"""Tests for StorageService.

Uses a FakeAsyncClient that replaces httpx.AsyncClient for the duration of
the test. This keeps the tests hermetic (no network, no real Supabase
project) while exercising the real request-shaping logic inside the
service.
"""

from __future__ import annotations

from dataclasses import dataclass, field

import httpx
import pytest

from app.services import storage_service as storage_module
from app.services.storage_service import StorageService, StorageServiceError


@dataclass
class FakeResponse:
    status_code: int = 200
    json_body: dict | None = None
    text_body: str = ""

    def json(self) -> dict:
        return self.json_body or {}

    @property
    def text(self) -> str:
        return self.text_body


@dataclass
class _Call:
    method: str
    url: str
    headers: dict
    content: bytes | None = None
    json_body: dict | None = None


@dataclass
class FakeAsyncClient:
    """Drop-in for httpx.AsyncClient used as an async context manager."""

    response: FakeResponse
    calls: list[_Call] = field(default_factory=list)

    def __init__(self, *_args, **_kwargs):
        self.response = getattr(FakeAsyncClient, "_next_response", FakeResponse())
        self.calls = FakeAsyncClient._shared_calls

    async def __aenter__(self) -> "FakeAsyncClient":
        return self

    async def __aexit__(self, *_exc) -> bool:
        return False

    async def post(
        self,
        url: str,
        *,
        content: bytes | None = None,
        headers: dict | None = None,
        json: dict | None = None,
    ) -> FakeResponse:
        self.calls.append(
            _Call(method="POST", url=url, headers=headers or {}, content=content, json_body=json)
        )
        return self.response

    async def request(
        self,
        method: str,
        url: str,
        *,
        headers: dict | None = None,
    ) -> FakeResponse:
        self.calls.append(_Call(method=method, url=url, headers=headers or {}))
        return self.response


@pytest.fixture(autouse=True)
def _patch_httpx(monkeypatch):
    FakeAsyncClient._shared_calls = []
    FakeAsyncClient._next_response = FakeResponse()
    monkeypatch.setattr(storage_module.httpx, "AsyncClient", FakeAsyncClient)
    yield
    FakeAsyncClient._shared_calls = []


def _set_response(**kwargs) -> None:
    FakeAsyncClient._next_response = FakeResponse(**kwargs)


async def test_upload_posts_to_object_endpoint_with_upsert_header() -> None:
    _set_response(status_code=200, json_body={"Key": "tool-outputs/abc.xlsx"})
    service = StorageService()

    path = await service.upload(
        object_path="abc/123.xlsx",
        content=b"hello",
        mime_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    )

    assert path == "abc/123.xlsx"
    call = FakeAsyncClient._shared_calls[-1]
    assert call.method == "POST"
    assert call.url.endswith(f"/storage/v1/object/{service.bucket}/abc/123.xlsx")
    assert call.headers["x-upsert"] == "true"
    assert call.headers["authorization"].startswith("Bearer ")
    assert call.content == b"hello"


async def test_upload_raises_storage_service_error_on_4xx() -> None:
    _set_response(status_code=403, text_body="forbidden")
    service = StorageService()

    with pytest.raises(StorageServiceError) as exc:
        await service.upload(object_path="x", content=b"x", mime_type="x")
    assert "403" in str(exc.value)


async def test_create_signed_url_returns_fully_qualified_url() -> None:
    # Supabase returns a bare /object/sign path; StorageService should
    # prepend the project host so the URL is usable directly.
    _set_response(
        status_code=200,
        json_body={"signedURL": "/object/sign/tool-outputs/abc?token=xyz"},
    )
    service = StorageService()

    url = await service.create_signed_url("abc", expires_in_seconds=900)

    assert url.endswith("/storage/v1/object/sign/tool-outputs/abc?token=xyz")
    assert url.startswith("https://") or url.startswith("http://")
    call = FakeAsyncClient._shared_calls[-1]
    assert call.method == "POST"
    assert call.json_body == {"expiresIn": 900}


async def test_create_signed_url_raises_when_response_has_no_signed_url() -> None:
    _set_response(status_code=200, json_body={"error": "nope"})
    service = StorageService()

    with pytest.raises(StorageServiceError):
        await service.create_signed_url("abc", expires_in_seconds=60)


async def test_delete_issues_delete_request_to_object_endpoint() -> None:
    _set_response(status_code=200)
    service = StorageService()

    await service.delete("abc/123.xlsx")

    call = FakeAsyncClient._shared_calls[-1]
    assert call.method == "DELETE"
    assert call.url.endswith(f"/storage/v1/object/{service.bucket}/abc/123.xlsx")


async def test_delete_tolerates_404_so_cleanup_is_idempotent() -> None:
    _set_response(status_code=404, text_body="not found")
    service = StorageService()

    # Should not raise — a missing object is a no-op for cleanup.
    await service.delete("abc/already-gone.xlsx")


async def test_delete_raises_on_non_404_error() -> None:
    _set_response(status_code=500, text_body="boom")
    service = StorageService()

    with pytest.raises(StorageServiceError):
        await service.delete("abc")
