from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Request

from ai_profile_extract_models import AIProfileExtractRequest, AIProfileExtractResponse
from ai_profile_extract_service import (
    AIProfileExtractService,
    AIProfileExtractServiceError,
)


router = APIRouter(prefix="/ai", tags=["ai-profile-extract"])


def get_ai_profile_extract_service(request: Request) -> AIProfileExtractService:
    service = getattr(request.app.state, "ai_profile_extract_service", None)
    if service is None:
        raise HTTPException(status_code=503, detail="AI profile extraction service is unavailable.")
    return service


@router.post("/extract-profile", response_model=AIProfileExtractResponse)
async def extract_profile_endpoint(
    payload: AIProfileExtractRequest,
    service: AIProfileExtractService = Depends(get_ai_profile_extract_service),
) -> AIProfileExtractResponse:
    try:
        return await service.handle_extract_profile(payload)
    except AIProfileExtractServiceError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.detail) from exc
