import os # for path handling and env vars
import json # for parsing LLM responses
import logging # for logging
import time # for lightweight retry backoff
import textwrap # for formatting long text blocks
from typing import List, Optional # for type hints
from contextlib import asynccontextmanager # for FastAPI lifespan management
import psycopg2 # for PostgreSQL database access
import psycopg2.extras # for dict cursor
from dotenv import load_dotenv # for loading .env configuration
from fastapi import FastAPI, HTTPException # for API framework and error handling
from fastapi.middleware.cors import CORSMiddleware # for CORS handling
from pydantic import BaseModel, Field # for request validation
from openai import OpenAI, APIConnectionError, APITimeoutError # for Ollama
import uvicorn # for running the app
import re as _re # for regex-based JSON cleanup

# Configuration
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), "..", ".env"))

def _normalize_ollama_base_url(raw_url: str) -> str:
    cleaned = (raw_url or "").strip().rstrip("/")
    if not cleaned:
        return "http://localhost:11434/v1"
    return cleaned if cleaned.endswith("/v1") else f"{cleaned}/v1"


OLLAMA_BASE_URL = _normalize_ollama_base_url(
    os.getenv("OLLAMA_BASE_URL", "http://localhost:11434/v1")
)
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "gemma3:1b")
TEMPERATURE = float(os.getenv("TEMPERATURE", "0.7"))
TIMEOUT = int(os.getenv("TIMEOUT", "300"))
DATABASE_URL = os.getenv(
    "DATABASE_URL", "postgresql://postgres:postgres@127.0.0.1:54322/postgres"
)
API_HOST = os.getenv("API_HOST", "0.0.0.0")
API_PORT = int(os.getenv("API_PORT", "8000"))

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("skillpulse-ai")

def _candidate_ollama_base_urls() -> tuple[str, ...]:
    candidates = [
        OLLAMA_BASE_URL,
        "http://127.0.0.1:11434/v1",
        "http://localhost:11434/v1",
    ]
    normalized = [_normalize_ollama_base_url(url) for url in candidates]
    return tuple(dict.fromkeys(normalized))


def _make_llm_client(base_url: str) -> OpenAI:
    return OpenAI(base_url=base_url, api_key="ollama")


def _list_models_with_failover():
    global llm, OLLAMA_BASE_URL

    last_exc = None
    for base_url in _candidate_ollama_base_urls():
        client = llm if base_url == OLLAMA_BASE_URL else _make_llm_client(base_url)
        try:
            models = client.models.list()
            if base_url != OLLAMA_BASE_URL:
                llm = client
                OLLAMA_BASE_URL = base_url
                logger.info("Switched Ollama base URL to %s", base_url)
            return models
        except Exception as exc:
            last_exc = exc

    raise last_exc if last_exc else RuntimeError("Ollama unavailable")


# LLM client (OpenAI-compatible → Ollama)
llm = _make_llm_client(OLLAMA_BASE_URL)


def chat(system_prompt: str, user_prompt: str) -> str:
    global llm, OLLAMA_BASE_URL

    last_conn_exc = None

    for base_url in _candidate_ollama_base_urls():
        client = llm if base_url == OLLAMA_BASE_URL else _make_llm_client(base_url)

        for attempt in range(2):
            try:
                response = client.chat.completions.create(
                    model=OLLAMA_MODEL,
                    messages=[
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_prompt},
                    ],
                    temperature=TEMPERATURE,
                    timeout=TIMEOUT,
                )

                if base_url != OLLAMA_BASE_URL:
                    llm = client
                    OLLAMA_BASE_URL = base_url
                    logger.info("Switched Ollama base URL to %s", base_url)

                return response.choices[0].message.content or ""

            except (APIConnectionError, APITimeoutError) as exc:
                last_conn_exc = exc
                logger.warning(
                    "LLM connectivity attempt %d failed via %s: %s",
                    attempt + 1,
                    base_url,
                    exc,
                )
                if attempt == 0:
                    time.sleep(1)
                    continue
                break
            except Exception as exc:
                logger.error("LLM call failed: %s", exc)
                raise HTTPException(status_code=503, detail=f"LLM unavailable: {exc}")

    candidate_urls = ", ".join(_candidate_ollama_base_urls())
    logger.error("LLM call failed across all Ollama endpoints: %s", last_conn_exc)
    raise HTTPException(
        status_code=503,
        detail=(
            f"LLM unavailable: {last_conn_exc or 'Connection error.'} "
            f"Check Ollama endpoints: {candidate_urls}"
        ),
    )


def chat_json(system_prompt: str, user_prompt: str) -> dict | list:
    raw = chat(system_prompt, user_prompt)
    # Strip markdown code fences if present
    cleaned = raw.strip()
    if cleaned.startswith("```"):
        cleaned = cleaned.split("\n", 1)[-1]
    if cleaned.endswith("```"):
        cleaned = cleaned.rsplit("```", 1)[0]
    cleaned = cleaned.strip()
    # Remove trailing commas before ] or } — a common small-model mistake
    cleaned = _re.sub(r",\s*([}\]])", r"\1", cleaned)

    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        # Attempt to find JSON object / array in the text
        for start_char, end_char in [("{", "}"), ("[", "]")]:
            start = cleaned.find(start_char)
            end = cleaned.rfind(end_char)
            if start != -1 and end != -1 and end > start:
                candidate = cleaned[start : end + 1]
                candidate = _re.sub(r",\s*([}\]])", r"\1", candidate)
                try:
                    return json.loads(candidate)
                except json.JSONDecodeError:
                    continue
        logger.warning("Could not parse LLM JSON. Raw response:\n%s", raw)
        raise HTTPException(status_code=502, detail="LLM returned invalid JSON")

# ----------------------------------------------------------------------------------------------------

# Database helpers

def get_db(): 
    return psycopg2.connect(DATABASE_URL, cursor_factory=psycopg2.extras.RealDictCursor)


