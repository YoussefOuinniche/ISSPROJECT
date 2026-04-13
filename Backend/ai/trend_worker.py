from __future__ import annotations

import argparse
import logging
import os
import re
import sys
import time
from collections import defaultdict
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Callable

import psycopg2
import psycopg2.extras
from dotenv import load_dotenv

from scraper import scrape_it_jobs_data


BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR.parent / ".env")
load_dotenv(BASE_DIR / ".env")


DEFAULT_QUERIES = [
    "software engineer",
    "data scientist",
    "devops engineer",
    "cloud engineer",
    "cybersecurity analyst",
]

DEFAULT_SKILL_ALIASES = {
    "Python": ["python"],
    "JavaScript": ["javascript", "js"],
    "TypeScript": ["typescript", "ts"],
    "React": ["react", "reactjs", "react.js"],
    "Node.js": ["node.js", "nodejs", "node js"],
    "PostgreSQL": ["postgresql", "postgres", "postgre sql"],
    "Docker": ["docker", "containerization", "containerisation"],
    "Machine Learning": ["machine learning", "ml"],
    "Deep Learning": ["deep learning"],
    "Data Analysis": ["data analysis", "analytics"],
    "SQL": ["sql"],
    "Git": ["git", "version control"],
    "REST API Design": ["rest api design", "rest api", "api design"],
    "GraphQL": ["graphql"],
    "Kubernetes": ["kubernetes", "k8s"],
    "AWS": ["aws", "amazon web services"],
    "Azure": ["azure", "microsoft azure"],
    "Cybersecurity": ["cybersecurity", "cyber security", "security"],
    "Agile / Scrum": ["agile", "scrum", "agile scrum"],
    "Communication": ["communication", "stakeholder communication"],
}

POSITIVE_TREND_KEYWORDS = [
    "rise",
    "rising",
    "growth",
    "growing",
    "increase",
    "increasing",
    "demand",
    "in demand",
    "adoption",
    "mainstream",
    "becoming standard",
    "rapidly",
    "expanding",
    "surge",
]

NEGATIVE_TREND_KEYWORDS = [
    "decline",
    "declining",
    "decrease",
    "decreasing",
    "drop",
    "dropping",
    "slowdown",
    "shrinking",
    "reduced demand",
    "falling",
]

STABLE_TREND_KEYWORDS = [
    "stable",
    "steady",
    "unchanged",
    "consistent",
]

CREATE_TABLE_SQL = """
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS skill_trends (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    skill         VARCHAR(255) NOT NULL,
    demand_score  NUMERIC(5,2) NOT NULL,
    trend         VARCHAR(10) NOT NULL CHECK (trend IN ('up', 'down', 'stable')),
    window_start  TIMESTAMP NOT NULL,
    source_count  INTEGER NOT NULL DEFAULT 0,
    created_at    TIMESTAMP DEFAULT NOW(),
    updated_at    TIMESTAMP DEFAULT NOW(),
    UNIQUE (skill, window_start)
);

CREATE INDEX IF NOT EXISTS idx_skill_trends_window_start
    ON skill_trends (window_start DESC);
"""

UPSERT_SQL = """
INSERT INTO skill_trends (skill, demand_score, trend, window_start, source_count)
VALUES (%s, %s, %s, %s, %s)
ON CONFLICT (skill, window_start)
DO UPDATE
SET demand_score = EXCLUDED.demand_score,
    trend = EXCLUDED.trend,
    source_count = EXCLUDED.source_count,
    updated_at = NOW()
RETURNING id
"""


@dataclass(slots=True)
class WorkerConfig:
    database_url: str
    queries: list[str]
    per_source_limit: int
    loop: bool
    interval_seconds: int
    max_retries: int
    retry_delay_seconds: float
    log_level: str


def configure_logging(level: str) -> None:
    logging.basicConfig(
        level=getattr(logging, level.upper(), logging.INFO),
        format="%(asctime)s %(levelname)s %(name)s %(message)s",
    )


def load_config(args: argparse.Namespace) -> WorkerConfig:
    raw_queries = os.getenv("TREND_WORKER_QUERIES", "")
    queries = [item.strip() for item in raw_queries.split(",") if item.strip()] or DEFAULT_QUERIES
    database_url = os.getenv(
        "DATABASE_URL",
        "postgresql://postgres:postgres@127.0.0.1:54322/postgres",
    )

    return WorkerConfig(
        database_url=database_url,
        queries=queries,
        per_source_limit=max(1, int(os.getenv("TREND_WORKER_PER_SOURCE_LIMIT", args.per_source_limit))),
        loop=args.loop,
        interval_seconds=max(
            60,
            int(os.getenv("TREND_WORKER_INTERVAL_SECONDS", args.interval_seconds)),
        ),
        max_retries=max(1, int(os.getenv("TREND_WORKER_MAX_RETRIES", args.max_retries))),
        retry_delay_seconds=max(
            1.0,
            float(os.getenv("TREND_WORKER_RETRY_DELAY_SECONDS", args.retry_delay_seconds)),
        ),
        log_level=(os.getenv("TREND_WORKER_LOG_LEVEL", args.log_level) or "INFO").upper(),
    )


