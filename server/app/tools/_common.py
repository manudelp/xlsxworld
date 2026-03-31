from __future__ import annotations
import re

from fastapi import UploadFile

from app.services.excel_reader import ensure_supported_excel_filename

MAX_UPLOAD_SIZE_BYTES = 20 * 1024 * 1024  # 20 MB

_INVALID_SHEET_CHARS = re.compile(r"[\\/*?:\[\]]")


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
