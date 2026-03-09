"""
scraper.py — IT Jobs & Career Research Pipeline
=================================================
This is the main pipeline module.  It gathers the latest IT job market data
from three public, ethically-accessible sources, then passes that context to
the local LLM (via backend.chat) to answer the user's query.

Data sources:

  1. Bureau of Labor Statistics – Computer & IT Occupations
     URL  : https://www.bls.gov/ooh/computer-and-information-technology/home.htm
     Type : BeautifulSoup HTML scraping
     ToS  : U.S. government public-domain work (17 U.S.C. § 105) — no
            restrictions on programmatic access.

  2. Remotive.io public REST API
     URL  : https://remotive.com/api/remote-jobs
     Type : JSON API (no credentials required)
     ToS  : Remotive provides this endpoint specifically for public use.

  3. Hacker News "Who is Hiring?" (official Firebase + Algolia APIs)
     URL  : https://hacker-news.firebaseio.com/v1/ & https://hn.algolia.com/api/
     Type : JSON APIs (no credentials required)
     ToS  : Both APIs are explicitly published for public consumption.

All HTTP requests include a descriptive User-Agent and a configurable timeout.
Each source is scraped independently; an error in one source does not prevent
results from the others.

Pipeline:
    scrape_it_jobs_data(query)          — aggregate raw results from all sources
    answer_with_scraped_context(query)  — scrape + pass context to local LLM
    main(query)                         — top-level entry point (same as above)

Quick usage:
-----------
    from scraper import main

    answer = main("What Python skills are most in demand in 2025?")
    print(answer)
"""

import logging
import re
import textwrap
import time
from typing import Optional

import requests
from bs4 import BeautifulSoup

# ---------------------------------------------------------------------------
# Module logger
# ---------------------------------------------------------------------------
logger = logging.getLogger("skillpulse-scraper")


# ---------------------------------------------------------------------------
# Shared HTTP configuration
# ---------------------------------------------------------------------------

# A descriptive User-Agent is considered best practice for bots so that
# website operators can identify and contact the requester if needed.
_HEADERS: dict[str, str] = {
    "User-Agent": (
        "SkillPulse-Research-Bot/1.0 "
        "(academic project - IT career research; "
        "source: github.com/skillpulse)"
    ),
    "Accept": "text/html,application/json,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
}

# Seconds to wait before giving up on a single HTTP request
_REQUEST_TIMEOUT: int = 15

# Polite delay (seconds) between consecutive Firebase API calls in the HN scraper
_HN_COMMENT_DELAY: float = 0.15


# ---------------------------------------------------------------------------
# Low-level HTTP helper
# ---------------------------------------------------------------------------


def _get(
    url: str,
    params: Optional[dict] = None,
    headers: Optional[dict] = None,
) -> Optional[requests.Response]:
    """
    Perform a polite, error-handled GET request.

    Args:
        url:     Target URL.
        params:  Optional query-string parameters.
        headers: Optional extra headers to merge with the default set.

    Returns:
        A :class:`requests.Response` on success, ``None`` on any failure.
    """
    merged_headers = dict(_HEADERS)
    if headers:
        merged_headers.update(headers)

    try:
        response = requests.get(
            url,
            headers=merged_headers,
            params=params,
            timeout=_REQUEST_TIMEOUT,
        )
        response.raise_for_status()
        return response
    except requests.exceptions.Timeout:
        logger.warning("Request timed-out: %s", url)
    except requests.exceptions.HTTPError as exc:
        logger.warning(
            "HTTP %s error for: %s", exc.response.status_code, url
        )
    except requests.exceptions.ConnectionError as exc:
        logger.error("Connection error for %s: %s", url, exc)
    except requests.exceptions.RequestException as exc:
        logger.error("Request failed for %s: %s", url, exc)

    return None