def retry(
    operation_name: str,
    func: Callable[[], Any],
    *,
    max_retries: int,
    delay_seconds: float,
) -> Any:
    last_error: Exception | None = None
    for attempt in range(1, max_retries + 1):
        try:
            return func()
        except Exception as error:  # noqa: BLE001
            last_error = error
            logging.warning(
                "%s failed on attempt %s/%s: %s",
                operation_name,
                attempt,
                max_retries,
                error,
            )
            if attempt < max_retries:
                time.sleep(delay_seconds * attempt)

    raise RuntimeError(f"{operation_name} failed after {max_retries} attempts") from last_error


def connect_db(database_url: str) -> psycopg2.extensions.connection:
    return psycopg2.connect(
        database_url,
        cursor_factory=psycopg2.extras.RealDictCursor,
    )


def ensure_skill_trends_table(connection: psycopg2.extensions.connection) -> None:
    with connection.cursor() as cursor:
        cursor.execute(CREATE_TABLE_SQL)
    connection.commit()


def fetch_skill_catalog(connection: psycopg2.extensions.connection) -> list[str]:
    with connection.cursor() as cursor:
        cursor.execute("SELECT name FROM skills ORDER BY name ASC")
        rows = cursor.fetchall()
    return [str(row["name"]).strip() for row in rows if str(row["name"]).strip()]


def normalize_text(text: str) -> str:
    lowered = (text or "").lower()
    return re.sub(r"[^a-z0-9#+.\-/ ]+", " ", lowered)


def make_aliases_for_skill(skill: str) -> list[str]:
    aliases = set(DEFAULT_SKILL_ALIASES.get(skill, []))
    aliases.add(skill.lower())
    aliases.add(skill.lower().replace("/", " "))
    aliases.add(skill.lower().replace(".", " "))
    aliases.add(skill.lower().replace("-", " "))
    aliases = {alias.strip() for alias in aliases if alias.strip()}
    return sorted(aliases)


def build_skill_alias_map(skills: list[str]) -> dict[str, list[str]]:
    alias_map: dict[str, list[str]] = {}
    for skill in skills:
        alias_map[skill] = make_aliases_for_skill(skill)
    return alias_map


def dedupe_scraped_documents(documents: list[dict[str, Any]]) -> list[dict[str, Any]]:
    seen: set[tuple[str, str]] = set()
    deduped: list[dict[str, Any]] = []
    for item in documents:
        href = str(item.get("href") or "").strip()
        title = str(item.get("title") or "").strip()
        key = (href.lower(), title.lower())
        if key in seen:
            continue
        seen.add(key)
        deduped.append(item)
    return deduped


def scrape_documents(config: WorkerConfig) -> list[dict[str, Any]]:
    combined: list[dict[str, Any]] = []
    for query in config.queries:
        logging.info("Scraping trend sources for query=%s", query)
        results = retry(
            f"scrape query '{query}'",
            lambda query=query: scrape_it_jobs_data(query, config.per_source_limit),
            max_retries=config.max_retries,
            delay_seconds=config.retry_delay_seconds,
        )
        combined.extend(results or [])

    deduped = dedupe_scraped_documents(combined)
    logging.info("Collected %s scraped documents (%s deduplicated)", len(combined), len(deduped))
    return deduped


def classify_document_trend(normalized_text_value: str) -> int:
    score = 0
    for keyword in POSITIVE_TREND_KEYWORDS:
        if keyword in normalized_text_value:
            score += 1
    for keyword in NEGATIVE_TREND_KEYWORDS:
        if keyword in normalized_text_value:
            score -= 1
    for keyword in STABLE_TREND_KEYWORDS:
        if keyword in normalized_text_value and score == 0:
            return 0
    return score


