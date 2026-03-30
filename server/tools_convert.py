from __future__ import annotations
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Query
from fastapi.responses import StreamingResponse
from io import BytesIO, StringIO, TextIOWrapper
import csv
import re
import zipfile
from openpyxl import Workbook

import tools_inspect

router = APIRouter(prefix="/api/convert", tags=["tools"])

_MAX_UPLOAD_SIZE_BYTES = 20 * 1024 * 1024  # 20 MB


def _load_token_workbook(token: str):
    return tools_inspect._load_workbook_from_token(token)


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

@router.post(
    "/csv-to-xlsx",
    summary="CSV to XLSX",
    description="Converts an uploaded CSV file into a single-sheet XLSX workbook.",
)
async def csv_to_xlsx(
    file: UploadFile = File(..., description="CSV file to convert"),
    sheet_name: str = Form("Sheet1", description="Target sheet name"),
    delimiter: str = Form(",", description="CSV delimiter (single character)"),
):
    if not file.filename.lower().endswith(".csv") and ".csv" not in file.content_type:
        raise HTTPException(status_code=400, detail="Unsupported file type, expected CSV")

    raw = await file.read()
    if len(raw) > _MAX_UPLOAD_SIZE_BYTES:
        raise HTTPException(
            status_code=400,
            detail=f"File too large (max {_MAX_UPLOAD_SIZE_BYTES // 1024 // 1024} MB)",
        )

    if len(delimiter) != 1:
        raise HTTPException(status_code=400, detail="Delimiter must be a single character")

    try:
        text_stream = TextIOWrapper(BytesIO(raw), encoding="utf-8", errors="replace", newline="")
        reader = csv.reader(text_stream, delimiter=delimiter)

        wb = Workbook()
        ws = wb.active
        ws.title = sheet_name[:31] if sheet_name else "Sheet1"

        row_count = 0
        for row in reader:
            ws.append([cell for cell in row])
            row_count += 1

        if row_count == 0:
            # ensure workbook isn't empty
            ws.append([""])

        output = BytesIO()
        wb.save(output)
        output.seek(0)

        filename = f"{file.filename.rsplit('.', 1)[0] if '.' in file.filename else 'converted'}.xlsx"

        return StreamingResponse(
            iter([output.getvalue()]),
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={
                "Content-Disposition": f"attachment; filename={filename}",
            },
        )
    except csv.Error as e:
        raise HTTPException(status_code=400, detail=f"Failed to parse CSV: {e}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Conversion error: {e}")


@router.get(
    "/xlsx-to-csv/export/csv",
    summary="Export XLSX to CSV",
    description="Exports one selected sheet as a CSV file using a workbook token.",
)
async def export_xlsx_to_csv(token: str, sheet: str):
    workbook_data = _load_token_workbook(token)
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
        headers={"Content-Disposition": f"attachment; filename={sheet}.csv"},
    )


@router.get(
    "/xlsx-to-csv/export/csv-zip",
    summary="Export XLSX to CSV ZIP",
    description="Exports all sheets as individual CSV files packaged in a ZIP archive.",
)
async def export_xlsx_to_csv_zip(token: str):
    workbook_data = _load_token_workbook(token)
    zipped = BytesIO()
    used_names: set[str] = set()

    with zipfile.ZipFile(zipped, mode="w", compression=zipfile.ZIP_DEFLATED) as zf:
        for sheet_name, rows in workbook_data.items():
            output = StringIO()
            writer = csv.writer(output)
            for r in rows:
                writer.writerow(["" if c is None else c for c in r])
            zf.writestr(_build_unique_csv_name(sheet_name, used_names), output.getvalue().encode("utf-8"))

    zipped.seek(0)
    return StreamingResponse(
        iter([zipped.getvalue()]),
        media_type="application/zip",
        headers={"Content-Disposition": "attachment; filename=all-sheets-csv.zip"},
    )


@router.get(
    "/xlsx-to-csv/export/csv-zip-selected",
    summary="Export Selected Sheets to CSV ZIP",
    description="Exports only the selected sheets as CSV files in a ZIP archive.",
)
async def export_xlsx_to_csv_zip_selected(
    token: str,
    sheets: list[str] = Query(...),
):
    if not sheets:
        raise HTTPException(status_code=400, detail="Select at least one sheet")

    workbook_data = _load_token_workbook(token)
    missing = [name for name in sheets if name not in workbook_data]
    if missing:
        raise HTTPException(status_code=404, detail=f"Sheet not found: {missing[0]}")

    zipped = BytesIO()
    used_names: set[str] = set()

    with zipfile.ZipFile(zipped, mode="w", compression=zipfile.ZIP_DEFLATED) as zf:
        for sheet_name in sheets:
            rows = workbook_data[sheet_name]
            output = StringIO()
            writer = csv.writer(output)
            for r in rows:
                writer.writerow(["" if c is None else c for c in r])
            zf.writestr(_build_unique_csv_name(sheet_name, used_names), output.getvalue().encode("utf-8"))

    zipped.seek(0)
    return StreamingResponse(
        iter([zipped.getvalue()]),
        media_type="application/zip",
        headers={"Content-Disposition": "attachment; filename=selected-sheets-csv.zip"},
    )
