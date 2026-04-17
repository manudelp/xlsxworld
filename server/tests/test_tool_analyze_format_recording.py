"""End-to-end recording-wiring coverage for ``analyze/*`` + ``format/*``.

Each parametrized case asserts the same contract as the trim-spaces
test in Task 5:

* ``POST /compare-workbooks`` — two-file input; recording uses
  ``file_a.filename`` as ``original_filename`` and emits a dynamic
  ``comparison-<a>-vs-<b>.xlsx`` output name.
* ``POST /scan-formula-errors``
* ``POST /summary-stats``
* ``POST /auto-size-columns``
* ``POST /freeze-header``
"""

from __future__ import annotations

import io
import uuid
from dataclasses import dataclass, field
from typing import Any, Callable
from unittest.mock import AsyncMock

import openpyxl
import pytest
from fastapi import FastAPI
from httpx import ASGITransport, AsyncClient

from app.core.security import AuthenticatedPrincipal, get_current_user_optional
from app.tools._recording import jobs_service_dep
from app.tools.analyze.compare_workbooks import router as compare_workbooks_router
from app.tools.analyze.scan_formula_errors import router as scan_formula_errors_router
from app.tools.analyze.summary_stats import router as summary_stats_router
from app.tools.format.auto_size_columns import router as auto_size_columns_router
from app.tools.format.freeze_header import router as freeze_header_router


XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"


def _xlsx_numeric() -> bytes:
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Sheet1"
    ws.append(["name", "score", "city"])
    ws.append(["Alice", 10, "Madrid"])
    ws.append(["Bob", 20, "Paris"])
    ws.append(["Carol", 30, "Rome"])
    buf = io.BytesIO()
    wb.save(buf)
    return buf.getvalue()


def _xlsx_numeric_modified() -> bytes:
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Sheet1"
    ws.append(["name", "score", "city"])
    ws.append(["Alice", 15, "Madrid"])  # modified score
    ws.append(["Bob", 20, "Paris"])
    ws.append(["Carol", 30, "Rome"])
    ws.append(["Dave", 40, "Berlin"])  # added row
    buf = io.BytesIO()
    wb.save(buf)
    return buf.getvalue()


@dataclass
class _Case:
    path: str
    router_factory: Callable[[], Any]
    tool_slug: str
    tool_name: str
    expected_mime: str
    files_factory: Callable[[], Any]
    expected_original_filename: str
    # Optional exact-match or suffix-match on output filename.
    expected_filename: str | None = None
    expected_filename_prefix: str | None = None
    form_data: dict[str, str] = field(default_factory=dict)


def _single_file() -> dict[str, tuple[str, bytes, str]]:
    return {"file": ("input.xlsx", _xlsx_numeric(), XLSX_MIME)}


def _compare_files() -> list[tuple[str, tuple[str, bytes, str]]]:
    return [
        ("file_a", ("original.xlsx", _xlsx_numeric(), XLSX_MIME)),
        ("file_b", ("modified.xlsx", _xlsx_numeric_modified(), XLSX_MIME)),
    ]


_CASES: list[_Case] = [
    _Case(
        path="/compare-workbooks",
        router_factory=lambda: compare_workbooks_router,
        tool_slug="compare-workbooks",
        tool_name="Compare Workbooks",
        expected_mime=XLSX_MIME,
        files_factory=_compare_files,
        expected_original_filename="original.xlsx",
        expected_filename_prefix="comparison-",
    ),
    _Case(
        path="/scan-formula-errors",
        router_factory=lambda: scan_formula_errors_router,
        tool_slug="scan-formula-errors",
        tool_name="Scan Formula Errors",
        expected_mime=XLSX_MIME,
        files_factory=_single_file,
        expected_original_filename="input.xlsx",
        expected_filename_prefix="formula-errors-",
    ),
    _Case(
        path="/summary-stats",
        router_factory=lambda: summary_stats_router,
        tool_slug="summary-stats",
        tool_name="Summary Stats",
        expected_mime=XLSX_MIME,
        files_factory=_single_file,
        expected_original_filename="input.xlsx",
        expected_filename_prefix="summary-stats-",
    ),
    _Case(
        path="/auto-size-columns",
        router_factory=lambda: auto_size_columns_router,
        tool_slug="auto-size-columns",
        tool_name="Auto-Size Columns",
        expected_mime=XLSX_MIME,
        files_factory=_single_file,
        expected_original_filename="input.xlsx",
        expected_filename="auto-sized.xlsx",
    ),
    _Case(
        path="/freeze-header",
        router_factory=lambda: freeze_header_router,
        tool_slug="freeze-header",
        tool_name="Freeze Header",
        expected_mime=XLSX_MIME,
        files_factory=_single_file,
        expected_original_filename="input.xlsx",
        expected_filename="frozen.xlsx",
        form_data={"rows": "1"},
    ),
]


def _build_app(case: _Case) -> FastAPI:
    app = FastAPI()
    app.include_router(case.router_factory())
    return app


@pytest.mark.asyncio
@pytest.mark.parametrize("case", _CASES, ids=[c.tool_slug for c in _CASES])
async def test_analyze_format_anonymous_does_not_record(case: _Case) -> None:
    app = _build_app(case)
    recorded = AsyncMock()
    app.dependency_overrides[get_current_user_optional] = lambda: None
    app.dependency_overrides[jobs_service_dep] = lambda: recorded

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.post(
            case.path,
            files=case.files_factory(),
            data=case.form_data,
        )

    assert response.status_code == 200, response.text
    assert "X-Job-Id" not in response.headers
    recorded.record_authenticated_job.assert_not_called()


@pytest.mark.asyncio
@pytest.mark.parametrize("case", _CASES, ids=[c.tool_slug for c in _CASES])
async def test_analyze_format_authenticated_schedules_recording(case: _Case) -> None:
    app = _build_app(case)
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

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.post(
            case.path,
            files=case.files_factory(),
            data=case.form_data,
            headers={"Authorization": "Bearer any-token"},
        )

    assert response.status_code == 200, response.text
    service.record_authenticated_job.assert_awaited_once()

    kwargs = service.record_authenticated_job.call_args.kwargs
    assert kwargs["user_id"] == principal.user_id
    assert kwargs["tool_slug"] == case.tool_slug
    assert kwargs["tool_name"] == case.tool_name
    assert kwargs["original_filename"] == case.expected_original_filename
    if case.expected_filename is not None:
        assert kwargs["output_filename"] == case.expected_filename
    if case.expected_filename_prefix is not None:
        assert kwargs["output_filename"].startswith(case.expected_filename_prefix), (
            kwargs["output_filename"]
        )
        assert kwargs["output_filename"].endswith(".xlsx"), kwargs["output_filename"]
    assert kwargs["mime_type"] == case.expected_mime
    assert kwargs["success"] is True
    assert kwargs["error_type"] is None
    assert isinstance(kwargs["duration_ms"], int) and kwargs["duration_ms"] >= 0
    assert isinstance(kwargs["output_bytes"], bytes) and len(kwargs["output_bytes"]) > 0
