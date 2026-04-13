import os # for environment variable handling and file paths
import json # for parsing and handling JSON data
import textwrap # for compact scraped context formatting
import hmac
import logging
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
import uvicorn
from ai_chat_router import router as ai_chat_router
from ai_chat_runtime import initialize_ai_chat_runtime, shutdown_ai_chat_runtime
from ai_market_trends_router import router as ai_market_trends_router
from ai_profile_extract_router import router as ai_profile_extract_router
from ai_roadmap_router import router as ai_roadmap_router
from ai_skill_gap_router import router as ai_skill_gap_router
from services.llm_service import (
    build_messages,
    call_llm,
    list_available_models,
)


# Load shared backend env first, then optional local AI env overrides.
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
load_dotenv(os.path.join(BASE_DIR, "..", ".env"))
load_dotenv(os.path.join(BASE_DIR, ".env"))

logging.basicConfig(level=os.getenv("AI_LOG_LEVEL", "INFO").upper())


def _env_int(name, default):
    raw = os.getenv(name)
    if raw is None or str(raw).strip() == "":
        return default
    try:
        return int(raw)
    except Exception:
        return default


def _env_bool(name, default=False):
    raw = os.getenv(name)
    if raw is None:
        return default
    return str(raw).strip().lower() in {"1", "true", "yes", "on"}


def _env_list(name, default=None):
    raw = os.getenv(name)
    if raw is None or str(raw).strip() == "":
        return default or []
    values = [part.strip() for part in str(raw).split(",") if part.strip()]
    return values if values else (default or [])


# --- SETTINGS ---
OLLAMA_MODEL_CHAT = (os.getenv("OLLAMA_MODEL_CHAT") or os.getenv("OLLAMA_MODEL") or "qwen2.5:3b").strip()
OLLAMA_MODEL_EXTRACT = (os.getenv("OLLAMA_MODEL_EXTRACT") or OLLAMA_MODEL_CHAT).strip()
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@127.0.0.1:54322/postgres") # database connection string
API_HOST = os.getenv("AI_HOST", "0.0.0.0")
API_PORT = _env_int("AI_PORT", 8000) # port for the API server
AI_RELOAD = _env_bool("AI_RELOAD", os.getenv("NODE_ENV", "development") != "production")
AI_REQUIRE_AUTH = _env_bool("AI_REQUIRE_AUTH", True)
AI_SERVICE_TOKEN = os.getenv("AI_SERVICE_TOKEN", "").strip()

default_cors_origins = [] if AI_REQUIRE_AUTH else ["http://localhost:3000", "http://127.0.0.1:3000"]
CORS_ORIGINS = _env_list("AI_CORS_ORIGINS", default_cors_origins)

if AI_REQUIRE_AUTH and not AI_SERVICE_TOKEN:
    raise RuntimeError("AI_REQUIRE_AUTH is enabled but AI_SERVICE_TOKEN is not set.")


# connect to database
def connect_db():
    import psycopg2
    import psycopg2.extras
    # Keep SQL in this service aligned with Backend/database/schema.sql.
    connection = psycopg2.connect(DATABASE_URL, cursor_factory=psycopg2.extras.RealDictCursor)
    return connection


# GET USER SKILLS FROM DATABASE 
def get_user_skills(user_id):
    conn = connect_db()
    cursor = conn.cursor()
    cursor.execute(
        """
        SELECT us.proficiency_level, us.years_of_experience,
               s.name AS skill_name, s.category
        FROM user_skills us
        JOIN skills s ON us.skill_id = s.id
        WHERE us.user_id = %s
        ORDER BY us.proficiency_level DESC
        """,
        (user_id,)
    )
    results = cursor.fetchall()
    cursor.close()
    conn.close()
    return results


# --- GET USER PROFILE FROM DATABASE ---
def get_user_profile(user_id):
    conn = connect_db()
    cursor = conn.cursor()
    cursor.execute(
        """
        SELECT u.full_name, u.email,
               p.current_role, p.target_role, p.experience_years,
               p.education_level, p.preferred_domains, p.bio
        FROM users u
        LEFT JOIN profiles p ON u.id = p.user_id
        WHERE u.id = %s
        """,
        (user_id,)
    )
    result = cursor.fetchone()
    cursor.close()
    conn.close()
    return result


# --- GET TRENDS FROM DATABASE ---
def get_trends(limit):
    conn = connect_db()
    cursor = conn.cursor()
    cursor.execute(
        """
        SELECT id, title, domain, description, source
        FROM trends
        ORDER BY created_at DESC
        LIMIT %s
        """,
        (limit,)
    )
    results = cursor.fetchall()
    cursor.close()
    conn.close()
    return results


