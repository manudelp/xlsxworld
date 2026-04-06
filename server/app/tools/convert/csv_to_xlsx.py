from __future__ import annotations

import csv
from io import BytesIO, TextIOWrapper

from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from openpyxl import Workbook

from app.tools._common import file_response, read_with_limit, safe_base_filename

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

    raw = await read_with_limit(file)

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

        out_name = f"{safe_base_filename(file.filename, 'converted')}.xlsx"

        return file_response(
            output.getvalue(),
            out_name,
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        )
    except csv.Error as e:
        raise HTTPException(status_code=400, detail=f"Failed to parse CSV: {e}")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Conversion error: {e}")
