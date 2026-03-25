from __future__ import annotations
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from fastapi.responses import StreamingResponse
from io import BytesIO
import zipfile
from openpyxl import load_workbook, Workbook

router = APIRouter(prefix="/api/tools", tags=["tools"])
_MAX_UPLOAD_SIZE_BYTES = 20 * 1024 * 1024  # 20 MB


def _check_file(file: UploadFile, expected_ext: str):
    if not file.filename.lower().endswith(expected_ext):
        raise HTTPException(status_code=400, detail=f"Unsupported file type, expected {expected_ext}")


@router.post("/merge-sheets")
async def merge_sheets(
    file: UploadFile = File(..., description="XLSX file"),
    sheet_names: str = Form("", description="Comma-separated sheet names to merge (empty=all)"),
    output_sheet: str = Form("Merged", description="Output sheet name"),
):
    _check_file(file, ".xlsx")

    raw = await file.read()
    if len(raw) > _MAX_UPLOAD_SIZE_BYTES:
        raise HTTPException(status_code=400, detail="File too large")

    try:
        wb = load_workbook(filename=BytesIO(raw), read_only=True, data_only=True)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to parse workbook: {e}")

    selected = [s.strip() for s in sheet_names.split(",") if s.strip()]
    if not selected:
        selected = wb.sheetnames

    for s in selected:
        if s not in wb.sheetnames:
            raise HTTPException(status_code=400, detail=f"Sheet not found: {s}")

    out_wb = Workbook()
    out_ws = out_wb.active
    out_ws.title = output_sheet[:31] if output_sheet else "Merged"

    header_written = False
    row_count = 0
    for sheet_name in selected:
        ws = wb[sheet_name]
        rows = ws.iter_rows(values_only=True)
        for i, row in enumerate(rows):
            if i == 0:
                if not header_written:
                    out_ws.append(["" if v is None else v for v in row])
                    header_written = True
                elif row and any(x is not None for x in row):
                    # skip repeating header for following sheets
                    continue
            else:
                out_ws.append(["" if v is None else v for v in row])
                row_count += 1

    output = BytesIO()
    out_wb.save(output)
    output.seek(0)

    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=merged.xlsx"},
    )


@router.post("/split-sheet")
async def split_sheet(
    file: UploadFile = File(..., description="XLSX file"),
    sheet: str = Form(..., description="Sheet name"),
    chunk_size: int = Form(1000, description="Max rows per chunk (including header)"),
):
    _check_file(file, ".xlsx")

    raw = await file.read()
    if len(raw) > _MAX_UPLOAD_SIZE_BYTES:
        raise HTTPException(status_code=400, detail="File too large")
    if chunk_size < 2:
        raise HTTPException(status_code=400, detail="chunk_size must be >= 2")

    try:
        wb = load_workbook(filename=BytesIO(raw), read_only=True, data_only=True)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to parse workbook: {e}")

    if sheet not in wb.sheetnames:
        raise HTTPException(status_code=404, detail="Sheet not found")

    ws = wb[sheet]
    rows = list(ws.iter_rows(values_only=True))
    if not rows:
        raise HTTPException(status_code=400, detail="Sheet is empty")

    # first row as header
    header = rows[0]
    chunks = [rows[i : i + chunk_size] for i in range(1, len(rows), chunk_size)]

    out_wb = Workbook()
    out_wb.remove(out_wb.active)

    for idx, chunk in enumerate(chunks, start=1):
        part = out_wb.create_sheet(f"part_{idx}")
        part.append(["" if v is None else v for v in header])
        for row in chunk:
            part.append(["" if v is None else v for v in row])

    if not chunks:
        # no data rows, create one sheet with header only
        part = out_wb.create_sheet("part_1")
        part.append(["" if v is None else v for v in header])

    output = BytesIO()
    out_wb.save(output)
    output.seek(0)

    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=splitted.xlsx"},
    )


@router.post("/append-workbooks")
async def append_workbooks(
    files: list[UploadFile] = File(..., description="XLSX files to append"),
    output_sheet: str = Form("Appended", description="Output sheet name"),
):
    if len(files) < 2:
        raise HTTPException(status_code=400, detail="At least two workbook files are required")

    out_wb = Workbook()
    out_ws = out_wb.active
    out_ws.title = output_sheet[:31] if output_sheet else "Appended"

    header_written = False
    total_rows = 0

    for file in files:
        if not file.filename.lower().endswith(".xlsx"):
            raise HTTPException(status_code=400, detail="Unsupported file type, expected .xlsx")

        raw = await file.read()
        if len(raw) > _MAX_UPLOAD_SIZE_BYTES:
            raise HTTPException(status_code=400, detail="One of the files is too large")

        wb = load_workbook(filename=BytesIO(raw), read_only=True, data_only=True)
        first_sheet = wb.active

        rows = first_sheet.iter_rows(values_only=True)
        for i, row in enumerate(rows):
            if i == 0:
                if not header_written:
                    out_ws.append(["" if v is None else v for v in row])
                    header_written = True
                else:
                    continue
            else:
                out_ws.append(["" if v is None else v for v in row])
                total_rows += 1

    if not header_written:
        raise HTTPException(status_code=400, detail="No data found in uploaded workbooks")

    output = BytesIO()
    out_wb.save(output)
    output.seek(0)

    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=appended.xlsx"},
    )


@router.post("/split-workbook")
async def split_workbook(file: UploadFile = File(..., description="XLSX file")):
    _check_file(file, ".xlsx")
    raw = await file.read()
    if len(raw) > _MAX_UPLOAD_SIZE_BYTES:
        raise HTTPException(status_code=400, detail="File too large")

    wb = load_workbook(filename=BytesIO(raw), read_only=True, data_only=True)
    if not wb.sheetnames:
        raise HTTPException(status_code=400, detail="Workbook is empty")

    zipped = BytesIO()
    with zipfile.ZipFile(zipped, mode="w", compression=zipfile.ZIP_DEFLATED) as zf:
        for sheet_name in wb.sheetnames:
            ws = wb[sheet_name]
            child_wb = Workbook()
            child_ws = child_wb.active
            child_ws.title = sheet_name[:31] if sheet_name else "Sheet1"

            for row in ws.iter_rows(values_only=True):
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
