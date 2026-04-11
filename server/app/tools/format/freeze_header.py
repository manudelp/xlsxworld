from __future__ import annotations

from io import BytesIO

from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from openpyxl import load_workbook

from app.tools._common import check_excel_file, file_response, read_with_limit

router = APIRouter()


@router.post(
    "/freeze-header",
    summary="Freeze Header",
    description="Freezes the first N rows of each sheet so they stay visible when scrolling.",
)
async def freeze_header(
    file: UploadFile = File(..., description="Excel file"),
    rows: int = Form(1, description="Number of rows to freeze", ge=1, le=100),
):
    check_excel_file(file)
    raw = await read_with_limit(file)

    try:
        wb = load_workbook(BytesIO(raw))
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Failed to parse workbook: {exc}") from exc

    for ws in wb.worksheets:
        ws.freeze_panes = f"A{rows + 1}"

    buf = BytesIO()
    wb.save(buf)

    return file_response(
        buf.getvalue(),
        "frozen.xlsx",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    )
