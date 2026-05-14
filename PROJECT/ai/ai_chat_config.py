from __future__ import annotations

import os
from typing import TypedDict

# SYSTEM_INSTRUCTION is defined in ai_chat_prompt.py and imported directly
# by ai_chat_service.py. Do NOT redefine it here — keeping a separate version
# caused the chat to silently ignore the questionnaire restrictions.


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


AIChatSettings = TypedDict(
    "AIChatSettings",
    {
        "database_url": str,
        "ollama_url": str,
        "ollama_model": str,
        "ollama_api_key": str,
        "request_timeout_seconds": float,
        "connect_timeout_seconds": float,
        "max_recent_messages": int,
        "market_trends_limit": int,
        "max_message_chars": int,
        "db_pool_min_size": int,
        "db_pool_max_size": int,
    },
)


def load_ai_chat_settings() -> AIChatSettings:
    db_pool_min_size = max(1, _env_int("AI_DB_POOL_MIN_SIZE", 1))
    db_pool_max_size = max(db_pool_min_size, _env_int("AI_DB_POOL_MAX_SIZE", 10))

    return {
        "database_url": (os.getenv("AI_DATABASE_URL") or os.getenv("DATABASE_URL") or "").strip(),
        "ollama_url": normalize_ollama_url(os.getenv("OLLAMA_URL", "http://localhost:11434/v1")),
        "ollama_model": (os.getenv("OLLAMA_MODEL_CHAT") or os.getenv("OLLAMA_MODEL") or "qwen2.5:7b"),
        "ollama_api_key": os.getenv("OLLAMA_API_KEY", "ollama"),
        "request_timeout_seconds": max(5.0, _env_float("AI_TIMEOUT_SECONDS", 180.0)),
        "connect_timeout_seconds": max(1.0, _env_float("AI_CONNECT_TIMEOUT_SECONDS", 10.0)),
        "max_recent_messages": max(1, _env_int("AI_CHAT_MAX_RECENT_MESSAGES", 10)),
        "market_trends_limit": max(1, _env_int("AI_CHAT_TRENDS_LIMIT", 5)),
        "max_message_chars": max(100, _env_int("AI_CHAT_MESSAGE_MAX_CHARS", 4000)),
        "db_pool_min_size": db_pool_min_size,
        "db_pool_max_size": db_pool_max_size,
    }
