from __future__ import annotations

import asyncio
import sys
import time
from typing import Any, Dict, List, Tuple

from fastapi import HTTPException

_WorkbookEntry = Tuple[float, Dict[str, List[List[Any]]], Dict[str, int], int]

_WORKBOOK_STORE: Dict[str, _WorkbookEntry] = {}
_MAX_STORE = 32
_MAX_TOTAL_BYTES = 512 * 1024 * 1024  # 512 MB total budget
_TTL_SECONDS = 60 * 15  # 15 minutes
_lock = asyncio.Lock()


def _estimate_size(workbook_data: dict[str, list[list[Any]]]) -> int:
    total = 0
    for rows in workbook_data.values():
        for row in rows:
            for cell in row:
                total += sys.getsizeof(cell)
    return total


def _current_total_bytes() -> int:
    return sum(entry[3] for entry in _WORKBOOK_STORE.values())


def _evict_expired() -> None:
    now = time.time()
    expired = [k for k, (ts, *_) in _WORKBOOK_STORE.items() if now - ts > _TTL_SECONDS]
    for k in expired:
        _WORKBOOK_STORE.pop(k, None)


def _evict_oldest(count: int) -> None:
    oldest = sorted(_WORKBOOK_STORE.items(), key=lambda kv: kv[1][0])[:count]
    for k, _ in oldest:
        _WORKBOOK_STORE.pop(k, None)


async def store_workbook(
    token: str,
    workbook_data: dict[str, list[list[Any]]],
    sheet_totals: dict[str, int],
) -> None:
    entry_size = _estimate_size(workbook_data)

    async with _lock:
        _evict_expired()

        while (
            len(_WORKBOOK_STORE) >= _MAX_STORE
            or _current_total_bytes() + entry_size > _MAX_TOTAL_BYTES
        ) and _WORKBOOK_STORE:
            _evict_oldest(1)

        _WORKBOOK_STORE[token] = (time.time(), workbook_data, sheet_totals, entry_size)


async def load_workbook(token: str) -> dict[str, list[list[Any]]]:
    async with _lock:
        meta = _WORKBOOK_STORE.get(token)
        if not meta:
            raise HTTPException(status_code=404, detail="Unknown or expired token")
        ts, workbook_data, sheet_totals, entry_size = meta
        if time.time() - ts > _TTL_SECONDS:
            _WORKBOOK_STORE.pop(token, None)
            raise HTTPException(status_code=404, detail="Token expired")
        _WORKBOOK_STORE[token] = (time.time(), workbook_data, sheet_totals, entry_size)
        return workbook_data


async def get_sheet_total_rows(token: str, sheet: str) -> int | None:
    async with _lock:
        meta = _WORKBOOK_STORE.get(token)
        if not meta:
            return None
        _, _, sheet_totals, _ = meta
        return sheet_totals.get(sheet)
