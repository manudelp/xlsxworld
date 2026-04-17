from __future__ import annotations

import csv
import time
from io import BytesIO, TextIOWrapper

from fastapi import APIRouter, BackgroundTasks, Depends, File, Form, HTTPException, UploadFile
from openpyxl import Workbook

from app.core.security import AuthenticatedPrincipal
from app.services.jobs_service import JobsService
from app.tools._common import read_upload_for_principal, safe_base_filename
from app.tools._recording import (
    get_current_user_optional,
    jobs_service_dep,
    record_and_respond,
)

router = APIRouter()

_XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"


@router.post(
    "/csv-to-xlsx",
    summary="CSV to XLSX",
    description="Converts an uploaded CSV file into a single-sheet XLSX workbook.",
)
async def csv_to_xlsx(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(..., description="CSV file to convert"),
    sheet_name: str = Form("Sheet1", description="Target sheet name"),
    delimiter: str = Form(",", description="CSV delimiter (single character)"),
    principal: AuthenticatedPrincipal | None = Depends(get_current_user_optional),
    jobs_service: JobsService = Depends(jobs_service_dep),
):
    started = time.perf_counter()
    if not file.filename.lower().endswith(".csv") and ".csv" not in file.content_type:
        raise HTTPException(status_code=400, detail="Unsupported file type, expected CSV")

    raw = await read_upload_for_principal(file, principal=principal)

    if len(delimiter) != 1:
        raise HTTPException(status_code=400, detail="Delimiter must be a single character")

    try:
        text_stream = TextIOWrapper(BytesIO(raw), encoding="utf-8", errors="replace", newline="")
        reader = csv.reader(text_stream, delimiter=delimiter)

        wb = Workbook()
        ws = wb.active
        ws.title = sheet_name[:31] if sheet_name else "Sheet1"

        row_count = 0
        for row in reader:
            ws.append([cell for cell in row])
            row_count += 1

        if row_count == 0:
            ws.append([""])

        output = BytesIO()
        wb.save(output)

        out_name = f"{safe_base_filename(file.filename, 'converted')}.xlsx"

        return await record_and_respond(
            principal=principal,
            background_tasks=background_tasks,
            jobs_service=jobs_service,
            tool_slug="csv-to-xlsx",
            tool_name="CSV to XLSX",
            original_filename=file.filename,
            output_bytes=output.getvalue(),
            output_filename=out_name,
            mime_type=_XLSX_MIME,
            success=True,
            error_type=None,
            duration_ms=int((time.perf_counter() - started) * 1000),
        )
    except csv.Error:
        raise HTTPException(
            status_code=400,
            detail="Could not read the CSV file. The file may be malformed.",
        )
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(
            status_code=500,
            detail="Conversion failed. Please verify the CSV is well-formed.",
        )
