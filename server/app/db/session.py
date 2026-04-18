from __future__ import annotations

import ssl
from collections.abc import AsyncIterator

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.config import get_settings

settings = get_settings()

_url = settings.async_database_pool_url
_needs_ssl = "supabase" in _url or "pooler" in _url


def _make_db_ssl_context() -> ssl.SSLContext:
    """Return an SSL context that skips certificate verification.

    Supabase pooler certs are rejected both by truststore (macOS strict
    validation) and by Python's default certifi bundle (self-signed root).
    For the DB wire connection we only need encryption, not CA verification.
    """
    ctx = ssl.SSLContext(ssl.PROTOCOL_TLS_CLIENT)
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE
    return ctx


engine = create_async_engine(
    _url,
    echo=settings.db_echo_sql,
    connect_args={
        "prepared_statement_cache_size": 0,
        **({"ssl": _make_db_ssl_context()} if _needs_ssl else {}),
    },
    pool_pre_ping=True,
    pool_size=settings.db_pool_size,
    max_overflow=settings.db_max_overflow,
    pool_timeout=settings.db_pool_timeout,
    pool_recycle=settings.db_pool_recycle,
)

AsyncSessionFactory = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


async def get_db_session() -> AsyncIterator[AsyncSession]:
    """Reusable FastAPI dependency for DB session injection."""

    async with AsyncSessionFactory() as session:
        yield session


async def dispose_engine() -> None:
    await engine.dispose()
