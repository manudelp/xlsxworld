from __future__ import annotations

from io import BytesIO

from fastapi import APIRouter, File, HTTPException, UploadFile
from openpyxl import load_workbook
from openpyxl.utils import get_column_letter

from app.tools._common import check_excel_file, file_response, read_with_limit

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

    try:
        wb = load_workbook(BytesIO(raw))
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Failed to parse workbook: {exc}") from exc

    for ws in wb.worksheets:
        for col_cells in ws.columns:
            col_letter = get_column_letter(col_cells[0].column)
            width = MIN_WIDTH
            for cell in col_cells:
                if cell.value is not None:
                    width = max(width, min(len(str(cell.value)) + PADDING, MAX_WIDTH))
            ws.column_dimensions[col_letter].width = width

    buf = BytesIO()
    wb.save(buf)

    return file_response(
        buf.getvalue(),
        "auto-sized.xlsx",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    )
