from __future__ import annotations

import re
import time
from io import BytesIO

from fastapi import APIRouter, BackgroundTasks, Depends, File, HTTPException, Query, UploadFile
from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import A3, A4, landscape, letter
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import PageBreak, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

from app.core.security import AuthenticatedPrincipal
from app.services.excel_reader import ensure_supported_excel_filename, parse_excel_bytes
from app.services.jobs_service import JobsService
from app.tools._common import (
    normalize_sheet_selection,
    read_with_limit,
    safe_base_filename,
)
from app.tools._recording import (
    get_current_user_optional,
    jobs_service_dep,
    record_and_respond,
)

router = APIRouter()

_MIN_COL_WIDTH = 30
_MAX_COL_WIDTH = 180   # used by ellipsis mode only
_CELL_PADDING = 4
_CHAR_W_FACTOR = 0.62  # conservative per-char width for Helvetica (accounts for wide glyphs)

_HEADER_BG_COLORED = colors.HexColor("#2E7D32")
_HEADER_BG_GRAY = colors.HexColor("#757575")
_HEADER_TEXT = colors.white
_ALT_ROW_BG = colors.HexColor("#F5F5F5")
_GRID_COLOR = colors.HexColor("#CCCCCC")

_PAGE_SIZES = {
    "A4": A4,
    "Letter": letter,
    "A3": A3,
}

_FONT_SIZES = {
    "small": (6, 7),
    "medium": (8, 9),
    "large": (10, 11),
}


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _truncate(value: object, max_len: int = 120) -> str:
    text = "" if value is None else str(value)
    return text[:max_len] + "…" if len(text) > max_len else text


def _safe_text(value: object) -> str:
    """Escape HTML special chars for use in a ReportLab Paragraph."""
    text = "" if value is None else str(value)
    return (
        text.replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace("\n", "<br/>")
    )


def _parse_hex_color(hex_str: str, fallback: colors.Color) -> colors.Color:
    if re.match(r"^#[0-9A-Fa-f]{6}$", hex_str):
        return colors.HexColor(hex_str)
    return fallback


def _natural_col_widths(
    table_data: list[list],
    body_fs: int,
    num_cols: int,
    avail_width: float,
) -> list[float]:
    """Per-column widths sized to content, capped at avail_width. No page scaling."""
    char_w = body_fs * _CHAR_W_FACTOR
    widths: list[float] = []
    for ci in range(num_cols):
        max_chars = max(
            (len(str(row[ci])) for row in table_data if ci < len(row)),
            default=0,
        )
        w = max(float(_MIN_COL_WIDTH), min(avail_width, max_chars * char_w + 2 * _CELL_PADDING))
        widths.append(w)
    return widths


def _group_columns_by_page(
    col_widths: list[float], avail_width: float
) -> list[tuple[int, int]]:
    """Return (start, end) index slices where each slice fits within avail_width."""
    groups: list[tuple[int, int]] = []
    start = 0
    while start < len(col_widths):
        total = 0.0
        end = start
        while end < len(col_widths) and total + col_widths[end] <= avail_width:
            total += col_widths[end]
            end += 1
        if end == start:
            end = start + 1  # single column wider than page — give it the full width
        groups.append((start, end))
        start = end
    return groups


def _make_style_cmds(
    num_rows: int,
    hdr_bg: colors.Color | None,
    hdr_text: colors.Color,
    body_fs: int,
    header_fs: int,
) -> list:
    cmds: list = [
        ("TEXTCOLOR", (0, 0), (-1, 0), hdr_text),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), body_fs),
        ("FONTSIZE", (0, 0), (-1, 0), header_fs),
        ("ALIGN", (0, 0), (-1, -1), "LEFT"),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("GRID", (0, 0), (-1, -1), 0.4, _GRID_COLOR),
        ("TOPPADDING", (0, 0), (-1, -1), _CELL_PADDING),
        ("BOTTOMPADDING", (0, 0), (-1, -1), _CELL_PADDING),
        ("LEFTPADDING", (0, 0), (-1, -1), _CELL_PADDING),
        ("RIGHTPADDING", (0, 0), (-1, -1), _CELL_PADDING),
    ]
    if hdr_bg is not None:
        cmds.insert(0, ("BACKGROUND", (0, 0), (-1, 0), hdr_bg))
    for i in range(1, num_rows):
        if i % 2 == 0:
            cmds.append(("BACKGROUND", (0, i), (-1, i), _ALT_ROW_BG))
    return cmds


# ---------------------------------------------------------------------------
# PDF builder
# ---------------------------------------------------------------------------

