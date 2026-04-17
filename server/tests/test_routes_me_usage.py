from __future__ import annotations

import uuid
from unittest.mock import AsyncMock

import pytest
from httpx import ASGITransport, AsyncClient

from app.core.app_factory import create_app
from app.core.limits import FREE_DAILY_JOBS, FREE_MAX_UPLOAD_BYTES
from app.core.quota_guard import quota_service_dep
from app.core.security import (
    AuthenticatedPrincipal,
    get_current_user,
    get_current_user_optional,
)


def _principal() -> AuthenticatedPrincipal:
    return AuthenticatedPrincipal(
        user_id=uuid.uuid4(), email="a@b.c", role=None, session_id=None, claims={},
    )


@pytest.mark.asyncio
async def test_usage_returns_current_tier_numbers() -> None:
    app = create_app()
    principal = _principal()

    async def fake_optional() -> AuthenticatedPrincipal:
        return principal

    async def fake_required() -> AuthenticatedPrincipal:
        return principal

    fake_service = AsyncMock()
    fake_service.read_today = AsyncMock(return_value=42)
    # The counter is also incremented by ``enforce_quota`` on every
    # tool call — but this endpoint is NOT a tool route, so the guard
    # isn't invoked here. We still override the factory just in case a
    # future test mounts the guard on ``/me`` too.

    app.dependency_overrides[get_current_user] = fake_required
    app.dependency_overrides[get_current_user_optional] = fake_optional
    app.dependency_overrides[quota_service_dep] = lambda: fake_service

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/api/v1/me/usage")

    assert response.status_code == 200
    body = response.json()
    assert body["plan"] == "free"
    assert body["jobs_today"] == 42
    assert body["jobs_today_limit"] == FREE_DAILY_JOBS
    assert body["max_upload_bytes"] == FREE_MAX_UPLOAD_BYTES
    # jobs_percent rounded to one decimal, within [0, 100].
    assert 0 <= body["jobs_percent"] <= 100


@pytest.mark.asyncio
async def test_usage_requires_authentication() -> None:
    app = create_app()
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/api/v1/me/usage")
    assert response.status_code == 401
