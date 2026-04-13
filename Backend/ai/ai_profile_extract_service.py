from __future__ import annotations

import logging
from dataclasses import dataclass
from typing import Any

import asyncpg
from fastapi.concurrency import run_in_threadpool

from ai_chat_config import AIChatSettings
from ai_chat_repository import (
    fetch_stored_user_ai_profile,
    upsert_user_ai_profile,
    user_exists,
)
from ai_profile_extract_models import (
    AIProfileExtractRequest,
    AIProfileExtractResponse,
    ExtractedProfile,
)
from services.llm_service import SAFE_EXTRACT_FALLBACK, build_messages, call_llm


logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """You extract structured career information from user messages.

RULES:

* Output ONLY valid JSON
* No explanations
* No extra text
* Be conservative (do not guess)
* If missing -> return empty
* Confidence must reflect certainty

JSON FORMAT:
{
"skills": [{"name": string, "level": "beginner|intermediate|advanced"}],
"goals": [string],
"experience_years": number,
"education": [string],
"interests": [string],
"confidence": number
}"""

SAFE_PROFILE_FALLBACK = {
    **SAFE_EXTRACT_FALLBACK,
    "confidence": 0.0,
}

SKILL_LEVEL_ORDER = {
    "beginner": 1,
    "intermediate": 2,
    "advanced": 3,
}


class AIProfileExtractServiceError(Exception):
    def __init__(self, status_code: int, detail: str) -> None:
        super().__init__(detail)
        self.status_code = status_code
        self.detail = detail


def _normalize_string_list(value: Any) -> list[str]:
    if not isinstance(value, list):
        return []

    normalized: list[str] = []
    seen: set[str] = set()
    for item in value:
        text = str(item or "").strip()
        if not text:
            continue
        key = text.casefold()
        if key in seen:
            continue
        seen.add(key)
        normalized.append(text)
    return normalized


def _normalize_skill_level(value: Any) -> str:
    level = str(value or "").strip().lower()
    if level in SKILL_LEVEL_ORDER:
        return level
    return "beginner"


def _normalize_skills(value: Any) -> list[dict[str, str]]:
    if not isinstance(value, list):
        return []

    normalized: dict[str, dict[str, str]] = {}
    for item in value:
        if not isinstance(item, dict):
            continue

        name = str(item.get("name") or "").strip()
        if not name:
            continue

        key = name.casefold()
        level = _normalize_skill_level(item.get("level"))
        existing = normalized.get(key)
        if existing and SKILL_LEVEL_ORDER[existing["level"]] >= SKILL_LEVEL_ORDER[level]:
            continue

        normalized[key] = {
            "name": existing["name"] if existing and existing["name"].casefold() == key else name,
            "level": level,
        }

    return list(normalized.values())


def _normalize_experience_years(value: Any) -> float | None:
    if value is None or value == "":
        return None

    try:
        number = float(value)
    except (TypeError, ValueError):
        return None

    if number < 0:
        return None

    return round(number, 1)


def _normalize_confidence(value: Any) -> float:
    if value is None or value == "":
        return 0.0

    try:
        confidence = float(value)
    except (TypeError, ValueError):
        return 0.0

    if confidence > 1.0 and confidence <= 100.0:
        confidence = confidence / 100.0

    if confidence < 0.0:
        return 0.0
    if confidence > 1.0:
        return 1.0
    return round(confidence, 4)


def normalize_extracted_profile(payload: Any) -> dict[str, Any]:
    if not isinstance(payload, dict):
        return dict(SAFE_PROFILE_FALLBACK)

    return {
        "skills": _normalize_skills(payload.get("skills")),
        "goals": _normalize_string_list(payload.get("goals")),
        "experience_years": _normalize_experience_years(payload.get("experience_years")),
        "education": _normalize_string_list(payload.get("education")),
        "interests": _normalize_string_list(payload.get("interests")),
        "confidence": _normalize_confidence(payload.get("confidence")),
    }


def _has_meaningful_profile_data(profile: dict[str, Any]) -> bool:
    return any(
        [
            bool(profile["skills"]),
            bool(profile["goals"]),
            profile["experience_years"] is not None,
            bool(profile["education"]),
            bool(profile["interests"]),
        ]
    )


