"""Inspection-based smoke tests for ``ToolRequestCounter``.

Matches the ``test_models_tool_jobs.py`` pattern: no DB session, just
verifies the mapped class has the columns, types, and constraints the
rest of the codebase will rely on.
"""

from __future__ import annotations

from sqlalchemy import inspect

from app.db.models import ToolRequestCounter


def test_table_name() -> None:
    assert ToolRequestCounter.__tablename__ == "tool_request_counters"


def test_has_required_columns() -> None:
    cols = {c.name for c in inspect(ToolRequestCounter).columns}
    assert {"id", "key", "day_utc", "count", "created_at", "updated_at"} <= cols


def test_key_is_indexed_with_day() -> None:
    indexes = {idx.name for idx in inspect(ToolRequestCounter).tables[0].indexes}
    assert "ix_tool_request_counters_key_day" in indexes


def test_key_day_unique_constraint_exists() -> None:
    constraint_names = {
        c.name
        for c in inspect(ToolRequestCounter).tables[0].constraints
    }
    assert "uq_tool_request_counters_key_day" in constraint_names
