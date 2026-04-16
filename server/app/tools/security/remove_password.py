from __future__ import annotations

from fastapi import APIRouter, File, HTTPException, UploadFile

from app.services.excel_editor import (
    load_workbook_for_edit,
    save_workbook_to_bytes,
    supports_inplace_edit,
)
from app.tools._common import check_excel_file, file_response, has_visual_elements, read_with_limit

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

    if not supports_inplace_edit(file.filename):
        raise HTTPException(
            status_code=400,
            detail="Remove password requires an .xlsx or .xlsm file.",
        )

    loaded = load_workbook_for_edit(raw, file.filename)
    wb = loaded.workbook

    for ws in wb.worksheets:
        ws.protection.sheet = False
        ws.protection.password = None

    wb.security.lockStructure = False

    output_bytes = save_workbook_to_bytes(wb)

    return file_response(
        output_bytes,
        "unprotected.xlsx",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        visual_elements_removed=loaded.visual_elements_lost or has_visual_elements(raw),
    )
