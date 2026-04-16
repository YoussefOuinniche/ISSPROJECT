from __future__ import annotations

import logging
import re
from dataclasses import dataclass

import asyncpg

from ai_chat_config import AIChatSettings
from ai_chat_llm_client import LLMRequestError, LLMTimeoutError, OllamaChatClient
from ai_chat_models import AIChatRequest, AIChatResponse, ConversationSummary
from ai_chat_prompt import build_chat_messages
from ai_chat_repository import (
    fetch_skill_catalog,
    fetch_recent_messages,
    fetch_stored_user_ai_profile,
    insert_chat_message,
    user_exists,
)


logger = logging.getLogger(__name__)
GOAL_PATTERNS = [
    re.compile(r"\b(?:want|hope|plan|aim|looking)\s+to\s+become\s+([^.,!?;\n]+)", re.IGNORECASE),
    re.compile(r"\b(?:want|hope|plan|aim|looking)\s+to\s+be\s+([^.,!?;\n]+)", re.IGNORECASE),
    re.compile(r"\bmy\s+goal\s+is\s+to\s+become\s+([^.,!?;\n]+)", re.IGNORECASE),
    re.compile(r"\bmy\s+goal\s+is\s+to\s+([^.,!?;\n]+)", re.IGNORECASE),
    re.compile(r"\bgoal\s+is\s+to\s+([^.,!?;\n]+)", re.IGNORECASE),
    re.compile(r"\binterested\s+in\s+becoming\s+([^.,!?;\n]+)", re.IGNORECASE),
    re.compile(r"\baspire\s+to\s+be(?:come)?\s+([^.,!?;\n]+)", re.IGNORECASE),
]

DEGRADED_RESPONSE_PREFIX = (
    "I cannot reach the live AI model right now, but here is a practical next-step plan you can use immediately."
)


class AIChatServiceError(Exception):
    def __init__(self, status_code: int, detail: str) -> None:
        super().__init__(detail)
        self.status_code = status_code
        self.detail = detail


def _unique_strings(values: list[str]) -> list[str]:
    unique: list[str] = []
    seen: set[str] = set()

    for value in values:
        cleaned = str(value or "").strip()
        if not cleaned:
            continue

        key = cleaned.casefold()
        if key in seen:
            continue

        seen.add(key)
        unique.append(cleaned)

    return unique


def _find_skill_mentions(message: str, skill_catalog: list[str]) -> list[str]:
    lowered_message = message.casefold()
    ordered_catalog = sorted(_unique_strings(skill_catalog), key=len, reverse=True)

    matches: list[tuple[int, str]] = []
    for skill_name in ordered_catalog:
        lowered_skill = skill_name.casefold()
        pattern = re.compile(
            rf"(?<![a-z0-9]){re.escape(lowered_skill)}(?![a-z0-9])",
            re.IGNORECASE,
        )
        found = pattern.search(lowered_message)
        if found:
            matches.append((found.start(), skill_name))

    matches.sort(key=lambda item: item[0])
    return [name for _, name in matches[:5]]


def _extract_goals(message: str) -> list[str]:
    goals: list[str] = []

    for pattern in GOAL_PATTERNS:
        for match in pattern.finditer(message):
            candidate = re.sub(r"^(?:an?|the)\s+", "", match.group(1).strip(), flags=re.IGNORECASE)
            candidate = candidate.strip(" .,!?:;")
            if candidate:
                goals.append(candidate)

    return _unique_strings(goals)[:5]


def build_conversation_summary(message: str, skill_catalog: list[str]) -> ConversationSummary:
    return ConversationSummary(
        skills_mentioned=_find_skill_mentions(message, skill_catalog),
        goals_mentioned=_extract_goals(message),
    )


def _as_unique_list(values: list[str], *, limit: int = 3) -> list[str]:
    return _unique_strings(values)[: max(1, limit)]


def _extract_target_role_from_profile(profile: dict[str, object]) -> str | None:
    candidates: list[str] = []

    direct_fields = [
        profile.get("target_role"),
        profile.get("explicit_target_role"),
        profile.get("current_role"),
        profile.get("title"),
    ]
    for value in direct_fields:
        text = str(value or "").strip()
        if text:
            candidates.append(text)

    skill_gap_analysis = profile.get("skill_gap_analysis")
    if isinstance(skill_gap_analysis, dict):
        text = str(skill_gap_analysis.get("target_role") or "").strip()
        if text:
            candidates.append(text)

    experience = profile.get("experience")
    if isinstance(experience, dict):
        text = str(experience.get("current_role") or "").strip()
        if text:
            candidates.append(text)

    goals = profile.get("goals")
    if isinstance(goals, list):
        for item in goals:
            text = str(item or "").strip()
            if text:
                candidates.append(text)

    unique_candidates = _unique_strings(candidates)
    return unique_candidates[0] if unique_candidates else None


def _extract_known_skills(profile: dict[str, object]) -> list[str]:
    raw_skills = profile.get("skills")
    if not isinstance(raw_skills, list):
        return []

    collected: list[str] = []
    for item in raw_skills:
        if isinstance(item, dict):
            text = str(item.get("name") or item.get("skill") or "").strip()
        else:
            text = str(item or "").strip()

        if text:
            collected.append(text)

    return _unique_strings(collected)


