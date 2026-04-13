"""Web scraping stage for market intelligence.

Responsibility:
- fetch raw HTML content from URLs returned by search
- provide deterministic, structured fetching output for downstream parsing
"""

import logging
import time
from dataclasses import dataclass
from urllib.parse import urlparse
from typing import Sequence

import requests

from .search import SearchDocument


logger = logging.getLogger(__name__)

DEFAULT_TIMEOUT_SECONDS = 8
DEFAULT_MAX_RETRIES = 2
MAX_HTML_CHARS = 2_000_000

DEFAULT_HEADERS = {
    "User-Agent": "SkillPulse-MarketIntel/1.0 (+https://skillpulse.local)",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
}

RETRYABLE_STATUS_CODES = {408, 425, 429, 500, 502, 503, 504}


@dataclass(slots=True)
class ScrapedDocument:
    """Represents raw HTML and metadata fetched from one URL."""

    url: str
    title: str
    source: str
    body_text: str


def fetch_page(url: str) -> str:
    """Fetch raw HTML content for a single URL.

    The function is intentionally fetch-only and does not parse or transform
    semantic content. It safely returns an empty string on failures.

    Args:
        url: Fully-qualified page URL.

    Returns:
        Raw HTML as a string, or an empty string if fetch fails.
    """

    parsed = urlparse(url)
    if parsed.scheme not in {"http", "https"} or not parsed.netloc:
        logger.warning("Skipping invalid URL in fetch_page: %s", url)
        return ""

    for attempt in range(DEFAULT_MAX_RETRIES + 1):
        try:
            response = requests.get(
                url,
                headers=DEFAULT_HEADERS,
                timeout=DEFAULT_TIMEOUT_SECONDS,
                allow_redirects=True,
            )

            if response.status_code in RETRYABLE_STATUS_CODES:
                raise requests.HTTPError(
                    f"Retryable status code {response.status_code}",
                    response=response,
                )

            response.raise_for_status()

            html = response.text or ""
            if len(html) > MAX_HTML_CHARS:
                logger.info(
                    "Truncating oversized HTML response",
                    extra={"url": url, "length": len(html), "max": MAX_HTML_CHARS},
                )
                html = html[:MAX_HTML_CHARS]

            return html
        except (requests.Timeout, requests.ConnectionError, requests.HTTPError) as exc:
            if attempt < DEFAULT_MAX_RETRIES:
                backoff_seconds = 0.5 * (attempt + 1)
                logger.warning(
                    "fetch_page retry",
                    extra={
                        "url": url,
                        "attempt": attempt + 1,
                        "max_attempts": DEFAULT_MAX_RETRIES + 1,
                        "error": str(exc),
                    },
                )
                time.sleep(backoff_seconds)
                continue

            logger.error("fetch_page failed after retries: %s", url)
            return ""
        except requests.RequestException as exc:
            logger.error("fetch_page request error for %s: %s", url, exc)
            return ""
        except Exception as exc:  # noqa: BLE001
            logger.exception("Unexpected fetch_page failure for %s: %s", url, exc)
            return ""

    return ""


def scrape_urls(search_results: Sequence[SearchDocument]) -> Sequence[ScrapedDocument]:
    """Fetch raw HTML for each search result URL.

    Args:
        search_results: URLs and metadata from the search stage.

    Returns:
        A sequence of `ScrapedDocument` with `body_text` storing raw HTML.
    """

    fetched: list[ScrapedDocument] = []

    for result in search_results:
        html = fetch_page(result.url)
        if not html:
            continue

        fetched.append(
            ScrapedDocument(
                url=result.url,
                title=result.title,
                source=result.source,
                body_text=html,
            )
        )

    return fetched
