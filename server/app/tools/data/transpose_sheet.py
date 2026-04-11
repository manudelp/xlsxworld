from __future__ import annotations

from fastapi import APIRouter, File, Form, HTTPException, UploadFile

from app.services.excel_reader import parse_excel_bytes
from app.tools._common import check_excel_file, file_response, read_with_limit
from app.tools.clean._utils import workbook_bytes_from_data

router = APIRouter()


@router.post(
    "/transpose-sheet",
    summary="Transpose Sheet",
    description="Transposes rows to columns and columns to rows for a selected sheet.",
)
async def transpose_sheet(
    file: UploadFile = File(..., description="Excel file"),
    sheet: str = Form(..., description="Sheet name to transpose"),
):
    check_excel_file(file)
    raw = await read_with_limit(file)
    workbook_data = parse_excel_bytes(raw, file.filename)

    if sheet not in workbook_data:
        raise HTTPException(status_code=404, detail="Sheet not found")

    rows = workbook_data[sheet]
    if rows:
        max_cols = max(len(r) for r in rows)
        padded = [list(r) + [None] * (max_cols - len(r)) for r in rows]
        workbook_data[sheet] = list(map(list, zip(*padded)))

    output_bytes = workbook_bytes_from_data(workbook_data)

    return file_response(
        output_bytes,
        "transposed.xlsx",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    )
