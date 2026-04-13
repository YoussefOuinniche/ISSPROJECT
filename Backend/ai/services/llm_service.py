from __future__ import annotations

import json
import logging
import os
from copy import deepcopy
from typing import Any, Literal

import httpx


logger = logging.getLogger(__name__)

LLMTask = Literal["chat", "extract"]

SAFE_EXTRACT_FALLBACK = {
    "skills": [],
    "goals": [],
    "experience_years": None,
    "education": [],
    "interests": [],
}


def _env_float(name: str, default: float) -> float:
    raw = os.getenv(name)
    if raw is None or str(raw).strip() == "":
        return default

    try:
        return float(raw)
    except (TypeError, ValueError):
        return default


def normalize_ollama_url(raw_url: str | None) -> str:
    cleaned = (raw_url or "http://localhost:11434").strip().rstrip("/")
    if not cleaned.endswith("/v1"):
        cleaned = f"{cleaned}/v1"
    return cleaned


def get_ollama_config() -> dict[str, Any]:
    chat_model = (
        os.getenv("OLLAMA_MODEL_CHAT")
        or os.getenv("OLLAMA_MODEL")
        or "qwen2.5:3b"
    ).strip()
    extract_model = (
        os.getenv("OLLAMA_MODEL_EXTRACT")
        or chat_model
    ).strip()

    return {
        "ollama_url": normalize_ollama_url(os.getenv("OLLAMA_URL", "http://localhost:11434/v1")),
        "ollama_api_key": os.getenv("OLLAMA_API_KEY", "ollama").strip(),
        "chat_model": chat_model,
        "extract_model": extract_model,
        "timeout_seconds": max(5.0, _env_float("AI_TIMEOUT_SECONDS", 300.0)),
        "connect_timeout_seconds": max(1.0, _env_float("AI_CONNECT_TIMEOUT_SECONDS", 10.0)),
        "chat_temperature": _env_float("AI_TEMPERATURE", 0.7),
        "extract_temperature": _env_float("AI_EXTRACT_TEMPERATURE", 0.0),
    }


def get_model_for_task(task: LLMTask) -> str:
    config = get_ollama_config()
    if task == "extract":
        return config["extract_model"]
    return config["chat_model"]


def build_messages(system_prompt: str, user_prompt: str) -> list[dict[str, str]]:
    return [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_prompt},
    ]


def _build_httpx_client(config: dict[str, Any]) -> httpx.Client:
    return httpx.Client(
        base_url=config["ollama_url"],
        timeout=httpx.Timeout(
            timeout=config["timeout_seconds"],
            connect=config["connect_timeout_seconds"],
        ),
        headers={"Content-Type": "application/json"},
    )


def _extract_text_from_payload(payload: dict[str, Any]) -> str:
    choices = payload.get("choices")
    if not isinstance(choices, list) or not choices:
        return ""

    message = choices[0].get("message") or {}
    content = message.get("content")
    if isinstance(content, str):
        return content

    if isinstance(content, list):
        text_parts: list[str] = []
        for part in content:
            if isinstance(part, dict) and part.get("type") == "text":
                text_value = str(part.get("text") or "").strip()
                if text_value:
                    text_parts.append(text_value)
        return "\n".join(text_parts)

    return ""


def _request_completion(
    *,
    task: LLMTask,
    messages: list[dict[str, Any]],
    model: str,
    config: dict[str, Any],
) -> str | None:
    payload = {
        "model": model,
        "messages": messages,
        "temperature": (
            config["extract_temperature"] if task == "extract" else config["chat_temperature"]
        ),
    }
    headers = {}
    if config["ollama_api_key"]:
        headers["Authorization"] = f"Bearer {config['ollama_api_key']}"

    with _build_httpx_client(config) as client:
        response = client.post("/chat/completions", json=payload, headers=headers)
        response.raise_for_status()
        response_payload = response.json()
        text = _extract_text_from_payload(response_payload).strip()
        return text or None


