from __future__ import annotations

import io
import uuid

import pytest
from fastapi import HTTPException
from fastapi import UploadFile

from app.core.limits import ANON_MAX_UPLOAD_BYTES, FREE_MAX_UPLOAD_BYTES
from app.core.security import AuthenticatedPrincipal
from app.tools._common import read_upload_for_principal


def _upload(content: bytes) -> UploadFile:
    return UploadFile(filename="input.xlsx", file=io.BytesIO(content))


def _principal() -> AuthenticatedPrincipal:
    return AuthenticatedPrincipal(
        user_id=uuid.uuid4(), email="a@b.c", role=None, session_id=None, claims={},
    )


@pytest.mark.asyncio
async def test_anon_under_anon_cap_passes() -> None:
    data = b"x" * (ANON_MAX_UPLOAD_BYTES - 1)
    out = await read_upload_for_principal(_upload(data), principal=None)
    assert out == data


@pytest.mark.asyncio
async def test_anon_over_anon_cap_raises_413_with_anon_code() -> None:
    data = b"x" * (ANON_MAX_UPLOAD_BYTES + 1)
    with pytest.raises(HTTPException) as excinfo:
        await read_upload_for_principal(_upload(data), principal=None)
    assert excinfo.value.status_code == 413
    assert isinstance(excinfo.value.detail, dict)
    assert excinfo.value.detail["error_code"] == "ANON_FILE_TOO_LARGE"


@pytest.mark.asyncio
async def test_free_under_free_cap_passes() -> None:
    data = b"x" * (ANON_MAX_UPLOAD_BYTES + 1)  # beyond anon, under free
    out = await read_upload_for_principal(_upload(data), principal=_principal())
    assert out == data


@pytest.mark.asyncio
async def test_free_over_free_cap_raises_413_with_free_code() -> None:
    # Reading a FREE_MAX_UPLOAD_BYTES + 1 payload in-memory would allocate
    # 25 MB in this test. That's acceptable but feel free to switch to
    # chunked reads if perf ever matters — the cap check happens on the
    # accumulator, so a partial tail chunk still trips the limit.
    data = b"x" * (FREE_MAX_UPLOAD_BYTES + 1)
    with pytest.raises(HTTPException) as excinfo:
        await read_upload_for_principal(_upload(data), principal=_principal())
    assert excinfo.value.status_code == 413
    assert excinfo.value.detail["error_code"] == "FREE_FILE_TOO_LARGE"