# --- SAVE SKILL GAPS TO DATABASE ---
def save_skill_gaps(user_id, gaps):
    conn = connect_db()
    cursor = conn.cursor()

    # delete old gaps first
    cursor.execute(
        "DELETE FROM skill_gaps WHERE user_id = %s AND reason LIKE %s",
        (user_id, "AI:%")
    )

    # save new ones one by one
    for gap in gaps:
        domain = gap.get("domain", "General")
        skill_name = gap["skill_name"]
        gap_level = gap.get("gap_level", 3)
        reason = "AI: " + gap.get("reason", "Identified by AI analysis")

        cursor.execute(
            """
            INSERT INTO skill_gaps (user_id, domain, skill_name, gap_level, reason)
            VALUES (%s, %s, %s, %s, %s)
            """,
            (user_id, domain, skill_name, gap_level, reason)
        )

    conn.commit()
    cursor.close()
    conn.close()


# --- SAVE RECOMMENDATIONS TO DATABASE ---
def save_recommendations(user_id, recommendations):
    conn = connect_db()
    cursor = conn.cursor()

    for rec in recommendations:
        rec_type = rec.get("type", "skill")
        title = rec["title"]
        content = rec["content"]
        skill_name = rec.get("skill_name")

        cursor.execute(
            """
            INSERT INTO recommendations (user_id, type, title, content, skill_name)
            VALUES (%s, %s, %s, %s, %s)
            """,
            (user_id, rec_type, title, content, skill_name)
        )

    conn.commit()
    cursor.close()
    conn.close()


# --- CLEAN UP AND PARSE JSON FROM LLM ---
def parse_llm_json(text):
    if text is None:
        return None

    cleaned = text.strip()

    # remove code fences if llm added them
    if cleaned.startswith("```"):
        lines = cleaned.split("\n")
        cleaned = "\n".join(lines[1:])

    if cleaned.endswith("```"):
        cleaned = cleaned[: cleaned.rfind("```")]

    cleaned = cleaned.strip()

    # try to parse directly
    try:
        result = json.loads(cleaned)
        return result
    except Exception:
        pass

    # try to find a json object in the mess
    start = cleaned.find("{")
    end = cleaned.rfind("}")
    if start != -1 and end != -1 and end > start:
        candidate = cleaned[start: end + 1]
        try:
            result = json.loads(candidate)
            return result
        except Exception:
            pass

    # try to find a json array
    start = cleaned.find("[")
    end = cleaned.rfind("]")
    if start != -1 and end != -1 and end > start:
        candidate = cleaned[start: end + 1]
        try:
            result = json.loads(candidate)
            return result
        except Exception:
            pass

    print("Could not parse LLM response as JSON!")
    print("Raw response was:", text)
    return None

def is_it_role(role): # check if role is an IT role 
    it_words = [
        "software", "developer", "engineer", "devops", "data", "cloud",
        "network", "security", "infrastructure", "architect", "database",
        "backend", "frontend", "fullstack", "mobile", "web", "ai", "ml",
        "machine learning", "deep learning", "cybersecurity", "sysadmin",
        "programmer", "python", "javascript", "java", "kubernetes", "docker",
        "aws", "azure", "gcp", "qa", "tester", "scrum", "agile", "api",
        "blockchain", "data scientist", "data analyst", "data engineer",
        "embedded", "firmware", "devsecops", "dba", "erp", "crm"
    ]

    role_lower = role.lower()

    for word in it_words:
        if word in role_lower:
            return True

    return False


# --- BUILD SKILLS TEXT FOR PROMPTS ---
def build_skills_text(skills):
    if len(skills) == 0:
        return "No skills registered yet."

    skills_text = ""
    for skill in skills:
        line = "- " + skill["skill_name"] + " (" + skill["category"] + ") — "
        line = line + skill["proficiency_level"] + ", "
        line = line + str(skill["years_of_experience"]) + "y exp"
        skills_text = skills_text + line + "\n"

    return skills_text


