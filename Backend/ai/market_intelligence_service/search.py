"""External search stage for market intelligence.

Responsibility:
- query external engines/APIs for market and job-related source URLs
- return a stable, typed search payload for downstream scraping
"""

import logging
import os
from dataclasses import dataclass
from typing import Any, Sequence
from urllib.parse import quote_plus, urlparse

import requests


logger = logging.getLogger(__name__)


TRUSTED_SOURCE_TEMPLATES: tuple[tuple[str, str, str], ...] = (
    (
        "LinkedIn Jobs",
        "LinkedIn Jobs - {role}",
        "https://www.linkedin.com/jobs/search/?keywords={query}",
    ),
    (
        "Indeed",
        "Indeed - {role} Jobs",
        "https://www.indeed.com/jobs?q={query}",
    ),
    (
        "Glassdoor",
        "Glassdoor - {role} Jobs",
        "https://www.glassdoor.com/Job/jobs.htm?sc.keyword={query}",
    ),
    (
        "Monster",
        "Monster - {role} Jobs",
        "https://www.monster.com/jobs/search/?q={query}",
    ),
    (
        "Wellfound",
        "Wellfound - {role} Jobs",
        "https://wellfound.com/jobs?query={query}",
    ),
    (
        "Remote OK",
        "Remote OK - {role}",
        "https://remoteok.com/remote-{query_slug}-jobs",
    ),
    (
        "BLS OOH",
        "BLS Occupational Outlook - {role}",
        "https://www.bls.gov/ooh/search.htm?q={query}",
    ),
)

BLOCKLIST_TERMS: tuple[str, ...] = (
    "/about",
    "/privacy",
    "/terms",
    "/contact",
    "/help",
    "/faq",
    "/support",
    "/login",
    "/signin",
    "/signup",
    "/register",
    "cookie",
    "advertis",
)

GENERIC_RELEVANCE_TERMS: tuple[str, ...] = (
    "job",
    "jobs",
    "career",
    "hiring",
    "salary",
    "skills",
    "skill",
    "requirements",
    "market",
    "trend",
)


@dataclass(slots=True)
class SearchDocument:
    """Represents one search hit that should be scraped next."""

    title: str
    url: str
    source: str
    snippet: str = ""


def search_role_sources(role: str, *, limit: int = 10) -> list[dict[str, str]]:
    """Return relevant URL seeds for a role.

    The function is intentionally simple and deterministic by default:
    it builds links from trusted source templates and optionally augments
    them using configured Bing/Google search APIs.

    Args:
        role: Target role, for example ``AI Engineer``.
        limit: Maximum number of results to return.

    Returns:
        List of objects in the shape:
        ``[{"title": "...", "url": "...", "source": "..."}]``.
    """

    clean_role = " ".join(role.split()).strip()
    if not clean_role:
        logger.warning("search_role_sources called with empty role")
        return []

    limit = max(1, min(limit, 100))
    logger.info("Searching role sources", extra={"role": clean_role, "limit": limit})

    results: list[dict[str, str]] = []
    results.extend(_trusted_source_results(clean_role))
    results.extend(_optional_api_results(clean_role, limit=limit))

    filtered = _filter_relevant_results(clean_role, _dedupe_by_url(results))
    final_results = filtered[:limit]

    logger.info(
        "Role source search finished",
        extra={
            "role": clean_role,
            "result_count": len(final_results),
            "had_api_results": len(results) > len(TRUSTED_SOURCE_TEMPLATES),
        },
    )
    return final_results


def _trusted_source_results(role: str) -> list[dict[str, str]]:
    query = quote_plus(role)
    query_slug = "-".join(part for part in role.lower().split() if part)

    results: list[dict[str, str]] = []
    for source, title_template, url_template in TRUSTED_SOURCE_TEMPLATES:
        url = url_template.format(query=query, query_slug=query_slug)
        title = title_template.format(role=role)
        results.append({"title": title, "url": url, "source": source})
    return results


def _optional_api_results(role: str, *, limit: int) -> list[dict[str, str]]:
    api_results: list[dict[str, str]] = []
    bing = _search_bing(role=role, limit=limit)
    if bing:
        api_results.extend(bing)
    else:
        google = _search_google(role=role, limit=limit)
        api_results.extend(google)
    return api_results


