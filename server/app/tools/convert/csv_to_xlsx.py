from __future__ import annotations
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from fastapi.responses import StreamingResponse
from io import BytesIO, TextIOWrapper
import csv
from openpyxl import Workbook

from app.tools._common import MAX_UPLOAD_SIZE_BYTES

router = APIRouter()


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
    if len(raw) > MAX_UPLOAD_SIZE_BYTES:
        raise HTTPException(
            status_code=400,
            detail=f"File too large (max {MAX_UPLOAD_SIZE_BYTES // 1024 // 1024} MB)",
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
                "Content-Encoding": "identity",
            },
        )
    except csv.Error as e:
        raise HTTPException(status_code=400, detail=f"Failed to parse CSV: {e}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Conversion error: {e}")
