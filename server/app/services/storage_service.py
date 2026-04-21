"""Async client for Supabase Storage.

A thin wrapper around the Supabase Storage REST API, mirroring the pattern
the auth_service follows (no extra dependency; just httpx + the
service-role key). All methods assume a private bucket — writes and signed
URLs both require the service-role key.
"""

from __future__ import annotations

from typing import Any

import httpx

from app.core.config import get_settings


class StorageServiceError(RuntimeError):
    """Raised when a Supabase Storage call fails."""


class StorageService:
    def __init__(self) -> None:
        settings = get_settings()
        if not settings.supabase_secret_key:
            raise StorageServiceError("SUPABASE_SECRET_KEY is not configured")
        if not settings.supabase_url:
            raise StorageServiceError("SUPABASE_URL is not configured")
        self._base_url = settings.supabase_storage_url
        self._bucket = settings.supabase_storage_bucket
        self._public_root = settings.supabase_url.rstrip("/")
        self._headers: dict[str, str] = {
            "apikey": settings.supabase_secret_key,
            "authorization": f"Bearer {settings.supabase_secret_key}",
        }

    @property
    def bucket(self) -> str:
        return self._bucket

    async def upload(
        self,
        *,
        object_path: str,
        content: bytes,
        mime_type: str,
    ) -> str:
        """Upload bytes to ``<bucket>/<object_path>``. Returns the object path.

        Uses upsert so re-uploads (e.g. retries) overwrite cleanly.
        """

        url = f"{self._base_url}/object/{self._bucket}/{object_path}"
        headers = {
            **self._headers,
            "content-type": mime_type,
            "x-upsert": "true",
        }
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(url, content=content, headers=headers)
        self._raise_for_status(response, "upload")
        return object_path

    async def create_signed_url(
        self, object_path: str, *, expires_in_seconds: int
    ) -> str:
        """Create a short-lived signed URL that downloads the stored object."""

        url = f"{self._base_url}/object/sign/{self._bucket}/{object_path}"
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(
                url, headers=self._headers, json={"expiresIn": expires_in_seconds}
            )
        self._raise_for_status(response, "sign")
        data: dict[str, Any] = response.json()
        # Supabase returns a path like "/object/sign/<bucket>/<path>?token=..."
        signed_path = data.get("signedURL") or data.get("signed_url")
        if not signed_path:
            raise StorageServiceError("Storage response missing signedURL")
        if not signed_path.startswith("/"):
            signed_path = "/" + signed_path
        if not signed_path.startswith("/storage/v1"):
            signed_path = "/storage/v1" + signed_path
        return f"{self._public_root}{signed_path}"

    async def download(self, object_path: str) -> bytes:
        """Download raw bytes from ``<bucket>/<object_path>``."""

        url = f"{self._base_url}/object/{self._bucket}/{object_path}"
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.get(url, headers=self._headers)
        self._raise_for_status(response, "download")
        return response.content

    async def delete(self, object_path: str) -> None:
        """Hard-delete a stored object. Succeeds silently on 404."""

        url = f"{self._base_url}/object/{self._bucket}/{object_path}"
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.request("DELETE", url, headers=self._headers)
        if response.status_code == 404:
            return
        self._raise_for_status(response, "delete")

    @staticmethod
    def _raise_for_status(response: httpx.Response, op: str) -> None:
        if response.status_code >= 400:
            body = (response.text or "")[:200]
            raise StorageServiceError(
                f"Storage {op} failed ({response.status_code}): {body}"
            )