# --- ANALYZE SKILL GAPS ---
def analyze_skill_gaps(user_id, target_role=None):
    # get profile
    profile = get_user_profile(user_id)
    if profile is None:
        print("User not found!")
        return None

    # get target role
    if target_role is None:
        target_role = profile.get("target_role")

    if target_role is None:
        print("No target role set!")
        return None

    # get skills
    skills = get_user_skills(user_id)
    skills_text = build_skills_text(skills)

    # build prompt
    system_prompt = """You are an expert career advisor for the IT industry.
        Given a user's current skills and target role, identify SKILL GAPS.
        Respond ONLY with a JSON array. Each element:
        {
        "skill_name": "Name of the missing skill",
        "domain": "Category like Frontend, Backend, DevOps etc",
        "gap_level": 1 to 5 where 5 is critical,
        "reason": "Why this skill is needed"
        }
        Return between 3 and 10 gaps, ordered by gap_level descending."""

    user_prompt = "User: " + str(profile.get("full_name", "N/A")) + "\n"
    user_prompt = user_prompt + "Current role: " + str(profile.get("current_role", "N/A")) + "\n"
    user_prompt = user_prompt + "Target role: " + target_role + "\n"
    user_prompt = user_prompt + "Experience: " + str(profile.get("experience_years", "N/A")) + " years\n"
    user_prompt = user_prompt + "Education: " + str(profile.get("education_level", "N/A")) + "\n\n"
    user_prompt = user_prompt + "Current skills:\n" + skills_text

    # call llm
    raw = call_llm("chat", build_messages(system_prompt, user_prompt)) # this is where we call the LLM to analyze skill gaps based on the user's profile and target role
    gaps = parse_llm_json(raw) # we then parse the LLM's response to extract the skill gaps in a structured format

    if gaps is None:
        return None

    # sometimes llm wraps it in an object
    if type(gaps) == dict:
        if "gaps" in gaps:
            gaps = gaps["gaps"]
        elif "skill_gaps" in gaps:
            gaps = gaps["skill_gaps"]

    # save to database
    try:
        save_skill_gaps(user_id, gaps)
    except Exception as err:
        print("Warning: could not save gaps:", err)

    return {"success": True, "target_role": target_role, "gaps": gaps}


# --- GENERATE LEARNING ROADMAP ---
def generate_roadmap(user_id, target_role=None, timeframe_months=6):
    profile = get_user_profile(user_id)
    if profile is None:
        print("User not found!")
        return None

    if target_role is None:
        target_role = profile.get("target_role")

    if target_role is None:
        print("No target role set!")
        return None

    skills = get_user_skills(user_id)

    # build simple skills list
    skills_text = ""
    for skill in skills:
        skills_text = skills_text + "- " + skill["skill_name"] + " (" + skill["proficiency_level"] + ")\n"

    if skills_text == "":
        skills_text = "None"

    system_prompt = """You are an expert learning advisor for IT professionals.
        Given a user's skill gaps and a timeframe, generate a structured learning roadmap.
        Respond ONLY with JSON:
        {
        "roadmap_title": "Roadmap to become <target_role>",
        "total_months": N,
        "phases": [
            {
            "phase": 1,
            "title": "Phase title",
            "duration_weeks": N,
            "skills": ["Skill A", "Skill B"],
            "tasks": ["Learning task 1", "Learning task 2"],
            "resources": [
                {"type": "course or book", "title": "Resource name", "url": "optional URL"}
            ]
            }
        ],
        "milestones": [
            {"month": 1, "description": "Milestone description"}
        ]
        }
        Keep it practical. 3 to 6 phases max."""

    user_prompt = "Target role: " + target_role + "\n"
    user_prompt = user_prompt + "Timeframe: " + str(timeframe_months) + " months\n"
    user_prompt = user_prompt + "Current role: " + str(profile.get("current_role", "N/A")) + "\n"
    user_prompt = user_prompt + "Experience: " + str(profile.get("experience_years", 0)) + " years\n\n"
    user_prompt = user_prompt + "Current skills:\n" + skills_text + "\n\n"
    user_prompt = user_prompt + "Generate a step-by-step roadmap."

    raw = call_llm("chat", build_messages(system_prompt, user_prompt))
    roadmap = parse_llm_json(raw)

    return {"success": True, "data": roadmap}


