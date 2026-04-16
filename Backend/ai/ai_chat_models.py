from __future__ import annotations

from typing import Any
from uuid import UUID

from pydantic import BaseModel, Field, field_validator


class AIChatRequest(BaseModel):
    user_id: str = Field(..., min_length=1, max_length=128)
    message: str = Field(..., min_length=1, max_length=4000)
    recent_messages: list[dict[str, Any]] = Field(default_factory=list)
    profile: dict[str, Any] = Field(default_factory=dict) 
    skill_catalog: list[str] = Field(default_factory=list)

    @field_validator("user_id", "message")
    @classmethod
    def strip_required_value(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("Value must not be blank.")
        return cleaned

    @field_validator("user_id")
    @classmethod
    def validate_uuid_like_user_id(cls, value: str) -> str:
        try:
            UUID(value)
        except ValueError as exc:
            raise ValueError("Field 'user_id' must be a valid UUID string.") from exc
        return value


class ConversationSummary(BaseModel):
    skills_mentioned: list[str] = Field(default_factory=list)
    goals_mentioned: list[str] = Field(default_factory=list)


class AIChatResponse(BaseModel):
    response: str
    message_id: str | None = None
    conversation_summary: ConversationSummary = Field(default_factory=ConversationSummary)
    degraded: bool = False