def _try_parse_json(text: str) -> Any | None:
    cleaned = text.strip()
    if not cleaned:
        return None

    if cleaned.startswith("```"):
        lines = cleaned.splitlines()
        cleaned = "\n".join(lines[1:])

    if cleaned.endswith("```"):
        cleaned = cleaned[: cleaned.rfind("```")]

    cleaned = cleaned.strip()

    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        pass

    object_start = cleaned.find("{")
    object_end = cleaned.rfind("}")
    if object_start != -1 and object_end > object_start:
        candidate = cleaned[object_start:object_end + 1]
        try:
            return json.loads(candidate)
        except json.JSONDecodeError:
            pass

    array_start = cleaned.find("[")
    array_end = cleaned.rfind("]")
    if array_start != -1 and array_end > array_start:
        candidate = cleaned[array_start:array_end + 1]
        try:
            return json.loads(candidate)
        except json.JSONDecodeError:
            pass

    return None


def _build_extract_retry_messages(messages: list[dict[str, Any]]) -> list[dict[str, Any]]:
    retry_messages = deepcopy(messages)
    retry_instruction = "Return ONLY valid JSON."

    if retry_messages and retry_messages[0].get("role") == "system":
        original_content = str(retry_messages[0].get("content") or "").rstrip()
        retry_messages[0]["content"] = f"{original_content}\n\n{retry_instruction}"
    else:
        retry_messages.insert(0, {"role": "system", "content": retry_instruction})

    retry_messages.append({"role": "user", "content": retry_instruction})
    return retry_messages


def call_llm(task: LLMTask, messages: list[dict[str, Any]]) -> str | dict[str, Any] | list[Any] | None:
    if task not in {"chat", "extract"}:
        raise ValueError("task must be either 'chat' or 'extract'")

    config = get_ollama_config()
    model = get_model_for_task(task)
    attempt_messages = deepcopy(messages)

    for attempt in range(2):
        logger.info(
            "Calling LLM task=%s model=%s attempt=%s",
            task,
            model,
            attempt + 1,
        )
        try:
            response_text = _request_completion(
                task=task,
                messages=attempt_messages,
                model=model,
                config=config,
            )
        except httpx.TimeoutException:
            logger.exception("Timed out calling LLM task=%s model=%s", task, model)
            return deepcopy(SAFE_EXTRACT_FALLBACK) if task == "extract" else None
        except httpx.HTTPError:
            logger.exception("HTTP failure while calling LLM task=%s model=%s", task, model)
            return deepcopy(SAFE_EXTRACT_FALLBACK) if task == "extract" else None
        except Exception:
            logger.exception("Unexpected LLM failure task=%s model=%s", task, model)
            return deepcopy(SAFE_EXTRACT_FALLBACK) if task == "extract" else None

        if not response_text:
            logger.warning(
                "Empty LLM response task=%s model=%s attempt=%s",
                task,
                model,
                attempt + 1,
            )
            if attempt == 0:
                logger.info("Retrying LLM request after empty response task=%s model=%s", task, model)
                if task == "extract":
                    attempt_messages = _build_extract_retry_messages(messages)
                continue

            return deepcopy(SAFE_EXTRACT_FALLBACK) if task == "extract" else None

        if task == "chat":
            return response_text

        parsed_json = _try_parse_json(response_text)
        if parsed_json is not None:
            return parsed_json

        logger.warning(
            "Invalid JSON from LLM task=%s model=%s attempt=%s",
            task,
            model,
            attempt + 1,
        )
        if attempt == 0:
            logger.info("Retrying extract request with strict JSON reminder model=%s", model)
            attempt_messages = _build_extract_retry_messages(messages)
            continue

        logger.error("Returning safe extract fallback after repeated invalid JSON model=%s", model)
        return deepcopy(SAFE_EXTRACT_FALLBACK)

    return deepcopy(SAFE_EXTRACT_FALLBACK) if task == "extract" else None


def list_available_models() -> list[str]:
    config = get_ollama_config()
    headers = {}
    if config["ollama_api_key"]:
        headers["Authorization"] = f"Bearer {config['ollama_api_key']}"

    with _build_httpx_client(config) as client:
        response = client.get("/models", headers=headers)
        response.raise_for_status()
        payload = response.json()

    models = payload.get("data", [])
    if not isinstance(models, list):
        return []

    return [str(model.get("id")) for model in models if isinstance(model, dict) and model.get("id")]
