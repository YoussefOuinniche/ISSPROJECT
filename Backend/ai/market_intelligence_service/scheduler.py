"""Scheduling and orchestration for market intelligence jobs.

Responsibility:
- run search -> scrape -> parse -> normalize -> store pipeline on schedule
- provide entry points for app startup hooks and on-demand refreshes
"""

from __future__ import annotations

from collections import Counter
from dataclasses import dataclass
import logging
from typing import Any

from .normalizer import normalize_market_data
from .parser import parse_market_documents
from .scraper import scrape_urls
from .search import search_market_sources
from .storage import save_source, save_trends


logger = logging.getLogger(__name__)


@dataclass(slots=True)
class SchedulerConfig:
    """Configuration for periodic market-intelligence refresh."""

    interval_minutes: int = 60
    enabled: bool = True


class MarketIntelligenceScheduler:
    """Coordinates periodic execution of the market-intelligence pipeline."""

    def __init__(self, config: SchedulerConfig | None = None) -> None:
        self.config = config or SchedulerConfig()
        self._running = False

    def start(self) -> None:
        """Start the scheduler loop (placeholder runtime hook).

        This method currently marks the scheduler as active. A real recurring
        runtime loop can be attached later without changing the API.
        """

        self._running = True
        logger.info("MarketIntelligenceScheduler started")

    def stop(self) -> None:
        """Stop the scheduler loop gracefully."""

        self._running = False
        logger.info("MarketIntelligenceScheduler stopped")

    def run_once(self, role: str) -> dict[str, Any]:
        """Execute one full market-intelligence pipeline cycle for a role."""

        return refresh_trends_for_role(role)


def refresh_trends_for_role(role: str, *, search_limit: int = 20) -> dict[str, Any]:
    """Run market-intelligence pipeline and persist trends for one role.

    Flow:
        search -> fetch -> parse -> normalize -> store
    """

    clean_role = " ".join(str(role).split()).strip()
    if not clean_role:
        return {
            "success": False,
            "role": "",
            "error": "Role is required.",
        }

    logger.info("Market refresh started for role=%s", clean_role)

    try:
        search_results = list(search_market_sources(clean_role, limit=search_limit))
        logger.info("Market refresh stage=search role=%s count=%s", clean_role, len(search_results))

        for result in search_results:
            save_source(clean_role, result.url, title=result.title, source=result.source)

        scraped_documents = list(scrape_urls(search_results))
        logger.info("Market refresh stage=fetch role=%s count=%s", clean_role, len(scraped_documents))

        parsed_signals = list(parse_market_documents(scraped_documents))
        logger.info("Market refresh stage=parse role=%s count=%s", clean_role, len(parsed_signals))

        normalized = list(normalize_market_data(parsed_signals))
        logger.info("Market refresh stage=normalize role=%s count=%s", clean_role, len(normalized))

        source_counter: Counter[str] = Counter()
        for signal in parsed_signals:
            for record in normalize_market_data([signal]):
                source_counter[record.skill] += 1

        trend_rows = [
            {
                "skill": record.skill,
                "frequency": int(record.frequency),
                "category": record.category,
                "source_count": int(source_counter.get(record.skill, record.frequency)),
            }
            for record in normalized
        ]

        saved_count = save_trends(clean_role, trend_rows)
        logger.info("Market refresh stage=store role=%s saved=%s", clean_role, saved_count)

        return {
            "success": True,
            "role": clean_role,
            "search_count": len(search_results),
            "fetched_count": len(scraped_documents),
            "parsed_count": len(parsed_signals),
            "normalized_count": len(normalized),
            "saved_count": saved_count,
        }
    except Exception as exc:  # noqa: BLE001
        logger.exception("Market refresh failed for role=%s: %s", clean_role, exc)
        return {
            "success": False,
            "role": clean_role,
            "error": str(exc),
        }


def refresh_trends_for_roles(roles: list[str], *, search_limit: int = 20) -> dict[str, Any]:
    """Callable batch refresh path for scheduled execution.

    This function is intended to be called by a future daily scheduler.
    """

    cleaned_roles = [" ".join(str(role).split()).strip() for role in roles if str(role).strip()]
    if not cleaned_roles:
        return {
            "success": False,
            "error": "No roles provided for scheduled refresh.",
            "roles": [],
        }

    results: list[dict[str, Any]] = []
    success_count = 0
    for role in cleaned_roles:
        result = refresh_trends_for_role(role, search_limit=search_limit)
        if result.get("success"):
            success_count += 1
        results.append(result)

    return {
        "success": success_count == len(cleaned_roles),
        "roles": cleaned_roles,
        "success_count": success_count,
        "failure_count": len(cleaned_roles) - success_count,
        "results": results,
    }
