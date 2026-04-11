from __future__ import annotations

import zipfile
from io import BytesIO

from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from openpyxl import Workbook

from app.services.excel_reader import parse_excel_bytes
from app.tools._common import check_excel_file, file_response, has_visual_elements, read_with_limit

router = APIRouter()


@router.post(
    "/split-workbook",
    summary="Split Workbook",
    description="Exports each workbook sheet as a separate XLSX file inside a ZIP archive.",
)
async def split_workbook(
    file: UploadFile = File(..., description="Excel file"),
    sheet_names: str = Form("", description="Comma-separated sheet names to split (empty=all)"),
):
    check_excel_file(file)
    raw = await read_with_limit(file)

    workbook_data = parse_excel_bytes(raw, file.filename)
    if not workbook_data:
        raise HTTPException(status_code=400, detail="Workbook is empty")

    has_visuals = has_visual_elements(raw)

    selected_sheet_names = [
        sheet_name.strip() for sheet_name in sheet_names.split(",") if sheet_name.strip()
    ]
    if selected_sheet_names:
        missing = [name for name in selected_sheet_names if name not in workbook_data]
        if missing:
            raise HTTPException(
                status_code=400,
                detail=f"Sheet not found: {missing[0]}",
            )
        selected_set = set(selected_sheet_names)
        workbook_data = {
            name: rows for name, rows in workbook_data.items() if name in selected_set
        }

    if not workbook_data:
        raise HTTPException(status_code=400, detail="Select at least one sheet")

    zipped = BytesIO()
    with zipfile.ZipFile(zipped, mode="w", compression=zipfile.ZIP_DEFLATED) as zf:
        for sheet_name, rows in workbook_data.items():
            child_wb = Workbook()
            child_ws = child_wb.active
            child_ws.title = sheet_name[:31] if sheet_name else "Sheet1"

            for row in rows:
                child_ws.append(["" if v is None else v for v in row])

            child_bytes = BytesIO()
            child_wb.save(child_bytes)
            member_name = f"{sheet_name.replace(' ', '_') or 'sheet'}.xlsx"
            zf.writestr(member_name, child_bytes.getvalue())

    return file_response(
        zipped.getvalue(),
        "split_workbook.zip",
        "application/zip",
        visual_elements_removed=has_visuals,
    )
