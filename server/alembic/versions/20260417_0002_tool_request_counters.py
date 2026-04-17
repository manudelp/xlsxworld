"""Add tool_request_counters for daily quota enforcement."""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = "20260417_0002"
down_revision = "20260417_0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "tool_request_counters",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column("key", sa.String(length=180), nullable=False),
        sa.Column("day_utc", sa.Date(), nullable=False),
        sa.Column("count", sa.Integer(), nullable=False, server_default="0"),
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
        sa.UniqueConstraint(
            "key", "day_utc", name="uq_tool_request_counters_key_day"
        ),
    )
    op.create_index(
        "ix_tool_request_counters_key_day",
        "tool_request_counters",
        ["key", "day_utc"],
    )
    op.execute(
        sa.text(
            """
            CREATE TRIGGER trg_set_updated_at_tool_request_counters
            BEFORE UPDATE ON tool_request_counters
            FOR EACH ROW
            EXECUTE FUNCTION public.set_updated_at();
            """
        )
    )


def downgrade() -> None:
    op.execute(
        sa.text(
            "DROP TRIGGER IF EXISTS "
            "trg_set_updated_at_tool_request_counters "
            "ON tool_request_counters;"
        )
    )
    op.drop_index(
        "ix_tool_request_counters_key_day",
        table_name="tool_request_counters",
    )
    op.drop_table("tool_request_counters")
