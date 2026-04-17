"""End-to-end recording-wiring coverage for the ``convert/*`` tool routes.

Each parametrized case asserts the same contract as the trim-spaces
test in Task 5 (anonymous passthrough + authenticated recording).
The 10 convert endpoints covered here:

* ``POST /csv-to-xlsx``
* ``POST /xlsx-to-csv``           (one sheet, CSV download)
* ``POST /xlsx-to-csv-zip``       (many sheets, ZIP download)
* ``POST /json-to-xlsx``
* ``POST /xlsx-to-json``
* ``POST /xml-to-xlsx``
* ``POST /xlsx-to-xml``
* ``POST /sql-to-xlsx``
* ``POST /xlsx-to-sql``
* ``POST /xlsx-to-pdf``
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
from app.tools.convert.csv_to_xlsx import router as csv_to_xlsx_router
from app.tools.convert.json_to_xlsx import router as json_to_xlsx_router
from app.tools.convert.sql_to_xlsx import router as sql_to_xlsx_router
from app.tools.convert.xlsx_to_csv import router as xlsx_to_csv_router
from app.tools.convert.xlsx_to_json import router as xlsx_to_json_router
from app.tools.convert.xlsx_to_pdf import router as xlsx_to_pdf_router
from app.tools.convert.xlsx_to_sql import router as xlsx_to_sql_router
from app.tools.convert.xlsx_to_xml import router as xlsx_to_xml_router
from app.tools.convert.xml_to_xlsx import router as xml_to_xlsx_router


XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
CSV_MIME = "text/csv; charset=utf-8"
JSON_MIME = "application/json"
XML_MIME = "application/xml"
SQL_MIME = "application/sql"


def _xlsx_bytes() -> bytes:
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Sheet1"
    ws.append(["a", "b"])
    ws.append([1, 2])
    ws.append([3, 4])
    buf = io.BytesIO()
    wb.save(buf)
    return buf.getvalue()


_CSV_BYTES = b"a,b\n1,2\n3,4\n"
_JSON_BYTES = b'[{"a": 1, "b": 2}, {"a": 3, "b": 4}]'
_XML_BYTES = (
    b'<?xml version="1.0" encoding="UTF-8"?>'
    b"<rows><row><a>1</a><b>2</b></row><row><a>3</a><b>4</b></row></rows>"
)
_SQL_BYTES = (
    b"INSERT INTO demo(a, b) VALUES (1, 2);\n"
    b"INSERT INTO demo(a, b) VALUES (3, 4);\n"
)


@dataclass
class _Case:
    path: str
    router_factory: Callable[[], Any]
    tool_slug: str
    tool_name: str
    expected_mime: str
    expected_filename_suffix: str
    input_filename: str
    input_bytes_factory: Callable[[], bytes]
    input_content_type: str
    form_data: dict[str, str] = field(default_factory=dict)
    query_string: str = ""


_CASES: list[_Case] = [
    _Case(
        path="/csv-to-xlsx",
        router_factory=lambda: csv_to_xlsx_router,
        tool_slug="csv-to-xlsx",
        tool_name="CSV to XLSX",
        expected_mime=XLSX_MIME,
        expected_filename_suffix=".xlsx",
        input_filename="data.csv",
        input_bytes_factory=lambda: _CSV_BYTES,
        input_content_type="text/csv",
        form_data={"sheet_name": "Sheet1", "delimiter": ","},
    ),
    _Case(
        path="/xlsx-to-csv",
        router_factory=lambda: xlsx_to_csv_router,
        tool_slug="xlsx-to-csv",
        tool_name="XLSX to CSV",
        expected_mime=CSV_MIME,
        expected_filename_suffix=".csv",
        input_filename="data.xlsx",
        input_bytes_factory=_xlsx_bytes,
        input_content_type=XLSX_MIME,
        query_string="?sheet=Sheet1",
    ),
    _Case(
        path="/xlsx-to-csv-zip",
        router_factory=lambda: xlsx_to_csv_router,
        tool_slug="xlsx-to-csv-zip",
        tool_name="XLSX to CSV ZIP",
        expected_mime="application/zip",
        expected_filename_suffix=".zip",
        input_filename="data.xlsx",
        input_bytes_factory=_xlsx_bytes,
        input_content_type=XLSX_MIME,
    ),
    _Case(
        path="/json-to-xlsx",
        router_factory=lambda: json_to_xlsx_router,
        tool_slug="json-to-xlsx",
        tool_name="JSON to XLSX",
        expected_mime=XLSX_MIME,
        expected_filename_suffix=".xlsx",
        input_filename="data.json",
        input_bytes_factory=lambda: _JSON_BYTES,
        input_content_type="application/json",
    ),
    _Case(
        path="/xlsx-to-json",
        router_factory=lambda: xlsx_to_json_router,
        tool_slug="xlsx-to-json",
        tool_name="XLSX to JSON",
        expected_mime="application/json; charset=utf-8",
        expected_filename_suffix=".json",
        input_filename="data.xlsx",
        input_bytes_factory=_xlsx_bytes,
        input_content_type=XLSX_MIME,
    ),
    _Case(
        path="/xml-to-xlsx",
        router_factory=lambda: xml_to_xlsx_router,
        tool_slug="xml-to-xlsx",
        tool_name="XML to XLSX",
        expected_mime=XLSX_MIME,
        expected_filename_suffix=".xlsx",
        input_filename="data.xml",
        input_bytes_factory=lambda: _XML_BYTES,
        input_content_type="application/xml",
    ),
    _Case(
        path="/xlsx-to-xml",
        router_factory=lambda: xlsx_to_xml_router,
        tool_slug="xlsx-to-xml",
        tool_name="XLSX to XML",
        expected_mime="application/xml; charset=utf-8",
        expected_filename_suffix=".xml",
        input_filename="data.xlsx",
        input_bytes_factory=_xlsx_bytes,
        input_content_type=XLSX_MIME,
    ),
    _Case(
        path="/sql-to-xlsx",
        router_factory=lambda: sql_to_xlsx_router,
        tool_slug="sql-to-xlsx",
        tool_name="SQL to XLSX",
        expected_mime=XLSX_MIME,
        expected_filename_suffix=".xlsx",
        input_filename="data.sql",
        input_bytes_factory=lambda: _SQL_BYTES,
        input_content_type="application/sql",
    ),
    _Case(
        path="/xlsx-to-sql",
        router_factory=lambda: xlsx_to_sql_router,
        tool_slug="xlsx-to-sql",
        tool_name="XLSX to SQL",
        expected_mime="application/sql; charset=utf-8",
        expected_filename_suffix=".sql",
        input_filename="data.xlsx",
        input_bytes_factory=_xlsx_bytes,
        input_content_type=XLSX_MIME,
    ),
    _Case(
        path="/xlsx-to-pdf",
        router_factory=lambda: xlsx_to_pdf_router,
        tool_slug="xlsx-to-pdf",
        tool_name="XLSX to PDF",
        expected_mime="application/pdf",
        expected_filename_suffix=".pdf",
        input_filename="data.xlsx",
        input_bytes_factory=_xlsx_bytes,
        input_content_type=XLSX_MIME,
    ),
]


def _build_app(case: _Case) -> FastAPI:
    app = FastAPI()
    app.include_router(case.router_factory())
    return app


def _multipart_files(case: _Case) -> dict[str, tuple[str, bytes, str]]:
    return {"file": (case.input_filename, case.input_bytes_factory(), case.input_content_type)}


@pytest.mark.asyncio
@pytest.mark.parametrize("case", _CASES, ids=[c.tool_slug for c in _CASES])
async def test_convert_tool_anonymous_does_not_record(case: _Case) -> None:
    app = _build_app(case)
    recorded = AsyncMock()
    app.dependency_overrides[get_current_user_optional] = lambda: None
    app.dependency_overrides[jobs_service_dep] = lambda: recorded

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.post(
            case.path + case.query_string,
            files=_multipart_files(case),
            data=case.form_data,
        )

    assert response.status_code == 200, response.text
    assert "X-Job-Id" not in response.headers
    recorded.record_authenticated_job.assert_not_called()


@pytest.mark.asyncio
@pytest.mark.parametrize("case", _CASES, ids=[c.tool_slug for c in _CASES])
async def test_convert_tool_authenticated_schedules_recording(case: _Case) -> None:
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
            case.path + case.query_string,
            files=_multipart_files(case),
            data=case.form_data,
            headers={"Authorization": "Bearer any-token"},
        )

    assert response.status_code == 200, response.text
    service.record_authenticated_job.assert_awaited_once()

    kwargs = service.record_authenticated_job.call_args.kwargs
    assert kwargs["user_id"] == principal.user_id
    assert kwargs["tool_slug"] == case.tool_slug
    assert kwargs["tool_name"] == case.tool_name
    assert kwargs["original_filename"] == case.input_filename
    assert kwargs["output_filename"].endswith(case.expected_filename_suffix), (
        kwargs["output_filename"]
    )
    assert kwargs["mime_type"] == case.expected_mime
    assert kwargs["success"] is True
    assert kwargs["error_type"] is None
    assert isinstance(kwargs["duration_ms"], int) and kwargs["duration_ms"] >= 0
    assert isinstance(kwargs["output_bytes"], bytes) and len(kwargs["output_bytes"]) > 0
