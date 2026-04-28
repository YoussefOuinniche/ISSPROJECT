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


def scrape_remotive(role: str, limit: int = 10) -> list[JobResult]:
    """Scrape Remotive.io for remote IT jobs (JSON API — no scraping needed)."""
    resp = _safe_get("https://remotive.com/api/remote-jobs", params={"category": "software-dev", "limit": limit, "search": role})
    if resp is None:
        return []
    try:
        data = resp.json()
        jobs = data.get("jobs", [])
        results: list[JobResult] = []
        for job in jobs[:limit]:
            results.append(JobResult(
                title=job.get("title", ""),
                company=job.get("company_name"),
                location=job.get("candidate_required_location", "Remote"),
                description=_strip_html(job.get("description", ""))[:300],
                salary=job.get("salary"),
                url=job.get("url"),
                source="remotive.com",
            ))
        return results
    except Exception as exc:
        logger.warning("Remotive parse failed: %s", exc)
        return []


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

@router.get("/api/jobs/search", response_model=JobSearchResponse)
async def search_jobs(
    role: str = Query(..., description="IT role or keyword to search for"),
    limit: int = Query(default=10, ge=1, le=30),
    ai_summary: bool = Query(default=False),
) -> JobSearchResponse:
    """Search for live job postings from multiple public job boards."""
    if not role.strip():
        raise HTTPException(status_code=422, detail="role query parameter is required")

    results: list[JobResult] = []

    # Try multiple sources in parallel-ish (sequential for simplicity)
    results.extend(scrape_remotive(role, limit=max(limit // 2, 5)))
    results.extend(scrape_arbeitnow(role, limit=max(limit // 2, 5)))

    # Deduplicate by title+company
    seen: set[str] = set()
    unique: list[JobResult] = []
    for job in results:
        key = f"{job.title.lower()}|{(job.company or '').lower()}"
        if key not in seen:
            seen.add(key)
            unique.append(job)

    unique = unique[:limit]

    summary = _generate_ai_summary(role, unique) if ai_summary else None

    return JobSearchResponse(
        query=role,
        results=unique,
        total=len(unique),
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
