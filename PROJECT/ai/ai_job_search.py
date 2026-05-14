"""Job web search module — scrapes public job boards and enriches results with LLM."""
from __future__ import annotations

import os
import logging
import re
from typing import Any

import requests
from bs4 import BeautifulSoup
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

from services.llm_service import call_llm, build_messages

logger = logging.getLogger(__name__)

REQUEST_TIMEOUT = int(os.getenv("JOB_SEARCH_TIMEOUT", "12"))
SCRAPER_USER_AGENT = os.getenv(
    "AI_SCRAPER_USER_AGENT",
    "NexaPath-Research-Bot/1.0 (academic project - IT career research)",
)

router = APIRouter()

# ---------------------------------------------------------------------------
# Models
# ---------------------------------------------------------------------------

class JobResult(BaseModel):
    title: str
    company: str | None = None
    location: str | None = None
    description: str | None = None
    salary: str | None = None
    url: str | None = None
    source: str = "web"


class JobSearchResponse(BaseModel):
    query: str
    results: list[JobResult]
    total: int
    ai_summary: str | None = None


# ---------------------------------------------------------------------------
# Scrapers
# ---------------------------------------------------------------------------

_HEADERS = {
    "User-Agent": SCRAPER_USER_AGENT,
    "Accept": "text/html,application/json,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
}


def _safe_get(url: str, params: dict | None = None) -> requests.Response | None:
    try:
        resp = requests.get(url, headers=_HEADERS, params=params, timeout=REQUEST_TIMEOUT)
        resp.raise_for_status()
        return resp
    except Exception as exc:
        logger.warning("Job search request failed for %s: %s", url, exc)
        return None


REMOTIVE_CATEGORIES = [
    "software-dev",
    "devops",
    "qa",
    "data",
    "design",
    "product",
    "marketing",
    "all-others",
]


def scrape_remotive(role: str, limit: int = 30, categories: list[str] | None = None) -> list[JobResult]:
    """Scrape Remotive.com for remote IT jobs (JSON API).

    Hits multiple categories and merges, so we get a broader haul than the
    previous software-dev-only pull.
    """
    cats = categories or REMOTIVE_CATEGORIES
    per_cat = max(limit, 50)
    results: list[JobResult] = []

    for cat in cats:
        params: dict[str, Any] = {"category": cat, "limit": per_cat}
        if role.strip():
            params["search"] = role.strip()
        resp = _safe_get("https://remotive.com/api/remote-jobs", params=params)
        if resp is None:
            continue
        try:
            data = resp.json()
            for job in data.get("jobs", []):
                results.append(JobResult(
                    title=job.get("title", ""),
                    company=job.get("company_name"),
                    location=job.get("candidate_required_location", "Remote"),
                    description=_strip_html(job.get("description", ""))[:500],
                    salary=job.get("salary") or None,
                    url=job.get("url"),
                    source="remotive.com",
                ))
        except Exception as exc:
            logger.warning("Remotive parse failed for category %s: %s", cat, exc)

    # Dedup by URL (Remotive's stable identifier).
    seen: set[str] = set()
    unique: list[JobResult] = []
    for j in results:
        key = j.url or f"{j.title}|{j.company}"
        if key in seen:
            continue
        seen.add(key)
        unique.append(j)

    return unique[:limit]


def scrape_arbeitnow(role: str, limit: int = 10) -> list[JobResult]:
    """Scrape arbeitnow.com free job board API."""
    resp = _safe_get("https://www.arbeitnow.com/api/job-board-api", params={"q": role})
    if resp is None:
        return []
    try:
        data = resp.json()
        jobs = data.get("data", [])
        results: list[JobResult] = []
        for job in jobs[:limit]:
            results.append(JobResult(
                title=job.get("title", ""),
                company=job.get("company_name"),
                location=job.get("location", ""),
                description=_strip_html(job.get("description", ""))[:300],
                url=job.get("url"),
                source="arbeitnow.com",
            ))
        return results
    except Exception as exc:
        logger.warning("Arbeitnow parse failed: %s", exc)
        return []


