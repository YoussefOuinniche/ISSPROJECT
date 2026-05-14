from __future__ import annotations

import json
from datetime import date, datetime
from typing import Any


def _json_default(value: Any) -> str:
    if isinstance(value, (datetime, date)):
        return value.isoformat()
    return str(value)


SYSTEM_INSTRUCTION = """You are NexaPath AI. Run a short career assessment to build the user's roadmap.

RULES
- Replies under 70 words. Plain language. No emojis. One question per message.
- Off-topic asks (code, jokes, trivia): reply only "Let's keep going — [repeat current question]".
- The target role is whatever the user names — cybersecurity stays cybersecurity, embedded stays embedded. Never substitute or reroute.

FLOW (in order, one question per message)
PHASE 1 — intro:
  Q1 "What's your name?"
  Q2 "What's your background — current role/studies and highest diploma?"
  Q3 "Which role are you aiming for?"
  Then confirm in one line: "Got it — we'll focus on <role>." and move to PHASE 2.

PHASE 2 — 5 basic questions tailored to the user's role. Mix at least 2 MCQ and at least 2 open-text.
  MCQ format exactly:
    **Q1/5 — Basic:** <question>
    1) <option>
    2) <option>
    3) <option>
    4) <option>
  Score each answer 1–10 internally. One short sentence of feedback, then next question.
  After Q5: say "Basic phase done — checking your answers…"

PHASE 3 — decide:
  basic avg < 4 → go to PHASE 4 with "Foundation-first roadmap incoming."
  basic avg ≥ 4 → run PHASE 3b.

PHASE 3b — 5 advanced questions (same MCQ/text mix), labelled "**Q1/5 — Advanced:**" etc.

PHASE 4 — wrap up:
  2 short lines summarising level + biggest gaps.
  Then: "Tap Generate Roadmap to build your plan."

STATE
Use the chat history to know which question is next. Never repeat answered ones."""


def build_chat_messages(
    system_instruction: str,
    recent_messages: list[dict[str, Any]],
    profile: dict[str, Any],
    user_message: str,
) -> list[dict[str, str]]:
    profile_block = json.dumps(profile or {}, indent=2, ensure_ascii=False, default=_json_default)

    # Determine which questionnaire fields are already known
    known_fields = _extract_known_fields(profile, recent_messages)

    system_prompt = (
        f"{SYSTEM_INSTRUCTION}\n\n"
        "## ALREADY COLLECTED FROM PROFILE & HISTORY\n"
        f"{known_fields}\n\n"
        "## FULL USER PROFILE (for context)\n"
        f"{profile_block}"
    )

    messages: list[dict[str, str]] = [{"role": "system", "content": system_prompt}]
    for item in recent_messages:
        role = str(item.get("role") or "user").strip().lower()
        if role not in {"system", "user", "assistant"}:
            role = "user"

        content = str(item.get("message") or "").strip()
        if not content:
            continue

        messages.append({"role": role, "content": content})

    messages.append({"role": "user", "content": user_message.strip()})
    return messages


def _extract_known_fields(profile: dict[str, Any], recent_messages: list[dict[str, Any]]) -> str:
    """Build a summary of what we already know about the user from profile and history."""
    known: list[str] = []

    target_role = profile.get("target_role") or profile.get("goals", [None])[0] if profile.get("goals") else None
    if target_role:
        known.append(f"- Target role: {target_role}")

    skills = profile.get("skills", [])
    if skills:
        skill_names = [s.get("name", str(s)) if isinstance(s, dict) else str(s) for s in skills[:8]]
        known.append(f"- Current skills: {', '.join(skill_names)}")

    education = profile.get("education")
    if education:
        known.append(f"- Education: {education}")

    experience = profile.get("experience")
    if experience:
        known.append(f"- Experience: {experience}")

    if not known:
        return "Nothing collected yet — start from Phase 1 / Q1 (ask their name)."

    return "\n".join(known)
