"""Smoke tests for the ToolJob ORM model.

Matches the project's existing test style (no real DB) — just verifies the
model class is wired correctly and exposes the columns the application
depends on. Schema correctness is verified via `alembic upgrade head` when
applied against the real database.
"""

from __future__ import annotations

from app.db.models import AppUser, ToolJob


def test_tool_job_is_exported_from_package() -> None:
    assert ToolJob is not None
    assert ToolJob.__tablename__ == "tool_jobs"


def test_tool_job_has_required_columns() -> None:
    columns = {column.name for column in ToolJob.__table__.columns}
    expected = {
        "id",
        "user_id",
        "tool_slug",
        "tool_name",
        "original_filename",
        "output_filename",
        "storage_path",
        "mime_type",
        "output_size_bytes",
        "success",
        "error_type",
        "duration_ms",
        "expires_at",
        "created_at",
        "updated_at",
    }
    missing = expected - columns
    assert not missing, f"Missing columns on tool_jobs: {missing}"


def test_user_id_is_nullable_for_future_anonymous_jobs() -> None:
    user_id_column = ToolJob.__table__.columns["user_id"]
    assert user_id_column.nullable is True


def test_storage_path_is_nullable_so_expired_rows_can_drop_it() -> None:
    storage_path_column = ToolJob.__table__.columns["storage_path"]
    assert storage_path_column.nullable is True


def test_app_user_has_tool_jobs_relationship() -> None:
    # SQLAlchemy exposes relationships on the mapper.
    rel_keys = {rel.key for rel in AppUser.__mapper__.relationships}
    assert "tool_jobs" in rel_keys


def test_tool_jobs_user_created_at_index_is_declared() -> None:
    indexes = {index.name for index in ToolJob.__table__.indexes}
    assert "ix_tool_jobs_user_created_at" in indexes
