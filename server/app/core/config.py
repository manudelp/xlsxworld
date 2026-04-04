from __future__ import annotations

import importlib
from functools import lru_cache
from typing import Any

from pydantic import Field

_pydantic_settings: Any = importlib.import_module("pydantic_settings")
BaseSettings = _pydantic_settings.BaseSettings
SettingsConfigDict = _pydantic_settings.SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
    )

    app_env: str = Field(default="development", alias="APP_ENV")

    database_url: str = Field(alias="DATABASE_URL")
    database_pool_url: str | None = Field(default=None, alias="DATABASE_POOL_URL")
    db_pool_size: int = Field(default=10, alias="DB_POOL_SIZE")
    db_max_overflow: int = Field(default=20, alias="DB_MAX_OVERFLOW")
    db_pool_timeout: int = Field(default=30, alias="DB_POOL_TIMEOUT")
    db_pool_recycle: int = Field(default=1800, alias="DB_POOL_RECYCLE")
    db_echo_sql: bool = Field(default=False, alias="DB_ECHO_SQL")

    supabase_url: str | None = Field(default=None, alias="SUPABASE_URL")
    supabase_publishable_key: str | None = Field(default=None, alias="SUPABASE_PUBLISHABLE_KEY")
    supabase_secret_key: str | None = Field(default=None, alias="SUPABASE_SECRET_KEY")

    @property
    def async_database_url(self) -> str:
        """Return SQLAlchemy-compatible async URL for asyncpg."""

        return self._to_asyncpg_url(self.database_url)

    @property
    def async_database_pool_url(self) -> str:
        """Return async DB URL for pooled/background services.

        Uses DATABASE_POOL_URL and raises when missing to avoid silent fallback.
        """

        if not self.database_pool_url:
            raise RuntimeError("DATABASE_POOL_URL is not configured")
        return self._to_asyncpg_url(self.database_pool_url)

    @staticmethod
    def _to_asyncpg_url(url: str) -> str:
        if url.startswith("postgresql+asyncpg://"):
            return url
        if url.startswith("postgresql://"):
            return url.replace("postgresql://", "postgresql+asyncpg://", 1)
        if url.startswith("postgres://"):
            return url.replace("postgres://", "postgresql+asyncpg://", 1)
        return url

    @property
    def supabase_auth_url(self) -> str:
        """Return the Supabase Auth base URL."""

        if not self.supabase_url:
            raise RuntimeError("SUPABASE_URL is not configured")
        return self.supabase_url.rstrip("/") + "/auth/v1"

    @property
    def supabase_jwks_url(self) -> str:
        """Return the Supabase JWKS discovery URL."""

        return self.supabase_auth_url + "/.well-known/jwks.json"

    @property
    def supabase_issuer(self) -> str:
        """Return the expected JWT issuer for Supabase Auth."""

        if not self.supabase_url:
            raise RuntimeError("SUPABASE_URL is not configured")
        return self.supabase_url.rstrip("/") + "/auth/v1"


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()
