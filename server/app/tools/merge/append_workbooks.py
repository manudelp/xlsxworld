from __future__ import annotations
from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import StreamingResponse
from io import BytesIO
from openpyxl import Workbook

from app.services.excel_reader import parse_excel_bytes
from app.tools._common import MAX_UPLOAD_SIZE_BYTES, check_excel_file, safe_sheet_title, unique_sheet_title, _INVALID_SHEET_CHARS

router = APIRouter()


@router.post(
    "/append-workbooks",
    summary="Append Workbooks",
    description="Combines sheets from multiple uploaded workbooks into one workbook.",
)
async def append_workbooks(
    files: list[UploadFile] = File(..., description="Excel files to append"),
):
    if len(files) < 2:
        raise HTTPException(status_code=400, detail="At least two workbook files are required")

    out_wb = Workbook()
    out_wb.remove(out_wb.active)
    used_titles: set[str] = set()
    copied_sheets = 0

    for file_index, file in enumerate(files, start=1):
        filename = file.filename or f"workbook_{file_index}.xlsx"
        source_name = filename.rsplit(".", 1)[0] or f"workbook_{file_index}"
        source_name = _INVALID_SHEET_CHARS.sub("_", source_name)

        check_excel_file(file)
        raw = await file.read()
        if len(raw) > MAX_UPLOAD_SIZE_BYTES:
            raise HTTPException(status_code=400, detail="One of the files is too large")

        workbook_data = parse_excel_bytes(raw, file.filename)
        for sheet_name, rows in workbook_data.items():
            preferred_title = safe_sheet_title(sheet_name, f"sheet_{copied_sheets + 1}")
            requested_title = safe_sheet_title(
                f"{source_name}_{preferred_title}",
                preferred_title,
            )
            target_title = unique_sheet_title(requested_title, used_titles)
            out_ws = out_wb.create_sheet(target_title)

            for row in rows:
                out_ws.append(["" if v is None else v for v in row])

            copied_sheets += 1

    if copied_sheets == 0:
        raise HTTPException(status_code=400, detail="No data found in uploaded workbooks")

    output = BytesIO()
    out_wb.save(output)
    output.seek(0)

    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=appended.xlsx"},
    )
