"""
Sources : 
* https://www.bls.gov/ooh/computer-and-information-technology/home.htm
* https://www.hiringlab.org/fr/
* https://www.naceweb.org/job-market/trends-and-predictions
"""

import logging # for internal logging of scraper activity and errors
import re # for regex-based HTML parsing fallbacks
import textwrap # for formatting long text blocks in console output
from typing import Optional # for type hints
import requests # for making HTTP requests to scrape data from the web
from bs4 import BeautifulSoup # for parsing HTML content and extracting text and links

# ---------------------------------------------------------------------------
# Module logger
# ---------------------------------------------------------------------------
logger = logging.getLogger("skillpulse-scraper")


# ---------------------------------------------------------------------------
# Shared HTTP configuration
# ---------------------------------------------------------------------------

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


# Low-level HTTP helper

def _get(url: str,params: Optional[dict] = None,headers: Optional[dict] = None,) -> Optional[requests.Response]: # Perform a polite, error-handled GET request
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

_BLS_OOH_URL = (
    "https://www.bls.gov/ooh/computer-and-information-technology/home.htm"
)


def scrape_bls_it_occupations() -> list[dict]: # Scrape IT occupation data from the BLS Occupational Outlook Handbook
    logger.info("Scraping BLS OOH Computer & IT Occupations page")

    response = _get(_BLS_OOH_URL)
    if response is None:
        logger.warning("BLS OOH request failed; skipping this source.")
        return []

    soup = BeautifulSoup(response.text, "html.parser")

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


_HIRING_LAB_URL = "https://www.hiringlab.org/fr/"


def scrape_hiring_lab(limit: int = 10) -> list[dict]: # Scrape research articles from the Indeed Hiring Lab French edition
    logger.info("Scraping Indeed Hiring Lab (FR): %s", _HIRING_LAB_URL)

    response = _get(_HIRING_LAB_URL)
    if response is None:
        logger.warning("Hiring Lab request failed; skipping this source.")
        return []

    soup = BeautifulSoup(response.text, "html.parser")

    results: list[dict] = []

    # The Hiring Lab page uses <article> elements for each post card.
    # Each card contains a heading with a link and an optional excerpt paragraph.
    articles = soup.find_all("article")
    if not articles:
        # Fallback: look for any <h2> or <h3> that contains a link — a common
        # pattern on CMS-driven research sites when semantic article tags are
        articles = soup.find_all(["h2", "h3"])

    for node in articles[:limit]:
        # ── Extract title and href ──────────────────────────────────────────
        link_tag = node.find("a") if node.name == "article" else (
            node.find("a") or node
        )
        if link_tag is None or not link_tag.get_text(strip=True):
            continue

        title = link_tag.get_text(strip=True)
        raw_href = link_tag.get("href", "")
        href = (
            raw_href if raw_href.startswith("http")
            else f"https://www.hiringlab.org{raw_href}"
        ) if raw_href else _HIRING_LAB_URL

        # ── Extract article excerpt (best-effort) ───────────────────────────
        excerpt = ""
        if node.name == "article":
            # Look for a <p> sibling or child that contains descriptive text
            para = node.find("p")
            if para:
                excerpt = para.get_text(strip=True)

        body = f"{title}. {excerpt}".strip(". ") if excerpt else title

        results.append(
            {"title": f"[Hiring Lab] {title}", "href": href, "body": body}
        )

    logger.info("Hiring Lab: found %d article(s)", len(results))
    return results


_NACE_URL = "https://www.naceweb.org/job-market/trends-and-predictions"

