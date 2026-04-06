from __future__ import annotations

import math
import xml.etree.ElementTree as ET
from datetime import date, datetime, time
from decimal import Decimal

from fastapi import APIRouter, File, HTTPException, Query, UploadFile

from app.services.excel_reader import ensure_supported_excel_filename, parse_excel_bytes
from app.tools._common import (
    _safe_xml_tag,
    dedupe_headers,
    file_response,
    normalize_sheet_selection,
    read_with_limit,
    safe_base_filename,
)

router = APIRouter()


def _safe_xml_value(value) -> str:
    if value is None:
        return ""
    if isinstance(value, bool):
        return "true" if value else "false"
    if isinstance(value, (int, str)):
        return str(value)
    if isinstance(value, float):
        return str(value) if math.isfinite(value) else ""
    if isinstance(value, Decimal):
        return str(float(value))
    if isinstance(value, (datetime, date, time)):
        return value.isoformat()
    if isinstance(value, bytes):
        return value.decode("utf-8", errors="replace")
    return str(value)


@router.post(
    "/xlsx-to-xml",
    summary="Export XLSX to XML",
    description="Uploads an Excel file and exports one or more sheets as XML.",
)
async def xlsx_to_xml(
    file: UploadFile = File(..., description="Excel file"),
    sheets: list[str] = Query(default=None, description="Sheet names to export (empty=all)"),
    root_tag: str = Query(default="workbook", description="Root XML element name"),
    row_tag: str = Query(default="row", description="Row XML element name"),
):
    ensure_supported_excel_filename(file.filename)
    raw = await read_with_limit(file)

    workbook_data = parse_excel_bytes(raw, file.filename)

    selected = normalize_sheet_selection(sheets)
    if selected:
        missing = [name for name in selected if name not in workbook_data]
        if missing:
            raise HTTPException(status_code=404, detail=f"Sheet not found: {missing[0]}")
        targets = selected
    else:
        targets = list(workbook_data.keys())

    root = ET.Element(_safe_xml_tag(root_tag, "workbook"))

    for sheet_name in targets:
        rows = workbook_data[sheet_name]
        sheet_el = ET.SubElement(root, "sheet", name=sheet_name)

        if not rows:
            continue

        headers = dedupe_headers(rows[0], tag_safe=True, tag_fallback="column")
        for data_row in rows[1:]:
            row_el = ET.SubElement(sheet_el, _safe_xml_tag(row_tag, "row"))
            for i, header in enumerate(headers):
                cell_el = ET.SubElement(row_el, header)
                cell_el.text = _safe_xml_value(data_row[i] if i < len(data_row) else None)

    ET.indent(root)
    xml_bytes = ET.tostring(root, encoding="unicode", xml_declaration=False)
    encoded = ('<?xml version="1.0" encoding="UTF-8"?>\n' + xml_bytes).encode("utf-8")

    download_name = f"{safe_base_filename(file.filename, 'workbook')}.xml"

    return file_response(encoded, download_name, "application/xml; charset=utf-8")
