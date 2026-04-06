from __future__ import annotations

import csv
import re
import zipfile
from io import BytesIO, StringIO

from fastapi import APIRouter, File, HTTPException, Query, UploadFile

from app.services.excel_reader import ensure_supported_excel_filename, parse_excel_bytes
from app.tools._common import file_response, read_with_limit, safe_base_filename

router = APIRouter()


def _build_unique_csv_name(raw_name: str, used_names: set[str]) -> str:
    safe = re.sub(r"[^A-Za-z0-9._-]+", "_", raw_name).strip("._")
    if not safe:
        safe = "sheet"
    candidate = safe
    i = 2
    while f"{candidate}.csv" in used_names:
        candidate = f"{safe}_{i}"
        i += 1
    filename = f"{candidate}.csv"
    used_names.add(filename)
    return filename


def _sheets_to_csv_zip(workbook_data: dict, sheet_names: list[str]) -> bytes:
    zipped = BytesIO()
    used_names: set[str] = set()
    with zipfile.ZipFile(zipped, mode="w", compression=zipfile.ZIP_DEFLATED) as zf:
        for sheet_name in sheet_names:
            rows = workbook_data[sheet_name]
            output = StringIO()
            writer = csv.writer(output)
            for r in rows:
                writer.writerow(["" if c is None else c for c in r])
            zf.writestr(_build_unique_csv_name(sheet_name, used_names), output.getvalue().encode("utf-8"))
    return zipped.getvalue()


@router.post(
    "/xlsx-to-csv",
    summary="Export XLSX Sheet to CSV",
    description="Uploads an Excel file and exports one sheet as a CSV download.",
)
async def xlsx_to_csv(
    file: UploadFile = File(..., description="Excel file"),
    sheet: str = Query(..., description="Sheet name to export"),
):
    ensure_supported_excel_filename(file.filename)
    raw = await read_with_limit(file)

    workbook_data = parse_excel_bytes(raw, file.filename)
    if sheet not in workbook_data:
        raise HTTPException(status_code=404, detail="Sheet not found")
    rows = workbook_data[sheet]

    output = StringIO()
    writer = csv.writer(output)
    for r in rows:
        writer.writerow(["" if c is None else c for c in r])

    encoded = output.getvalue().encode("utf-8")
    download_name = f"{safe_base_filename(file.filename, sheet)}.csv"

    return file_response(encoded, download_name, "text/csv; charset=utf-8")


@router.post(
    "/xlsx-to-csv-zip",
    summary="Export XLSX to CSV ZIP",
    description="Uploads an Excel file and exports all (or selected) sheets as CSV files in a ZIP archive.",
)
async def xlsx_to_csv_zip(
    file: UploadFile = File(..., description="Excel file"),
    sheets: list[str] = Query(default=None, description="Sheet names to export (empty=all)"),
):
    ensure_supported_excel_filename(file.filename)
    raw = await read_with_limit(file)

    workbook_data = parse_excel_bytes(raw, file.filename)

    if sheets:
        missing = [name for name in sheets if name not in workbook_data]
        if missing:
            raise HTTPException(status_code=404, detail=f"Sheet not found: {missing[0]}")
        selected = sheets
    else:
        selected = list(workbook_data.keys())

    zipped = _sheets_to_csv_zip(workbook_data, selected)
    download_name = f"{safe_base_filename(file.filename, 'sheets-csv')}.zip"

    return file_response(zipped, download_name, "application/zip")
