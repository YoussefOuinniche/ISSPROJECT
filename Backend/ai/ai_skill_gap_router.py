from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Request

from ai_skill_gap_models import AISkillGapAnalysisRequest, AISkillGapAnalysisResponse
from ai_skill_gap_service import AISkillGapService, AISkillGapServiceError


router = APIRouter(prefix="/ai", tags=["ai-skill-gap"])


def get_ai_skill_gap_service(request: Request) -> AISkillGapService:
    service = getattr(request.app.state, "ai_skill_gap_service", None)
    if service is None:
        raise HTTPException(status_code=503, detail="AI skill-gap service is unavailable.")
    return service


@router.post("/skill-gap-analysis", response_model=AISkillGapAnalysisResponse)
async def skill_gap_analysis_endpoint(
    payload: AISkillGapAnalysisRequest,
    service: AISkillGapService = Depends(get_ai_skill_gap_service),
) -> AISkillGapAnalysisResponse:
    try:
        return await service.handle_analysis(payload)
    except AISkillGapServiceError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.detail) from exc
