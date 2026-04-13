from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from pydantic import BaseModel, Field
from fastapi import APIRouter, HTTPException

from market_intelligence_service.scheduler import refresh_trends_for_role, refresh_trends_for_roles
from market_intelligence_service.storage import get_global_trends, get_trends


router = APIRouter(prefix="/trends", tags=["market-trends"])


class RefreshTrendsRequest(BaseModel):
    role: str | None = Field(default=None, description="Role to refresh trends for")
    roles: list[str] | None = Field(default=None, description="Roles for scheduled batch refresh")
    search_limit: int = Field(default=20, ge=1, le=100)


STALE_AFTER_HOURS = 24


def _to_utc_datetime(value: Any) -> datetime | None:
    if isinstance(value, datetime):
        if value.tzinfo is None:
            return value.replace(tzinfo=timezone.utc)
        return value.astimezone(timezone.utc)

    if isinstance(value, str) and value.strip():
        raw = value.strip()
        if raw.endswith("Z"):
            raw = raw[:-1] + "+00:00"
        try:
            parsed = datetime.fromisoformat(raw)
        except ValueError:
            return None
        if parsed.tzinfo is None:
            return parsed.replace(tzinfo=timezone.utc)
        return parsed.astimezone(timezone.utc)

    return None


def _extract_latest_updated_at(rows: list[dict[str, Any]]) -> datetime | None:
    latest: datetime | None = None
    for row in rows:
        candidate = _to_utc_datetime(row.get("updated_at"))
        if candidate is None:
            continue
        if latest is None or candidate > latest:
            latest = candidate
    return latest


def _is_stale(latest_updated_at: datetime | None) -> bool:
    if latest_updated_at is None:
        return True
    age_seconds = (datetime.now(timezone.utc) - latest_updated_at).total_seconds()
    return age_seconds > (STALE_AFTER_HOURS * 3600)


def _truthy_flag(value: str | None, default: bool = True) -> bool:
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


@router.get("/role/{role}")
async def get_role_trends_endpoint(
    role: str,
    limit: int = 100,
    refresh_if_stale: str | None = None,
):
    clean_role = " ".join(role.split()).strip()
    if not clean_role:
        raise HTTPException(status_code=400, detail="Role is required.")

    safe_limit = max(1, min(limit, 500))
    trends = get_trends(clean_role, limit=safe_limit)
    latest_updated_at = _extract_latest_updated_at(trends)
    stale = _is_stale(latest_updated_at)

    did_trigger_background_refresh = False
    if stale and _truthy_flag(refresh_if_stale, default=True):
        did_trigger_background_refresh = True
        refresh_trends_for_role(clean_role)

    return {
        "success": True,
        "role": clean_role,
        "count": len(trends),
        "stale": stale,
        "stale_after_hours": STALE_AFTER_HOURS,
        "latest_updated_at": latest_updated_at.isoformat() if latest_updated_at else None,
        "background_refresh_triggered": did_trigger_background_refresh,
        "trends": trends,
    }


@router.get("/global")
async def get_global_trends_endpoint(limit: int = 100):
    safe_limit = max(1, min(limit, 500))
    trends = get_global_trends(limit=safe_limit)
    latest_updated_at = _extract_latest_updated_at(trends)
    stale = _is_stale(latest_updated_at)

    return {
        "success": True,
        "count": len(trends),
        "stale": stale,
        "stale_after_hours": STALE_AFTER_HOURS,
        "latest_updated_at": latest_updated_at.isoformat() if latest_updated_at else None,
        "trends": trends,
    }


@router.post("/refresh")
async def refresh_role_trends_endpoint(payload: RefreshTrendsRequest):
    requested_role = " ".join((payload.role or "").split()).strip()
    requested_roles = [" ".join(str(item).split()).strip() for item in (payload.roles or []) if str(item).strip()]

    if requested_roles:
        result = refresh_trends_for_roles(requested_roles, search_limit=payload.search_limit)
    elif requested_role:
        result = refresh_trends_for_role(requested_role, search_limit=payload.search_limit)
    else:
        raise HTTPException(status_code=400, detail="Provide 'role' or non-empty 'roles'.")

    if not result.get("success"):
        raise HTTPException(status_code=500, detail=result.get("error", "Trend refresh failed."))
    return result
