from __future__ import annotations

from typing import Any, Literal
from uuid import UUID

from pydantic import BaseModel, Field, field_validator


SkillLevel = Literal["beginner", "intermediate", "advanced"]


class AIProfileExtractRequest(BaseModel):
    user_id: str = Field(..., min_length=1, max_length=128)
    message: str = Field(..., min_length=1, max_length=4000)
    existing_profile: dict[str, Any] = Field(default_factory=dict)

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


class ExtractedSkill(BaseModel):
    name: str
    level: SkillLevel


class ExtractedProfile(BaseModel):
    skills: list[ExtractedSkill] = Field(default_factory=list)
    goals: list[str] = Field(default_factory=list)
    experience_years: float | None = None
    education: list[str] = Field(default_factory=list)
    interests: list[str] = Field(default_factory=list)


class AIProfileExtractResponse(BaseModel):
    extracted: ExtractedProfile
    confidence: float