# --- GET RECOMMENDATIONS ---
def get_recommendations(user_id, count=5):
    profile = get_user_profile(user_id)
    if profile is None:
        print("User not found!")
        return None

    skills = get_user_skills(user_id)
    trends = get_trends(10)

    # build skills string
    skills_list = ""
    for skill in skills:
        if skills_list != "":
            skills_list = skills_list + ", "
        skills_list = skills_list + skill["skill_name"]

    if skills_list == "":
        skills_list = "None"

    # build trends string
    trends_text = ""
    for trend in trends:
        trends_text = trends_text + "- " + trend["title"] + " (" + trend["domain"] + ")\n"

    if trends_text == "":
        trends_text = "No trends available."

    system_prompt = """You are an AI career coach for IT professionals.
        Given the user profile, skills, and latest trends, suggest actionable recommendations.
        Respond ONLY with a JSON array. Each element:
        {
        "type": "skill or course or project or career",
        "title": "Short title",
        "content": "Detailed recommendation in 2-3 sentences",
        "skill_name": "Related skill name or null",
        "priority": "high or medium or low"
        }"""

    user_prompt = "User: " + str(profile.get("full_name", "N/A")) + "\n"
    user_prompt = user_prompt + "Current role: " + str(profile.get("current_role", "N/A")) + "\n"
    user_prompt = user_prompt + "Target role: " + str(profile.get("target_role", "N/A")) + "\n"
    user_prompt = user_prompt + "Skills: " + skills_list + "\n\n"
    user_prompt = user_prompt + "Current trends:\n" + trends_text + "\n\n"
    user_prompt = user_prompt + "Provide up to " + str(count) + " recommendations."

    raw = call_llm("chat", build_messages(system_prompt, user_prompt))
    recs = parse_llm_json(raw)

    if recs is None:
        return None

    if type(recs) == dict:
        if "recommendations" in recs:
            recs = recs["recommendations"]

    # save to database
    try:
        save_recommendations(user_id, recs)
    except Exception as err:
        print("Warning: could not save recommendations:", err)

    return {"success": True, "data": recs}


# --- CAREER ADVICE ---
def get_career_advice(question, user_id=None):
    context = ""

    if user_id is not None:
        profile = get_user_profile(user_id)
        if profile is not None:
            skills = get_user_skills(user_id)
            skills_list = ""
            for skill in skills:
                if skills_list != "":
                    skills_list = skills_list + ", "
                skills_list = skills_list + skill["skill_name"]
            if skills_list == "":
                skills_list = "None"

            context = "\n[User context]\n"
            context = context + "Name: " + str(profile.get("full_name", "N/A")) + "\n"
            context = context + "Current role: " + str(profile.get("current_role", "N/A")) + "\n"
            context = context + "Target role: " + str(profile.get("target_role", "N/A")) + "\n"
            context = context + "Experience: " + str(profile.get("experience_years", "N/A")) + "y\n"
            context = context + "Skills: " + skills_list + "\n"

    system_prompt = """You are SkillPulse AI, an expert career advisor for IT professionals.
Answer the user's career question in a helpful and concise way.
If user profile is provided, personalize your answer.
Format your response in clear paragraphs. You can use bullet points."""

    user_prompt = question + context

    answer = call_llm("chat", build_messages(system_prompt, user_prompt))

    return {"success": True, "answer": answer}


# --- COUNT TASK HOURS ---
def count_task_hours(tasks):
    total = 0.0
    for item in tasks:
        if type(item) == dict:
            time_str = str(item.get("time_estimate", ""))
            # try to grab first number from string
            number = ""
            for char in time_str:
                if char.isdigit() or char == ".":
                    number = number + char
                elif number != "":
                    break  # stop after first number
            if number != "":
                total = total + float(number)
    return round(total, 1)


def _normalize_task_list(raw_tasks):
    tasks = []
    if type(raw_tasks) != list:
        return tasks

    for item in raw_tasks:
        if type(item) == dict:
            task_text = str(item.get("task") or item.get("title") or item.get("name") or "").strip()
            time_estimate = str(item.get("time_estimate") or "").strip()
        else:
            task_text = str(item).strip()
            time_estimate = ""

        if task_text == "":
            continue

        if time_estimate == "":
            time_estimate = "3 h/week"

        tasks.append({
            "task": task_text,
            "time_estimate": time_estimate
        })

    return tasks


def _job_has_core_content(job):
    if type(job) != dict:
        return False

    title = str(job.get("title", "")).strip()
    description = str(job.get("description", "")).strip()
    tasks = _normalize_task_list(job.get("tasks", []))
    return title != "" and description != "" and len(tasks) > 0


def _build_ai_fallback_tasks(reference_tasks):
    tasks = []
    ref_tasks = _normalize_task_list(reference_tasks)

    for item in ref_tasks[:8]:
        task_text = str(item.get("task", "")).strip()
        if task_text == "":
            continue
        tasks.append({
            "task": "AI-assisted: " + task_text,
            "time_estimate": str(item.get("time_estimate", "3 h/week"))
        })

    if len(tasks) > 0:
        return tasks

    return [
        {"task": "AI-assisted data extraction and cleaning", "time_estimate": "4 h/week"},
        {"task": "AI-guided trend analysis and anomaly detection", "time_estimate": "4 h/week"},
        {"task": "Build dashboards with AI-generated insights", "time_estimate": "3 h/week"},
        {"task": "Validate AI outputs and business metrics", "time_estimate": "3 h/week"},
        {"task": "Automate recurring reporting workflows", "time_estimate": "3 h/week"},
        {"task": "Collaborate on model monitoring and improvements", "time_estimate": "3 h/week"},
    ]


