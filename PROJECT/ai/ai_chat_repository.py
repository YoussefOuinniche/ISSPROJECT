from __future__ import annotations

import json
from typing import Any

import asyncpg


async def ensure_user_ai_profile_table(connection: asyncpg.Connection) -> None:
    await connection.execute(
        """
        CREATE TABLE IF NOT EXISTS user_ai_profile (
            user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
            profile_json JSONB NOT NULL DEFAULT '{}'::jsonb
        )
        """
    )


async def user_exists(connection: asyncpg.Connection, user_id: str) -> bool:
    return bool(
        await connection.fetchval(
            "SELECT EXISTS (SELECT 1 FROM users WHERE id = $1)",
            user_id,
        )
    )


async def insert_chat_message(
    connection: asyncpg.Connection,
    user_id: str,
    role: str,
    message: str,
) -> dict[str, Any]:
    row = await connection.fetchrow(
        """
        INSERT INTO chat_history (user_id, role, message)
        VALUES ($1, $2, $3)
        RETURNING id, user_id, role, message, created_at
        """,
        user_id,
        role,
        message,
    )
    return dict(row) if row else {}


async def fetch_recent_messages(
    connection: asyncpg.Connection,
    user_id: str,
    limit: int,
) -> list[dict[str, Any]]:
    rows = await connection.fetch(
        """
        SELECT id, role, message, created_at
        FROM chat_history
        WHERE user_id = $1
        ORDER BY created_at DESC
        LIMIT $2
        """,
        user_id,
        limit,
    )
    ordered_rows = reversed(rows)
    return [dict(row) for row in ordered_rows]


async def fetch_skill_catalog(
    connection: asyncpg.Connection,
) -> list[str]:
    rows = await connection.fetch(
        """
        SELECT name
        FROM skills
        ORDER BY name ASC
        """
    )
    return [str(row["name"]).strip() for row in rows if row["name"]]


async def fetch_user_ai_profile(
    connection: asyncpg.Connection,
    user_id: str,
) -> dict[str, Any]:
    try:
        row = await connection.fetchrow(
            """
            SELECT profile_json
            FROM user_ai_profile
            WHERE user_id = $1
            """,
            user_id,
        )
    except asyncpg.UndefinedTableError:
        return await fetch_profile_fallback(connection, user_id)

    if row and row["profile_json"]:
        profile_json = row["profile_json"]
        if isinstance(profile_json, str):
            try:
                return json.loads(profile_json)
            except json.JSONDecodeError:
                return {}
        if isinstance(profile_json, dict):
            return profile_json

    return await fetch_profile_fallback(connection, user_id)


async def fetch_stored_user_ai_profile(
    connection: asyncpg.Connection,
    user_id: str,
) -> dict[str, Any]:
    try:
        row = await connection.fetchrow(
            """
            SELECT profile_json
            FROM user_ai_profile
            WHERE user_id = $1
            """,
            user_id,
        )
    except asyncpg.UndefinedTableError:
        return {}

    if not row:
        return {}

    profile_json = row["profile_json"]
    if isinstance(profile_json, dict):
        return profile_json

    if isinstance(profile_json, str):
        try:
            parsed = json.loads(profile_json)
        except json.JSONDecodeError:
            return {}
        return parsed if isinstance(parsed, dict) else {}

    return {}


async def upsert_user_ai_profile(
    connection: asyncpg.Connection,
    user_id: str,
    profile_json: dict[str, Any],
) -> dict[str, Any]:
    try:
        row = await connection.fetchrow(
            """
            INSERT INTO user_ai_profile (user_id, profile_json)
            VALUES ($1, $2::jsonb)
            ON CONFLICT (user_id)
            DO UPDATE SET profile_json = EXCLUDED.profile_json
            RETURNING user_id, profile_json
            """,
            user_id,
            json.dumps(profile_json),
        )
    except asyncpg.UndefinedTableError:
        await ensure_user_ai_profile_table(connection)
        row = await connection.fetchrow(
            """
            INSERT INTO user_ai_profile (user_id, profile_json)
            VALUES ($1, $2::jsonb)
            ON CONFLICT (user_id)
            DO UPDATE SET profile_json = EXCLUDED.profile_json
            RETURNING user_id, profile_json
            """,
            user_id,
            json.dumps(profile_json),
        )
    return dict(row) if row else {"user_id": user_id, "profile_json": profile_json}


async def fetch_profile_fallback(
    connection: asyncpg.Connection,
    user_id: str,
) -> dict[str, Any]:
    base_profile = await connection.fetchrow(
        """
        SELECT
            u.full_name,
            u.email,
            p.domain,
            p.title,
            p.experience_level,
            p.bio
        FROM users u
        LEFT JOIN profiles p ON p.user_id = u.id
        WHERE u.id = $1
        """,
        user_id,
    )

    skill_rows = await connection.fetch(
        """
        SELECT
            s.name,
            s.category,
            us.proficiency_level,
            us.years_of_experience
        FROM user_skills us
        JOIN skills s ON s.id = us.skill_id
        WHERE us.user_id = $1
        ORDER BY us.years_of_experience DESC NULLS LAST, s.name ASC
        """,
        user_id,
    )

    skills = [
        {
            "name": row["name"],
            "category": row["category"],
            "proficiency": row["proficiency_level"],
            "years_of_experience": float(row["years_of_experience"] or 0),
        }
        for row in skill_rows
    ]

    if not base_profile:
        return {
            "skills": skills,
            "goals": [],
            "experience": {},
            "source": "fallback_core_profile",
        }

    return {
        "name": base_profile["full_name"],
        "email": base_profile["email"],
        "skills": skills,
        "goals": [],
        "experience": {
            "current_role": base_profile["title"],
            "domain": base_profile["domain"],
            "level": base_profile["experience_level"],
        },
        "bio": base_profile["bio"],
        "source": "fallback_core_profile",
    }


async def fetch_recent_trends(
    connection: asyncpg.Connection,
    limit: int,
) -> list[dict[str, Any]]:
    rows = await connection.fetch(
        """
        SELECT title, domain, description, source, created_at
        FROM trends
        ORDER BY created_at DESC
        LIMIT $1
        """,
        limit,
    )
    return [dict(row) for row in rows]
