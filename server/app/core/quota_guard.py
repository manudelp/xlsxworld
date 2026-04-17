from __future__ import annotations

from fastapi import Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.limits import Tier, effective_limits
from app.core.security import AuthenticatedPrincipal, get_current_user_optional
from app.db.session import get_db_session
from app.services.quota_service import (
    QuotaExceededError,
    QuotaService,
    today_utc,
)


def _key_for_request(
    request: Request,
    principal: AuthenticatedPrincipal | None,
) -> str:
    if principal is not None:
        return f"user:{principal.user_id}"
    # Trust ``X-Forwarded-For`` first because every deploy target we
    # care about (Render, Vercel, Cloudflare) sits behind a proxy. We
    # take the left-most entry, which is the original client. Spoofable
    # — and per parent spec, anonymous quotas are "best-effort".
    forwarded = request.headers.get("x-forwarded-for") if hasattr(request, "headers") else None
    if forwarded:
        ip = forwarded.split(",", 1)[0].strip()
        if ip:
            return f"ip:{ip}"
    client = getattr(request, "client", None)
    host = getattr(client, "host", None) or "unknown"
    return f"ip:{host}"


async def quota_service_dep(
    db: AsyncSession = Depends(get_db_session),
) -> QuotaService:
    return QuotaService(db)


async def enforce_quota(
    request: Request,
    principal: AuthenticatedPrincipal | None = Depends(get_current_user_optional),
    quota_service: QuotaService = Depends(quota_service_dep),
) -> None:
    """Pre-check + increment the daily quota for the caller's tier.

    Attached globally on the tool routers in ``app_factory.py``; not
    intended to be used per-route.
    """

    limits = effective_limits(principal)
    key = _key_for_request(request, principal)

    try:
        await quota_service.increment_and_check(
            key=key, day=today_utc(), limit=limits.daily_jobs,
        )
    except QuotaExceededError:
        error_code = (
            "ANON_DAILY_QUOTA" if limits.tier is Tier.ANON else "FREE_DAILY_QUOTA"
        )
        message = (
            "Daily free limit reached. Sign up to raise the limit."
            if limits.tier is Tier.ANON
            else "You've reached today's Free-tier job limit."
        )
        raise HTTPException(
            status_code=429,
            detail={"detail": message, "error_code": error_code},
            headers={"Retry-After": "3600"},
        )


__all__ = ["enforce_quota", "quota_service_dep", "_key_for_request"]
