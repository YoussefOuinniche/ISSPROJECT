from __future__ import annotations

import logging

import asyncpg
import httpx
from fastapi import FastAPI

from ai_chat_config import AIChatSettings, load_ai_chat_settings
from ai_chat_service import create_ai_chat_service_context
from ai_profile_extract_service import create_ai_profile_extract_service_context


logger = logging.getLogger(__name__)


async def ensure_ai_chat_schema(db_pool: asyncpg.Pool) -> None:
    async with db_pool.acquire() as connection:
        await connection.execute(
            """
            CREATE TABLE IF NOT EXISTS chat_history (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
                message TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT NOW()
            )
            """
        )
        await connection.execute(
            """
            CREATE INDEX IF NOT EXISTS idx_chat_history_user_created_at
                ON chat_history (user_id, created_at DESC)
            """
        )
        await connection.execute(
            """
            CREATE TABLE IF NOT EXISTS user_ai_profile (
                user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
                profile_json JSONB NOT NULL DEFAULT '{}'::jsonb
            )
            """
        )


async def ensure_ollama_model(http_client: httpx.AsyncClient, model: str) -> bool:
    try:
        response = await http_client.get("/models")
        response.raise_for_status()
        payload = response.json()
    except Exception as exc:
        logger.warning("AI model unavailable: %s", exc)
        return False

    models = payload.get("data", [])
    available_models = [
        str(item.get("id"))
        for item in models
        if isinstance(item, dict) and item.get("id")
    ]

    if model not in available_models:
        logger.warning("AI model unavailable: %s is not listed by Ollama.", model)
        return False

    print(f"AI model running: {model}", flush=True)
    return True


async def initialize_ai_chat_runtime(app: FastAPI) -> None:
    settings = load_ai_chat_settings()
    http_client: httpx.AsyncClient | None = None
    db_pool: asyncpg.Pool | None = None

    try:
        http_client = httpx.AsyncClient(
            base_url=settings["ollama_url"],
            timeout=httpx.Timeout(
                timeout=settings["request_timeout_seconds"],
                connect=settings["connect_timeout_seconds"],
            ),
            limits=httpx.Limits(max_connections=20, max_keepalive_connections=10),
        )

        await ensure_ollama_model(http_client, settings["ollama_model"])

        if settings["database_url"]:
            try:
                db_pool = await asyncpg.create_pool(
                    dsn=settings["database_url"],
                    min_size=settings["db_pool_min_size"],
                    max_size=settings["db_pool_max_size"],
                )
                await ensure_ai_chat_schema(db_pool)
            except Exception as exc:
                logger.debug("AI DB startup error: %s", exc)
                if db_pool is not None:
                    await db_pool.close()
                db_pool = None

        app.state.ai_chat_settings = settings
        app.state.ai_chat_db_pool = db_pool
        app.state.ai_chat_http_client = http_client
        app.state.ai_chat_service = create_ai_chat_service_context(
            pool=db_pool,
            http_client=http_client,
            settings=settings,
        )
        app.state.ai_profile_extract_service = create_ai_profile_extract_service_context(
            pool=db_pool,
            settings=settings,
        )
    except Exception:
        logger.warning("Failed to initialize AI chat runtime.")
        app.state.ai_chat_settings = settings
        app.state.ai_chat_db_pool = None
        app.state.ai_chat_http_client = None
        app.state.ai_chat_service = None
        app.state.ai_profile_extract_service = None

        if http_client is not None:
            await http_client.aclose()
        if db_pool is not None:
            await db_pool.close()


async def shutdown_ai_chat_runtime(app: FastAPI) -> None:
    http_client = getattr(app.state, "ai_chat_http_client", None)
    db_pool = getattr(app.state, "ai_chat_db_pool", None)

    if http_client is not None:
        await http_client.aclose()
        app.state.ai_chat_http_client = None

    if db_pool is not None:
        await db_pool.close()
        app.state.ai_chat_db_pool = None

    app.state.ai_chat_service = None
    app.state.ai_profile_extract_service = None


def get_ai_chat_settings(app: FastAPI) -> AIChatSettings | None:
    return getattr(app.state, "ai_chat_settings", None)
