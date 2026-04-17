"""Add tool_jobs table for user job history."""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = "20260417_0001"
down_revision = "20260404_0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "tool_jobs",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=True,
        ),
        sa.Column("tool_slug", sa.String(length=120), nullable=False),
        sa.Column("tool_name", sa.String(length=180), nullable=False),
        sa.Column("original_filename", sa.Text(), nullable=True),
        sa.Column("output_filename", sa.Text(), nullable=False),
        sa.Column("storage_path", sa.Text(), nullable=True),
        sa.Column("mime_type", sa.String(length=180), nullable=False),
        sa.Column("output_size_bytes", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("success", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("error_type", sa.String(length=120), nullable=True),
        sa.Column("duration_ms", sa.Integer(), nullable=True),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
    )
    op.create_index("ix_tool_jobs_user_id", "tool_jobs", ["user_id"])
    op.create_index("ix_tool_jobs_tool_slug", "tool_jobs", ["tool_slug"])
    op.create_index("ix_tool_jobs_expires_at", "tool_jobs", ["expires_at"])
    op.create_index(
        "ix_tool_jobs_user_created_at", "tool_jobs", ["user_id", "created_at"]
    )

    op.execute(
        sa.text(
            """
            CREATE TRIGGER trg_set_updated_at_tool_jobs
            BEFORE UPDATE ON tool_jobs
            FOR EACH ROW
            EXECUTE FUNCTION public.set_updated_at();
            """
        )
    )


def downgrade() -> None:
    op.execute(
        sa.text("DROP TRIGGER IF EXISTS trg_set_updated_at_tool_jobs ON tool_jobs;")
    )
    op.drop_index("ix_tool_jobs_user_created_at", table_name="tool_jobs")
    op.drop_index("ix_tool_jobs_expires_at", table_name="tool_jobs")
    op.drop_index("ix_tool_jobs_tool_slug", table_name="tool_jobs")
    op.drop_index("ix_tool_jobs_user_id", table_name="tool_jobs")
    op.drop_table("tool_jobs")