def scrape_nace_trends(limit: int = 10) -> list[dict]: # Scrape job-market trend articles from the NACE Web research page
    logger.info("Scraping NACE Web trends page: %s", _NACE_URL)

    response = _get(_NACE_URL)
    if response is None:
        logger.warning("NACE Web request failed; skipping this source.")
        return []

    soup = BeautifulSoup(response.text, "html.parser")

    results: list[dict] = []

    # NACE uses <article> or <li class="...item..."> elements for each listing.
    # Try semantic article tags first, then list-item fallback.
    nodes = soup.find_all("article") or soup.find_all(
        "li", class_=re.compile(r"item", re.I)
    )

    if not nodes:
        # Last-resort fallback: any heading that wraps or precedes a link
        nodes = soup.find_all(["h2", "h3", "h4"])

    for node in nodes[:limit]:
        # ── Title and href ──────────────────────────────────────────────────
        link_tag = node.find("a")
        if link_tag is None:
            continue

        title = link_tag.get_text(strip=True)
        if not title:
            continue

        raw_href = link_tag.get("href", "")
        href = (
            raw_href if raw_href.startswith("http")
            else f"https://www.naceweb.org{raw_href}"
        ) if raw_href else _NACE_URL

        # ── Excerpt (optional) ──────────────────────────────────────────────
        excerpt = ""
        para = node.find("p")
        if para:
            excerpt = para.get_text(strip=True)
        # ── Publication date (optional, informational) ──────────────────────
        date_tag = node.find(attrs={"class": re.compile(r"date|time", re.I)})
        date_str = date_tag.get_text(strip=True) if date_tag else ""

        body_parts = [title]
        if date_str:
            body_parts.append(f"Published: {date_str}.")
        if excerpt:
            body_parts.append(excerpt)
        body = " ".join(body_parts)

        results.append(
            {"title": f"[NACE] {title}", "href": href, "body": body}
        )

    logger.info("NACE Web: found %d article(s)", len(results))
    return results

# Orchestrator — aggregate all sources

def scrape_it_jobs_data(query: str,per_source_limit: int = 5,) -> list[dict]: # Aggregate IT job and career data from all three supported sources
    logger.info("Aggregating IT jobs data for query: %r", query)

    all_results: list[dict] = []

    # ── 1. BLS OOH ──────────────────────────────────────────────────────────
    try:
        bls = scrape_bls_it_occupations()
        all_results.extend(bls[:per_source_limit])
        logger.debug("BLS contributed %d result(s)", len(bls[:per_source_limit]))
    except Exception as exc:  # broad catch: never crash the whole pipeline
        logger.error("Unexpected error in BLS scraper: %s", exc)

    # ── 2. Indeed Hiring Lab ─────────────────────────────────────────────────
    try:
        hl = scrape_hiring_lab(limit=per_source_limit)
        all_results.extend(hl)
        logger.debug("Hiring Lab contributed %d result(s)", len(hl))
    except Exception as exc:
        logger.error("Unexpected error in Hiring Lab scraper: %s", exc)

    # ── 3. NACE Web ──────────────────────────────────────────────────────────
    try:
        nace = scrape_nace_trends(limit=per_source_limit)
        all_results.extend(nace)
        logger.debug("NACE Web contributed %d result(s)", len(nace))
    except Exception as exc:
        logger.error("Unexpected error in NACE Web scraper: %s", exc)

    logger.info(
        "IT jobs scrape complete: %d total result(s) from up to 3 sources",
        len(all_results),
    )
    return all_results


# LLM integration — pass scraped context to the local model

def answer_with_scraped_context(query: str,per_source_limit: int = 5,) -> str: # End-to-end pipeline: scrape IT jobs data, then answer *query* using the local LLM with the scraped results as context
    from backend import chat  

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
            item.get("body", ""),placeholder="…"
        )
        href = item.get("href", "")
        title = item.get("title", f"Result {idx}")
        context_parts.append(f"[{idx}] {title}\nURL: {href}\n{snippet}")

    context_text = "\n\n".join(context_parts)

    system_prompt = (
        "You are SkillPulse AI, a knowledgeable assistant specialising in IT skills, "
        "career development, and technology job market trends. "
        "You have been given real-time data scraped from three authoritative sources: "
        "the US Bureau of Labor Statistics Occupational Outlook Handbook, "
        "the Indeed Hiring Lab research blog, and "
        "the NACE Web job-market trends and predictions page. "
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
    return answer_with_scraped_context(query, per_source_limit=per_source_limit)

# CLI entry-point (for quick manual testing)

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
