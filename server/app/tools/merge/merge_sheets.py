from __future__ import annotations
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from fastapi.responses import StreamingResponse
from io import BytesIO
from openpyxl import Workbook

from app.services.excel_reader import parse_excel_bytes
from app.tools._common import MAX_UPLOAD_SIZE_BYTES, check_excel_file

router = APIRouter()


@router.post(
    "/merge-sheets",
    summary="Merge Sheets",
    description="Merges multiple sheets from one workbook into a single output sheet.",
)
async def merge_sheets(
    file: UploadFile = File(..., description="Excel file"),
    sheet_names: str = Form("", description="Comma-separated sheet names to merge (empty=all)"),
    output_sheet: str = Form("Merged", description="Output sheet name"),
):
    check_excel_file(file)
    raw = await file.read()
    if len(raw) > MAX_UPLOAD_SIZE_BYTES:
        raise HTTPException(status_code=400, detail="File too large")

    workbook_data = parse_excel_bytes(raw, file.filename)
    sheet_order = list(workbook_data.keys())

    selected = [s.strip() for s in sheet_names.split(",") if s.strip()]
    if not selected:
        selected = sheet_order

    for s in selected:
        if s not in workbook_data:
            raise HTTPException(status_code=400, detail=f"Sheet not found: {s}")

    out_wb = Workbook()
    out_ws = out_wb.active
    out_ws.title = output_sheet[:31] if output_sheet else "Merged"

    header_written = False
    for sheet_name in selected:
        rows = workbook_data[sheet_name]
        for i, row in enumerate(rows):
            if i == 0:
                if not header_written:
                    out_ws.append(["" if v is None else v for v in row])
                    header_written = True
                elif row and any(x is not None for x in row):
                    continue
            else:
                out_ws.append(["" if v is None else v for v in row])

    output = BytesIO()
    out_wb.save(output)
    output.seek(0)

    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=merged.xlsx"},
    )
