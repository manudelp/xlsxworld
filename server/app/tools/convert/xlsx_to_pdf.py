from __future__ import annotations

from io import BytesIO

from fastapi import APIRouter, File, HTTPException, Query, UploadFile
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.units import mm
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet

from app.services.excel_reader import ensure_supported_excel_filename, parse_excel_bytes
from app.tools._common import (
    file_response,
    normalize_sheet_selection,
    read_with_limit,
    safe_base_filename,
)

router = APIRouter()

_MAX_COL_WIDTH = 180
_MIN_COL_WIDTH = 40
_CELL_PADDING = 4
_HEADER_BG = colors.HexColor("#2E7D32")
_HEADER_TEXT = colors.white
_ALT_ROW_BG = colors.HexColor("#F5F5F5")
_GRID_COLOR = colors.HexColor("#CCCCCC")


def _truncate(value: object, max_len: int = 120) -> str:
    text = "" if value is None else str(value)
    return text[:max_len] + "…" if len(text) > max_len else text


def _build_pdf(sheets: dict[str, list[list]], selected: list[str], orientation: str) -> bytes:
    buf = BytesIO()
    page_size = landscape(A4) if orientation == "landscape" else A4
    doc = SimpleDocTemplate(
        buf,
        pagesize=page_size,
        leftMargin=12 * mm,
        rightMargin=12 * mm,
        topMargin=14 * mm,
        bottomMargin=14 * mm,
    )
    styles = getSampleStyleSheet()
    story: list = []

    for idx, sheet_name in enumerate(selected):
        rows = sheets[sheet_name]
        if not rows:
            continue

        if idx > 0:
            story.append(Spacer(1, 8 * mm))

        story.append(Paragraph(sheet_name, styles["Heading2"]))
        story.append(Spacer(1, 2 * mm))

        table_data = [[_truncate(c) for c in row] for row in rows]
        if not table_data:
            continue

        num_cols = max(len(r) for r in table_data)
        for r in table_data:
            while len(r) < num_cols:
                r.append("")

        avail_width = page_size[0] - 24 * mm
        col_width = max(_MIN_COL_WIDTH, min(_MAX_COL_WIDTH, avail_width / num_cols))
        col_widths = [col_width] * num_cols

        t = Table(table_data, colWidths=col_widths, repeatRows=1)

        style_cmds: list = [
            ("BACKGROUND", (0, 0), (-1, 0), _HEADER_BG),
            ("TEXTCOLOR", (0, 0), (-1, 0), _HEADER_TEXT),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, -1), 7),
            ("FONTSIZE", (0, 0), (-1, 0), 8),
            ("ALIGN", (0, 0), (-1, -1), "LEFT"),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("GRID", (0, 0), (-1, -1), 0.4, _GRID_COLOR),
            ("TOPPADDING", (0, 0), (-1, -1), _CELL_PADDING),
            ("BOTTOMPADDING", (0, 0), (-1, -1), _CELL_PADDING),
            ("LEFTPADDING", (0, 0), (-1, -1), _CELL_PADDING),
            ("RIGHTPADDING", (0, 0), (-1, -1), _CELL_PADDING),
        ]

        for i in range(1, len(table_data)):
            if i % 2 == 0:
                style_cmds.append(("BACKGROUND", (0, i), (-1, i), _ALT_ROW_BG))

        t.setStyle(TableStyle(style_cmds))
        story.append(t)

    if not story:
        raise HTTPException(status_code=400, detail="No data to export")

    doc.build(story)
    return buf.getvalue()


@router.post(
    "/xlsx-to-pdf",
    summary="Export XLSX to PDF",
    description="Uploads an Excel file and exports selected sheets as a formatted PDF.",
)
async def xlsx_to_pdf(
    file: UploadFile = File(..., description="Excel file"),
    sheets: list[str] = Query(default=None, description="Sheet names to export (empty=all)"),
    orientation: str = Query(default="landscape", description="Page orientation: portrait or landscape"),
):
    ensure_supported_excel_filename(file.filename)
    raw = await read_with_limit(file)

    workbook_data = parse_excel_bytes(raw, file.filename)

    selected = normalize_sheet_selection(sheets)
    if selected:
        missing = [name for name in selected if name not in workbook_data]
        if missing:
            raise HTTPException(status_code=404, detail=f"Sheet not found: {missing[0]}")
        targets = selected
    else:
        targets = list(workbook_data.keys())

    if orientation not in ("portrait", "landscape"):
        orientation = "landscape"

    pdf_bytes = _build_pdf(workbook_data, targets, orientation)
    download_name = f"{safe_base_filename(file.filename, 'workbook')}.pdf"

    return file_response(pdf_bytes, download_name, "application/pdf")
