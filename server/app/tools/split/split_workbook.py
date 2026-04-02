from __future__ import annotations
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from fastapi.responses import StreamingResponse
from io import BytesIO
import zipfile
from openpyxl import Workbook

from app.services.excel_reader import parse_excel_bytes
from app.tools._common import MAX_UPLOAD_SIZE_BYTES, check_excel_file

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
    raw = await file.read()
    if len(raw) > MAX_UPLOAD_SIZE_BYTES:
        raise HTTPException(status_code=400, detail="File too large")

    workbook_data = parse_excel_bytes(raw, file.filename)
    if not workbook_data:
        raise HTTPException(status_code=400, detail="Workbook is empty")

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
            child_bytes.seek(0)
            member_name = f"{sheet_name.replace(' ', '_') or 'sheet'}.xlsx"
            zf.writestr(member_name, child_bytes.getvalue())

    zipped.seek(0)
    return StreamingResponse(
        iter([zipped.getvalue()]),
        media_type="application/zip",
        headers={"Content-Disposition": "attachment; filename=splitted_workbook.zip"},
    )
