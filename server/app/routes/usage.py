"""Caller-scoped usage (read-only), with or without authentication."""

from __future__ import annotations

from fastapi import APIRouter, Depends, Request

from app.core.limits import effective_limits
from app.core.quota_guard import _key_for_request, quota_service_dep
from app.core.security import AuthenticatedPrincipal, get_current_user_optional
from app.schemas.usage import UsageResponse
from app.services.quota_service import QuotaService, today_utc

router = APIRouter(prefix="/api/v1", tags=["usage"])


@router.get(
    "/usage",
    response_model=UsageResponse,
    summary="Current usage and limits",
    description=(
        "Returns today's job count, limits, and tier for the caller. "
        "Anonymous callers are keyed by client IP (best-effort); "
        "signed-in users are keyed by account."
    ),
)
async def get_usage_for_caller(
    request: Request,
    principal: AuthenticatedPrincipal | None = Depends(get_current_user_optional),
    quota_service: QuotaService = Depends(quota_service_dep),
) -> UsageResponse:
    limits = effective_limits(principal)
    key = _key_for_request(request, principal)
    count = await quota_service.read_today(key=key, day=today_utc())
    percent = (
        round((count / limits.daily_jobs) * 100, 1)
        if limits.daily_jobs
        else 0.0
    )
    return UsageResponse(
        plan=limits.tier.value,
        jobs_today=count,
        jobs_today_limit=limits.daily_jobs,
        jobs_percent=min(percent, 100.0),
        max_upload_bytes=limits.max_upload_bytes,
    )
