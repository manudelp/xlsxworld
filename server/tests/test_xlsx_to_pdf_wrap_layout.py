"""Regression: wrap mode with huge cell text must not raise ReportLab LayoutError."""

from __future__ import annotations

from app.tools.convert.xlsx_to_pdf import _build_pdf


def test_build_pdf_wrap_mode_survives_massive_cell_text() -> None:
    huge = "word " * 8000
    rows = [[huge] * 4] + [["x", "y", "z", "w"]] * 5
    sheets = {"Sheet1": rows}
    pdf = _build_pdf(
        sheets,
        ["Sheet1"],
        orientation="landscape",
        column_mode="wrap",
        font_size="medium",
        header_style="colored",
        page_size_key="A4",
        header_color="#2E7D32",
    )
    assert len(pdf) > 2000
    assert pdf[:4] == b"%PDF"
