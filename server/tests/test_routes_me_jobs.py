"""Tests for the ``/api/v1/me/jobs`` endpoints.

The project does not yet spin up a Postgres test database, so we stub
``JobsService`` with an :class:`AsyncMock` via ``dependency_overrides``
and assert on the HTTP contract and the service calls issued by each
handler. Ownership checks and SQL shaping are already covered in
``test_jobs_service.py``.
"""

from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone
from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest
from fastapi import FastAPI
from httpx import ASGITransport, AsyncClient

from app.core.security import AuthenticatedPrincipal, get_current_user
from app.routes.me import router as me_router
from app.services.jobs_service import JobNotFoundError, get_jobs_service


def _principal(user_id: uuid.UUID) -> AuthenticatedPrincipal:
    return AuthenticatedPrincipal(
        user_id=user_id,
        email=f"{user_id}@example.com",
        role="authenticated",
        session_id=None,
        claims={"sub": str(user_id)},
    )


def _job_row(
    *,
    user_id: uuid.UUID,
    tool_slug: str = "trim-spaces",
    tool_name: str = "Trim Spaces",
    storage_path: str | None = "path/in/bucket.xlsx",
    success: bool = True,
    expires_at: datetime | None = None,
    job_id: uuid.UUID | None = None,
) -> SimpleNamespace:
    return SimpleNamespace(
        id=job_id or uuid.uuid4(),
        user_id=user_id,
        tool_slug=tool_slug,
        tool_name=tool_name,
        original_filename="input.xlsx",
        output_filename="trim-spaces.xlsx",
        storage_path=storage_path,
        mime_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        output_size_bytes=1234,
        success=success,
        error_type=None,
        duration_ms=42,
        expires_at=expires_at or datetime.now(timezone.utc) + timedelta(days=7),
        created_at=datetime.now(timezone.utc),
    )


@pytest.fixture()
def user_id() -> uuid.UUID:
    return uuid.uuid4()


@pytest.fixture()
def service() -> AsyncMock:
    return AsyncMock()


@pytest.fixture()
def app(user_id: uuid.UUID, service: AsyncMock) -> FastAPI:
    app = FastAPI()
    app.include_router(me_router)
    app.dependency_overrides[get_current_user] = lambda: _principal(user_id)
    app.dependency_overrides[get_jobs_service] = lambda: service
    return app


@pytest.fixture()
async def client(app: FastAPI):
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as async_client:
        yield async_client


@pytest.mark.asyncio
async def test_list_jobs_returns_paginated_items_for_current_user(
    app: FastAPI,
    client: AsyncClient,
    user_id: uuid.UUID,
    service: AsyncMock,
) -> None:
    job = _job_row(user_id=user_id, tool_slug="trim-spaces", tool_name="Trim Spaces")
    service.list_for_user = AsyncMock(return_value=[job])

    response = await client.get(
        "/api/v1/me/jobs",
        params={"limit": "10", "offset": "0", "search": "trim", "success": "true"},
        headers={"Authorization": "Bearer token"},
    )

    assert response.status_code == 200
    body = response.json()
    assert len(body["items"]) == 1
    item = body["items"][0]
    assert item["tool_slug"] == "trim-spaces"
    assert item["expired"] is False
    assert item["output_size_bytes"] == 1234

    service.list_for_user.assert_awaited_once_with(
        user_id, limit=10, offset=0, search="trim", success=True
    )


@pytest.mark.asyncio
async def test_list_jobs_marks_expired_items(
    app: FastAPI,
    client: AsyncClient,
    user_id: uuid.UUID,
    service: AsyncMock,
) -> None:
    expired_job = _job_row(
        user_id=user_id,
        storage_path=None,
        expires_at=datetime.now(timezone.utc) - timedelta(days=1),
    )
    service.list_for_user = AsyncMock(return_value=[expired_job])

    response = await client.get(
        "/api/v1/me/jobs", headers={"Authorization": "Bearer token"}
    )

    assert response.status_code == 200
    item = response.json()["items"][0]
    assert item["expired"] is True


