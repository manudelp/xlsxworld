from __future__ import annotations

import re
from urllib.parse import quote

from fastapi import HTTPException, Response, UploadFile

from app.services.excel_reader import ensure_supported_excel_filename

MAX_UPLOAD_SIZE_BYTES = 20 * 1024 * 1024  # 20 MB
_READ_CHUNK = 64 * 1024  # 64 KB

_INVALID_SHEET_CHARS = re.compile(r"[\\/\*?:\[\]]")


async def read_with_limit(file: UploadFile, max_bytes: int = MAX_UPLOAD_SIZE_BYTES) -> bytes:
    chunks: list[bytes] = []
    total = 0
    while chunk := await file.read(_READ_CHUNK):
        total += len(chunk)
        if total > max_bytes:
            raise HTTPException(status_code=400, detail="File too large")
        chunks.append(chunk)
    return b"".join(chunks)


def check_excel_file(file: UploadFile):
    ensure_supported_excel_filename(file.filename)


def safe_sheet_title(raw: str | None, fallback: str) -> str:
    value = (raw or "").strip()
    if not value:
        value = fallback
    value = _INVALID_SHEET_CHARS.sub("_", value).strip("'")
    if not value:
        value = fallback
    return value[:31]


def unique_sheet_title(base: str, used: set[str]) -> str:
    if base not in used:
        used.add(base)
        return base
    for index in range(2, 10_000):
        suffix = f"_{index}"
        allowed = max(1, 31 - len(suffix))
        candidate = f"{base[:allowed]}{suffix}"
        if candidate not in used:
            used.add(candidate)
            return candidate
    candidate = f"part_{len(used) + 1}"[:31]
    used.add(candidate)
    return candidate


def safe_base_filename(filename: str | None, fallback: str) -> str:
    if not filename:
        return fallback
    base = filename.rsplit(".", 1)[0] if "." in filename else filename
    safe = re.sub(r"[^A-Za-z0-9._-]+", "-", base).strip("-._")
    return safe or fallback


def normalize_sheet_selection(sheets: list[str] | None) -> list[str] | None:
    if not sheets:
        return None
    normalized: list[str] = []
    for entry in sheets:
        for part in entry.split(","):
            value = part.strip()
            if value:
                normalized.append(value)
    return normalized or None


def dedupe_headers(raw_headers: list, *, tag_safe: bool = False, tag_fallback: str = "column") -> list[str]:
    headers: list[str] = []
    used: set[str] = set()
    for index, raw in enumerate(raw_headers):
        name = (str(raw).strip() if raw is not None else "") or f"{tag_fallback}_{index + 1}"
        if tag_safe:
            name = _safe_xml_tag(name, f"{tag_fallback}_{index + 1}")
        candidate = name
        i = 2
        while candidate in used:
            candidate = f"{name}_{i}"
            i += 1
        used.add(candidate)
        headers.append(candidate)
    return headers


_TAG_RE = re.compile(r"[^A-Za-z0-9_.-]")


def _safe_xml_tag(raw: str, fallback: str = "field") -> str:
    tag = _TAG_RE.sub("_", raw.strip()).strip("_.-")
    if not tag or tag[0].isdigit() or tag[0] in (".", "-"):
        tag = f"{fallback}_{tag}" if tag else fallback
    return tag


def file_response(
    content: bytes,
    filename: str,
    media_type: str,
) -> Response:
    encoded_filename = quote(filename, safe="")
    return Response(
        content=content,
        media_type=media_type,
        headers={
            "Content-Disposition": (
                f'attachment; filename="{filename}"; '
                f"filename*=UTF-8''{encoded_filename}"
            ),
            "Content-Length": str(len(content)),
            "X-Content-Type-Options": "nosniff",
        },
    )
