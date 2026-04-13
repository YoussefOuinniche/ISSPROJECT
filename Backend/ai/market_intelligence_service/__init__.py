"""Market intelligence service package.

This package contains the orchestration and pipeline stages used to collect,
parse, normalize, and persist external labor-market signals for the app.

Modules are intentionally scaffolded with placeholder implementations so the
team can add provider-specific logic incrementally without changing the public
interfaces.
"""

from .normalizer import NormalizedMarketRecord, normalize_market_data
from .parser import ParsedMarketSignal, parse_market_documents
from .scheduler import (
    MarketIntelligenceScheduler,
    SchedulerConfig,
    refresh_trends_for_role,
    refresh_trends_for_roles,
)
from .scraper import ScrapedDocument, fetch_page, scrape_urls
from .search import SearchDocument, search_market_sources, search_role_sources
from .storage import get_global_trends, get_trends, persist_market_records, save_source, save_trends

__all__ = [
    "MarketIntelligenceScheduler",
    "NormalizedMarketRecord",
    "ParsedMarketSignal",
    "SchedulerConfig",
    "ScrapedDocument",
    "SearchDocument",
    "get_global_trends",
    "get_trends",
    "normalize_market_data",
    "parse_market_documents",
    "persist_market_records",
    "refresh_trends_for_role",
    "refresh_trends_for_roles",
    "save_source",
    "save_trends",
    "fetch_page",
    "scrape_urls",
    "search_market_sources",
    "search_role_sources",
]