@pytest.mark.asyncio
async def test_list_jobs_requires_authentication(
    app: FastAPI, client: AsyncClient
) -> None:
    # Drop the auth override so we exercise the real dependency which
    # will refuse without a bearer token.
    app.dependency_overrides.pop(get_current_user)

    response = await client.get("/api/v1/me/jobs")
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_download_returns_signed_url(
    client: AsyncClient,
    user_id: uuid.UUID,
    service: AsyncMock,
) -> None:
    job = _job_row(user_id=user_id, storage_path=f"{user_id}/job.xlsx")
    service.get_for_user = AsyncMock(return_value=job)
    service.create_download_url = AsyncMock(
        return_value="https://example.com/signed?token=abc"
    )

    response = await client.get(
        f"/api/v1/me/jobs/{job.id}/download",
        headers={"Authorization": "Bearer token"},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["url"] == "https://example.com/signed?token=abc"
    assert body["expires_in_seconds"] == 15 * 60

    service.get_for_user.assert_awaited_once_with(user_id, job.id)
    service.create_download_url.assert_awaited_once_with(
        f"{user_id}/job.xlsx", expires_in_seconds=15 * 60
    )


@pytest.mark.asyncio
async def test_download_returns_410_when_storage_path_cleared(
    client: AsyncClient,
    user_id: uuid.UUID,
    service: AsyncMock,
) -> None:
    job = _job_row(
        user_id=user_id,
        storage_path=None,
        expires_at=datetime.now(timezone.utc) - timedelta(days=1),
    )
    service.get_for_user = AsyncMock(return_value=job)

    response = await client.get(
        f"/api/v1/me/jobs/{job.id}/download",
        headers={"Authorization": "Bearer token"},
    )

    assert response.status_code == 410


@pytest.mark.asyncio
async def test_download_returns_410_when_expires_at_in_the_past(
    client: AsyncClient,
    user_id: uuid.UUID,
    service: AsyncMock,
) -> None:
    """``storage_path`` may not have been cleaned up yet, but ``expires_at``
    is the source of truth for whether a user can download."""

    job = _job_row(
        user_id=user_id,
        storage_path=f"{user_id}/still-there.xlsx",
        expires_at=datetime.now(timezone.utc) - timedelta(minutes=1),
    )
    service.get_for_user = AsyncMock(return_value=job)

    response = await client.get(
        f"/api/v1/me/jobs/{job.id}/download",
        headers={"Authorization": "Bearer token"},
    )
    assert response.status_code == 410


@pytest.mark.asyncio
async def test_download_returns_404_when_job_missing(
    client: AsyncClient,
    service: AsyncMock,
) -> None:
    service.get_for_user = AsyncMock(side_effect=JobNotFoundError("no"))

    response = await client.get(
        f"/api/v1/me/jobs/{uuid.uuid4()}/download",
        headers={"Authorization": "Bearer token"},
    )

    assert response.status_code == 404


@pytest.mark.asyncio
async def test_delete_job_204(
    client: AsyncClient,
    user_id: uuid.UUID,
    service: AsyncMock,
) -> None:
    service.delete_for_user = AsyncMock(return_value=None)
    job_id = uuid.uuid4()

    response = await client.delete(
        f"/api/v1/me/jobs/{job_id}", headers={"Authorization": "Bearer token"}
    )

    assert response.status_code == 204
    assert response.content == b""
    service.delete_for_user.assert_awaited_once_with(user_id, job_id)


@pytest.mark.asyncio
async def test_delete_job_404_when_missing(
    client: AsyncClient,
    service: AsyncMock,
) -> None:
    service.delete_for_user = AsyncMock(side_effect=JobNotFoundError("no"))

    response = await client.delete(
        f"/api/v1/me/jobs/{uuid.uuid4()}",
        headers={"Authorization": "Bearer token"},
    )

    assert response.status_code == 404