def _strip_html(html: str) -> str:
    """
    Remove all HTML tags from *html* and collapse whitespace.

    Args:
        html: Raw HTML string.

    Returns:
        Plain-text string with normalised whitespace.
    """
    text = BeautifulSoup(html, "html.parser").get_text(separator=" ")
    return re.sub(r"\s+", " ", text).strip()


# ===========================================================================
# Source 1 — Bureau of Labor Statistics (BLS) Occupational Outlook Handbook
# ===========================================================================

_BLS_OOH_URL = (
    "https://www.bls.gov/ooh/computer-and-information-technology/home.htm"
)


def scrape_bls_it_occupations() -> list[dict]:
    """
    Scrape IT occupation data from the BLS Occupational Outlook Handbook.

    The BLS OOH Computer & IT page lists all tracked IT occupations with:
      - Required entry-level education
      - Median annual pay
      - Projected 10-year job-growth outlook

    This is public-domain U.S. government data — no ToS restrictions.

    Returns:
        List of dicts, each with keys ``title``, ``href``, and ``body``.
        Returns an empty list if the page structure has changed or the
        request fails.
    """
    logger.info("Scraping BLS OOH Computer & IT Occupations page")

    response = _get(_BLS_OOH_URL)
    if response is None:
        logger.warning("BLS OOH request failed; skipping this source.")
        return []

    soup = BeautifulSoup(response.text, "html.parser")

    # The OOH page contains a table whose rows describe each occupation.
    # Typical column order: Occupation | Education | Pay | Outlook
    table = soup.find("table")
    if not table:
        logger.warning(
            "BLS page structure may have changed — occupation table not found."
        )
        return []

    results: list[dict] = []
    rows = table.find_all("tr")

    for row in rows[1:]:  # skip the header row
        cells = row.find_all("td")
        if len(cells) < 2:
            continue

        # ── Occupation name & link ──────────────────────────────────────────
        occ_cell = cells[0]
        occ_name = occ_cell.get_text(strip=True)

        link_tag = occ_cell.find("a")
        occ_href = ""
        if link_tag and link_tag.get("href"):
            raw_href = link_tag["href"]
            occ_href = (
                raw_href
                if raw_href.startswith("http")
                else f"https://www.bls.gov{raw_href}"
            )

        # ── Supporting columns (gracefully tolerate missing columns) ────────
        education = cells[1].get_text(strip=True) if len(cells) > 1 else "N/A"
        median_pay = cells[2].get_text(strip=True) if len(cells) > 2 else "N/A"
        job_outlook = cells[3].get_text(strip=True) if len(cells) > 3 else "N/A"

        body = (
            f"Occupation: {occ_name}. "
            f"Entry-level education required: {education}. "
            f"Median annual pay: {median_pay}. "
            f"10-year job outlook: {job_outlook}."
        )

        results.append(
            {"title": f"[BLS OOH] {occ_name}", "href": occ_href, "body": body}
        )

    logger.info("BLS OOH: found %d occupation(s)", len(results))
    return results


# ===========================================================================
# Source 2 — Remotive.io public REST API
# ===========================================================================

_REMOTIVE_API_URL = "https://remotive.com/api/remote-jobs"

# Maximum characters to include from a job description
_REMOTIVE_DESC_LIMIT = 500