def _normalize_job_block(role, job, ai_mode=False, reference_tasks=None):
    if type(job) != dict:
        job = {}

    if ai_mode:
        default_title = role + " - AI-Augmented"
        default_description = (
            "This role performs the same core responsibilities but with AI integrated into daily workflows. "
            "The focus is on faster delivery, automation of repetitive tasks, and stronger quality control."
        )
    else:
        default_title = role
        default_description = (
            "This role focuses on the core responsibilities of the position using standard tools and processes. "
            "The emphasis is on consistent execution, analysis quality, and reliable delivery."
        )

    title = str(job.get("title", "")).strip()
    description = str(job.get("description", "")).strip()
    tasks = _normalize_task_list(job.get("tasks", []))

    if title == "":
        title = default_title
    if description == "":
        description = default_description

    if len(tasks) == 0:
        if ai_mode:
            tasks = _build_ai_fallback_tasks(reference_tasks or [])
        else:
            tasks = [
                {"task": "Gather and clean relevant data", "time_estimate": "4 h/week"},
                {"task": "Analyze trends and key metrics", "time_estimate": "4 h/week"},
                {"task": "Prepare recurring reports", "time_estimate": "3 h/week"},
                {"task": "Validate findings with quality checks", "time_estimate": "3 h/week"},
                {"task": "Communicate insights to stakeholders", "time_estimate": "3 h/week"},
                {"task": "Document methods and outcomes", "time_estimate": "2 h/week"},
            ]

    return {
        "title": title,
        "description": description,
        "tasks": tasks,
    }


def _source_name_from_result(item):
    title = str(item.get("title", "")).strip()
    if title.startswith("[") and "]" in title:
        return title[1:title.find("]")].strip()

    href = str(item.get("href", "")).lower()
    if "bls.gov" in href:
        return "BLS OOH"
    if "hiringlab.org" in href:
        return "Hiring Lab"
    if "naceweb.org" in href:
        return "NACE"
    return ""


def _count_unique_sources(results):
    sources = set()
    for item in results:
        if type(item) != dict:
            continue
        source_name = _source_name_from_result(item)
        if source_name != "":
            sources.add(source_name.lower())
    return len(sources)


def _collect_market_context(role, per_source_limit):
    results = []

    try:
        from tools import tool_web_scrape
        scraped = tool_web_scrape(role, per_source_limit=per_source_limit)
        if type(scraped) == dict and scraped.get("success"):
            rows = scraped.get("results", [])
            if type(rows) == list:
                results = rows
    except Exception as err:
        print("Warning: tools.py scrape pipeline failed:", err)

    if len(results) == 0:
        try:
            from scraper import scrape_it_jobs_data
            fallback_rows = scrape_it_jobs_data(role, per_source_limit)
            if type(fallback_rows) == list:
                results = fallback_rows
        except Exception as err:
            print("Warning: scraper.py fallback failed:", err)

    lines = []
    i = 1
    for item in results[:15]:
        title = str(item.get("title", "Result")).strip() or "Result"
        href = str(item.get("href", "")).strip()
        body = str(item.get("body", "")).strip()
        snippet = textwrap.shorten(body, width=350, placeholder="…") if body != "" else "No snippet."
        lines.append("[" + str(i) + "] " + title + " | " + href + "\n" + snippet)
        i = i + 1

    if len(lines) > 0:
        context_block = "\n\n".join(lines)
    else:
        context_block = "No live trend data available — rely on general IT industry knowledge."

    return {
        "results": results,
        "context_block": context_block,
        "scraped_sources": _count_unique_sources(results),
    }


