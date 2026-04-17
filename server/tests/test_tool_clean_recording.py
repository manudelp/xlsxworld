"""End-to-end recording-wiring coverage for the ``clean/*`` tool routes.

Each parametrized case asserts the same contract as the trim-spaces test
in Task 5:

* anonymous callers: no ``JobsService`` method is invoked and no
  ``X-Job-Id`` header leaks; the underlying tool continues to return a
  byte-identical file download response.
* authenticated callers: the scheduled background task runs
  ``JobsService.record_authenticated_job`` exactly once with the
  expected ``tool_slug``/``tool_name``/``output_filename``/``mime_type``
  and a non-negative ``duration_ms``.
"""

from __future__ import annotations

import io
import uuid
from dataclasses import dataclass
from typing import Any, Callable
from unittest.mock import AsyncMock

import openpyxl
import pytest
from fastapi import FastAPI
from httpx import ASGITransport, AsyncClient

from app.core.security import AuthenticatedPrincipal, get_current_user_optional
from app.tools._recording import jobs_service_dep
from app.tools.clean.find_replace import router as find_replace_router
from app.tools.clean.normalize_case import router as normalize_case_router
from app.tools.clean.remove_duplicates import router as remove_duplicates_router
from app.tools.clean.remove_empty_rows import router as remove_empty_rows_router


XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"


def _xlsx_bytes_with_duplicates_and_blanks() -> bytes:
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Sheet1"
    ws.append(["name", "city"])
    ws.append(["Alice", "Madrid"])
    ws.append(["Bob", "Paris"])
    ws.append(["Alice", "Madrid"])  # dup
    ws.append([None, None])  # blank row
    ws.append(["  carol  ", "Rome"])
    buf = io.BytesIO()
    wb.save(buf)
    return buf.getvalue()


@dataclass
class _Case:
    """One route worth of wiring — everything a test needs to exercise it."""

    path: str
    router_factory: Callable[[], Any]
    tool_slug: str
    tool_name: str
    output_filename: str
    form_data: dict[str, str]


_CASES: list[_Case] = [
    _Case(
        path="/find-replace",
        router_factory=lambda: find_replace_router,
        tool_slug="find-replace",
        tool_name="Find and Replace",
        output_filename="find-replace.xlsx",
        form_data={
            "find_text": "Alice",
            "replace_text": "ALICE",
            "sheet": "Sheet1",
            "all_sheets": "false",
        },
    ),
    _Case(
        path="/normalize-case",
        router_factory=lambda: normalize_case_router,
        tool_slug="normalize-case",
        tool_name="Normalize Case",
        output_filename="normalize-case.xlsx",
        form_data={
            "mode": "upper",
            "sheet": "Sheet1",
            "all_sheets": "false",
        },
    ),
    _Case(
        path="/remove-duplicates",
        router_factory=lambda: remove_duplicates_router,
        tool_slug="remove-duplicates",
        tool_name="Remove Duplicates",
        output_filename="remove-duplicates.xlsx",
        form_data={
            "sheet": "Sheet1",
            "all_sheets": "false",
            "keep": "first",
        },
    ),
    _Case(
        path="/remove-empty-rows",
        router_factory=lambda: remove_empty_rows_router,
        tool_slug="remove-empty-rows",
        tool_name="Remove Empty Rows",
        output_filename="cleaned.xlsx",
        form_data={"sheets": "Sheet1"},
    ),
]


@pytest.fixture()
def app_factory():
    def _factory(case: _Case) -> FastAPI:
        app = FastAPI()
        app.include_router(case.router_factory())
        return app

    return _factory


@pytest.mark.asyncio
@pytest.mark.parametrize("case", _CASES, ids=[c.tool_slug for c in _CASES])
async def test_clean_tool_anonymous_does_not_record(
    app_factory, case: _Case
) -> None:
    app = app_factory(case)
    recorded = AsyncMock()
    app.dependency_overrides[get_current_user_optional] = lambda: None
    app.dependency_overrides[jobs_service_dep] = lambda: recorded

    files = {"file": ("input.xlsx", _xlsx_bytes_with_duplicates_and_blanks(), XLSX_MIME)}

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.post(case.path, files=files, data=case.form_data)

    assert response.status_code == 200, response.text
    assert response.headers["content-type"] == XLSX_MIME
    assert "X-Job-Id" not in response.headers
    recorded.record_authenticated_job.assert_not_called()


@pytest.mark.asyncio
@pytest.mark.parametrize("case", _CASES, ids=[c.tool_slug for c in _CASES])
async def test_clean_tool_authenticated_schedules_recording(
    app_factory, case: _Case
) -> None:
    app = app_factory(case)
    principal = AuthenticatedPrincipal(
        user_id=uuid.uuid4(),
        email="user@example.com",
        role="authenticated",
        session_id=None,
        claims={"sub": "user"},
    )
    service = AsyncMock()
    service.record_authenticated_job = AsyncMock(return_value=uuid.uuid4())

    app.dependency_overrides[get_current_user_optional] = lambda: principal
    app.dependency_overrides[jobs_service_dep] = lambda: service

    files = {"file": ("input.xlsx", _xlsx_bytes_with_duplicates_and_blanks(), XLSX_MIME)}

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.post(
            case.path,
            files=files,
            data=case.form_data,
            headers={"Authorization": "Bearer any-token"},
        )

    assert response.status_code == 200, response.text
    service.record_authenticated_job.assert_awaited_once()

    kwargs = service.record_authenticated_job.call_args.kwargs
    assert kwargs["user_id"] == principal.user_id
    assert kwargs["tool_slug"] == case.tool_slug
    assert kwargs["tool_name"] == case.tool_name
    assert kwargs["original_filename"] == "input.xlsx"
    assert kwargs["output_filename"] == case.output_filename
    assert kwargs["mime_type"] == XLSX_MIME
    assert kwargs["success"] is True
    assert kwargs["error_type"] is None
    assert isinstance(kwargs["duration_ms"], int) and kwargs["duration_ms"] >= 0
    assert isinstance(kwargs["output_bytes"], bytes) and len(kwargs["output_bytes"]) > 0
