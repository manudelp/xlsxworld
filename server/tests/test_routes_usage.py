from __future__ import annotations

import uuid
from unittest.mock import AsyncMock

import pytest
from httpx import ASGITransport, AsyncClient

from app.core.app_factory import create_app
from app.core.limits import (
    ANON_DAILY_JOBS,
    ANON_MAX_UPLOAD_BYTES,
    FREE_DAILY_JOBS,
    FREE_MAX_UPLOAD_BYTES,
)
from app.core.quota_guard import quota_service_dep
from app.core.security import AuthenticatedPrincipal, get_current_user_optional


def _principal() -> AuthenticatedPrincipal:
    return AuthenticatedPrincipal(
        user_id=uuid.uuid4(),
        email="a@b.c",
        role=None,
        session_id=None,
        claims={},
    )


@pytest.mark.asyncio
async def test_public_usage_anonymous_returns_anon_tier() -> None:
    app = create_app()
    fake_service = AsyncMock()
    fake_service.read_today = AsyncMock(return_value=4)
    app.dependency_overrides[quota_service_dep] = lambda: fake_service

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get(
            "/api/v1/usage",
            headers={"x-forwarded-for": "203.0.113.55"},
        )

    assert response.status_code == 200
    body = response.json()
    assert body["plan"] == "anon"
    assert body["jobs_today"] == 4
    assert body["jobs_today_limit"] == ANON_DAILY_JOBS
    assert body["max_upload_bytes"] == ANON_MAX_UPLOAD_BYTES
    fake_service.read_today.assert_awaited_once()
    key = fake_service.read_today.await_args.kwargs["key"]
    assert key == "ip:203.0.113.55"


@pytest.mark.asyncio
async def test_public_usage_authenticated_returns_free_tier() -> None:
    app = create_app()
    principal = _principal()

    async def fake_optional() -> AuthenticatedPrincipal:
        return principal

    fake_service = AsyncMock()
    fake_service.read_today = AsyncMock(return_value=12)
    app.dependency_overrides[get_current_user_optional] = fake_optional
    app.dependency_overrides[quota_service_dep] = lambda: fake_service

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/api/v1/usage")

    assert response.status_code == 200
    body = response.json()
    assert body["plan"] == "free"
    assert body["jobs_today"] == 12
    assert body["jobs_today_limit"] == FREE_DAILY_JOBS
    assert body["max_upload_bytes"] == FREE_MAX_UPLOAD_BYTES
    fake_service.read_today.assert_awaited_once()
    assert fake_service.read_today.await_args.kwargs["key"] == f"user:{principal.user_id}"