def fetch_user_skills(user_id: str) -> List[dict]: # Returns list of skills with proficiency and experience years
    with get_db() as conn, conn.cursor() as cur:
        cur.execute(
            """
            SELECT us.proficiency_level, us.years_of_experience,
                   s.name AS skill_name, s.category
            FROM user_skills us
            JOIN skills s ON us.skill_id = s.id
            WHERE us.user_id = %s
            ORDER BY us.proficiency_level DESC
            """,
            (user_id,),
        )
        return cur.fetchall()


def fetch_user_profile(user_id: str) -> Optional[dict]: # Returns user's profile info (name, current role, target role, experience, education)
    with get_db() as conn, conn.cursor() as cur:
        cur.execute(
            """
            SELECT u.full_name, u.email,
                   p.current_role, p.target_role, p.experience_years,
                   p.education_level, p.preferred_domains, p.bio
            FROM users u
            LEFT JOIN profiles p ON u.id = p.user_id
            WHERE u.id = %s
            """,
            (user_id,),
        )
        return cur.fetchone()


def fetch_trends(limit: int = 20) -> List[dict]: # Fetches recent IT trends from the 'trends' table, ordered by creation date
    with get_db() as conn, conn.cursor() as cur:
        cur.execute(
            """
            SELECT id, title, domain, description, source
            FROM trends
            ORDER BY created_at DESC
            LIMIT %s
            """,
            (limit,),
        )
        return cur.fetchall()


def save_skill_gaps(user_id: str, gaps: List[dict]) -> None: # Saves the identified skill gaps to the 'skill_gaps' table, associating them with the user and marking them as AI-generated
    with get_db() as conn, conn.cursor() as cur:
        # Clear old AI-generated gaps
        cur.execute(
            "DELETE FROM skill_gaps WHERE user_id = %s AND reason LIKE %s",
            (user_id, "AI:%"),
        )
        for gap in gaps:
            cur.execute(
                """
                INSERT INTO skill_gaps (user_id, domain, skill_name, gap_level, reason)
                VALUES (%s, %s, %s, %s, %s)
                """,
                (
                    user_id,
                    gap.get("domain", "General"),
                    gap["skill_name"],
                    gap.get("gap_level", 3),
                    f"AI: {gap.get('reason', 'Identified by AI analysis')}",
                ),
            )
        conn.commit()


def save_recommendations(user_id: str, recs: List[dict]) -> None: # Saves the generated recommendations to the 'recommendations' table, associating them with the user
    with get_db() as conn, conn.cursor() as cur:
        for rec in recs:
            cur.execute(
                """
                INSERT INTO recommendations (user_id, type, title, content, skill_name)
                VALUES (%s, %s, %s, %s, %s)
                """,
                (
                    user_id,
                    rec.get("type", "skill"),
                    rec["title"],
                    rec["content"],
                    rec.get("skill_name"),
                ),
            )
        conn.commit()


# Pydantic request / response models
class SkillGapRequest(BaseModel):
    user_id: str = Field(..., description="UUID of the user")
    target_role: Optional[str] = Field(
        None, description="Target job role (overrides profile target_role)"
    )


class RoadmapRequest(BaseModel):
    user_id: str
    target_role: Optional[str] = None
    timeframe_months: int = Field(6, ge=1, le=24)


class RecommendRequest(BaseModel):
    user_id: str
    count: int = Field(5, ge=1, le=20)


class CareerAdviceRequest(BaseModel):
    user_id: Optional[str] = None
    question: str = Field(..., min_length=5)


class FreeAnalysisRequest(BaseModel):
    skills: List[str] = Field(..., min_length=1)
    target_role: str


class ResearchRequest(BaseModel):
    question: str = Field(..., min_length=5)


class JobDescriptionRequest(BaseModel):
    role: str = Field(..., min_length=3, description="IT job role to analyse (must be IT domain)")
    per_source_limit: int = Field(5, ge=1, le=10, description="Max results per scraper source")

# ----------------------------------------------------------------------------------------------------

# FastAPI application & middleware

@asynccontextmanager
async def lifespan(app: FastAPI): # Handle application startup checks and graceful shutdown logging
    logger.info("SkillPulse AI starting — model=%s  url=%s", OLLAMA_MODEL, OLLAMA_BASE_URL)
    # Quick LLM health check
    try:
        _list_models_with_failover()
        logger.info("Ollama connection OK ✓")
    except Exception as exc:
        logger.warning("Ollama not reachable: %s  (endpoints will fail until it's up)", exc)
    yield
    logger.info("SkillPulse AI shutting down")

# Create FastAPI app with metadata and lifespan management
app = FastAPI( 
    title="SkillPulse AI",
    description="Local-LLM powered skill gap analysis, roadmap generation & career recommendations",
    version="1.0.0",
    lifespan=lifespan,
)

