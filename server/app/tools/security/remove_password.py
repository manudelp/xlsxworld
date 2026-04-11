from __future__ import annotations

from io import BytesIO

from fastapi import APIRouter, File, HTTPException, UploadFile
from openpyxl import load_workbook

from app.tools._common import check_excel_file, file_response, read_with_limit

router = APIRouter()


@router.post(
    "/remove-password",
    summary="Remove Password",
    description="Removes sheet-level protection from all sheets.",
)
async def remove_password(
    file: UploadFile = File(..., description="Excel file"),
):
    check_excel_file(file)
    raw = await read_with_limit(file)

    try:
        wb = load_workbook(BytesIO(raw))
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Failed to parse workbook: {exc}") from exc

    for ws in wb.worksheets:
        ws.protection.sheet = False
        ws.protection.password = None

    wb.security.lockStructure = False

    buf = BytesIO()
    wb.save(buf)

    return file_response(
        buf.getvalue(),
        "unprotected.xlsx",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    )
