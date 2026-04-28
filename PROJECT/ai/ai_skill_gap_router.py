from __future__ import annotations

from fastapi import APIRouter, HTTPException

from ai_skill_gap_models import AISkillGapAnalysisRequest, AISkillGapAnalysisResponse
from ai_skill_gap_service import AISkillGapServiceError, handle_analysis


router = APIRouter(prefix="/ai", tags=["ai-skill-gap"])


@router.post("/skill-gap-analysis", response_model=AISkillGapAnalysisResponse)
async def skill_gap_analysis_endpoint(
    payload: AISkillGapAnalysisRequest,
) -> AISkillGapAnalysisResponse:
    try:
        return await handle_analysis(payload)
    except AISkillGapServiceError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.detail) from exc
