"""Initial application schema for users, analytics, and billing."""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = "20260404_0001"
down_revision = None
branch_labels = None
depends_on = None


def _create_updated_at_trigger(table_name: str) -> None:
    op.execute(
        sa.text(
            f"""
            CREATE TRIGGER trg_set_updated_at_{table_name}
            BEFORE UPDATE ON {table_name}
            FOR EACH ROW
            EXECUTE FUNCTION public.set_updated_at();
            """
        )
    )


def _drop_updated_at_trigger(table_name: str) -> None:
    op.execute(sa.text(f"DROP TRIGGER IF EXISTS trg_set_updated_at_{table_name} ON {table_name};"))


def upgrade() -> None:
    op.execute('CREATE EXTENSION IF NOT EXISTS "pgcrypto";')

    op.execute(
        """
        CREATE OR REPLACE FUNCTION public.set_updated_at()
        RETURNS trigger
        LANGUAGE plpgsql
        AS $$
        BEGIN
            NEW.updated_at = NOW();
            RETURN NEW;
        END;
        $$;
        """
    )

    op.create_table(
        "users",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("email", sa.String(length=320), nullable=False),
        sa.Column("display_name", sa.String(length=150), nullable=True),
        sa.Column("avatar_url", sa.Text(), nullable=True),
        sa.Column(
            "role",
            sa.Enum("admin", "member", "analyst", "support", name="user_role", native_enum=False),
            nullable=False,
            server_default="member",
        ),
        sa.Column(
            "status",
            sa.Enum("active", "pending", "suspended", "deleted", name="user_status", native_enum=False),
            nullable=False,
            server_default="active",
        ),
        sa.Column("last_seen_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("metadata", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("NOW()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("NOW()")),
        sa.ForeignKeyConstraint(["id"], ["auth.users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id", name="pk_users"),
        sa.UniqueConstraint("email", name="uq_users_email"),
    )
    op.create_index("ix_users_email", "users", ["email"], unique=False)
    op.create_index("ix_users_role_status", "users", ["role", "status"], unique=False)

    op.create_table(
        "metric_events",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            nullable=False,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("event_name", sa.String(length=120), nullable=False),
        sa.Column("event_category", sa.String(length=80), nullable=True),
        sa.Column("session_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("source", sa.String(length=80), nullable=True),
        sa.Column("occurred_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("properties", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("NOW()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("NOW()")),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id", name="pk_metric_events"),
    )
    op.create_index("ix_metric_events_user_id", "metric_events", ["user_id"], unique=False)
    op.create_index("ix_metric_events_event_name", "metric_events", ["event_name"], unique=False)
    op.create_index("ix_metric_events_session_id", "metric_events", ["session_id"], unique=False)
    op.create_index("ix_metric_events_occurred_at", "metric_events", ["occurred_at"], unique=False)
    op.create_index("ix_metric_events_name_occurred", "metric_events", ["event_name", "occurred_at"], unique=False)

    op.create_table(
        "user_activity_daily",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            nullable=False,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("activity_date", sa.Date(), nullable=False),
        sa.Column("events_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("active_seconds", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("first_event_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("last_event_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("NOW()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("NOW()")),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id", name="pk_user_activity_daily"),
        sa.UniqueConstraint("user_id", "activity_date", name="uq_user_activity_daily_user_id_activity_date"),
    )
    op.create_index("ix_user_activity_daily_user_id", "user_activity_daily", ["user_id"], unique=False)
    op.create_index("ix_user_activity_daily_activity_date", "user_activity_daily", ["activity_date"], unique=False)

    op.create_table(
        "metric_data_points",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            nullable=False,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("metric_key", sa.String(length=120), nullable=False),
        sa.Column("metric_unit", sa.String(length=32), nullable=True),
        sa.Column("metric_value", sa.Numeric(precision=18, scale=4), nullable=False),
        sa.Column("metric_count", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("bucket_start", sa.DateTime(timezone=True), nullable=False),
        sa.Column("bucket_end", sa.DateTime(timezone=True), nullable=True),
        sa.Column("dimensions", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column("source", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("NOW()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("NOW()")),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id", name="pk_metric_data_points"),
    )
    op.create_index("ix_metric_data_points_user_id", "metric_data_points", ["user_id"], unique=False)
    op.create_index("ix_metric_data_points_metric_key", "metric_data_points", ["metric_key"], unique=False)
    op.create_index("ix_metric_data_points_bucket_start", "metric_data_points", ["bucket_start"], unique=False)
    op.create_index("ix_metric_data_points_key_bucket_start", "metric_data_points", ["metric_key", "bucket_start"], unique=False)

    op.create_table(
        "subscription_plans",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            nullable=False,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column("code", sa.String(length=50), nullable=False),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("price_amount", sa.Numeric(precision=12, scale=2), nullable=False),
        sa.Column("currency", sa.String(length=3), nullable=False, server_default="USD"),
        sa.Column(
            "billing_interval",
            sa.Enum("month", "year", name="billing_interval", native_enum=False),
            nullable=False,
            server_default="month",
        ),
        sa.Column("interval_count", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("NOW()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("NOW()")),
        sa.PrimaryKeyConstraint("id", name="pk_subscription_plans"),
        sa.UniqueConstraint("code", name="uq_subscription_plans_code"),
    )
    op.create_index("ix_subscription_plans_code", "subscription_plans", ["code"], unique=False)

    op.create_table(
        "user_subscriptions",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            nullable=False,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("plan_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column(
            "status",
            sa.Enum(
                "trialing",
                "active",
                "past_due",
                "canceled",
                "incomplete",
                name="subscription_status",
                native_enum=False,
            ),
            nullable=False,
            server_default="active",
        ),
        sa.Column("payment_status", sa.String(length=40), nullable=False, server_default="unpaid"),
        sa.Column("current_period_start", sa.DateTime(timezone=True), nullable=True),
        sa.Column("current_period_end", sa.DateTime(timezone=True), nullable=True),
        sa.Column("cancel_at_period_end", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("canceled_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("provider_customer_id", sa.String(length=100), nullable=True),
        sa.Column("provider_subscription_id", sa.String(length=100), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("NOW()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("NOW()")),
        sa.ForeignKeyConstraint(["plan_id"], ["subscription_plans.id"], ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id", name="pk_user_subscriptions"),
        sa.UniqueConstraint("provider_subscription_id", name="uq_user_subscriptions_provider_subscription_id"),
    )
    op.create_index("ix_user_subscriptions_user_id", "user_subscriptions", ["user_id"], unique=False)
    op.create_index("ix_user_subscriptions_plan_id", "user_subscriptions", ["plan_id"], unique=False)
    op.create_index("ix_user_subscriptions_status", "user_subscriptions", ["status"], unique=False)
    op.create_index("ix_user_subscriptions_current_period_end", "user_subscriptions", ["current_period_end"], unique=False)
    op.create_index("ix_user_subscriptions_provider_customer_id", "user_subscriptions", ["provider_customer_id"], unique=False)
    op.create_index("ix_user_subscriptions_user_status", "user_subscriptions", ["user_id", "status"], unique=False)

    op.create_table(
        "billing_invoices",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            nullable=False,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("subscription_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("amount_due", sa.Numeric(precision=12, scale=2), nullable=False),
        sa.Column("amount_paid", sa.Numeric(precision=12, scale=2), nullable=False, server_default="0"),
        sa.Column("currency", sa.String(length=3), nullable=False, server_default="USD"),
        sa.Column(
            "status",
            sa.Enum("draft", "open", "paid", "void", "uncollectible", name="invoice_status", native_enum=False),
            nullable=False,
            server_default="open",
        ),
        sa.Column("billing_period_start", sa.DateTime(timezone=True), nullable=True),
        sa.Column("billing_period_end", sa.DateTime(timezone=True), nullable=True),
        sa.Column("due_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("paid_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("provider_invoice_id", sa.String(length=100), nullable=True),
        sa.Column("metadata", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("NOW()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("NOW()")),
        sa.ForeignKeyConstraint(["subscription_id"], ["user_subscriptions.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id", name="pk_billing_invoices"),
        sa.UniqueConstraint("provider_invoice_id", name="uq_billing_invoices_provider_invoice_id"),
    )
    op.create_index("ix_billing_invoices_user_id", "billing_invoices", ["user_id"], unique=False)
    op.create_index("ix_billing_invoices_subscription_id", "billing_invoices", ["subscription_id"], unique=False)
    op.create_index("ix_billing_invoices_status", "billing_invoices", ["status"], unique=False)
    op.create_index("ix_billing_invoices_due_at", "billing_invoices", ["due_at"], unique=False)
    op.create_index("ix_billing_invoices_user_status", "billing_invoices", ["user_id", "status"], unique=False)

    for table_name in [
        "users",
        "metric_events",
        "user_activity_daily",
        "metric_data_points",
        "subscription_plans",
        "user_subscriptions",
        "billing_invoices",
    ]:
        _create_updated_at_trigger(table_name)


def downgrade() -> None:
    for table_name in [
        "billing_invoices",
        "user_subscriptions",
        "subscription_plans",
        "metric_data_points",
        "user_activity_daily",
        "metric_events",
        "users",
    ]:
        _drop_updated_at_trigger(table_name)

    op.drop_index("ix_billing_invoices_user_status", table_name="billing_invoices")
    op.drop_index("ix_billing_invoices_due_at", table_name="billing_invoices")
    op.drop_index("ix_billing_invoices_status", table_name="billing_invoices")
    op.drop_index("ix_billing_invoices_subscription_id", table_name="billing_invoices")
    op.drop_index("ix_billing_invoices_user_id", table_name="billing_invoices")
    op.drop_table("billing_invoices")

    op.drop_index("ix_user_subscriptions_user_status", table_name="user_subscriptions")
    op.drop_index("ix_user_subscriptions_provider_customer_id", table_name="user_subscriptions")
    op.drop_index("ix_user_subscriptions_current_period_end", table_name="user_subscriptions")
    op.drop_index("ix_user_subscriptions_status", table_name="user_subscriptions")
    op.drop_index("ix_user_subscriptions_plan_id", table_name="user_subscriptions")
    op.drop_index("ix_user_subscriptions_user_id", table_name="user_subscriptions")
    op.drop_table("user_subscriptions")

    op.drop_index("ix_subscription_plans_code", table_name="subscription_plans")
    op.drop_table("subscription_plans")

    op.drop_index("ix_metric_data_points_key_bucket_start", table_name="metric_data_points")
    op.drop_index("ix_metric_data_points_bucket_start", table_name="metric_data_points")
    op.drop_index("ix_metric_data_points_metric_key", table_name="metric_data_points")
    op.drop_index("ix_metric_data_points_user_id", table_name="metric_data_points")
    op.drop_table("metric_data_points")

    op.drop_index("ix_user_activity_daily_activity_date", table_name="user_activity_daily")
    op.drop_index("ix_user_activity_daily_user_id", table_name="user_activity_daily")
    op.drop_table("user_activity_daily")

    op.drop_index("ix_metric_events_name_occurred", table_name="metric_events")
    op.drop_index("ix_metric_events_occurred_at", table_name="metric_events")
    op.drop_index("ix_metric_events_session_id", table_name="metric_events")
    op.drop_index("ix_metric_events_event_name", table_name="metric_events")
    op.drop_index("ix_metric_events_user_id", table_name="metric_events")
    op.drop_table("metric_events")

    op.drop_index("ix_users_role_status", table_name="users")
    op.drop_index("ix_users_email", table_name="users")
    op.drop_table("users")

    op.execute("DROP FUNCTION IF EXISTS public.set_updated_at();")
