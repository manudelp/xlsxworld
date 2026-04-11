from __future__ import annotations

from fastapi import APIRouter, File, Form, UploadFile

from app.services.excel_reader import parse_excel_bytes
from app.tools._common import check_excel_file, file_response, read_with_limit, normalize_sheet_selection
from app.tools.clean._utils import workbook_bytes_from_data

router = APIRouter()


@router.post(
    "/remove-empty-rows",
    summary="Remove Empty Rows",
    description="Removes rows where all cells are empty across selected sheets.",
)
async def remove_empty_rows(
    file: UploadFile = File(..., description="Excel file"),
    sheets: str = Form("", description="Comma-separated sheet names (empty=all sheets)"),
):
    check_excel_file(file)
    raw = await read_with_limit(file)
    workbook_data = parse_excel_bytes(raw, file.filename)

    selected = normalize_sheet_selection([sheets]) if sheets.strip() else None
    target_sheets = selected if selected else list(workbook_data.keys())

    total_removed = 0
    for sheet_name in target_sheets:
        if sheet_name not in workbook_data:
            continue
        rows = workbook_data[sheet_name]
        if not rows:
            continue
        header = rows[0]
        data_rows = rows[1:]
        cleaned = [r for r in data_rows if any(c is not None and str(c).strip() != "" for c in r)]
        total_removed += len(data_rows) - len(cleaned)
        workbook_data[sheet_name] = [header, *cleaned]

    output_bytes = workbook_bytes_from_data(workbook_data)
    resp = file_response(
        output_bytes,
        "cleaned.xlsx",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    )
    resp.headers["X-Rows-Removed"] = str(total_removed)
    resp.headers["Access-Control-Expose-Headers"] = "X-Rows-Removed"
    return resp
