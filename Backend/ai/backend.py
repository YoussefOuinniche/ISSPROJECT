"""
SkillPulse AI Backend
=====================
FastAPI server that integrates a local LLM (via Ollama) for:
  - Skill gap analysis
  - Personalized learning roadmap generation
  - Skill & career recommendations
  - Trend-based insights

Ollama must be running locally:  https://ollama.com
Default model: llama3.2  (change via OLLAMA_MODEL env var)
Pull a model:  ollama pull llama3.2
"""

import os
import json
import logging
from typing import Dict, List, Optional
from contextlib import asynccontextmanager

import psycopg2
import psycopg2.extras
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Body
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from openai import OpenAI
import uvicorn

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), "..", ".env"))

OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434/v1")
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

# ---------------------------------------------------------------------------
# LLM client (OpenAI‑compatible → Ollama)
# ---------------------------------------------------------------------------
llm = OpenAI(base_url=OLLAMA_BASE_URL, api_key="ollama")


def chat(system_prompt: str, user_prompt: str) -> str:
    """Send a chat completion request to the local LLM."""
    try:
        response = llm.chat.completions.create(
            model=OLLAMA_MODEL,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            temperature=TEMPERATURE,
            timeout=TIMEOUT,
        )
        return response.choices[0].message.content
    except Exception as exc:
        logger.error("LLM call failed: %s", exc)
        raise HTTPException(status_code=503, detail=f"LLM unavailable: {exc}")


def chat_json(system_prompt: str, user_prompt: str) -> dict | list:
    """Chat with the LLM and parse the response as JSON."""
    raw = chat(system_prompt, user_prompt)
    # Strip markdown code fences if present
    cleaned = raw.strip()
    if cleaned.startswith("```"):
        cleaned = cleaned.split("\n", 1)[-1]
    if cleaned.endswith("```"):
        cleaned = cleaned.rsplit("```", 1)[0]
    cleaned = cleaned.strip()
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        # Attempt to find JSON object / array in the text
        for start_char, end_char in [("{", "}"), ("[", "]")]:
            start = cleaned.find(start_char)
            end = cleaned.rfind(end_char)
            if start != -1 and end != -1 and end > start:
                try:
                    return json.loads(cleaned[start : end + 1])
                except json.JSONDecodeError:
                    continue
        logger.warning("Could not parse LLM JSON. Raw response:\n%s", raw)
        raise HTTPException(status_code=502, detail="LLM returned invalid JSON")


# ---------------------------------------------------------------------------
# Database helpers
# ---------------------------------------------------------------------------
def get_db():
    """Return a psycopg2 connection using the project DATABASE_URL."""
    return psycopg2.connect(DATABASE_URL, cursor_factory=psycopg2.extras.RealDictCursor)


def fetch_user_skills(user_id: str) -> List[dict]:
    """Fetch a user's skills with proficiency from the database."""
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


def fetch_user_profile(user_id: str) -> Optional[dict]:
    """Fetch a user's profile from the database."""
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


def fetch_all_skills() -> List[dict]:
    """Fetch the full skills catalogue."""
    with get_db() as conn, conn.cursor() as cur:
        cur.execute("SELECT id, name, category FROM skills ORDER BY category, name")
        return cur.fetchall()


def fetch_trends(limit: int = 20) -> List[dict]:
    """Fetch recent industry trends."""
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


def save_skill_gaps(user_id: str, gaps: List[dict]):
    """Persist AI-generated skill gaps into the database."""
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


def save_recommendations(user_id: str, recs: List[dict]):
    """Persist AI-generated recommendations into the database."""
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


# ---------------------------------------------------------------------------
# Pydantic request / response models
# ---------------------------------------------------------------------------
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
    """Analyse a skill set without requiring a database user."""
    skills: List[str] = Field(..., min_length=1)
    target_role: str


# ---------------------------------------------------------------------------
# FastAPI application
# ---------------------------------------------------------------------------
@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("SkillPulse AI starting — model=%s  url=%s", OLLAMA_MODEL, OLLAMA_BASE_URL)
    # Quick LLM health check
    try:
        llm.models.list()
        logger.info("Ollama connection OK ✓")
    except Exception as exc:
        logger.warning("Ollama not reachable: %s  (endpoints will fail until it's up)", exc)
    yield
    logger.info("SkillPulse AI shutting down")


app = FastAPI(
    title="SkillPulse AI",
    description="Local-LLM powered skill gap analysis, roadmap generation & career recommendations",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---- Health ------------------------------------------------------------------
@app.get("/health")
async def health():
    """Check LLM + DB connectivity."""
    status = {"llm": "unknown", "database": "unknown"}
    try:
        llm.models.list()
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


# ---- Skill Gap Analysis -----------------------------------------------------
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


@app.post("/analyze-skill-gaps")
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


# ---- Learning Roadmap --------------------------------------------------------
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


@app.post("/generate-roadmap")
async def generate_roadmap(req: RoadmapRequest):
    """Generate a personalised learning roadmap."""
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


# ---- Recommendations ---------------------------------------------------------
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


@app.post("/recommend")
async def recommend(req: RecommendRequest):
    """Generate personalised recommendations."""
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


# ---- Career Advice (free-text Q&A) ------------------------------------------
CAREER_SYSTEM = """You are SkillPulse AI, an expert career advisor for IT professionals.
Answer the user's career-related question in a helpful, concise way.
If the user's profile context is provided, personalise your answer.
Format your response in clear paragraphs. You can use bullet points."""


@app.post("/career-advice")
async def career_advice(req: CareerAdviceRequest):
    """Free-form career advice powered by the local LLM."""
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


# ---- Free Analysis (no DB user required) ------------------------------------
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


@app.post("/analyze-free")
async def analyze_free(req: FreeAnalysisRequest):
    """Quick analysis without needing a database account."""
    skills_text = ", ".join(req.skills)
    user_prompt = (
        f"Current skills: {skills_text}\n"
        f"Target role: {req.target_role}\n\n"
        "Provide a complete analysis."
    )
    result = chat_json(FREE_ANALYSIS_SYSTEM, user_prompt)
    return {"success": True, "data": result}


# ---- List available Ollama models --------------------------------------------
@app.get("/models")
async def list_models():
    """List models available in the local Ollama instance."""
    try:
        models = llm.models.list()
        return {
            "success": True,
            "current_model": OLLAMA_MODEL,
            "available": [m.id for m in models.data],
        }
    except Exception as exc:
        raise HTTPException(status_code=503, detail=f"Ollama unreachable: {exc}")


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    uvicorn.run(
        "backend:app",
        host=API_HOST,
        port=API_PORT,
        reload=True,
        log_level="info",
    )
