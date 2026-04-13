from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field, field_validator


class AIRoadmapGenerateRequest(BaseModel):
    role: str = Field(..., min_length=2, max_length=255)
    user_profile: dict[str, Any] = Field(default_factory=dict)

    @field_validator("role")
    @classmethod
    def strip_role(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("Field 'role' must not be blank.")
        return cleaned


class RoadmapStage(BaseModel):
    title: str
    items: list[str] = Field(default_factory=list)
    projects: list[str] = Field(default_factory=list)


class RoadmapVisualizationStage(BaseModel):
    title: str
    items: list[str] = Field(default_factory=list)


class VisualizationDatum(BaseModel):
    label: str
    value: float | None = None
    items: list[str] = Field(default_factory=list)
    color: str | None = None


class VisualizationPayload(BaseModel):
    type: Literal["roadmap", "bar_chart", "radar"]
    title: str
    data: list[VisualizationDatum] = Field(default_factory=list)
    stages: list[RoadmapVisualizationStage] = Field(default_factory=list)


class AIRoadmapGenerateResponse(BaseModel):
    role: str
    stages: list[RoadmapStage] = Field(default_factory=list)
    tools: list[str] = Field(default_factory=list)
    final_projects: list[str] = Field(default_factory=list)
    visualization: VisualizationPayload