# --- BUILD COMPARISON REPORT ---
def build_comparison_report(role, job_no_ai, job_with_ai):
    # check both jobs have content
    if type(job_no_ai) != dict or type(job_with_ai) != dict:
        return {}

    tasks_no_ai = job_no_ai.get("tasks", [])
    tasks_with_ai = job_with_ai.get("tasks", [])

    hours_no_ai = count_task_hours(tasks_no_ai)
    hours_with_ai = count_task_hours(tasks_with_ai)

    hour_difference = round(hours_no_ai - hours_with_ai, 1)

    # work out efficiency gain percent
    if hours_no_ai > 0:
        efficiency_gain = round((max(0.0, hour_difference) / hours_no_ai) * 100.0, 1)
    else:
        efficiency_gain = 0.0

    # build basic report text
    introduction = (
        "This report compares the traditional role '"
        + str(job_no_ai.get("title", role))
        + "' with the AI-enhanced role '"
        + str(job_with_ai.get("title", role + " - AI-Augmented"))
        + "'. "
        + "It looks at responsibilities, workload, and practical advantages of using AI in this role."
    )

    if hour_difference > 0:
        efficiency_text = (
            "The AI-enhanced role is modeled at about "
            + str(hours_with_ai)
            + " h/week versus "
            + str(hours_no_ai)
            + " h/week for the traditional role. "
            + "That suggests roughly a "
            + str(efficiency_gain)
            + "% improvement in delivery efficiency."
        )
    else:
        efficiency_text = (
            "Both roles have a similar weekly workload of about "
            + str(hours_with_ai)
            + " h/week. "
            + "The main benefit of AI here is faster iteration rather than fewer total hours."
        )

    summary = (
        "Overall, the AI-enhanced "
        + role
        + " role shows realistic advantages in efficiency and work quality. "
        + "The biggest win is shifting from manual execution toward oversight and strategic work."
    )

    report = {
        "introduction": introduction,
        "comparison_points": [
            {"dimension": "Efficiency", "analysis": efficiency_text}
        ],
        "summary": summary,
        "metrics": {
            "weekly_hours_non_ai": hours_no_ai,
            "weekly_hours_ai": hours_with_ai,
            "estimated_efficiency_gain_pct": efficiency_gain
        }
    }

    return report


# --- GENERATE JOB DESCRIPTION ---
def generate_job_description(role, per_source_limit=5):
    role = role.strip()

    # check if it looks like an IT role
    if not is_it_role(role):
        print("Error: role is not in the IT domain:", role)
        return None

    market_data = _collect_market_context(role, per_source_limit)
    context_block = market_data.get("context_block", "")
    scraped_sources = market_data.get("scraped_sources", 0)

    # build the LLM prompt for job descriptions
    system_prompt_part1 = """You are an expert IT workforce strategist.
The requested role is already validated as an IT role.
Respond ONLY with valid JSON:
{
    "job_without_ai": {
    "title": "Exact role title",
    "description": "2-sentence overview without AI tooling",
    "tasks": [
      {"task": "Task description", "time_estimate": "X h/week"}
    ]
  },
  "job_with_ai": {
    "title": "Exact role title - AI-Augmented",
    "description": "2-sentence overview with AI tools",
    "tasks": [
      {"task": "AI-enhanced task", "time_estimate": "X h/week"}
    ]
  }
}
Include 6 to 10 tasks per job. Every task MUST include time_estimate.
Return ONLY the JSON, no extra text."""

    user_prompt_part1 = "Role to analyse: " + role + "\n\n"
    user_prompt_part1 = user_prompt_part1 + "Use exact titles:\n"
    user_prompt_part1 = user_prompt_part1 + "- Non-AI title: " + role + "\n"
    user_prompt_part1 = user_prompt_part1 + "- AI title: " + role + " - AI-Augmented\n\n"
    user_prompt_part1 = user_prompt_part1 + "Live IT job-market trends (scraped context):\n\n"
    user_prompt_part1 = user_prompt_part1 + context_block + "\n\n"
    user_prompt_part1 = user_prompt_part1 + "Generate the job descriptions now."

    # call llm for job descriptions
    raw_part1 = call_llm("chat", build_messages(system_prompt_part1, user_prompt_part1))
    part1 = parse_llm_json(raw_part1)

    if part1 is None:
        print("LLM returned nothing useful for part 1")
        return None

    # handle if llm returned a list instead of object
    if type(part1) == list:
        found = None
        for item in part1:
            if type(item) == dict:
                found = item
                break
        part1 = found if found is not None else {}

    # get both job objects
    job_no_ai = part1.get("job_without_ai", {})
    job_with_ai = part1.get("job_with_ai", {})

    # make sure both are dicts
    if type(job_no_ai) != dict:
        job_no_ai = {}
    if type(job_with_ai) != dict:
        job_with_ai = {}

    if not _job_has_core_content(job_with_ai):
        repair_system = """You are an expert IT workforce strategist.
Return ONLY valid JSON for an AI-augmented version of the role.
Output format:
{
    "job_with_ai": {
        "title": "Exact role title - AI-Augmented",
        "description": "2-sentence overview with AI integration",
        "tasks": [
            {"task": "AI-enhanced task", "time_estimate": "X h/week"}
        ]
    }
}
Include 6 to 10 tasks with concrete time_estimate."""

        repair_user = (
            "Role: " + role + "\n\n"
            + "Existing non-AI job context:\n"
            + json.dumps(job_no_ai) + "\n\n"
            + "Generate only the AI-augmented section now."
        )
        repaired = parse_llm_json(call_llm("chat", build_messages(repair_system, repair_user)))

        if type(repaired) == dict:
            if type(repaired.get("job_with_ai")) == dict:
                job_with_ai = repaired.get("job_with_ai")
            elif "title" in repaired or "description" in repaired or "tasks" in repaired:
                job_with_ai = repaired

    job_no_ai = _normalize_job_block(role, job_no_ai, ai_mode=False)
    job_with_ai = _normalize_job_block(
        role,
        job_with_ai,
        ai_mode=True,
        reference_tasks=job_no_ai.get("tasks", []),
    )

    # call llm for analysis sections
    system_prompt_part2 = """You are an expert AI-integration consultant for IT teams.
        Given an IT role, produce ONLY this JSON:
        {
        "skill_gaps": ["Gap 1", "Gap 2", "Gap 3", "Gap 4"],
        "work_responsibility_transformations": ["Transformation 1", "Transformation 2"],
        "ai_integration_recommendations": ["Recommendation 1", "Recommendation 2"],
        "workforce_development_strategies": ["Strategy 1", "Strategy 2"],
        "workforce_sustainability_impact": ["Impact 1", "Impact 2"],
        "practical_advice_for_teams": ["Advice 1", "Advice 2"]
        }
        At least 4 items per list. Return ONLY the JSON, no extra text."""

    user_prompt_part2 = "Role to analyse: " + role + "\n\n"
    user_prompt_part2 = user_prompt_part2 + "Live IT job-market trends (scraped context):\n\n"
    user_prompt_part2 = user_prompt_part2 + context_block + "\n\n"
    user_prompt_part2 = user_prompt_part2 + "Generate the analysis sections now."

    raw_part2 = call_llm("chat", build_messages(system_prompt_part2, user_prompt_part2))
    part2 = parse_llm_json(raw_part2)

    if part2 is None:
        part2 = {}

    if type(part2) == list:
        found = None
        for item in part2:
            if type(item) == dict:
                found = item
                break
        part2 = found if found is not None else {}

    # build comparison report
    comparison = build_comparison_report(role, job_no_ai, job_with_ai)

    result = {
        "success": True,
        "role": role,
        "scraped_sources": scraped_sources,
        "data": {
            "job_without_ai": job_no_ai,
            "job_with_ai": job_with_ai,
            "comparative_analysis_report": comparison,
            "skill_gaps": part2.get("skill_gaps", []),
            "work_responsibility_transformations": part2.get("work_responsibility_transformations", []),
            "ai_integration_recommendations": part2.get("ai_integration_recommendations", []),
            "workforce_development_strategies": part2.get("workforce_development_strategies", []),
            "workforce_sustainability_impact": part2.get("workforce_sustainability_impact", []),
            "practical_advice_for_teams": part2.get("practical_advice_for_teams", [])
        }
    }

    return result

