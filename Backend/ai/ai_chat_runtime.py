from __future__ import annotations

import logging

import asyncpg
import httpx
from fastapi import FastAPI

from ai_chat_config import AIChatSettings, load_ai_chat_settings
from ai_chat_llm_client import OllamaChatClient
from ai_roadmap_service import AIRoadmapService
from ai_chat_service import AIChatService
from ai_profile_extract_service import AIProfileExtractService
from ai_skill_gap_service import AISkillGapService


logger = logging.getLogger(__name__)


async def ensure_ai_chat_schema(db_pool: asyncpg.Pool) -> None:
    async with db_pool.acquire() as connection:
        await connection.execute(
            """
            CREATE TABLE IF NOT EXISTS ai_chat_sessions (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                title VARCHAR(255) NOT NULL DEFAULT 'New Conversation',
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            )
            """
        )
        await connection.execute(
            """
            CREATE INDEX IF NOT EXISTS idx_ai_chat_sessions_user_id
                ON ai_chat_sessions (user_id)
            """
        )
        await connection.execute(
            """
            CREATE TABLE IF NOT EXISTS ai_chat_messages (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                session_id UUID NOT NULL REFERENCES ai_chat_sessions(id) ON DELETE CASCADE,
                role VARCHAR(20) NOT NULL,
                content TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT NOW()
            )
            """
        )
        await connection.execute(
            """
            CREATE INDEX IF NOT EXISTS idx_ai_chat_messages_session_id
                ON ai_chat_messages (session_id)
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


async def initialize_ai_chat_runtime(app: FastAPI) -> None:
    settings = load_ai_chat_settings()
    http_client: httpx.AsyncClient | None = None
    db_pool: asyncpg.Pool | None = None

    try:
        http_client = httpx.AsyncClient(
            base_url=settings.ollama_url,
            timeout=httpx.Timeout(
                timeout=settings.request_timeout_seconds,
                connect=settings.connect_timeout_seconds,
            ),
            limits=httpx.Limits(max_connections=20, max_keepalive_connections=10),
        )

        try:
            db_pool = await asyncpg.create_pool(
                dsn=settings.database_url,
                min_size=settings.db_pool_min_size,
                max_size=settings.db_pool_max_size,
            )
            await ensure_ai_chat_schema(db_pool)
        except Exception:
            logger.exception("AI chat runtime could not connect to Postgres. Continuing in no-db mode.")
            if db_pool is not None:
                await db_pool.close()
            db_pool = None

        app.state.ai_chat_settings = settings
        app.state.ai_chat_db_pool = db_pool
        app.state.ai_chat_http_client = http_client
        app.state.ai_chat_service = AIChatService(
            pool=db_pool,
            llm_client=OllamaChatClient(http_client=http_client, settings=settings),
            settings=settings,
        )
        app.state.ai_profile_extract_service = AIProfileExtractService(
            pool=db_pool,
            settings=settings,
        )
        app.state.ai_skill_gap_service = AISkillGapService()
        app.state.ai_roadmap_service = AIRoadmapService()
        logger.info("[AI] Ollama URL: %s", settings.ollama_url)
        logger.info("[AI] Ollama model: %s", settings.ollama_model)
        logger.info("AI chat runtime initialized")
    except Exception:
        logger.exception("Failed to initialize AI chat runtime.")
        app.state.ai_chat_settings = settings
        app.state.ai_chat_db_pool = None
        app.state.ai_chat_http_client = None
        app.state.ai_chat_service = None
        app.state.ai_profile_extract_service = None
        app.state.ai_skill_gap_service = None
        app.state.ai_roadmap_service = None

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
    app.state.ai_skill_gap_service = None
    app.state.ai_roadmap_service = None


def get_ai_chat_settings(app: FastAPI) -> AIChatSettings | None:
    return getattr(app.state, "ai_chat_settings", None)
