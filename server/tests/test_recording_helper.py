from __future__ import annotations

import uuid
from unittest.mock import AsyncMock

import pytest
from fastapi import BackgroundTasks

from app.core.security import AuthenticatedPrincipal
from app.tools._recording import record_and_respond


@pytest.mark.asyncio
async def test_anon_response_is_passthrough() -> None:
    bg = BackgroundTasks()
    jobs = AsyncMock()

    response = await record_and_respond(
        principal=None,
        background_tasks=bg,
        jobs_service=jobs,
        tool_slug="trim-spaces",
        tool_name="Trim Spaces",
        original_filename="in.xlsx",
        output_bytes=b"hi",
        output_filename="out.xlsx",
        mime_type="application/octet-stream",
        success=True,
        error_type=None,
        duration_ms=10,
    )

    assert response.body == b"hi"
    assert response.media_type == "application/octet-stream"
    assert "X-Job-Id" not in response.headers
    assert bg.tasks == []
    jobs.record_authenticated_job.assert_not_called()


@pytest.mark.asyncio
async def test_authenticated_response_schedules_recording() -> None:
    bg = BackgroundTasks()
    jobs = AsyncMock()
    jobs.record_authenticated_job = AsyncMock(return_value=uuid.uuid4())
    principal = AuthenticatedPrincipal(
        user_id=uuid.uuid4(),
        email="a@b.c",
        role=None,
        session_id=None,
        claims={},
    )

    response = await record_and_respond(
        principal=principal,
        background_tasks=bg,
        jobs_service=jobs,
        tool_slug="trim-spaces",
        tool_name="Trim Spaces",
        original_filename="in.xlsx",
        output_bytes=b"hi",
        output_filename="out.xlsx",
        mime_type="application/octet-stream",
        success=True,
        error_type=None,
        duration_ms=10,
    )

    assert response.body == b"hi"
    assert len(bg.tasks) == 1

    # Execute the scheduled task and verify it calls the service with the
    # expected keyword arguments (including the principal's user_id).
    await bg.tasks[0]()

    jobs.record_authenticated_job.assert_awaited_once_with(
        user_id=principal.user_id,
        tool_slug="trim-spaces",
        tool_name="Trim Spaces",
        original_filename="in.xlsx",
        output_filename="out.xlsx",
        output_bytes=b"hi",
        mime_type="application/octet-stream",
        success=True,
        error_type=None,
        duration_ms=10,
    )


@pytest.mark.asyncio
async def test_authenticated_but_jobs_service_unavailable_falls_back() -> None:
    """Fail-safe: if the DB/jobs factory blew up and no service could be
    built, we still return the response and never schedule anything."""

    bg = BackgroundTasks()
    principal = AuthenticatedPrincipal(
        user_id=uuid.uuid4(),
        email="a@b.c",
        role=None,
        session_id=None,
        claims={},
    )

    response = await record_and_respond(
        principal=principal,
        background_tasks=bg,
        jobs_service=None,
        tool_slug="trim-spaces",
        tool_name="Trim Spaces",
        original_filename=None,
        output_bytes=b"hi",
        output_filename="out.xlsx",
        mime_type="application/octet-stream",
        success=True,
        error_type=None,
        duration_ms=None,
    )

    assert response.body == b"hi"
    assert bg.tasks == []