# Allow CORS from any origin for simplicity
app.add_middleware( 
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health") # Check LLM + DB connectivity
async def health():
    status = {"llm": "unknown", "database": "unknown"}
    try:
        _list_models_with_failover()
        status["llm"] = "connected"
    except Exception:
        status["llm"] = "disconnected"
    try:
        with get_db() as conn, conn.cursor() as cur:
            cur.execute("SELECT 1")
        status["database"] = "connected"
    except Exception:
        status["database"] = "disconnected"
    ok = all(v == "connected" for v in status.values())
    return {"success": ok, "services": status, "model": OLLAMA_MODEL}

# ----------------------------------------------------------------------------------------------------

SKILL_GAP_SYSTEM = """You are an expert career advisor for the IT industry.
Given a user's current skills (with proficiency levels) and their target role,
identify the SKILL GAPS — skills they are missing or need to improve.

Respond ONLY with a JSON array. Each element:
{
  "skill_name": "Name of the missing / weak skill",
  "domain": "Category (e.g. Frontend, Backend, DevOps, Data, AI/ML, Soft Skills)",
  "gap_level": <1-5 integer, 5 = critical gap>,
  "reason": "Why this skill is needed for the target role"
}
Return between 3 and 10 gaps, ordered by gap_level descending."""


@app.post("/analyze-skill-gaps") # Analyze skill gaps for a user and target role, using the local LLM and persisting results to the database
async def analyze_skill_gaps(req: SkillGapRequest):
    """Analyse a user's skill gaps using the local LLM."""
    profile = fetch_user_profile(req.user_id)
    if not profile:
        raise HTTPException(status_code=404, detail="User not found")

    skills = fetch_user_skills(req.user_id)
    target = req.target_role or (profile.get("target_role") if profile else None)
    if not target:
        raise HTTPException(
            status_code=400,
            detail="No target role specified. Set it in your profile or in the request.",
        )

    skills_text = "\n".join(
        f"- {s['skill_name']} ({s['category']}) — {s['proficiency_level']}, {s['years_of_experience']}y exp"
        for s in skills
    ) or "No skills registered yet."

    user_prompt = (
        f"User: {profile.get('full_name', 'N/A')}\n"
        f"Current role: {profile.get('current_role', 'N/A')}\n"
        f"Target role: {target}\n"
        f"Experience: {profile.get('experience_years', 'N/A')} years\n"
        f"Education: {profile.get('education_level', 'N/A')}\n\n"
        f"Current skills:\n{skills_text}"
    )

    gaps = chat_json(SKILL_GAP_SYSTEM, user_prompt)
    if not isinstance(gaps, list):
        gaps = gaps.get("gaps", gaps.get("skill_gaps", []))

    # Persist to DB
    try:
        save_skill_gaps(req.user_id, gaps)
    except Exception as exc:
        logger.warning("Could not save gaps to DB: %s", exc)

    return {"success": True, "target_role": target, "gaps": gaps}


ROADMAP_SYSTEM = """You are an expert learning advisor for IT professionals.
Given a user's skill gaps and a timeframe, generate a structured learning roadmap.

Respond ONLY with JSON:
{
  "roadmap_title": "Roadmap to become <target_role>",
  "total_months": <N>,
  "phases": [
    {
      "phase": 1,
      "title": "Phase title",
      "duration_weeks": <N>,
      "skills": ["Skill A", "Skill B"],
      "tasks": [
        "Specific learning task 1",
        "Specific learning task 2"
      ],
      "resources": [
        {"type": "course|book|tutorial|project", "title": "Resource name", "url": "optional URL"}
      ]
    }
  ],
  "milestones": [
    {"month": 1, "description": "Milestone description"}
  ]
}
Keep it practical and achievable. 3-6 phases max."""


@app.post("/generate-roadmap") # Generate a personalised learning roadmap based on the user's skill gaps and target role, using the local LLM
async def generate_roadmap(req: RoadmapRequest):
    profile = fetch_user_profile(req.user_id)
    if not profile:
        raise HTTPException(status_code=404, detail="User not found")

    skills = fetch_user_skills(req.user_id)
    target = req.target_role or (profile.get("target_role") if profile else None)
    if not target:
        raise HTTPException(status_code=400, detail="No target role specified.")

    skills_text = "\n".join(
        f"- {s['skill_name']} ({s['proficiency_level']})" for s in skills
    ) or "None"

    user_prompt = (
        f"Target role: {target}\n"
        f"Timeframe: {req.timeframe_months} months\n"
        f"Current role: {profile.get('current_role', 'N/A')}\n"
        f"Experience: {profile.get('experience_years', 0)} years\n\n"
        f"Current skills:\n{skills_text}\n\n"
        "Generate a step-by-step roadmap."
    )

    roadmap = chat_json(ROADMAP_SYSTEM, user_prompt)
    return {"success": True, "data": roadmap}


RECOMMEND_SYSTEM = """You are an AI career coach for IT professionals.
Given the user's profile, current skills, and latest industry trends,
suggest actionable recommendations.

Respond ONLY with a JSON array. Each element:
{
  "type": "skill|course|project|career",
  "title": "Short recommendation title",
  "content": "Detailed recommendation (2-3 sentences)",
  "skill_name": "Related skill name or null",
  "priority": "high|medium|low"
}
Return between 3 and <count> recommendations."""


@app.post("/recommend") # Generate personalised recommendations based on the user's profile, skills, and current IT trends, using the local LLM and persisting results to the database
async def recommend(req: RecommendRequest):
    profile = fetch_user_profile(req.user_id)
    if not profile:
        raise HTTPException(status_code=404, detail="User not found")

    skills = fetch_user_skills(req.user_id)
    trends = fetch_trends(10)

    skills_text = ", ".join(s["skill_name"] for s in skills) or "None"
    trends_text = "\n".join(
        f"- {t['title']} ({t['domain']})" for t in trends
    ) or "No trends available."

    user_prompt = (
        f"User: {profile.get('full_name', 'N/A')}\n"
        f"Current role: {profile.get('current_role', 'N/A')}\n"
        f"Target role: {profile.get('target_role', 'N/A')}\n"
        f"Skills: {skills_text}\n\n"
        f"Current industry trends:\n{trends_text}\n\n"
        f"Provide up to {req.count} recommendations."
    )

    recs = chat_json(RECOMMEND_SYSTEM, user_prompt)
    if not isinstance(recs, list):
        recs = recs.get("recommendations", [])

    # Persist
    try:
        save_recommendations(req.user_id, recs)
    except Exception as exc:
        logger.warning("Could not save recommendations: %s", exc)

    return {"success": True, "data": recs}


CAREER_SYSTEM = """You are SkillPulse AI, an expert career advisor for IT professionals.
Answer the user's career-related question in a helpful, concise way.
If the user's profile context is provided, personalise your answer.
Format your response in clear paragraphs. You can use bullet points."""


@app.post("/career-advice") # Free-form career advice powered by the local LLM  
async def career_advice(req: CareerAdviceRequest):
    context = ""
    if req.user_id:
        profile = fetch_user_profile(req.user_id)
        skills = fetch_user_skills(req.user_id) if profile else []
        if profile:
            skills_text = ", ".join(s["skill_name"] for s in skills) or "None"
            context = (
                f"\n[User context]\n"
                f"Name: {profile.get('full_name', 'N/A')}\n"
                f"Current role: {profile.get('current_role', 'N/A')}\n"
                f"Target role: {profile.get('target_role', 'N/A')}\n"
                f"Experience: {profile.get('experience_years', 'N/A')}y\n"
                f"Skills: {skills_text}\n"
            )

    user_prompt = f"{req.question}{context}"
    answer = chat(CAREER_SYSTEM, user_prompt)
    return {"success": True, "answer": answer}


FREE_ANALYSIS_SYSTEM = """You are an expert IT career analyst.
Given a list of skills and a target role, provide:
1. A skill gap analysis
2. A brief learning roadmap
3. Top 3 recommendations

Respond ONLY with JSON:
{
  "gaps": [
    {"skill_name": "...", "domain": "...", "gap_level": 1-5, "reason": "..."}
  ],
  "roadmap_summary": "A 2-3 paragraph roadmap overview",
  "recommendations": [
    {"title": "...", "content": "...", "priority": "high|medium|low"}
  ]
}"""


@app.post("/analyze-free") # Free-form analysis based on provided skills and target role, using the local LLM without requiring a user profile
async def analyze_free(req: FreeAnalysisRequest):
    skills_text = ", ".join(req.skills)
    user_prompt = (
        f"Current skills: {skills_text}\n"
        f"Target role: {req.target_role}\n\n"
        "Provide a complete analysis."
    )
    result = chat_json(FREE_ANALYSIS_SYSTEM, user_prompt)
    return {"success": True, "data": result}


@app.post("/research") # Answer an IT career / job market question using live-scraped data
async def research(req: ResearchRequest):
    from scraper import main as scraper_main  # noqa: PLC0415

    try:
        answer = scraper_main(req.question)
    except Exception as exc:
        logger.error("Scraper pipeline error: %s", exc)
        raise HTTPException(
            status_code=503, detail=f"Scraper pipeline failed: {exc}"
        )
    return {"success": True, "answer": answer}


# ── IT-domain keyword fast-path guard ────────────────────────────────────────
_IT_KEYWORDS = {
    "software", "developer", "engineer", "devops", "data", "cloud", "network",
    "security", "infrastructure", "architect", "database", "backend", "frontend",
    "fullstack", "full-stack", "mobile", "web", " ai ", "ml ", " llm", "machine learning",
    "deep learning", "cybersecurity", "sysadmin", "system admin", "it support",
    "programmer", "python", "javascript", "typescript", "java", "golang", "rust",
    "kubernetes", "docker", "aws", "azure", "gcp", "qa", "tester", "test engineer",
    "product manager", "scrum", "agile", "api", "microservices", "platform engineer",
    "site reliability", "sre", "technical lead", "tech lead", "cto", "ciso", "cio",
    "solution architect", "solutions architect", "it consultant", "information technology",
    "data scientist", "data analyst", "data engineer", "ml engineer", "ai engineer",
    "ux engineer", "ui developer", "embedded", "firmware", "blockchain", "crypto",
    "devsecops", "fintech engineer", "database admin", "dba", "erp", "crm developer",
}


def _looks_like_it_role(role: str) -> bool: # Quick keyword pre-check — True if role string contains an IT keyword
    r = role.lower()
    return any(kw in r for kw in _IT_KEYWORDS)


def _to_text(value: object) -> str:
    return str(value or "").strip()


def _clean_task_text(task_text: str) -> str:
    cleaned = _to_text(task_text)
    cleaned = _re.sub(
        r"\s*\((?:\d+(?:\.\d+)?(?:\s*[-–]\s*\d+(?:\.\d+)?)?)\s*(?:h|hour|hours)\s*/\s*(?:day|week|month)\)\s*$",
        "",
        cleaned,
        flags=_re.I,
    )
    cleaned = _re.sub(r"\s+", " ", cleaned)
    return cleaned.strip(" -")


def _clean_job_description(description: str) -> str:
    cleaned = _to_text(description)
    cleaned = _re.sub(
        r"\s*Estimated time:\s*\d+(?:\.\d+)?(?:\s*[-–]\s*\d+(?:\.\d+)?)?\s*(?:h|hour|hours)\s*/\s*week\.?",
        "",
        cleaned,
        flags=_re.I,
    )
    cleaned = _re.sub(r"\s+", " ", cleaned)
    return cleaned.strip()


def _normalize_job_title(role: str, ai_augmented: bool) -> str:
    """Keep both outputs anchored to the same requested role."""
    return f"{role} - AI-Augmented" if ai_augmented else role


def _parse_weekly_hours(raw_estimate: str) -> Optional[float]:
    estimate = _to_text(raw_estimate).lower()
    if not estimate:
        return None

    match = _re.search(r"(\d+(?:\.\d+)?)", estimate)
    if not match:
        return None

    amount = float(match.group(1))
    if any(token in estimate for token in ["/day", "per day", "h/day", "hour/day"]):
        return amount * 5.0
    if any(token in estimate for token in ["/week", "per week", "h/week", "hour/week"]):
        return amount
    if any(token in estimate for token in ["/month", "per month", "h/month", "hour/month"]):
        return amount / 4.33

    # Unknown unit: better to ignore than trust an ambiguous value
    return None


def _estimate_weekly_hours_from_task(task: str, ai_augmented: bool) -> float:
    text = task.lower()
    hours = 3.0

    if any(k in text for k in ["train", "fine-tune", "model development", "algorithm", "build model", "design model", "implement model"]):
        hours = max(hours, 8.0)
    if any(k in text for k in ["data", "preprocess", "clean", "feature engineering"]):
        hours = max(hours, 5.0)
    if any(k in text for k in ["evaluate", "validation", "metric", "test", "a/b", "ab testing"]):
        hours = max(hours, 4.0)
    if any(k in text for k in ["deploy", "integration", "pipeline", "ci/cd", "release"]):
        hours = max(hours, 3.5)
    if any(k in text for k in ["monitor", "retrain", "drift", "incident", "observability"]):
        hours = max(hours, 3.5)
    if any(k in text for k in ["research", "experiment", "prototype"]):
        hours = max(hours, 3.0)
    if any(k in text for k in ["document", "documentation", "knowledge sharing"]):
        hours = max(hours, 2.0)
    if any(k in text for k in ["collaborate", "stakeholder", "meeting", "sync"]):
        hours = max(hours, 2.5)
    if any(k in text for k in ["debug", "troubleshoot", "fix"]):
        hours = max(hours, 3.0)
    if any(k in text for k in ["governance", "compliance", "security", "ethic", "xai", "explainability"]):
        hours = max(hours, 2.5)

    if ai_augmented:
        if any(k in text for k in ["documentation", "preprocess", "clean", "test", "report"]):
            hours *= 0.8
        elif any(k in text for k in ["monitor", "governance", "security", "compliance", "xai"]):
            hours *= 1.1
        else:
            hours *= 0.9

    return max(1.0, min(12.0, hours))


def _normalize_job_tasks(job: dict, role: str, ai_augmented: bool) -> dict:
    normalized: dict = {
        "title": _normalize_job_title(role, ai_augmented),
        "description": _clean_job_description(_to_text(job.get("description"))),
        "tasks": [],
    }

    raw_tasks = job.get("tasks")
    if not isinstance(raw_tasks, list) or not raw_tasks:
        return normalized

    if len(raw_tasks) > 10:
        raw_tasks = raw_tasks[:10]

    task_entries: list[dict] = []
    for idx, item in enumerate(raw_tasks, start=1):
        if isinstance(item, str):
            task_text = _to_text(item)
            raw_estimate = ""
        elif isinstance(item, dict):
            task_text = _to_text(item.get("task") or item.get("title") or item.get("name"))
            raw_estimate = _to_text(item.get("time_estimate"))
        else:
            continue

        embedded_estimate = _parse_weekly_hours(task_text)
        task_text = _clean_task_text(task_text)

        if not task_text:
            task_text = f"Task {idx}"

        weekly_hours = _parse_weekly_hours(raw_estimate)
        if weekly_hours is None:
            weekly_hours = embedded_estimate
        if weekly_hours is None:
            weekly_hours = _estimate_weekly_hours_from_task(task_text, ai_augmented)

        task_entries.append(
            {
                "task": task_text,
                "weekly_hours": float(weekly_hours),
            }
        )

    if not task_entries:
        return normalized

    current_total = sum(t["weekly_hours"] for t in task_entries)
    min_total, max_total = ((28.0, 46.0) if ai_augmented else (32.0, 50.0))
    target_total = 36.0 if ai_augmented else 40.0

    if current_total > 0 and (current_total < min_total or current_total > max_total):
        scale = target_total / current_total
        for t in task_entries:
            t["weekly_hours"] = t["weekly_hours"] * scale

    normalized["tasks"] = [
        {
            "task": t["task"],
            "time_estimate": f"{max(2, int(round(t['weekly_hours'])))} h/week",
        }
        for t in task_entries
    ]

    return normalized


def _job_has_content(job: dict) -> bool:
    if not isinstance(job, dict):
        return False
    if _to_text(job.get("title")):
        return True
    if _to_text(job.get("description")):
        return True
    tasks = job.get("tasks", [])
    return isinstance(tasks, list) and any(
        isinstance(item, dict) and _to_text(item.get("task")) for item in tasks
    )


def _job_is_complete(job: dict) -> bool:
    if not isinstance(job, dict):
        return False
    title = _to_text(job.get("title"))
    description = _to_text(job.get("description"))
    tasks = job.get("tasks", [])
    valid_tasks = 0
    if isinstance(tasks, list):
        for item in tasks:
            if isinstance(item, dict) and _to_text(item.get("task")):
                valid_tasks += 1
    return bool(title and description and valid_tasks >= 4)


def _normalize_part1_payload(part1: dict | list) -> dict:
    """Collapse small-model array wrappers into a single JSON object."""
    if isinstance(part1, list):
        return next((x for x in part1 if isinstance(x, dict)), {})
    return part1 if isinstance(part1, dict) else {}


def _repair_job_descriptions(base_prompt: str, role: str, incomplete_part1: dict) -> dict:
    repair_prompt = (
        base_prompt
        + "The previous JSON response was incomplete for one or both job descriptions.\n\n"
        + f"Requested role: {role}\n"
        + f"Previous incomplete JSON: {json.dumps(incomplete_part1, ensure_ascii=True)}\n\n"
        + "Regenerate BOTH job_without_ai and job_with_ai completely.\n"
        + "Requirements:\n"
        + "- Keep is_it_role=true for valid IT roles.\n"
        + f"- job_without_ai.title must be exactly '{role}'.\n"
        + f"- job_with_ai.title must be exactly '{role} - AI-Augmented'.\n"
        + "- Both sections must describe the SAME underlying role, domain, and core mission.\n"
        + "- The only difference is that the AI version uses AI tools and AI-assisted workflows.\n"
        + "- Do not convert the role into an adjacent specialization or a different job family.\n"
        + "- Provide a non-empty title for each job.\n"
        + "- Provide a non-empty 2-sentence description for each job.\n"
        + "- Provide 6 to 10 tasks for each job.\n"
        + "- Every task must include a concrete numeric time_estimate in h/week.\n"
        + "- Return valid JSON only, with no markdown or commentary."
    )
    repaired = chat_json(JOB_DESC_SYSTEM_PART1, repair_prompt)
    return _normalize_part1_payload(repaired)


def _sum_task_hours(tasks: list[dict]) -> float:
    total = 0.0
    for item in tasks:
        if isinstance(item, dict):
            total += _parse_weekly_hours(_to_text(item.get("time_estimate"))) or 0.0
    return round(total, 1)


def _sum_keyword_task_hours(tasks: list[dict], keywords: tuple[str, ...]) -> float:
    total = 0.0
    for item in tasks:
        if not isinstance(item, dict):
            continue
        task_text = _to_text(item.get("task")).lower()
        if any(keyword in task_text for keyword in keywords):
            total += _parse_weekly_hours(_to_text(item.get("time_estimate"))) or 0.0
    return round(total, 1)


def _safe_pct(numerator: float, denominator: float) -> float:
    if denominator <= 0:
        return 0.0
    return round((numerator / denominator) * 100.0, 1)


def _extract_skill_domains(job: dict) -> list[str]:
    combined_text = " ".join(
        [
            _to_text(job.get("title")),
            _to_text(job.get("description")),
            *[
                _to_text(item.get("task"))
                for item in job.get("tasks", [])
                if isinstance(item, dict)
            ],
        ]
    ).lower()

    domains = {
        "Model Development": ("model", "train", "fine-tune", "algorithm", "prediction"),
        "Data Engineering": ("data", "preprocess", "pipeline", "feature", "clean"),
        "MLOps and Deployment": ("deploy", "ci/cd", "release", "integration", "production"),
        "Monitoring and Quality": ("monitor", "validation", "test", "drift", "quality"),
        "Governance and Explainability": ("governance", "ethic", "security", "compliance", "explainability"),
        "Experimentation and Research": ("research", "experiment", "prototype", "optimize"),
        "Collaboration and Product": ("collaborate", "stakeholder", "backlog", "review", "guidance"),
    }

    covered = [
        domain for domain, keywords in domains.items()
        if any(keyword in combined_text for keyword in keywords)
    ]
    return covered


def _first_task_text(tasks: list[dict]) -> str:
    for item in tasks:
        if isinstance(item, dict):
            task_text = _to_text(item.get("task"))
            if task_text:
                return task_text
    return "core delivery work"


def _build_comparison_report(role: str, non_ai_job: dict, ai_job: dict) -> dict:
    if not (_job_has_content(non_ai_job) and _job_has_content(ai_job)):
        return {}

    non_ai_tasks = non_ai_job.get("tasks", []) if isinstance(non_ai_job.get("tasks", []), list) else []
    ai_tasks = ai_job.get("tasks", []) if isinstance(ai_job.get("tasks", []), list) else []

    non_ai_hours = _sum_task_hours(non_ai_tasks)
    ai_hours = _sum_task_hours(ai_tasks)
    weekly_delta = round(non_ai_hours - ai_hours, 1)
    efficiency_gain_pct = _safe_pct(max(0.0, weekly_delta), non_ai_hours)

    repetitive_keywords = ("data", "preprocess", "clean", "document", "test", "debug", "report")
    strategic_keywords = ("design", "research", "optimize", "stakeholder", "collaborate", "guidance", "backlog")
    oversight_keywords = ("monitor", "drift", "security", "compliance", "governance", "explainability", "review")

    non_ai_repetitive = _sum_keyword_task_hours(non_ai_tasks, repetitive_keywords)
    ai_repetitive = _sum_keyword_task_hours(ai_tasks, repetitive_keywords)
    non_ai_strategic = _sum_keyword_task_hours(non_ai_tasks, strategic_keywords)
    ai_strategic = _sum_keyword_task_hours(ai_tasks, strategic_keywords)
    non_ai_oversight = _sum_keyword_task_hours(non_ai_tasks, oversight_keywords)
    ai_oversight = _sum_keyword_task_hours(ai_tasks, oversight_keywords)
    strategic_delta = round(ai_strategic - non_ai_strategic, 1)

    non_ai_domains = _extract_skill_domains(non_ai_job)
    ai_domains = _extract_skill_domains(ai_job)
    added_domains = [domain for domain in ai_domains if domain not in non_ai_domains]

    ai_title = _to_text(ai_job.get("title")) or f"{role} - AI-Augmented"
    non_ai_title = _to_text(non_ai_job.get("title")) or role

    introduction = (
        f"This report compares the traditional role '{non_ai_title}' with the AI-enhanced role '{ai_title}'. "
        f"The assessment uses the generated responsibilities, estimated weekly workload, and task mix to identify practical advantages of AI augmentation without overstating the impact."
    )

    if weekly_delta > 0:
        efficiency_text = (
            f"The AI-enhanced role is modeled at about {ai_hours:.0f} h/week versus {non_ai_hours:.0f} h/week for the traditional role, "
            f"which indicates an estimated {efficiency_gain_pct:.0f}% improvement in delivery efficiency for a similar scope of work. "
            f"The main gains come from shifting repetitive execution away from tasks like '{_first_task_text(non_ai_tasks)}' toward more automated workflows."
        )
    else:
        efficiency_text = (
            f"The modeled weekly workload is similar at {ai_hours:.0f} h/week for the AI-enhanced role and {non_ai_hours:.0f} h/week for the traditional role. "
            f"In this case, the benefit of AI is less about reducing hours and more about improving throughput and reducing manual effort within those hours."
        )

    productivity_shift = round(non_ai_repetitive - ai_repetitive, 1)
    if productivity_shift > 0:
        if strategic_delta > 0:
            strategic_text = (
                f"At the same time, strategic and collaboration-oriented work rises from {non_ai_strategic:.0f} to {ai_strategic:.0f} h/week"
            )
        elif strategic_delta < 0:
            strategic_text = (
                f"Strategic and collaboration-oriented work changes from {non_ai_strategic:.0f} to {ai_strategic:.0f} h/week, suggesting this AI version is more execution-focused"
            )
        else:
            strategic_text = (
                f"Strategic and collaboration-oriented work remains stable at about {ai_strategic:.0f} h/week"
            )

        productivity_text = (
            f"Automation-friendly work drops from about {non_ai_repetitive:.0f} to {ai_repetitive:.0f} h/week, freeing roughly {productivity_shift:.0f} h/week for higher-value work such as experimentation, integration, and review. "
            f"{strategic_text}, which is consistent with common industry practice where AI reduces time spent on repeatable steps and reallocates effort toward higher-value decisions."
        )
    elif productivity_shift < 0:
        productivity_text = (
            f"Automation-friendly work is modeled at {ai_repetitive:.0f} h/week in the AI-enhanced role versus {non_ai_repetitive:.0f} h/week in the traditional role. "
            f"That suggests this version of the role reinvests AI gains into more analysis, reporting, or experimentation rather than simply removing effort. "
            f"Strategic and collaboration-oriented work shifts from {non_ai_strategic:.0f} to {ai_strategic:.0f} h/week, so productivity changes are driven by task mix rather than pure hour reduction."
        )
    else:
        productivity_text = (
            f"Automation-friendly work remains stable at about {ai_repetitive:.0f} h/week across both roles, but the AI-enhanced version allocates more time to strategic and collaboration-oriented work ({ai_strategic:.0f} h/week versus {non_ai_strategic:.0f} h/week). "
            f"In practice, this means productivity gains come from faster iteration and better decision support, not from large workload cuts."
        )

    if len(ai_domains) >= len(non_ai_domains):
        skill_text = (
            f"The AI-enhanced role covers {len(ai_domains)} skill domains versus {len(non_ai_domains)} in the traditional role. "
            f"It expands the job toward areas such as {', '.join(added_domains[:3]) if added_domains else 'monitoring, quality control, and cross-functional delivery'}, "
            f"which means the role demands broader tool literacy and stronger operational judgment rather than only core implementation ability."
        )
    else:
        skill_text = (
            f"The AI-enhanced role concentrates on {len(ai_domains)} high-value skill domains versus {len(non_ai_domains)} in the traditional role. "
            f"Rather than broadening every activity, it places more emphasis on domains like {', '.join(ai_domains[:3]) if ai_domains else 'monitoring and decision support'}, which typically raises the importance of tool fluency, judgment, and cross-functional coordination."
        )

    repetitive_share_non_ai = _safe_pct(non_ai_repetitive, non_ai_hours)
    repetitive_share_ai = _safe_pct(ai_repetitive, ai_hours)
    if repetitive_share_ai < repetitive_share_non_ai:
        satisfaction_text = (
            f"Repetitive task share decreases from {repetitive_share_non_ai:.0f}% to {repetitive_share_ai:.0f}% of modeled weekly effort, while oversight and quality work increases from {non_ai_oversight:.0f} to {ai_oversight:.0f} h/week. "
            f"That mix generally supports better job satisfaction because more time is spent on higher-autonomy activities, although it also requires stronger support for reskilling and clearer accountability."
        )
    else:
        satisfaction_text = (
            f"Repetitive task share is modeled at {repetitive_share_ai:.0f}% in the AI-enhanced role versus {repetitive_share_non_ai:.0f}% in the traditional role, while oversight and quality work stays strong at {ai_oversight:.0f} h/week. "
            f"This suggests job satisfaction gains depend less on reduced repetition and more on whether the team gives engineers autonomy, training time, and ownership over AI-assisted decisions."
        )

    summary = (
        f"Overall, the AI-enhanced {role} role shows realistic advantages in efficiency, productivity, and work quality. "
        f"The strongest benefit is not full replacement of human work, but a measurable shift from manual execution toward oversight, improvement, and cross-functional impact."
    )

    return {
        "introduction": introduction,
        "comparison_points": [
            {"dimension": "Efficiency", "analysis": efficiency_text},
            {"dimension": "Productivity", "analysis": productivity_text},
            {"dimension": "Skill Requirements", "analysis": skill_text},
            {"dimension": "Job Satisfaction", "analysis": satisfaction_text},
        ],
        "summary": summary,
        "metrics": {
            "weekly_hours_non_ai": non_ai_hours,
            "weekly_hours_ai": ai_hours,
            "estimated_efficiency_gain_pct": efficiency_gain_pct,
            "repetitive_hours_non_ai": non_ai_repetitive,
            "repetitive_hours_ai": ai_repetitive,
            "strategic_hours_non_ai": non_ai_strategic,
            "strategic_hours_ai": ai_strategic,
            "skill_domains_non_ai": non_ai_domains,
            "skill_domains_ai": ai_domains,
        },
    }


# ── Part-1 prompt: domain check + both job descriptions ─────────────────────
JOB_DESC_SYSTEM_PART1 = """You are an expert IT workforce strategist.

DOMAIN CHECK: Is the given role part of IT (software, data, cloud, security, network,
DevOps, AI/ML, QA, embedded, blockchain, ERP/CRM, IT support, architecture, etc.)?
If NOT IT, respond ONLY with:
{"is_it_role": false, "error": "Role is not in the IT domain."}

If IT, respond ONLY with valid JSON:
{
  "is_it_role": true,
  "job_without_ai": {
        "title": "EXACTLY the requested role title",
    "description": "2-sentence overview WITHOUT AI tooling",
    "tasks": [
            {"task": "Task description", "time_estimate": "X h/week"},
      {"task": "...", "time_estimate": "..."}
    ]
  },
  "job_with_ai": {
        "title": "EXACTLY the requested role title followed by ' - AI-Augmented'",
    "description": "2-sentence overview WITH AI tools integrated",
    "tasks": [
            {"task": "AI-enhanced task", "time_estimate": "X h/week"},
      {"task": "...", "time_estimate": "..."}
    ]
  }
}
Both job descriptions MUST represent the same base job role.
Do not change the profession into a related but different role or specialization.
The non-AI version and AI version should share the same core responsibilities, domain, and business purpose.
Only the workflow, tooling, speed, automation level, and required oversight should change.
Include 6 to 10 tasks per job.
Every task MUST include a concrete numeric time_estimate in h/week (no blanks, no dashes).
Return ONLY the JSON, no extra text."""

# ── Part-2 prompt: analysis sections (gaps, recommendations, strategies) ─────
JOB_DESC_SYSTEM_PART2 = """You are an expert AI-integration consultant for IT teams.

Given an IT role and live market trends, produce ONLY this JSON:
{
  "skill_gaps": [
    "Gap 1 that emerges when adopting AI workflows",
    "Gap 2", "Gap 3", "Gap 4"
  ],
  "work_responsibility_transformations": [
    "How responsibility X shifts from manual to AI-augmented",
    "...", "...", "..."
  ],
  "ai_integration_recommendations": [
    "Specific AI tool or practice to adopt and why",
    "...", "...", "..."
  ],
  "workforce_development_strategies": [
    "Concrete upskilling/reskilling strategy",
    "...", "...", "..."
  ],
    "workforce_sustainability_impact": [
        "Impact on workload sustainability and burnout risk",
        "...", "...", "..."
    ],
  "practical_advice_for_teams": [
    "Day-to-day actionable advice for teams",
    "...", "...", "..."
  ]
}
At least 4 items per list. Promote balanced human-AI collaboration.
Return ONLY the JSON, no extra text."""


@app.post("/generate-job-description")
async def generate_job_description(req: JobDescriptionRequest): # Generate a structured IT job description with a full AI-integration analysis.
    from scraper import scrape_it_jobs_data  

    role = req.role.strip()

    # Fast pre-check 
    if not _looks_like_it_role(role):
        logger.info("Role %r passed no keyword pre-check; delegating to LLM.", role)

    # ── Scrape live IT trends ────────────────────────────────────────────────
    try:
        raw_results = scrape_it_jobs_data(role, per_source_limit=req.per_source_limit)
    except Exception as exc:
        logger.error("Scraper failed for role %r: %s", role, exc)
        raw_results = []  # degrade gracefully; LLM will work from general knowledge

    context_lines: list[str] = []
    for idx, item in enumerate(raw_results[:15], start=1):
        snippet = textwrap.shorten(item.get("body", ""), width=500, placeholder="…")
        context_lines.append(
            f"[{idx}] {item.get('title', 'Result')} | {item.get('href', '')}\n{snippet}"
        )
    context_block = (
        "\n\n".join(context_lines)
        if context_lines
        else "No live trend data available — rely on general IT industry knowledge."
    )

    base_prompt = (
        f"Role to analyse: {role}\n\n"
        f"Use exact titles:\n- Non-AI title: {role}\n- AI title: {role} - AI-Augmented\n\n"
        "Important: compare the SAME job with and without AI adoption.\n"
        "Do not change the role into a different specialization, team, or job family.\n\n"
        f"Live IT job-market trends (scraped from BLS OOH, Remotive, HN Hiring):\n\n"
        f"{context_block}\n\n"
    )

    # ── LLM call 1: domain validation + job descriptions ─────────────────────
    part1 = _normalize_part1_payload(
        chat_json(JOB_DESC_SYSTEM_PART1, base_prompt + "Generate the job descriptions now.")
    )

    # ── Domain validation gate ────────────────────────────────────────────────
    if not part1.get("is_it_role", True):
        raise HTTPException(
            status_code=400,
            detail=part1.get(
                "error",
                f"The role '{role}' is not in the IT domain. "
                "This endpoint only analyses IT roles.",
            ),
        )

    if not (
        _job_is_complete(part1.get("job_without_ai"))
        and _job_is_complete(part1.get("job_with_ai"))
    ):
        logger.warning("Part 1 LLM response was incomplete for role %r; requesting repair.", role)
        repaired_part1 = _repair_job_descriptions(base_prompt, role, part1)
        if repaired_part1.get("is_it_role", True):
            part1 = repaired_part1

    job_without_ai = _normalize_job_tasks(
        part1.get("job_without_ai") if isinstance(part1.get("job_without_ai"), dict) else {},
        role=role,
        ai_augmented=False,
    )
    job_with_ai = _normalize_job_tasks(
        part1.get("job_with_ai") if isinstance(part1.get("job_with_ai"), dict) else {},
        role=role,
        ai_augmented=True,
    )

    if not (_job_has_content(job_without_ai) and _job_has_content(job_with_ai)):
        raise HTTPException(
            status_code=502,
            detail=(
                "LLM returned incomplete job descriptions for one or both sections. "
                "Please retry the request."
            ),
        )

    # ── LLM call 2: analysis sections ────────────────────────────────────────
    part2 = chat_json(JOB_DESC_SYSTEM_PART2, base_prompt + "Generate the analysis sections now.")
    if isinstance(part2, list):
        part2 = next((x for x in part2 if isinstance(x, dict)), {})

    workforce_sustainability_impact = part2.get("workforce_sustainability_impact", [])
    if not isinstance(workforce_sustainability_impact, list):
        workforce_sustainability_impact = []

    comparison_report = _build_comparison_report(role, job_without_ai, job_with_ai)

    return {
        "success": True,
        "role": role,
        "scraped_sources": len(raw_results),
        "data": {
            "job_without_ai": job_without_ai,
            "job_with_ai": job_with_ai,
            "comparative_analysis_report": comparison_report,
            "skill_gaps": part2.get("skill_gaps", []),
            "work_responsibility_transformations": part2.get(
                "work_responsibility_transformations", []
            ),
            "ai_integration_recommendations": part2.get(
                "ai_integration_recommendations", []
            ),
            "workforce_development_strategies": part2.get(
                "workforce_development_strategies", []
            ),
            "workforce_sustainability_impact": workforce_sustainability_impact,
            "practical_advice_for_teams": part2.get("practical_advice_for_teams", []),
        },
    }


@app.get("/models") # List models available in the local Ollama instance
async def list_models():
    try:
        models = _list_models_with_failover()
        return {
            "success": True,
            "current_model": OLLAMA_MODEL,
            "available": [m.id for m in models.data],
        }
    except Exception as exc:
        raise HTTPException(status_code=503, detail=f"Ollama unreachable: {exc}")


# Entry point
if __name__ == "__main__":
    uvicorn.run(
        "backend:app",
        host=API_HOST,
        port=API_PORT,
        reload=True,
        log_level="info",
    )
