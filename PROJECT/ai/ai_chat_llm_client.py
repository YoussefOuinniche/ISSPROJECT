from __future__ import annotations

import logging
import re
from typing import Any

import httpx

from ai_chat_config import AIChatSettings


logger = logging.getLogger(__name__)


class LLMTimeoutError(RuntimeError):
    pass


class LLMRequestError(RuntimeError):
    pass


_WORD_RE = re.compile(r"[A-Za-z]{2,}")


def _looks_like_gibberish(text: str) -> bool:
    """Heuristic: detect garbage token output (broken chat template / corrupt weights).

    Returns True when the response is dominated by non-letter symbols or has
    almost no recognisable English-like words.
    """
    body = text.strip()
    if len(body) < 12:
        return False
    letters = sum(1 for c in body if c.isalpha())
    letter_ratio = letters / max(1, len(body))
    word_count = len(_WORD_RE.findall(body))
    word_density = word_count / max(1, len(body) / 6)  # rough words-per-token proxy
    return letter_ratio < 0.45 or word_density < 0.25


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
        # Conservative sampling — guards against the random-token gibberish
        # some Ollama builds produce when defaults drift.
        "temperature": 0.3,
        "top_p": 0.9,
        "frequency_penalty": 0.3,
        "presence_penalty": 0.2,
        # Cap output length so each questionnaire turn returns in seconds,
        # not the full default 2k-token budget which can stall a local
        # Ollama machine for minutes.
        "max_tokens": 220,
        # Hard stop tokens — abort the moment the model tries to roleplay
        # both sides, dumps a system tag, or wanders past one turn.
        "stop": ["<|im_end|>", "<|endoftext|>", "\n\nUser:", "\nUser:"],
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

    cleaned = content.strip()
    if _looks_like_gibberish(cleaned):
        logger.error(
            "LLM produced gibberish output (likely broken chat template / corrupt weights): %r",
            cleaned[:160],
        )
        raise LLMRequestError(
            "The model returned garbled output. Try re-pulling the Ollama model "
            "(`ollama pull qwen2.5:14b`) or switching OLLAMA_MODEL_CHAT to qwen2:7b."
        )

    return cleaned
