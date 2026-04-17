"""Parametrized integration coverage for Phase 2 file-size limits.

One minimal happy-path test per tool is already covered elsewhere
(Phase 1 recording tests). This suite only asserts the tier-aware
size cap actually rejects over-limit anonymous uploads with the
structured 413 the client expects. We don't exhaustively exercise
every tool — a representative sample from each folder is enough to
catch "someone forgot to swap the helper" regressions.

The global ``enforce_quota`` dependency is overridden to a no-op so
the tests don't require a running database. The route body's file-size
check (``read_upload_for_principal``) is what we're actually exercising.
"""

from __future__ import annotations

from dataclasses import dataclass

import pytest
from httpx import ASGITransport, AsyncClient

from app.core.app_factory import create_app
from app.core.limits import ANON_MAX_UPLOAD_BYTES
from app.core.quota_guard import enforce_quota

_XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
_OVERSIZE = b"x" * (ANON_MAX_UPLOAD_BYTES + 1024)


@dataclass(frozen=True)
class _Endpoint:
    path: str
    extra_data: dict[str, str]
    uploads: tuple[tuple[str, str, str], ...] = (
        ("file", "big.xlsx", _XLSX_MIME),
    )


_CASES = [
    _Endpoint("/api/v1/tools/clean/trim-spaces", {"all_sheets": "true"}),
    _Endpoint(
        "/api/v1/tools/convert/csv-to-xlsx",
        {},
        uploads=(("file", "big.csv", "text/csv"),),
    ),
    _Endpoint(
        "/api/v1/tools/append-workbooks",
        {},
        uploads=(
            ("files", "w1.xlsx", _XLSX_MIME),
            ("files", "w2.xlsx", _XLSX_MIME),
        ),
    ),
    _Endpoint(
        "/api/v1/tools/analyze/compare-workbooks",
        {},
        uploads=(
            ("file_a", "a.xlsx", _XLSX_MIME),
            ("file_b", "b.xlsx", _XLSX_MIME),
        ),
    ),
    _Endpoint("/api/v1/tools/format/freeze-header", {"rows": "1"}),
    _Endpoint(
        "/api/v1/tools/data/sort-rows",
        {
            "sheet": "Sheet1",
            "sort_keys": '[{"column":"ColA","direction":"asc"}]',
        },
    ),
    _Endpoint("/api/v1/tools/validate/detect-blanks", {}),
    _Endpoint("/api/v1/tools/security/password-protect", {"password": "hunter2"}),
    _Endpoint("/api/v1/tools/inspect/preview", {}),
    _Endpoint("/api/v1/tools/split-workbook", {"sheet_names": ""}),
]


@pytest.mark.asyncio
@pytest.mark.parametrize("case", _CASES, ids=lambda c: c.path)
async def test_anon_over_size_cap_returns_413_with_anon_code(case: _Endpoint) -> None:
    app = create_app()
    # The route body's own read_upload_for_principal is what this test
    # exercises; bypass the DB-backed quota guard entirely.
    app.dependency_overrides[enforce_quota] = lambda: None

    transport = ASGITransport(app=app)
    file_parts = [
        (field, (filename, _OVERSIZE, mime_type))
        for field, filename, mime_type in case.uploads
    ]
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post(case.path, files=file_parts, data=case.extra_data)

    assert response.status_code == 413, response.text
    body = response.json()
    assert body["error_code"] == "ANON_FILE_TOO_LARGE"