def normalize_skill_trends(
    documents: list[dict[str, Any]],
    skills: list[str],
) -> list[dict[str, Any]]:
    alias_map = build_skill_alias_map(skills)
    stats: dict[str, dict[str, Any]] = defaultdict(
        lambda: {
            "mentions": 0,
            "positive": 0,
            "negative": 0,
            "sources": set(),
        }
    )

    for item in documents:
        title = str(item.get("title") or "")
        body = str(item.get("body") or "")
        source_name = title.split("]")[0].replace("[", "").strip() if title.startswith("[") else "source"
        searchable_text = normalize_text(f"{title} {body}")
        trend_score = classify_document_trend(searchable_text)

        matched_skills: set[str] = set()
        for skill, aliases in alias_map.items():
            for alias in aliases:
                pattern = rf"(?<![a-z0-9]){re.escape(alias)}(?![a-z0-9])"
                if re.search(pattern, searchable_text):
                    matched_skills.add(skill)
                    break

        for skill in matched_skills:
            skill_stats = stats[skill]
            skill_stats["mentions"] += 1
            skill_stats["sources"].add(source_name)
            if trend_score > 0:
                skill_stats["positive"] += trend_score
            elif trend_score < 0:
                skill_stats["negative"] += abs(trend_score)

    normalized_rows: list[dict[str, Any]] = []
    for skill, item in stats.items():
        source_count = len(item["sources"])
        demand_score = min(
            100.0,
            round(
                (item["mentions"] * 18.0)
                + (source_count * 12.0)
                + (item["positive"] * 4.0)
                - (item["negative"] * 3.0),
                2,
            ),
        )
        demand_score = max(demand_score, 5.0)

        if item["positive"] > item["negative"]:
            trend = "up"
        elif item["negative"] > item["positive"]:
            trend = "down"
        else:
            trend = "stable"

        normalized_rows.append(
            {
                "skill": skill,
                "demand_score": demand_score,
                "trend": trend,
                "source_count": source_count,
            }
        )

    normalized_rows.sort(key=lambda row: (-row["demand_score"], row["skill"].lower()))
    return normalized_rows


def current_window_start(now: datetime | None = None) -> datetime:
    timestamp = now or datetime.now(timezone.utc)
    hour_bucket = (timestamp.hour // 6) * 6
    return timestamp.replace(hour=hour_bucket, minute=0, second=0, microsecond=0, tzinfo=None)


def persist_skill_trends(
    connection: psycopg2.extensions.connection,
    rows: list[dict[str, Any]],
    window_start: datetime,
) -> int:
    try:
        with connection.cursor() as cursor:
            for row in rows:
                cursor.execute(
                    UPSERT_SQL,
                    (
                        row["skill"],
                        row["demand_score"],
                        row["trend"],
                        window_start,
                        row["source_count"],
                    ),
                )
        connection.commit()
        return len(rows)
    except Exception:
        connection.rollback()
        raise


def run_once(config: WorkerConfig) -> int:
    logging.info("Trend worker run started")
    documents = scrape_documents(config)
    if not documents:
        logging.warning("No scraped documents were collected; nothing to persist.")
        return 0

    connection = retry(
        "connect to database",
        lambda: connect_db(config.database_url),
        max_retries=config.max_retries,
        delay_seconds=config.retry_delay_seconds,
    )

    try:
        ensure_skill_trends_table(connection)
        skills = fetch_skill_catalog(connection)
        if not skills:
            logging.warning("Skill catalog is empty; trend worker has nothing to normalize.")
            return 0

        normalized_rows = normalize_skill_trends(documents, skills)
        if not normalized_rows:
            logging.warning("No skill trend signals were extracted from the scraped documents.")
            return 0

        window_start = current_window_start()
        persisted = retry(
            "persist skill trends",
            lambda: persist_skill_trends(connection, normalized_rows, window_start),
            max_retries=config.max_retries,
            delay_seconds=config.retry_delay_seconds,
        )
        logging.info(
            "Persisted %s skill trend rows for window_start=%s",
            persisted,
            window_start.isoformat(sep=" "),
        )
        return persisted
    finally:
        connection.close()


def sleep_until_next_run(interval_seconds: int) -> None:
    next_run = datetime.now(timezone.utc) + timedelta(seconds=interval_seconds)
    logging.info("Sleeping until next run at %s", next_run.isoformat())
    time.sleep(interval_seconds)


def parse_args(argv: list[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=(
            "Scrape and persist normalized skill trend signals. "
            "Run once for cron, or pass --loop for an always-on worker."
        )
    )
    parser.add_argument("--loop", action="store_true", help="Run continuously every 6 hours.")
    parser.add_argument("--per-source-limit", type=int, default=5, help="Max scraped items per source/query.")
    parser.add_argument("--interval-seconds", type=int, default=21600, help="Loop interval in seconds.")
    parser.add_argument("--max-retries", type=int, default=3, help="Retry count for scrape/db operations.")
    parser.add_argument("--retry-delay-seconds", type=float, default=2.0, help="Base retry delay in seconds.")
    parser.add_argument("--log-level", default="INFO", help="Logging level.")
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv or sys.argv[1:])
    config = load_config(args)
    configure_logging(config.log_level)

    while True:
        try:
            run_once(config)
        except Exception as error:  # noqa: BLE001
            logging.exception("Trend worker run failed: %s", error)
            if not config.loop:
                return 1

        if not config.loop:
            return 0

        sleep_until_next_run(config.interval_seconds)


if __name__ == "__main__":
    raise SystemExit(main())
