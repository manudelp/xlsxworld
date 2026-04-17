"""End-to-end test for the ``trim-spaces`` endpoint's recording wiring.

The project does not spin up a Postgres test database, so we stub the
``JobsService`` dependency with an ``AsyncMock`` and verify:

* anonymous calls never construct a service or schedule recording;
* authenticated calls run the scheduled background task and invoke
  ``JobsService.record_authenticated_job`` with the expected arguments.
"""

from __future__ import annotations

import io
import uuid
from unittest.mock import AsyncMock

import openpyxl
import pytest
from fastapi import FastAPI
from httpx import ASGITransport, AsyncClient

from app.core.security import AuthenticatedPrincipal, get_current_user_optional
from app.tools._recording import jobs_service_dep
from app.tools.clean.trim_spaces import router as trim_spaces_router


XLSX_MIME = (
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
)


def _xlsx_bytes() -> bytes:
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Sheet1"
    ws.append(["name"])
    ws.append([" alice "])
    ws.append(["  bob  "])
    buf = io.BytesIO()
    wb.save(buf)
    return buf.getvalue()


@pytest.fixture()
def app() -> FastAPI:
    app = FastAPI()
    app.include_router(trim_spaces_router)
    return app


@pytest.fixture()
async def client(app: FastAPI):
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as async_client:
        yield async_client


@pytest.mark.asyncio
async def test_trim_spaces_anonymous_does_not_record(
    app: FastAPI, client: AsyncClient
) -> None:
    recorded = AsyncMock()
    app.dependency_overrides[get_current_user_optional] = lambda: None
    app.dependency_overrides[jobs_service_dep] = lambda: recorded

    files = {"file": ("input.xlsx", _xlsx_bytes(), XLSX_MIME)}
    data = {"sheet": "Sheet1", "all_sheets": "false"}

    response = await client.post("/trim-spaces", files=files, data=data)

    assert response.status_code == 200
    assert response.headers["content-type"] == XLSX_MIME
    assert "X-Job-Id" not in response.headers
    recorded.record_authenticated_job.assert_not_called()


@pytest.mark.asyncio
async def test_trim_spaces_authenticated_schedules_recording(
    app: FastAPI, client: AsyncClient
) -> None:
    principal = AuthenticatedPrincipal(
        user_id=uuid.uuid4(),
        email="signed-in@example.com",
        role="authenticated",
        session_id=None,
        claims={"sub": "signed-in"},
    )
    service = AsyncMock()
    service.record_authenticated_job = AsyncMock(return_value=uuid.uuid4())

    app.dependency_overrides[get_current_user_optional] = lambda: principal
    app.dependency_overrides[jobs_service_dep] = lambda: service

    files = {"file": ("input.xlsx", _xlsx_bytes(), XLSX_MIME)}
    data = {"sheet": "Sheet1", "all_sheets": "false"}

    response = await client.post(
        "/trim-spaces",
        files=files,
        data=data,
        headers={"Authorization": "Bearer any-token"},
    )

    assert response.status_code == 200
    # Starlette drives BackgroundTasks before returning via ASGITransport,
    # so by the time we observe the response the recording call has run.
    service.record_authenticated_job.assert_awaited_once()

    kwargs = service.record_authenticated_job.call_args.kwargs
    assert kwargs["user_id"] == principal.user_id
    assert kwargs["tool_slug"] == "trim-spaces"
    assert kwargs["tool_name"] == "Trim Spaces"
    assert kwargs["original_filename"] == "input.xlsx"
    assert kwargs["output_filename"] == "trim-spaces.xlsx"
    assert kwargs["mime_type"] == XLSX_MIME
    assert kwargs["success"] is True
    assert kwargs["error_type"] is None
    assert isinstance(kwargs["duration_ms"], int)
    assert kwargs["duration_ms"] >= 0
    assert isinstance(kwargs["output_bytes"], bytes)
    assert len(kwargs["output_bytes"]) > 0
