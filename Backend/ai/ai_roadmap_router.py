from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Request

from ai_roadmap_models import AIRoadmapGenerateRequest, AIRoadmapGenerateResponse
from ai_roadmap_service import AIRoadmapService, AIRoadmapServiceError


router = APIRouter(prefix="/ai", tags=["ai-roadmap"])


def get_ai_roadmap_service(request: Request) -> AIRoadmapService:
    service = getattr(request.app.state, "ai_roadmap_service", None)
    if service is None:
        raise HTTPException(status_code=503, detail="AI roadmap service is unavailable.")
    return service


@router.post("/generate-roadmap", response_model=AIRoadmapGenerateResponse)
async def generate_roadmap_endpoint(
    payload: AIRoadmapGenerateRequest,
    service: AIRoadmapService = Depends(get_ai_roadmap_service),
) -> AIRoadmapGenerateResponse:
    try:
        return await service.handle_generate(payload)
    except AIRoadmapServiceError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.detail) from exc