def scrape_remotive_jobs(keyword: str = "", limit: int = 10) -> list[dict]:
    """
    Fetch remote IT job listings from the Remotive.io public API.

    Remotive provides a free, unauthenticated REST API for remote jobs.
    Full API documentation: https://remotive.com/api/remote-jobs

    The ``software-dev`` category covers software engineering, DevOps,
    data engineering, and related IT roles.

    Args:
        keyword: Optional keyword forwarded to the API's ``search`` param
                 to pre-filter results server-side.
        limit:   Maximum number of job records to return.

    Returns:
        List of dicts with keys ``title``, ``href``, and ``body``.
        Body combines company name, required skills/tags, and a plain-text
        snippet of the job description.
    """
    logger.info(
        "Fetching Remotive jobs — keyword=%r, limit=%d", keyword, limit
    )

    # Over-fetch to allow client-side deduplication / additional filtering
    params: dict = {"category": "software-dev", "limit": limit * 3}
    if keyword:
        params["search"] = keyword

    response = _get(_REMOTIVE_API_URL, params=params)
    if response is None:
        logger.warning("Remotive API request failed; skipping this source.")
        return []

    try:
        data = response.json()
        raw_jobs: list[dict] = data.get("jobs", [])
    except ValueError:
        logger.error("Remotive API returned a non-JSON response.")
        return []

    results: list[dict] = []
    for job in raw_jobs[:limit]:
        title = job.get("title", "Untitled Position")
        company = job.get("company_name", "Unknown Company")
        url = job.get("url", "")
        tags = ", ".join(job.get("tags", []))

        # Strip HTML from the description field before including it
        raw_desc = job.get("description", "")
        description = _strip_html(raw_desc)[:_REMOTIVE_DESC_LIMIT]

        body = (
            f"{company} is hiring for '{title}'. "
            f"Required skills / tags: {tags or 'not specified'}. "
            f"{description}"
        ).strip()

        results.append(
            {
                "title": f"[Remotive] {title} — {company}",
                "href": url,
                "body": body,
            }
        )

    logger.info("Remotive: returned %d job listing(s)", len(results))
    return results


# ===========================================================================
# Source 3 — Hacker News "Who is Hiring?" (Firebase + Algolia public APIs)
# ===========================================================================

_HN_ALGOLIA_SEARCH_URL = "https://hn.algolia.com/api/v1/search"
_HN_FIREBASE_ITEM_URL = "https://hacker-news.firebaseio.com/v1/item/{}.json"

# Maximum comment IDs to inspect when searching for keyword matches.
# Increasing this finds more matches at the cost of more API calls.
_HN_CANDIDATE_LIMIT = 100

# Maximum snippet length (characters) for a single HN job post
_HN_SNIPPET_LIMIT = 600


def _find_latest_hn_hiring_thread_id() -> Optional[int]:
    """
    Use the Algolia HN search API to locate the most recent
    "Ask HN: Who is Hiring?" thread.

    Returns:
        Integer item ID of the latest thread, or ``None`` on failure.
    """
    params = {
        "query": "Ask HN: Who is Hiring?",
        "tags": "ask_hn",
        "hitsPerPage": 1,
    }
    response = _get(_HN_ALGOLIA_SEARCH_URL, params=params)
    if response is None:
        return None

    try:
        hits = response.json().get("hits", [])
        if not hits:
            logger.warning("Algolia HN search returned zero hits.")
            return None
        raw_id = hits[0].get("objectID")
        return int(raw_id) if raw_id else None
    except (ValueError, TypeError, KeyError) as exc:
        logger.error("Failed to parse Algolia HN response: %s", exc)
        return None


