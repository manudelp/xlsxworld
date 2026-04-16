from __future__ import annotations

from fastapi import APIRouter, File, HTTPException, UploadFile
from openpyxl.utils import get_column_letter

from app.services.excel_editor import (
    load_workbook_for_edit,
    save_workbook_to_bytes,
    supports_inplace_edit,
)
from app.tools._common import check_excel_file, file_response, has_visual_elements, read_with_limit

router = APIRouter()

PADDING = 2
MIN_WIDTH = 8
MAX_WIDTH = 60


@router.post(
    "/auto-size-columns",
    summary="Auto-Size Columns",
    description="Auto-sizes all column widths based on cell content across all sheets.",
)
async def auto_size_columns(
    file: UploadFile = File(..., description="Excel file"),
):
    check_excel_file(file)
    raw = await read_with_limit(file)

    if not supports_inplace_edit(file.filename):
        raise HTTPException(
            status_code=400,
            detail="Auto-size columns requires an .xlsx or .xlsm file.",
        )

    loaded = load_workbook_for_edit(raw, file.filename)
    wb = loaded.workbook

    for ws in wb.worksheets:
        # Walking ws.columns on a workbook with merged cells can raise; iterate
        # over the cell ranges manually so a single problematic sheet doesn't
        # break the whole tool.
        max_col = ws.max_column
        max_row = ws.max_row
        if max_col == 0 or max_row == 0:
            continue
        for col_idx in range(1, max_col + 1):
            col_letter = get_column_letter(col_idx)
            width = MIN_WIDTH
            for row_idx in range(1, max_row + 1):
                value = ws.cell(row=row_idx, column=col_idx).value
                if value is not None:
                    width = max(width, min(len(str(value)) + PADDING, MAX_WIDTH))
            ws.column_dimensions[col_letter].width = width

    output_bytes = save_workbook_to_bytes(wb)

    return file_response(
        output_bytes,
        "auto-sized.xlsx",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        visual_elements_removed=loaded.visual_elements_lost or has_visual_elements(raw),
    )