def _search_bing(role: str, *, limit: int) -> list[dict[str, str]]:
    api_key = os.getenv("BING_SEARCH_API_KEY", "").strip()
    endpoint = os.getenv("BING_SEARCH_ENDPOINT", "https://api.bing.microsoft.com/v7.0/search").strip()
    if not api_key:
        return []

    query = f"{role} jobs skills requirements"
    params = {"q": query, "count": min(limit, 50), "responseFilter": "Webpages"}
    headers = {"Ocp-Apim-Subscription-Key": api_key}

    try:
        response = requests.get(endpoint, params=params, headers=headers, timeout=8)
        response.raise_for_status()
        payload: dict[str, Any] = response.json()
    except Exception as exc:  # noqa: BLE001
        logger.warning("Bing role search failed: %s", exc)
        return []

    values = payload.get("webPages", {}).get("value", [])
    results: list[dict[str, str]] = []
    for item in values:
        title = str(item.get("name", "")).strip()
        url = str(item.get("url", "")).strip()
        if not title or not url:
            continue
        results.append({"title": title, "url": url, "source": "Bing"})
    return results


def _search_google(role: str, *, limit: int) -> list[dict[str, str]]:
    api_key = os.getenv("GOOGLE_API_KEY", "").strip()
    cx = os.getenv("GOOGLE_CSE_ID", "").strip()
    if not api_key or not cx:
        return []

    endpoint = "https://www.googleapis.com/customsearch/v1"
    query = f"{role} jobs skills requirements"
    params = {"q": query, "key": api_key, "cx": cx, "num": min(limit, 10)}

    try:
        response = requests.get(endpoint, params=params, timeout=8)
        response.raise_for_status()
        payload: dict[str, Any] = response.json()
    except Exception as exc:  # noqa: BLE001
        logger.warning("Google CSE role search failed: %s", exc)
        return []

    items = payload.get("items", [])
    results: list[dict[str, str]] = []
    for item in items:
        title = str(item.get("title", "")).strip()
        url = str(item.get("link", "")).strip()
        if not title or not url:
            continue
        results.append({"title": title, "url": url, "source": "Google CSE"})
    return results


def _filter_relevant_results(role: str, results: Sequence[dict[str, str]]) -> list[dict[str, str]]:
    role_terms = [term for term in role.lower().split() if len(term) > 2]
    relevance_terms = set(role_terms) | set(GENERIC_RELEVANCE_TERMS)

    filtered: list[dict[str, str]] = []
    for item in results:
        title = item.get("title", "").strip()
        url = item.get("url", "").strip()
        source = item.get("source", "").strip() or "unknown"
        if not title or not url:
            continue

        normalized = f"{title} {url}".lower()
        if any(term in normalized for term in BLOCKLIST_TERMS):
            continue
        if not any(term in normalized for term in relevance_terms):
            continue

        parsed = urlparse(url)
        if parsed.scheme not in {"http", "https"}:
            continue

        filtered.append({"title": title, "url": url, "source": source})
    return filtered


def _dedupe_by_url(results: Sequence[dict[str, str]]) -> list[dict[str, str]]:
    seen: set[str] = set()
    deduped: list[dict[str, str]] = []
    for item in results:
        url = item.get("url", "").strip().lower()
        if not url or url in seen:
            continue
        seen.add(url)
        deduped.append(item)
    return deduped


def search_market_sources(query: str, *, limit: int = 10) -> Sequence[SearchDocument]:
    """Search external sources for market intelligence material.

    Args:
        query: Search phrase, for example a role + location + timeframe.
        limit: Maximum number of hits to return.

    Returns:
        A sequence of `SearchDocument` items suitable for the scraping stage.

    This wrapper keeps the stage-oriented interface while delegating to the
    deterministic role source search implementation.
    """

    raw_results = search_role_sources(role=query, limit=limit)
    return [
        SearchDocument(
            title=item["title"],
            url=item["url"],
            source=item["source"],
            snippet="",
        )
        for item in raw_results
    ]