def scrape_hn_hiring(keyword: str = "", limit: int = 10) -> list[dict]:
    """
    Fetch job posts from the latest "Ask HN: Who is Hiring?" thread.

    Uses two official, publicly documented APIs:
      - Hacker News Firebase API  (https://github.com/HackerNews/API)
      - Algolia HN search API     (https://hn.algolia.com/api)

    A short polite delay (_HN_COMMENT_DELAY) is inserted between each
    Firebase item request to avoid hammering the API.

    Args:
        keyword: Case-insensitive keyword to filter post text.  Pass an
                 empty string to return posts without filtering.
        limit:   Maximum number of matching posts to return.

    Returns:
        List of dicts with keys ``title``, ``href``, and ``body``.
    """
    logger.info("Fetching HN 'Who is Hiring?' posts — keyword=%r", keyword)

    thread_id = _find_latest_hn_hiring_thread_id()
    if thread_id is None:
        logger.warning("Could not locate the latest HN hiring thread.")
        return []

    logger.debug("Latest HN hiring thread ID: %d", thread_id)

    # Fetch the thread item to obtain its top-level comment IDs ("kids")
    thread_response = _get(_HN_FIREBASE_ITEM_URL.format(thread_id))
    if thread_response is None:
        logger.warning("Failed to fetch HN thread %d.", thread_id)
        return []

    try:
        thread_data = thread_response.json()
        kid_ids: list[int] = thread_data.get("kids", [])
    except ValueError:
        logger.error("Non-JSON response for HN thread %d.", thread_id)
        return []

    results: list[dict] = []
    kw_lower = keyword.strip().lower()

    # Iterate over comments; stop once we have enough matching results
    for kid_id in kid_ids[:_HN_CANDIDATE_LIMIT]:
        if len(results) >= limit:
            break

        time.sleep(_HN_COMMENT_DELAY)  # polite delay between API calls

        comment_response = _get(_HN_FIREBASE_ITEM_URL.format(kid_id))
        if comment_response is None:
            continue

        try:
            comment = comment_response.json()
        except ValueError:
            continue

        # Skip deleted / dead comments
        if comment.get("deleted") or comment.get("dead"):
            continue

        raw_text: str = comment.get("text", "") or ""
        plain_text = _strip_html(raw_text)

        # Apply optional keyword filter
        if kw_lower and kw_lower not in plain_text.lower():
            continue

        item_url = f"https://news.ycombinator.com/item?id={kid_id}"
        snippet = plain_text[:_HN_SNIPPET_LIMIT]
        if len(plain_text) > _HN_SNIPPET_LIMIT:
            snippet += "…"

        results.append(
            {
                "title": f"[HN Who's Hiring] Post #{kid_id}",
                "href": item_url,
                "body": snippet,
            }
        )

    logger.info("HN hiring: returned %d post(s)", len(results))
    return results


# ===========================================================================
# Orchestrator — aggregate all sources
# ===========================================================================


def scrape_it_jobs_data(
    query: str,
    per_source_limit: int = 5,
) -> list[dict]:
    """
    Aggregate IT job and career data from all three supported sources.

    Each source is queried independently.  A failure in one source does not
    prevent results from the remaining sources.

    Sources (queried in order):
      1. BLS OOH  — authoritative US government occupational outlook data
      2. Remotive — current remote IT job listings (public API)
      3. HN       — community-sourced hiring posts (official API)

    Args:
        query:            The user's search query, used to filter Remotive
                          and HN results.
        per_source_limit: Maximum number of results to collect per source.

    Returns:
        Combined, ordered list of result dicts.  Each dict has the keys
        ``title`` (str), ``href`` (str), and ``body`` (str).
        Returns an empty list only if all three sources fail.
    """
    logger.info("Aggregating IT jobs data for query: %r", query)

    all_results: list[dict] = []

    # ── 1. BLS OOH ──────────────────────────────────────────────────────────
    # BLS data is not query-specific but is always relevant for IT career
    # questions; include a capped number of rows.
    try:
        bls = scrape_bls_it_occupations()
        all_results.extend(bls[:per_source_limit])
        logger.debug("BLS contributed %d result(s)", len(bls[:per_source_limit]))
    except Exception as exc:  # broad catch to never crash the whole pipeline
        logger.error("Unexpected error in BLS scraper: %s", exc)

    # ── 2. Remotive.io ──────────────────────────────────────────────────────
    try:
        remotive = scrape_remotive_jobs(keyword=query, limit=per_source_limit)
        all_results.extend(remotive)
        logger.debug("Remotive contributed %d result(s)", len(remotive))
    except Exception as exc:
        logger.error("Unexpected error in Remotive scraper: %s", exc)

    # ── 3. Hacker News ──────────────────────────────────────────────────────
    try:
        hn = scrape_hn_hiring(keyword=query, limit=per_source_limit)
        all_results.extend(hn)
        logger.debug("HN contributed %d result(s)", len(hn))
    except Exception as exc:
        logger.error("Unexpected error in HN scraper: %s", exc)

    logger.info(
        "IT jobs scrape complete: %d total result(s) from up to 3 sources",
        len(all_results),
    )
    return all_results


