from __future__ import annotations
from fastapi import APIRouter, UploadFile, File, HTTPException, Query
from fastapi.responses import StreamingResponse
from io import BytesIO, StringIO
import csv
import re
import zipfile

from app.services.excel_reader import ensure_supported_excel_filename, parse_excel_bytes
from app.tools._common import MAX_UPLOAD_SIZE_BYTES

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


def _sheets_to_csv_zip(workbook_data: dict, sheet_names: list[str]) -> BytesIO:
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
    zipped.seek(0)
    return zipped


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
    raw = await file.read()
    if len(raw) > MAX_UPLOAD_SIZE_BYTES:
        raise HTTPException(status_code=400, detail="File too large")

    workbook_data = parse_excel_bytes(raw, file.filename)
    if sheet not in workbook_data:
        raise HTTPException(status_code=404, detail="Sheet not found")
    rows = workbook_data[sheet]

    def gen():
        output = StringIO()
        writer = csv.writer(output)
        for r in rows:
            writer.writerow(["" if c is None else c for c in r])
            data = output.getvalue()
            if data:
                yield data.encode("utf-8")
            output.seek(0)
            output.truncate(0)

    return StreamingResponse(
        gen(),
        media_type="text/csv; charset=utf-8",
        headers={
            "Content-Disposition": f"attachment; filename={sheet}.csv",
            "Content-Encoding": "identity",
        },
    )


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
    raw = await file.read()
    if len(raw) > MAX_UPLOAD_SIZE_BYTES:
        raise HTTPException(status_code=400, detail="File too large")

    workbook_data = parse_excel_bytes(raw, file.filename)

    if sheets:
        missing = [name for name in sheets if name not in workbook_data]
        if missing:
            raise HTTPException(status_code=404, detail=f"Sheet not found: {missing[0]}")
        selected = sheets
    else:
        selected = list(workbook_data.keys())

    zipped = _sheets_to_csv_zip(workbook_data, selected)

    return StreamingResponse(
        iter([zipped.getvalue()]),
        media_type="application/zip",
        headers={
            "Content-Disposition": "attachment; filename=sheets-csv.zip",
            "Content-Encoding": "identity",
        },
    )
