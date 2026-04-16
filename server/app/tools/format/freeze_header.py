from __future__ import annotations

from fastapi import APIRouter, File, Form, HTTPException, UploadFile

from app.services.excel_editor import (
    load_workbook_for_edit,
    save_workbook_to_bytes,
    supports_inplace_edit,
)
from app.tools._common import check_excel_file, file_response, has_visual_elements, read_with_limit

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

    if not supports_inplace_edit(file.filename):
        raise HTTPException(
            status_code=400,
            detail="Freeze header requires an .xlsx or .xlsm file.",
        )

    loaded = load_workbook_for_edit(raw, file.filename)
    wb = loaded.workbook

    for ws in wb.worksheets:
        ws.freeze_panes = f"A{rows + 1}"

    output_bytes = save_workbook_to_bytes(wb)

    return file_response(
        output_bytes,
        "frozen.xlsx",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        visual_elements_removed=loaded.visual_elements_lost or has_visual_elements(raw),
    )