def _build_degraded_assistant_response(
    *,
    message: str,
    profile: dict[str, object],
    conversation_summary: ConversationSummary,
) -> str:
    target_role = _extract_target_role_from_profile(profile)
    mentioned_skills = _as_unique_list(conversation_summary.skills_mentioned, limit=3)
    known_skills = _as_unique_list(_extract_known_skills(profile), limit=3)
    goals = _as_unique_list(conversation_summary.goals_mentioned, limit=2)

    lines = [DEGRADED_RESPONSE_PREFIX]
    if target_role:
        lines.append(f"Target role detected: {target_role}.")

    if mentioned_skills:
        focus_skills = ", ".join(mentioned_skills)
    elif known_skills:
        focus_skills = ", ".join(known_skills)
    else:
        focus_skills = "your top 2-3 priority skills"

    lines.append(f"1) Focus this week on {focus_skills} and produce one measurable artifact (repo, notebook, or deployed demo).")
    lines.append("2) For each focus skill, complete one guided practice and one portfolio-ready project task, then document outcomes.")

    if goals:
        lines.append(f"3) Keep your work aligned to this goal: {goals[0]}.")
    elif target_role:
        lines.append(f"3) Align every task to {target_role} job requirements and capture evidence in your portfolio.")
    else:
        lines.append("3) Share your target role plus your current top 3 skills so I can generate a precise role-based plan.")

    user_message = str(message or "").strip()
    if user_message:
        lines.append("Reply with one specific objective for this week, and I will break it into a day-by-day execution plan.")

    return "\n".join(lines).strip()


@dataclass(slots=True)
class AIChatService:
    pool: asyncpg.Pool | None
    llm_client: OllamaChatClient
    settings: AIChatSettings

    async def handle_chat(self, payload: AIChatRequest) -> AIChatResponse:
        if len(payload.message) > self.settings.max_message_chars:
            raise AIChatServiceError(
                422,
                f"Field 'message' must not exceed {self.settings.max_message_chars} characters.",
            )

        if self.pool is not None:
            try:
                async with self.pool.acquire() as connection:
                    if not await user_exists(connection, payload.user_id):
                        raise AIChatServiceError(status_code=404, detail="User not found.")

                    recent_messages = await fetch_recent_messages(
                        connection=connection,
                        user_id=payload.user_id,
                        limit=self.settings.max_recent_messages,
                    )
                    profile = await fetch_stored_user_ai_profile(connection, payload.user_id)
                    skill_catalog = await fetch_skill_catalog(connection)
            except AIChatServiceError:
                raise
            except asyncpg.PostgresError as exc:
                logger.exception("Database error while preparing chat context for user %s", payload.user_id)
                raise AIChatServiceError(503, "Database unavailable while preparing chat context.") from exc
        else:
            recent_messages = [
                message
                for message in payload.recent_messages[: self.settings.max_recent_messages]
                if isinstance(message, dict)
            ]
            profile = payload.profile if isinstance(payload.profile, dict) else {}
            skill_catalog = [str(skill).strip() for skill in payload.skill_catalog if str(skill).strip()]

        messages = build_chat_messages(
            system_instruction=self.settings.system_instruction,
            recent_messages=recent_messages,
            profile=profile,
            user_message=payload.message,
        )
        conversation_summary = build_conversation_summary(payload.message, skill_catalog)
        degraded = False

        try:
            assistant_response = await self.llm_client.create_chat_completion(messages)
        except LLMTimeoutError:
            logger.warning("LLM timeout for user %s; returning degraded response", payload.user_id)
            assistant_response = _build_degraded_assistant_response(
                message=payload.message,
                profile=profile if isinstance(profile, dict) else {},
                conversation_summary=conversation_summary,
            )
            degraded = True
        except LLMRequestError as exc:
            logger.warning(
                "LLM unavailable for user %s; returning degraded response: %s",
                payload.user_id,
                str(exc),
            )
            assistant_response = _build_degraded_assistant_response(
                message=payload.message,
                profile=profile if isinstance(profile, dict) else {},
                conversation_summary=conversation_summary,
            )
            degraded = True

        user_message_row: dict[str, str] = {}
        if self.pool is not None:
            try:
                async with self.pool.acquire() as connection:
                    async with connection.transaction():
                        user_message_row = await insert_chat_message(
                            connection=connection,
                            user_id=payload.user_id,
                            role="user",
                            message=payload.message,
                        )
                        await insert_chat_message(
                            connection=connection,
                            user_id=payload.user_id,
                            role="assistant",
                            message=assistant_response,
                        )
            except asyncpg.PostgresError as exc:
                logger.exception("Database error while persisting assistant reply for user %s", payload.user_id)
                raise AIChatServiceError(503, "Database unavailable while saving assistant response.") from exc

        logger.info(
            "Stored AI chat exchange for user %s",
            payload.user_id,
        )
        return AIChatResponse(
            response=assistant_response,
            message_id=str(user_message_row.get("id")) if user_message_row.get("id") else None,
            conversation_summary=conversation_summary,
            degraded=degraded,
        )