def _strip_html(html: str) -> str:
    try:
        return BeautifulSoup(html, "html.parser").get_text(" ", strip=True)
    except Exception:
        return re.sub(r"<[^>]+>", " ", html)


def _generate_ai_summary(role: str, jobs: list[JobResult]) -> str | None:
    if not jobs:
        return None
    try:
        titles = [j.title for j in jobs[:5]]
        titles_text = "\n".join(f"- {t}" for t in titles)
        messages = build_messages(
            system_prompt="You are a concise job market analyst. Summarize job search results in 2 sentences max.",
            user_prompt=f"Role searched: {role}\nTop results:\n{titles_text}\n\nGive a brief market overview.",
        )
        result = call_llm("chat", messages)
        return str(result).strip() if result else None
    except Exception as exc:
        logger.warning("AI summary failed: %s", exc)
        return None


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

def _job_matches_keywords(job: JobResult, keywords: list[str]) -> bool:
    """Return True only if every keyword shows up in title, company, or description."""
    if not keywords:
        return True
    haystack = " ".join(
        filter(None, [job.title, job.company or "", job.location or "", job.description or ""]),
    ).lower()
    return all(kw in haystack for kw in keywords)


@router.get("/api/jobs/search", response_model=JobSearchResponse)
async def search_jobs(
    role: str = Query(..., description="IT role or keyword to search for"),
    limit: int = Query(default=10, ge=1, le=30),
    ai_summary: bool = Query(default=False),
) -> JobSearchResponse:
    """Search for live job postings from multiple public job boards.

    Only returns rows that mention every requested keyword in the title,
    company, location, or description so a search for "ai" never surfaces a
    plain frontend role.
    """
    query = role.strip()
    if not query:
        raise HTTPException(status_code=422, detail="role query parameter is required")

    keywords = [kw.lower() for kw in re.split(r"\s+", query) if len(kw) >= 2]

    results: list[JobResult] = []

    # Pull a wider pool than `limit` so that keyword filtering still has enough
    # to surface after dropping non-matches.
    pool = max(limit * 4, 40)
    results.extend(scrape_remotive(query, limit=pool))
    results.extend(scrape_arbeitnow(query, limit=pool))

    # Deduplicate by title+company
    seen: set[str] = set()
    unique: list[JobResult] = []
    for job in results:
        key = f"{job.title.lower()}|{(job.company or '').lower()}"
        if key not in seen:
            seen.add(key)
            unique.append(job)

    # Strict keyword filter — every keyword must show up somewhere in the row.
    filtered = [job for job in unique if _job_matches_keywords(job, keywords)]
    filtered = filtered[:limit]

    summary = _generate_ai_summary(query, filtered) if ai_summary else None

    return JobSearchResponse(
        query=query,
        results=filtered,
        total=len(filtered),
        ai_summary=summary,
    )


@router.get("/api/jobs/trending", response_model=JobSearchResponse)
async def trending_jobs(
    country: str = Query(default="global", description="Country filter (e.g. 'United States')"),
    limit: int = Query(default=15, ge=1, le=30),
) -> JobSearchResponse:
    """Get trending IT job postings."""
    trending_roles = ["AI Engineer", "Machine Learning Engineer", "DevOps Engineer",
                      "Cloud Engineer", "Backend Engineer", "Data Scientist"]

    results: list[JobResult] = []
    for role_q in trending_roles[:3]:
        results.extend(scrape_remotive(role_q, limit=5))
        if len(results) >= limit:
            break

    # Deduplicate
    seen: set[str] = set()
    unique: list[JobResult] = []
    for job in results:
        key = f"{job.title.lower()}|{(job.company or '').lower()}"
        if key not in seen:
            seen.add(key)
            unique.append(job)

    return JobSearchResponse(
        query=f"Trending IT jobs ({country})",
        results=unique[:limit],
        total=len(unique[:limit]),
    )
