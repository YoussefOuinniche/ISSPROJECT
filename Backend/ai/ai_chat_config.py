from __future__ import annotations

import os
from dataclasses import dataclass


SYSTEM_INSTRUCTION = (
    "You are SkillPulse, a career AI assistant inside a mobile product.\n\n"
    "Use:\n"
    "* explicit profile\n"
    "* AI profile\n"
    "* skill-gap analysis\n"
    "* learning roadmap\n"
    "* recent conversation\n\n"
    "RULES:\n"
    "* be concise\n"
    "* be practical\n"
    "* be personalized and specific to the user's target role, strengths, urgent gaps, and roadmap when available\n"
    "* avoid generic motivational filler\n"
    "* do not invent skills\n"
    "* if key context is missing, ask exactly one focused follow-up question\n"
    "* align advice with market trends\n"
    "* prefer immediate next steps, realistic tools, and portfolio-quality project advice"
)


def _env_int(name: str, default: int) -> int:
    raw = os.getenv(name)
    if raw is None or str(raw).strip() == "":
        return default

    try:
        return int(raw)
    except (TypeError, ValueError):
        return default


def _env_float(name: str, default: float) -> float:
    raw = os.getenv(name)
    if raw is None or str(raw).strip() == "":
        return default

    try:
        return float(raw)
    except (TypeError, ValueError):
        return default


def normalize_ollama_url(raw_url: str) -> str:
    cleaned = (raw_url or "http://localhost:11434").strip().rstrip("/")
    if not cleaned.endswith("/v1"):
        cleaned = f"{cleaned}/v1"
    return cleaned


@dataclass(frozen=True, slots=True)
class AIChatSettings:
    database_url: str
    ollama_url: str
    ollama_model: str
    ollama_api_key: str
    system_instruction: str
    request_timeout_seconds: float
    connect_timeout_seconds: float
    max_recent_messages: int
    market_trends_limit: int
    max_message_chars: int
    db_pool_min_size: int
    db_pool_max_size: int


def load_ai_chat_settings() -> AIChatSettings:
    db_pool_min_size = max(1, _env_int("AI_DB_POOL_MIN_SIZE", 1))
    db_pool_max_size = max(db_pool_min_size, _env_int("AI_DB_POOL_MAX_SIZE", 10))

    return AIChatSettings(
        database_url=os.getenv(
            "DATABASE_URL",
            "postgresql://postgres:postgres@127.0.0.1:54322/postgres",
        ),
        ollama_url=normalize_ollama_url(os.getenv("OLLAMA_URL", "http://localhost:11434/v1")),
        ollama_model=(os.getenv("OLLAMA_MODEL_CHAT") or os.getenv("OLLAMA_MODEL") or "qwen2.5:7b"),
        ollama_api_key=os.getenv("OLLAMA_API_KEY", "ollama"),
        system_instruction=SYSTEM_INSTRUCTION,
        request_timeout_seconds=max(5.0, _env_float("AI_TIMEOUT_SECONDS", 60.0)),
        connect_timeout_seconds=max(1.0, _env_float("AI_CONNECT_TIMEOUT_SECONDS", 10.0)),
        max_recent_messages=max(1, _env_int("AI_CHAT_MAX_RECENT_MESSAGES", 10)),
        market_trends_limit=max(1, _env_int("AI_CHAT_TRENDS_LIMIT", 5)),
        max_message_chars=max(100, _env_int("AI_CHAT_MESSAGE_MAX_CHARS", 4000)),
        db_pool_min_size=db_pool_min_size,
        db_pool_max_size=db_pool_max_size,
    )
