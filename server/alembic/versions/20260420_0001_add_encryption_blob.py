"""Add encryption_blob column to tool_jobs."""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "20260420_0001"
down_revision = "20260417_0002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "tool_jobs",
        sa.Column("encryption_blob", sa.LargeBinary(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("tool_jobs", "encryption_blob")