def _build_pdf(
    sheets: dict[str, list[list]],
    selected: list[str],
    orientation: str,
    column_mode: str,
    font_size: str,
    header_style: str,
    page_size_key: str,
    header_color: str,
) -> bytes:
    buf = BytesIO()
    base_size = _PAGE_SIZES.get(page_size_key, A4)
    page_size = landscape(base_size) if orientation == "landscape" else base_size
    doc = SimpleDocTemplate(
        buf,
        pagesize=page_size,
        leftMargin=12 * mm,
        rightMargin=12 * mm,
        topMargin=14 * mm,
        bottomMargin=14 * mm,
    )
    styles = getSampleStyleSheet()
    body_fs, header_fs = _FONT_SIZES.get(font_size, (8, 9))

    if header_style == "colored":
        hdr_bg: colors.Color | None = _parse_hex_color(header_color, _HEADER_BG_COLORED)
        hdr_text = _HEADER_TEXT
    elif header_style == "gray":
        hdr_bg = _HEADER_BG_GRAY
        hdr_text = _HEADER_TEXT
    else:  # plain
        hdr_bg = None
        hdr_text = colors.black

    # Paragraph styles for wrap mode
    cell_style = ParagraphStyle(
        "CellWrap",
        fontName="Helvetica",
        fontSize=body_fs,
        leading=body_fs + 2,
        textColor=colors.black,
        alignment=TA_LEFT,
        wordWrap="LTR",
    )
    header_cell_style = ParagraphStyle(
        "HeaderWrap",
        fontName="Helvetica-Bold",
        fontSize=header_fs,
        leading=header_fs + 2,
        textColor=hdr_text,
        alignment=TA_LEFT,
        wordWrap="LTR",
    )

    story: list = []

    for sheet_idx, sheet_name in enumerate(selected):
        rows = sheets[sheet_name]
        if not rows:
            continue

        if sheet_idx > 0:
            story.append(Spacer(1, 8 * mm))

        story.append(Paragraph(sheet_name, styles["Heading2"]))
        story.append(Spacer(1, 2 * mm))

        num_cols = max(len(r) for r in rows)
        avail_width = page_size[0] - 24 * mm

        # ── fit mode: column pagination ──────────────────────────────────────
        if column_mode == "fit":
            raw_data = [
                [str(c) if c is not None else "" for c in row]
                for row in rows
            ]
            for r in raw_data:
                while len(r) < num_cols:
                    r.append("")

            col_widths_all = _natural_col_widths(raw_data, body_fs, num_cols, avail_width)
            col_groups = _group_columns_by_page(col_widths_all, avail_width)

            for gi, (col_start, col_end) in enumerate(col_groups):
                if gi > 0:
                    story.append(PageBreak())
                    story.append(Paragraph(f"{sheet_name} (cont.)", styles["Heading2"]))
                    story.append(Spacer(1, 2 * mm))

                group_widths = col_widths_all[col_start:col_end]
                # If this single-column group is wider than the page, clamp it
                if col_end - col_start == 1 and group_widths[0] > avail_width:
                    group_widths = [avail_width]

                group_data = [
                    [row[ci] for ci in range(col_start, col_end)]
                    for row in raw_data
                ]

                t = Table(group_data, colWidths=group_widths, repeatRows=1)
                t.setStyle(TableStyle(
                    _make_style_cmds(len(group_data), hdr_bg, hdr_text, body_fs, header_fs)
                ))
                story.append(t)

            continue  # sheet fully handled; move to next

        # ── wrap mode ────────────────────────────────────────────────────────
        if column_mode == "wrap":
            table_data = []
            for ri, row in enumerate(rows):
                style = header_cell_style if ri == 0 else cell_style
                cells = [
                    Paragraph(_safe_text(row[ci] if ci < len(row) else None), style)
                    for ci in range(num_cols)
                ]
                table_data.append(cells)
            col_width = max(float(_MIN_COL_WIDTH), avail_width / num_cols)
            col_widths = [col_width] * num_cols

        # ── ellipsis mode (default) ──────────────────────────────────────────
        else:
            col_width = max(float(_MIN_COL_WIDTH), min(float(_MAX_COL_WIDTH), avail_width / num_cols))
            char_limit = max(6, int((col_width - 2 * _CELL_PADDING) / (body_fs * _CHAR_W_FACTOR)) - 2)
            table_data = [[_truncate(c, char_limit) for c in row] for row in rows]
            for r in table_data:
                while len(r) < num_cols:
                    r.append("")
            col_widths = [col_width] * num_cols

        t = Table(table_data, colWidths=col_widths, repeatRows=1)
        t.setStyle(TableStyle(
            _make_style_cmds(len(table_data), hdr_bg, hdr_text, body_fs, header_fs)
        ))
        story.append(t)

    if not story:
        raise HTTPException(status_code=400, detail="No data to export")

    doc.build(story)
    return buf.getvalue()


# ---------------------------------------------------------------------------
# Route
# ---------------------------------------------------------------------------

@router.post(
    "/xlsx-to-pdf",
    summary="Export XLSX to PDF",
    description="Uploads an Excel file and exports selected sheets as a formatted PDF.",
)
async def xlsx_to_pdf(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(..., description="Excel file"),
    sheets: list[str] = Query(default=None, description="Sheet names to export (empty = all)"),
    orientation: str = Query(default="landscape", description="portrait | landscape"),
    column_mode: str = Query(default="ellipsis", description="ellipsis | wrap | fit"),
    font_size: str = Query(default="medium", description="small | medium | large"),
    header_style: str = Query(default="colored", description="colored | gray | plain"),
    page_size: str = Query(default="A4", description="A4 | Letter | A3"),
    header_color: str = Query(default="#2E7D32", description="Hex color for colored header, e.g. #2E7D32"),
    principal: AuthenticatedPrincipal | None = Depends(get_current_user_optional),
    jobs_service: JobsService = Depends(jobs_service_dep),
):
    started = time.perf_counter()
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
    if column_mode not in ("ellipsis", "wrap", "fit"):
        column_mode = "ellipsis"
    if font_size not in ("small", "medium", "large"):
        font_size = "medium"
    if header_style not in ("colored", "gray", "plain"):
        header_style = "colored"
    if page_size not in _PAGE_SIZES:
        page_size = "A4"

    pdf_bytes = _build_pdf(
        workbook_data, targets, orientation, column_mode,
        font_size, header_style, page_size, header_color,
    )
    download_name = f"{safe_base_filename(file.filename, 'workbook')}.pdf"
    return await record_and_respond(
        principal=principal,
        background_tasks=background_tasks,
        jobs_service=jobs_service,
        tool_slug="xlsx-to-pdf",
        tool_name="XLSX to PDF",
        original_filename=file.filename,
        output_bytes=pdf_bytes,
        output_filename=download_name,
        mime_type="application/pdf",
        success=True,
        error_type=None,
        duration_ms=int((time.perf_counter() - started) * 1000),
    )
