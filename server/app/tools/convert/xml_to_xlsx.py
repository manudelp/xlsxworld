from __future__ import annotations

import time
from io import BytesIO

import defusedxml.ElementTree as ET
from fastapi import APIRouter, BackgroundTasks, Depends, File, Form, HTTPException, UploadFile
from openpyxl import Workbook

from app.core.security import AuthenticatedPrincipal
from app.services.jobs_service import JobsService
from app.tools._common import (
    read_with_limit,
    safe_base_filename,
    safe_sheet_title,
    unique_sheet_title,
)
from app.tools._recording import (
    get_current_user_optional,
    jobs_service_dep,
    record_and_respond,
)

router = APIRouter()

_XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"

_XML_CONTENT_TYPES = {"application/xml", "text/xml"}


def _strip_ns(tag: str) -> str:
    if "}" in tag:
        return tag.split("}", 1)[1]
    return tag


def _extract_tables(root: ET.Element) -> dict[str, dict]:
    tables: dict[str, dict] = {}

    for child in root:
        tag = _strip_ns(child.tag)
        sheet_name = child.attrib.get("name", tag)
        row_elements = list(child)
        if not row_elements:
            continue

        first_row = row_elements[0]
        if len(first_row) > 0:
            headers_set: list[str] = []
            seen: set[str] = set()
            rows: list[list] = []
            for row_el in row_elements:
                row_data: dict[str, str] = {}
                for cell_el in row_el:
                    col_name = _strip_ns(cell_el.tag)
                    if col_name not in seen:
                        seen.add(col_name)
                        headers_set.append(col_name)
                    row_data[col_name] = (cell_el.text or "").strip()
                rows.append([row_data.get(h, "") for h in headers_set])
            tables[sheet_name] = {"headers": headers_set, "rows": rows}
        else:
            break

    if tables:
        return tables

    row_elements = list(root)
    if row_elements and len(row_elements[0]) > 0:
        headers_set = []
        seen: set[str] = set()
        rows = []
        for row_el in row_elements:
            row_data: dict[str, str] = {}
            for cell_el in row_el:
                col_name = _strip_ns(cell_el.tag)
                if col_name not in seen:
                    seen.add(col_name)
                    headers_set.append(col_name)
                row_data[col_name] = (cell_el.text or "").strip()
            rows.append([row_data.get(h, "") for h in headers_set])
        tables[_strip_ns(root.tag)] = {"headers": headers_set, "rows": rows}

    return tables


@router.post(
    "/xml-to-xlsx",
    summary="XML to XLSX",
    description="Parses an XML file and converts tabular data into an XLSX workbook.",
)
async def xml_to_xlsx(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(..., description="XML file to convert"),
    include_headers: bool = Form(True, description="Include column headers"),
    principal: AuthenticatedPrincipal | None = Depends(get_current_user_optional),
    jobs_service: JobsService = Depends(jobs_service_dep),
):
    started = time.perf_counter()
    filename = (file.filename or "").lower()
    content_type = (file.content_type or "").lower()
    if not filename.endswith(".xml") and content_type not in _XML_CONTENT_TYPES:
        raise HTTPException(status_code=400, detail="Unsupported file type, expected XML")

    raw = await read_with_limit(file)

    try:
        root = ET.fromstring(raw, forbid_dtd=True, forbid_entities=True, forbid_external=True)
    except ET.ParseError as e:
        raise HTTPException(status_code=400, detail=f"Invalid XML: {e}") from e
    except ET.EntitiesForbidden:
        raise HTTPException(status_code=400, detail="XML entity declarations are not allowed")
    except ET.DTDForbidden:
        raise HTTPException(status_code=400, detail="XML DTD declarations are not allowed")
    except ET.ExternalReferenceForbidden:
        raise HTTPException(status_code=400, detail="XML external references are not allowed")

    tables = _extract_tables(root)
    if not tables:
        raise HTTPException(status_code=400, detail="No tabular data found in the XML file")

    wb = Workbook()
    default_ws = wb.active
    wb.remove(default_ws)

    used_names: set[str] = set()
    for table_name, data in tables.items():
        title = unique_sheet_title(safe_sheet_title(table_name, "Sheet"), used_names)
        ws = wb.create_sheet(title=title)
        if include_headers:
            ws.append(data["headers"])
        for row in data["rows"]:
            ws.append(row)

    output = BytesIO()
    wb.save(output)

    out_name = f"{safe_base_filename(file.filename, 'converted')}.xlsx"

    return await record_and_respond(
        principal=principal,
        background_tasks=background_tasks,
        jobs_service=jobs_service,
        tool_slug="xml-to-xlsx",
        tool_name="XML to XLSX",
        original_filename=file.filename,
        output_bytes=output.getvalue(),
        output_filename=out_name,
        mime_type=_XLSX_MIME,
        success=True,
        error_type=None,
        duration_ms=int((time.perf_counter() - started) * 1000),
    )
