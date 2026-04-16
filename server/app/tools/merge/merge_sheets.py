from __future__ import annotations

from io import BytesIO

from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from openpyxl import Workbook

from app.services.excel_reader import parse_excel_bytes
from app.tools._common import check_excel_file, file_response, has_visual_elements, read_with_limit

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
    raw = await read_with_limit(file)

    workbook_data = parse_excel_bytes(raw, file.filename)
    has_visuals = has_visual_elements(raw)
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

    # Build the union of headers across selected sheets so columns line up
    # even when different sheets present different column orders or names.
    merged_headers: list[str] = []
    seen_headers: set[str] = set()
    sheet_headers: dict[str, list[str]] = {}
    for sheet_name in selected:
        rows = workbook_data[sheet_name]
        if not rows:
            sheet_headers[sheet_name] = []
            continue
        header_row = ["" if v is None else str(v) for v in rows[0]]
        sheet_headers[sheet_name] = header_row
        for column in header_row:
            if column and column not in seen_headers:
                seen_headers.add(column)
                merged_headers.append(column)

    if merged_headers:
        out_ws.append(merged_headers)

    for sheet_name in selected:
        rows = workbook_data[sheet_name]
        if len(rows) <= 1:
            continue
        headers = sheet_headers.get(sheet_name, [])
        # Map each merged-column to the index in this sheet's row, or None.
        column_index_map: list[int | None] = []
        for column in merged_headers:
            if column in headers:
                column_index_map.append(headers.index(column))
            else:
                column_index_map.append(None)

        for row in rows[1:]:
            mapped_row = []
            for source_index in column_index_map:
                if source_index is None or source_index >= len(row):
                    mapped_row.append("")
                else:
                    value = row[source_index]
                    mapped_row.append("" if value is None else value)
            out_ws.append(mapped_row)

    output = BytesIO()
    out_wb.save(output)

    return file_response(
        output.getvalue(),
        "merged.xlsx",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        visual_elements_removed=has_visuals,
    )
