from __future__ import annotations

import json
from datetime import date, datetime
from typing import Any


def _json_default(value: Any) -> str:
    if isinstance(value, (datetime, date)):
        return value.isoformat()
    return str(value)

def build_chat_messages(
    system_instruction: str,
    recent_messages: list[dict[str, Any]],
    profile: dict[str, Any],
    user_message: str,
) -> list[dict[str, str]]:
    profile_block = json.dumps(profile or {}, indent=2, ensure_ascii=False, default=_json_default)

    system_prompt = (
        f"{system_instruction}\n\n"
        "Use the structured profile below together with the recent conversation.\n"
        "If profile details are missing, acknowledge the gap and ask a focused follow-up question.\n"
        "If skill gaps or a learning roadmap exist, anchor the answer to them instead of giving generic advice.\n"
        "Prefer a short answer with one concrete next step and one useful follow-up question when needed.\n"
        "Never claim the user has a skill unless it appears in the stored profile or conversation.\n\n"
        f"User profile:\n{profile_block}"
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
