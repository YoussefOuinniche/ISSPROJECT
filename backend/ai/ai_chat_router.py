from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Request

from ai_chat_models import AIChatRequest, AIChatResponse
from ai_chat_service import AIChatService, AIChatServiceError


router = APIRouter(prefix="/ai", tags=["ai-chat"])


def get_ai_chat_service(request: Request) -> AIChatService:
    service = getattr(request.app.state, "ai_chat_service", None)
    if service is None:
        raise HTTPException(status_code=503, detail="AI chat service is unavailable.")
    return service


@router.post("/chat", response_model=AIChatResponse)
async def chat_endpoint(
    payload: AIChatRequest,
    service: AIChatService = Depends(get_ai_chat_service),
) -> AIChatResponse:
    try:
        return await service.handle_chat(payload)
    except AIChatServiceError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.detail) from exc