def merge_profile_data(existing: dict[str, Any], new_data: dict[str, Any]) -> dict[str, Any]:
    existing_normalized = normalize_extracted_profile(existing)
    new_normalized = normalize_extracted_profile(new_data)
    existing_has_data = _has_meaningful_profile_data(existing_normalized)
    new_has_data = _has_meaningful_profile_data(new_normalized)

    merged_skills: dict[str, dict[str, str]] = {}
    for skill in existing_normalized["skills"] + new_normalized["skills"]:
        key = skill["name"].casefold()
        current = merged_skills.get(key)
        if current is None:
            merged_skills[key] = {"name": skill["name"], "level": skill["level"]}
            continue

        if SKILL_LEVEL_ORDER[skill["level"]] > SKILL_LEVEL_ORDER[current["level"]]:
            merged_skills[key] = {"name": current["name"], "level": skill["level"]}

    existing_experience = existing_normalized["experience_years"]
    new_experience = new_normalized["experience_years"]
    if existing_experience is None and new_experience is None:
        merged_experience = None
    else:
        merged_experience = max(
            value for value in [existing_experience, new_experience] if value is not None
        )

    if new_has_data and not existing_has_data:
        merged_confidence = new_normalized["confidence"]
    elif not new_has_data:
        merged_confidence = existing_normalized["confidence"]
    else:
        merged_confidence = round(
            (existing_normalized["confidence"] * 0.4) + (new_normalized["confidence"] * 0.6),
            4,
        )

    return {
        "skills": list(merged_skills.values()),
        "goals": _normalize_string_list(existing_normalized["goals"] + new_normalized["goals"]),
        "experience_years": merged_experience,
        "education": _normalize_string_list(
            existing_normalized["education"] + new_normalized["education"]
        ),
        "interests": _normalize_string_list(
            existing_normalized["interests"] + new_normalized["interests"]
        ),
        "confidence": merged_confidence,
    }


@dataclass(slots=True)
class AIProfileExtractService:
    pool: asyncpg.Pool | None
    settings: AIChatSettings

    async def handle_extract_profile(
        self,
        payload: AIProfileExtractRequest,
    ) -> AIProfileExtractResponse:
        if len(payload.message) > self.settings.max_message_chars:
            raise AIProfileExtractServiceError(
                422,
                f"Field 'message' must not exceed {self.settings.max_message_chars} characters.",
            )

        if self.pool is not None:
            try:
                async with self.pool.acquire() as connection:
                    if not await user_exists(connection, payload.user_id):
                        raise AIProfileExtractServiceError(404, "User not found.")

                    existing_profile = await fetch_stored_user_ai_profile(connection, payload.user_id)
            except AIProfileExtractServiceError:
                raise
            except asyncpg.PostgresError as exc:
                logger.exception("Database error while loading AI profile for user %s", payload.user_id)
                raise AIProfileExtractServiceError(
                    503,
                    "Database unavailable while loading the profile.",
                ) from exc
        else:
            existing_profile = (
                payload.existing_profile
                if isinstance(payload.existing_profile, dict)
                else {}
            )

        llm_messages = build_messages(SYSTEM_PROMPT, payload.message)
        try:
            raw_extracted = await run_in_threadpool(call_llm, "extract", llm_messages)
        except Exception:
            logger.exception("Unexpected extraction failure for user %s", payload.user_id)
            raw_extracted = dict(SAFE_PROFILE_FALLBACK)

        extracted_profile = normalize_extracted_profile(raw_extracted)
        merged_profile = merge_profile_data(existing_profile, extracted_profile)

        if self.pool is not None:
            try:
                async with self.pool.acquire() as connection:
                    async with connection.transaction():
                        await upsert_user_ai_profile(connection, payload.user_id, merged_profile)
            except asyncpg.PostgresError as exc:
                logger.exception("Database error while saving AI profile for user %s", payload.user_id)
                raise AIProfileExtractServiceError(
                    503,
                    "Database unavailable while saving the extracted profile.",
                ) from exc

        logger.info(
            "Profile extraction result for user %s: extracted=%s merged=%s confidence=%.4f",
            payload.user_id,
            extracted_profile,
            {
                "skills": len(merged_profile["skills"]),
                "goals": len(merged_profile["goals"]),
                "education": len(merged_profile["education"]),
                "interests": len(merged_profile["interests"]),
                "experience_years": merged_profile["experience_years"],
            },
            merged_profile["confidence"],
        )

        return AIProfileExtractResponse(
            extracted=ExtractedProfile(
                skills=merged_profile["skills"],
                goals=merged_profile["goals"],
                experience_years=merged_profile["experience_years"],
                education=merged_profile["education"],
                interests=merged_profile["interests"],
            ),
            confidence=merged_profile["confidence"],
        )
