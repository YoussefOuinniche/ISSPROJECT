"""Storage stage for market intelligence.

Responsibility:
- persist normalized records to durable storage (db/cache/object-store)
- expose retrieval-ready payloads for API/service layers
"""

from __future__ import annotations

import logging
import os
from typing import Any, Sequence

import psycopg2
import psycopg2.extras

from .normalizer import NormalizedMarketRecord


logger = logging.getLogger(__name__)

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@127.0.0.1:54322/postgres")


def _connect_db() -> psycopg2.extensions.connection:
    return psycopg2.connect(DATABASE_URL, cursor_factory=psycopg2.extras.RealDictCursor)


def _ensure_tables(connection: psycopg2.extensions.connection) -> None:
    with connection.cursor() as cursor:
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS market_trend_sources (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                role VARCHAR(255) NOT NULL,
                url TEXT NOT NULL,
                title TEXT,
                source VARCHAR(255),
                created_at TIMESTAMP DEFAULT NOW(),
                UNIQUE (role, url)
            )
            """
        )
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS market_role_trends (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                role VARCHAR(255) NOT NULL,
                skill VARCHAR(255) NOT NULL,
                frequency INTEGER NOT NULL,
                category VARCHAR(100) NOT NULL,
                source_count INTEGER NOT NULL DEFAULT 0,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW(),
                UNIQUE (role, skill)
            )
            """
        )
        cursor.execute(
            """
            CREATE INDEX IF NOT EXISTS idx_market_role_trends_role_updated
            ON market_role_trends (role, updated_at DESC)
            """
        )
        cursor.execute(
            """
            CREATE INDEX IF NOT EXISTS idx_market_role_trends_skill
            ON market_role_trends (skill)
            """
        )
    connection.commit()


def save_source(role: str, url: str, *, title: str = "", source: str = "") -> bool:
    """Persist one source URL used for market-trend extraction."""

    clean_role = " ".join(role.split()).strip()
    clean_url = url.strip()
    if not clean_role or not clean_url:
        return False

    conn = None
    try:
        conn = _connect_db()
        _ensure_tables(conn)
        with conn.cursor() as cursor:
            cursor.execute(
                """
                INSERT INTO market_trend_sources (role, url, title, source)
                VALUES (%s, %s, %s, %s)
                ON CONFLICT (role, url)
                DO UPDATE SET
                    title = EXCLUDED.title,
                    source = EXCLUDED.source
                """,
                (clean_role, clean_url, title.strip(), source.strip()),
            )
        conn.commit()
        return True
    except Exception as exc:  # noqa: BLE001
        logger.exception("Failed saving market source", extra={"role": clean_role, "url": clean_url, "error": str(exc)})
        if conn is not None:
            conn.rollback()
        return False
    finally:
        if conn is not None:
            conn.close()


def save_trends(role: str, trends: Sequence[dict[str, Any] | NormalizedMarketRecord]) -> int:
    """Upsert normalized trends for a role and return saved row count."""

    clean_role = " ".join(role.split()).strip()
    if not clean_role:
        return 0

    prepared_rows: list[dict[str, Any]] = []
    for trend in trends:
        if isinstance(trend, NormalizedMarketRecord):
            row = {
                "skill": trend.skill,
                "frequency": int(trend.frequency),
                "category": trend.category,
                "source_count": int(trend.frequency),
            }
        else:
            row = {
                "skill": str(trend.get("skill", "")).strip(),
                "frequency": int(trend.get("frequency", 0) or 0),
                "category": str(trend.get("category", "tooling")).strip() or "tooling",
                "source_count": int(trend.get("source_count", trend.get("frequency", 0)) or 0),
            }

        if not row["skill"] or row["frequency"] <= 0:
            continue
        prepared_rows.append(row)

    conn = None
    try:
        conn = _connect_db()
        _ensure_tables(conn)
        with conn.cursor() as cursor:
            if prepared_rows:
                cursor.executemany(
                    """
                    INSERT INTO market_role_trends (role, skill, frequency, category, source_count, updated_at)
                    VALUES (%s, %s, %s, %s, %s, NOW())
                    ON CONFLICT (role, skill)
                    DO UPDATE SET
                        frequency = EXCLUDED.frequency,
                        category = EXCLUDED.category,
                        source_count = EXCLUDED.source_count,
                        updated_at = NOW()
                    """,
                    [
                        (clean_role, row["skill"], row["frequency"], row["category"], row["source_count"])
                        for row in prepared_rows
                    ],
                )

                incoming_skills = [row["skill"] for row in prepared_rows]
                cursor.execute(
                    """
                    DELETE FROM market_role_trends
                    WHERE role = %s
                      AND NOT (skill = ANY(%s))
                    """,
                    (clean_role, incoming_skills),
                )
            else:
                cursor.execute("DELETE FROM market_role_trends WHERE role = %s", (clean_role,))

        conn.commit()
        return len(prepared_rows)
    except Exception as exc:  # noqa: BLE001
        logger.exception("Failed saving role trends", extra={"role": clean_role, "error": str(exc)})
        if conn is not None:
            conn.rollback()
        return 0
    finally:
        if conn is not None:
            conn.close()


def get_trends(role: str, *, limit: int = 100) -> list[dict[str, Any]]:
    """Fetch persisted trends for a specific role."""

    clean_role = " ".join(role.split()).strip()
    if not clean_role:
        return []

    conn = None
    try:
        conn = _connect_db()
        _ensure_tables(conn)
        with conn.cursor() as cursor:
            cursor.execute(
                """
                SELECT role, skill, frequency, category, source_count, updated_at
                FROM market_role_trends
                WHERE role = %s
                ORDER BY frequency DESC, skill ASC
                LIMIT %s
                """,
                (clean_role, max(1, min(limit, 500))),
            )
            rows = cursor.fetchall()
        return [dict(row) for row in rows]
    except Exception as exc:  # noqa: BLE001
        logger.exception("Failed fetching role trends", extra={"role": clean_role, "error": str(exc)})
        return []
    finally:
        if conn is not None:
            conn.close()


def get_global_trends(*, limit: int = 100) -> list[dict[str, Any]]:
    """Fetch aggregated trends across all roles."""

    conn = None
    try:
        conn = _connect_db()
        _ensure_tables(conn)
        with conn.cursor() as cursor:
            cursor.execute(
                """
                SELECT
                    skill,
                    SUM(frequency)::INTEGER AS frequency,
                    category,
                    SUM(source_count)::INTEGER AS source_count,
                    MAX(updated_at) AS updated_at
                FROM market_role_trends
                GROUP BY skill, category
                ORDER BY frequency DESC, skill ASC
                LIMIT %s
                """,
                (max(1, min(limit, 500)),),
            )
            rows = cursor.fetchall()
        return [dict(row) for row in rows]
    except Exception as exc:  # noqa: BLE001
        logger.exception("Failed fetching global trends", extra={"error": str(exc)})
        return []
    finally:
        if conn is not None:
            conn.close()


def persist_market_records(records: Sequence[NormalizedMarketRecord]) -> int:
    """Persist normalized market records.

    Args:
        records: Canonical records created by the normalization stage.

    Returns:
        Number of records persisted.

    Notes:
        Backward-compatibility helper that stores records under a
        synthetic role bucket called "global".
    """

    return save_trends("global", records)