# --------------------------------------------------------------------------------------------------------

# --- SIMPLE HEALTH CHECK ---
def check_health():
    status = {}

    # check llm
    try:
        list_available_models()
        status["llm"] = "connected"
    except Exception:
        status["llm"] = "disconnected"

    # check database
    try:
        conn = connect_db()
        cursor = conn.cursor()
        cursor.execute("SELECT 1")
        cursor.close()
        conn.close()
        status["database"] = "connected"
    except Exception:
        status["database"] = "disconnected"

    all_good = True
    for key in status:
        if status[key] != "connected":
            all_good = False

    return {
        "success": all_good,
        "services": status,
        "model": OLLAMA_MODEL_CHAT,
        "models": {
            "chat": OLLAMA_MODEL_CHAT,
            "extract": OLLAMA_MODEL_EXTRACT,
        },
    }


app = FastAPI(
    title="SkillPulse AI",
    description="Skill analysis, roadmap generation, and AI-augmented IT role insights",
    version="1.0.0",
)


def _extract_bearer_token(request):
    auth_header = request.headers.get("authorization", "")
    if auth_header.lower().startswith("bearer "):
        return auth_header[7:].strip()
    return ""


def _is_public_path(path):
    return path == "/health"


@app.middleware("http")
async def service_auth_middleware(request: Request, call_next):
    if not AI_REQUIRE_AUTH or _is_public_path(request.url.path) or request.method == "OPTIONS":
        return await call_next(request)

    presented = request.headers.get("x-ai-service-token", "").strip() or _extract_bearer_token(request)
    if not presented or not hmac.compare_digest(presented, AI_SERVICE_TOKEN):
        return JSONResponse(status_code=401, content={"detail": "Unauthorized AI service access"})

    return await call_next(request)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=("*" not in CORS_ORIGINS),
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(ai_chat_router)
app.include_router(ai_market_trends_router)
app.include_router(ai_profile_extract_router)
app.include_router(ai_roadmap_router)
app.include_router(ai_skill_gap_router)


