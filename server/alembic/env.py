from __future__ import annotations

from logging.config import fileConfig

from alembic import context
from sqlalchemy import pool
from sqlalchemy.engine import Connection
from sqlalchemy.ext.asyncio import async_engine_from_config

from app.core.config import get_settings
from app.db.base import Base
from app.db import models as _models  # noqa: F401

config = context.config
settings = get_settings()

# Prefer the pooler URL when configured. Supabase Free-tier direct
# connections (db.<project>.supabase.co) are IPv6-only and unreachable
# from networks without IPv6. The pooler host is always IPv4 and is
# what the running application already uses (see app/db/session.py).
try:
    _alembic_url = settings.async_database_pool_url
except RuntimeError:
    _alembic_url = settings.async_database_url
config.set_main_option("sqlalchemy.url", _alembic_url)

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata


def run_migrations_offline() -> None:
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        compare_type=True,
    )

    with context.begin_transaction():
        context.run_migrations()


def do_run_migrations(connection: Connection) -> None:
    context.configure(connection=connection, target_metadata=target_metadata, compare_type=True)

    with context.begin_transaction():
        context.run_migrations()


async def run_migrations_online() -> None:
    connectable = async_engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
        # Match the application engine: Supabase's transaction-style
        # pooler does not support cached prepared statements.
        connect_args={"prepared_statement_cache_size": 0},
    )

    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations)

    await connectable.dispose()


if context.is_offline_mode():
    run_migrations_offline()
else:
    import asyncio

    asyncio.run(run_migrations_online())
