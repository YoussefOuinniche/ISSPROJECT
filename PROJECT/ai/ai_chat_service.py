from __future__ import annotations

import logging
import re
from typing import TypedDict

import asyncpg
import httpx

from ai_chat_config import AIChatSettings
from ai_chat_llm_client import LLMRequestError, LLMTimeoutError, create_chat_completion
from ai_chat_models import AIChatRequest, AIChatResponse, ConversationSummary
from ai_chat_prompt import build_chat_messages, SYSTEM_INSTRUCTION
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


class AIChatServiceError(Exception):
    def __init__(self, status_code: int, detail: str) -> None:
        super().__init__(detail)
        self.status_code = status_code
        self.detail = detail


AIChatServiceContext = TypedDict(
    "AIChatServiceContext",
    {
        "pool": asyncpg.Pool | None,
        "http_client": httpx.AsyncClient,
        "settings": AIChatSettings,
    },
)


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


def create_ai_chat_service_context(
    pool: asyncpg.Pool | None,
    http_client: httpx.AsyncClient,
    settings: AIChatSettings,
) -> AIChatServiceContext:
    return {
        "pool": pool,
        "http_client": http_client,
        "settings": settings,
    }


async def handle_chat(
    service_context: AIChatServiceContext,
    payload: AIChatRequest,
) -> AIChatResponse:
    settings = service_context["settings"]
    pool = service_context["pool"]

    if len(payload.message) > settings["max_message_chars"]:
        raise AIChatServiceError(
            422,
            f"Field 'message' must not exceed {settings['max_message_chars']} characters.",
        )

    if pool is not None:
        try:
            async with pool.acquire() as connection:
                if not await user_exists(connection, payload.user_id):
                    raise AIChatServiceError(status_code=404, detail="User not found.")

                recent_messages = await fetch_recent_messages(
                    connection=connection,
                    user_id=payload.user_id,
                    limit=settings["max_recent_messages"],
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
            for message in payload.recent_messages[: settings["max_recent_messages"]]
            if isinstance(message, dict)
        ]
        profile = payload.profile if isinstance(payload.profile, dict) else {}
        skill_catalog = [str(skill).strip() for skill in payload.skill_catalog if str(skill).strip()]

    messages = build_chat_messages(
        system_instruction=SYSTEM_INSTRUCTION,
        recent_messages=recent_messages,
        profile=profile,
        user_message=payload.message,
    )
    conversation_summary = build_conversation_summary(payload.message, skill_catalog)

    try:
        assistant_response = await create_chat_completion(
            service_context["http_client"],
            settings,
            messages,
        )
    except LLMTimeoutError as exc:
        logger.warning("LLM timeout for user %s", payload.user_id)
        raise AIChatServiceError(504, "The AI service timed out.") from exc
    except LLMRequestError as exc:
        logger.exception("LLM request failed for user %s", payload.user_id)
        raise AIChatServiceError(502, exc.args[0]) from exc

    user_message_row: dict[str, str] = {}
    if pool is not None:
        try:
            async with pool.acquire() as connection:
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
    )
