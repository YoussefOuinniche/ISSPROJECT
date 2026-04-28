from __future__ import annotations

from fastapi import APIRouter, HTTPException

from ai_roadmap_models import AIRoadmapGenerateRequest, AIRoadmapGenerateResponse
from ai_roadmap_service import AIRoadmapServiceError, handle_generate


router = APIRouter(prefix="/ai", tags=["ai-roadmap"])


@router.post("/generate-roadmap", response_model=AIRoadmapGenerateResponse)
async def generate_roadmap_endpoint(
    payload: AIRoadmapGenerateRequest,
) -> AIRoadmapGenerateResponse:
    try:
        return await handle_generate(payload)
    except AIRoadmapServiceError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.detail) from exc
