from __future__ import annotations
from typing import Any, Dict, List, Tuple
import time

from fastapi import HTTPException

_WORKBOOK_STORE: Dict[str, Tuple[float, Dict[str, List[List[Any]]], Dict[str, int]]] = {}
_MAX_STORE = 32
_TTL_SECONDS = 60 * 15  # 15 minutes


def store_workbook(token: str, workbook_data: dict[str, list[list[Any]]], sheet_totals: dict[str, int]):
    if len(_WORKBOOK_STORE) >= _MAX_STORE:
        oldest = sorted(_WORKBOOK_STORE.items(), key=lambda kv: kv[1][0])[:4]
        for k, _ in oldest:
            _WORKBOOK_STORE.pop(k, None)
    _WORKBOOK_STORE[token] = (time.time(), workbook_data, sheet_totals)


def load_workbook(token: str) -> dict[str, list[list[Any]]]:
    meta = _WORKBOOK_STORE.get(token)
    if not meta:
        raise HTTPException(status_code=404, detail="Unknown or expired token")
    ts, workbook_data, sheet_totals = meta
    if time.time() - ts > _TTL_SECONDS:
        _WORKBOOK_STORE.pop(token, None)
        raise HTTPException(status_code=404, detail="Token expired")
    _WORKBOOK_STORE[token] = (time.time(), workbook_data, sheet_totals)
    return workbook_data


def get_sheet_total_rows(token: str, sheet: str) -> int | None:
    meta = _WORKBOOK_STORE.get(token)
    if not meta:
        return None
    _, _, sheet_totals = meta
    return sheet_totals.get(sheet)
