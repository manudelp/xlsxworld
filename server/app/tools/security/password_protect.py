from __future__ import annotations

from io import BytesIO

from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from openpyxl import load_workbook
from openpyxl.worksheet.protection import SheetProtection

from app.tools._common import check_excel_file, file_response, read_with_limit, normalize_sheet_selection

router = APIRouter()


@router.post(
    "/password-protect",
    summary="Password Protect",
    description="Adds sheet-level protection to an XLSX file.",
)
async def password_protect(
    file: UploadFile = File(..., description="Excel file"),
    password: str = Form(..., description="Protection password", min_length=1),
    sheets: str = Form("", description="Comma-separated sheet names (empty=all sheets)"),
    protect_structure: bool = Form(True, description="Protect sheet structure"),
    protect_content: bool = Form(True, description="Protect cell content"),
    protect_formatting: bool = Form(True, description="Protect formatting"),
):
    check_excel_file(file)
    raw = await read_with_limit(file)

    try:
        wb = load_workbook(BytesIO(raw))
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Failed to parse workbook: {exc}") from exc

    selected = normalize_sheet_selection([sheets]) if sheets.strip() else None
    target_names = selected if selected else [ws.title for ws in wb.worksheets]

    for ws in wb.worksheets:
        if ws.title not in target_names:
            continue
        ws.protection = SheetProtection(
            sheet=protect_content,
            formatCells=not protect_formatting,
            formatColumns=not protect_formatting,
            formatRows=not protect_formatting,
            password=password,
        )

    if protect_structure:
        wb.security.lockStructure = True

    buf = BytesIO()
    wb.save(buf)

    return file_response(
        buf.getvalue(),
        "protected.xlsx",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    )