# ===========================================================================
# LLM integration — pass scraped context to the local model
# ===========================================================================

# Maximum characters to include per result body in the LLM prompt
_CONTEXT_SNIPPET_LIMIT = 600


def answer_with_scraped_context(
    query: str,
    per_source_limit: int = 5,
) -> str:
    """
    End-to-end pipeline: scrape IT jobs data, then answer *query* using the
    local LLM with the scraped results as context.

    Steps:
      1. Call :func:`scrape_it_jobs_data` to gather results from BLS, Remotive,
         and Hacker News.
      2. Format the results into a numbered context block.
      3. Send the context + query to the LLM via ``backend.chat``.

    Args:
        query:            The user's question or search string.
        per_source_limit: Maximum results per individual source.

    Returns:
        LLM-generated answer string, or a plain message when no data was found.
    """
    # Import here to avoid a circular import at module load time
    # (backend.py imports nothing from scraper.py at the top level)
    from backend import chat  # noqa: PLC0415

    if not query or not query.strip():
        return "Please provide a non-empty query."

    logger.info("Starting scraper pipeline for query: %r", query)

    results = scrape_it_jobs_data(query, per_source_limit=per_source_limit)

    if not results:
        return (
            "I could not retrieve IT job market data from any source right now. "
            "Please try again later."
        )

    # Build a numbered context block from the scraped results
    context_parts: list[str] = []
    for idx, item in enumerate(results, start=1):
        snippet = textwrap.shorten(
            item.get("body", ""), width=_CONTEXT_SNIPPET_LIMIT, placeholder="…"
        )
        href = item.get("href", "")
        title = item.get("title", f"Result {idx}")
        context_parts.append(f"[{idx}] {title}\nURL: {href}\n{snippet}")

    context_text = "\n\n".join(context_parts)

    system_prompt = (
        "You are SkillPulse AI, a knowledgeable assistant specialising in IT skills, "
        "career development, and technology job market trends. "
        "You have been given real-time data scraped from authoritative sources: "
        "the US Bureau of Labor Statistics, Remotive.io job listings, and "
        "Hacker News 'Who is Hiring?' posts. "
        "Answer the user's question using this data. "
        "Cite the source title or URL where relevant, and acknowledge uncertainty "
        "if the data does not fully cover the question."
    )

    user_prompt = (
        f"Scraped IT job market context:\n\n{context_text}\n\n"
        f"Question: {query}\n\n"
        "Please provide a clear, accurate, and helpful answer based on the context above."
    )

    logger.info(
        "Sending %d scraped result(s) to LLM for query: %r", len(results), query
    )
    return chat(system_prompt, user_prompt)


def main(query: str, per_source_limit: int = 5) -> str:
    """
    Top-level entry point for the IT jobs research pipeline.

    Equivalent to :func:`answer_with_scraped_context`; exposed as ``main``
    for a familiar import pattern and for use by ``backend.py``.

    Args:
        query:            The user's question or search string.
        per_source_limit: Maximum results per individual data source.

    Returns:
        LLM-generated answer string.
    """
    return answer_with_scraped_context(query, per_source_limit=per_source_limit)


# ---------------------------------------------------------------------------
# CLI entry-point (for quick manual testing)
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    import sys

    logging.basicConfig(
        level=logging.INFO, format="%(levelname)s | %(name)s | %(message)s"
    )

    search_query = " ".join(sys.argv[1:]) if len(sys.argv) > 1 else "Python developer"
    print(f"\nQuerying IT jobs pipeline for: {search_query!r}\n")

    answer = main(search_query)

    print("\n" + "=" * 70)
    print("ANSWER")
    print("=" * 70)
    print(answer)