@app.on_event("startup")
async def startup_event():
    await initialize_ai_chat_runtime(app)


@app.on_event("shutdown")
async def shutdown_event():
    await shutdown_ai_chat_runtime(app)


@app.get("/health")
async def health_endpoint():
    return check_health()


@app.post("/analyze-skill-gaps")
async def analyze_skill_gaps_endpoint(payload: dict):
    user_id = str(payload.get("user_id", "")).strip()
    if user_id == "":
        raise HTTPException(status_code=400, detail="Field 'user_id' is required.")

    target_role = payload.get("target_role")
    if target_role is not None:
        target_role = str(target_role).strip() or None

    result = analyze_skill_gaps(user_id, target_role)
    if result is None:
        raise HTTPException(status_code=400, detail="Could not analyze skill gaps for this user.")
    return result


@app.post("/generate-roadmap")
async def generate_roadmap_endpoint(payload: dict):
    user_id = str(payload.get("user_id", "")).strip()
    if user_id == "":
        raise HTTPException(status_code=400, detail="Field 'user_id' is required.")

    target_role = payload.get("target_role")
    if target_role is not None:
        target_role = str(target_role).strip() or None

    timeframe_months = payload.get("timeframe_months", 6)
    try:
        timeframe_months = int(timeframe_months)
    except Exception:
        raise HTTPException(status_code=400, detail="Field 'timeframe_months' must be an integer.")
    if timeframe_months < 1 or timeframe_months > 24:
        raise HTTPException(status_code=400, detail="Field 'timeframe_months' must be between 1 and 24.")

    result = generate_roadmap(user_id, target_role, timeframe_months)
    if result is None:
        raise HTTPException(status_code=400, detail="Could not generate roadmap for this user.")
    return result


@app.post("/recommend") 
async def recommend_endpoint(payload: dict):
    user_id = str(payload.get("user_id", "")).strip()
    if user_id == "":
        raise HTTPException(status_code=400, detail="Field 'user_id' is required.")

    count = payload.get("count", 5)
    try:
        count = int(count)
    except Exception:
        raise HTTPException(status_code=400, detail="Field 'count' must be an integer.")
    if count < 1 or count > 20:
        raise HTTPException(status_code=400, detail="Field 'count' must be between 1 and 20.")

    result = get_recommendations(user_id, count)
    if result is None:
        raise HTTPException(status_code=400, detail="Could not generate recommendations for this user.")
    return result


@app.post("/career-advice")
async def career_advice_endpoint(payload: dict):
    question = str(payload.get("question", "")).strip()
    if len(question) < 5:
        raise HTTPException(status_code=400, detail="Field 'question' is required and must contain at least 5 characters.")

    user_id = payload.get("user_id")
    if user_id is not None:
        user_id = str(user_id).strip() or None

    result = get_career_advice(question, user_id)
    if result is None:
        raise HTTPException(status_code=400, detail="Could not generate career advice.")
    return result


@app.post("/generate-job-description")
async def generate_job_description_endpoint(payload: dict):
    role = str(payload.get("role", "")).strip()
    if len(role) < 2:
        raise HTTPException(status_code=400, detail="Field 'role' is required and must contain at least 2 characters.")

    per_source_limit = payload.get("per_source_limit", 5)
    try:
        per_source_limit = int(per_source_limit)
    except Exception:
        raise HTTPException(status_code=400, detail="Field 'per_source_limit' must be an integer.")
    if per_source_limit < 1 or per_source_limit > 10:
        raise HTTPException(status_code=400, detail="Field 'per_source_limit' must be between 1 and 10.")

    result = generate_job_description(role, per_source_limit)
    if result is None:
        raise HTTPException(
            status_code=400,
            detail=(
                f"The role '{role}' is not in the IT domain or the generation failed. "
                "This endpoint only analyses IT roles."
            ),
        )
    return result


@app.get("/models")
async def models_endpoint():
    try:
        models = list_available_models()
        return {
            "success": True,
            "current_model": OLLAMA_MODEL_CHAT,
            "current_models": {
                "chat": OLLAMA_MODEL_CHAT,
                "extract": OLLAMA_MODEL_EXTRACT,
            },
            "available": models,
        }
    except Exception as exc:
        raise HTTPException(status_code=503, detail=f"Ollama unreachable: {exc}")


# --- MAIN: run FastAPI app ---
if __name__ == "__main__":
    uvicorn.run(
        "backend:app",
        host=API_HOST,
        port=API_PORT,
        reload=AI_RELOAD,
        log_level="info",
    )
