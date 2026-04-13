from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field, field_validator


SkillLevel = Literal["beginner", "intermediate", "advanced", "expert"]
GapPriority = Literal["high", "medium", "low"]
GapSeverity = Literal["critical", "moderate", "minor"]


class AISkillGapAnalysisRequest(BaseModel):
    profile: dict[str, Any] = Field(default_factory=dict)
    target_role: str = Field(..., min_length=2, max_length=255)

    @field_validator("target_role")
    @classmethod
    def strip_target_role(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("Field 'target_role' must not be blank.")
        return cleaned


class StrengthItem(BaseModel):
    skill: str
    current_level: SkillLevel
    target_level: SkillLevel
    why_it_matters: str
    category: str


class MissingSkillItem(BaseModel):
    skill: str
    target_level: SkillLevel
    priority: GapPriority
    gap_severity: GapSeverity
    why_it_matters: str
    category: str


class PartialGapItem(BaseModel):
    skill: str
    current_level: SkillLevel
    target_level: SkillLevel
    priority: GapPriority
    gap_severity: GapSeverity
    why_it_matters: str
    category: str


class SkillGapRecommendation(BaseModel):
    title: str
    priority: GapPriority
    action: str
    reason: str


class SkillGapAnalysisMeta(BaseModel):
    matched_role_key: str
    current_skill_count: int = 0
    explicit_skill_count: int = 0
    ai_skill_count: int = 0
    source: str = "role_taxonomy"


class AISkillGapAnalysisResponse(BaseModel):
    target_role: str
    strengths: list[StrengthItem] = Field(default_factory=list)
    missing_skills: list[MissingSkillItem] = Field(default_factory=list)
    partial_gaps: list[PartialGapItem] = Field(default_factory=list)
    recommendations: list[SkillGapRecommendation] = Field(default_factory=list)
    meta: SkillGapAnalysisMeta
