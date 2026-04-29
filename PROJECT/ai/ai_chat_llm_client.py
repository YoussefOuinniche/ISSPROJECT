from __future__ import annotations

import logging
from typing import Any

import httpx

from ai_chat_config import AIChatSettings


logger = logging.getLogger(__name__)


class LLMTimeoutError(RuntimeError):
    pass


class LLMRequestError(RuntimeError):
    pass


def _extract_response_content(payload: dict[str, Any]) -> str:
    choices = payload.get("choices")
    if not isinstance(choices, list) or not choices:
        return ""

    message = choices[0].get("message") or {}
    content = message.get("content")
    if isinstance(content, str):
        return content

    if isinstance(content, list):
        parts: list[str] = []
        for item in content:
            if isinstance(item, dict) and item.get("type") == "text":
                text = str(item.get("text") or "").strip()
                if text:
                    parts.append(text)
        return "\n".join(parts)

    return ""


async def create_chat_completion(
    http_client: httpx.AsyncClient,
    settings: AIChatSettings,
    messages: list[dict[str, str]],
) -> str:
    payload = {
        "model": settings["ollama_model"],
        "messages": messages,
        "temperature": 0.3,
    }
    headers = {}
    if settings["ollama_api_key"]:
        headers["Authorization"] = f"Bearer {settings['ollama_api_key']}"

    try:
        response = await http_client.post(
            "/chat/completions",
            json=payload,
            headers=headers,
        )
    except httpx.TimeoutException as exc:
        raise LLMTimeoutError("Timed out while waiting for the LLM response.") from exc
    except httpx.HTTPError as exc:
        raise LLMRequestError("Failed to reach the LLM service.") from exc

    if response.status_code >= 400:
        logger.error(
            "LLM request failed with status %s: %s",
            response.status_code,
            response.text,
        )
        raise LLMRequestError("The LLM service rejected the request.")

    try:
        payload = response.json()
    except ValueError as exc:
        raise LLMRequestError("The LLM service returned invalid JSON.") from exc

    content = _extract_response_content(payload)
    if not content:
        raise LLMRequestError("The LLM service returned an empty response.")

    return content.strip()
