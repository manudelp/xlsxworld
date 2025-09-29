-- xlsxworld initial schema
-- This script runs only on first DB initialization (docker-entrypoint-initdb.d)
-- Safe to re-run: uses IF NOT EXISTS / OR REPLACE / guards where practical

-- Extensions commonly useful for app features
CREATE EXTENSION IF NOT EXISTS pgcrypto;  -- gen_random_uuid(), crypt, etc.
CREATE EXTENSION IF NOT EXISTS citext;    -- case-insensitive text for emails

-- Optional: set default timezone (store UTC timestamps)
SET TIME ZONE 'UTC-3';

-- Utility function to touch updated_at automatically
CREATE OR REPLACE FUNCTION touch_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
	NEW.updated_at := now();
	RETURN NEW;
END;
$$;

-- Users table (basic auth/ownership for future features)
CREATE TABLE IF NOT EXISTS users (
	id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	email        CITEXT NOT NULL UNIQUE,
	password_hash TEXT NOT NULL,
	role         TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin','user')),
	created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
	updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Trigger for users.updated_at
DO $$
BEGIN
	IF NOT EXISTS (
		SELECT 1 FROM pg_trigger WHERE tgname = 'trg_users_touch_updated_at'
	) THEN
		CREATE TRIGGER trg_users_touch_updated_at
		BEFORE UPDATE ON users
		FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
	END IF;
END$$;

-- API keys (hashed), tied to users, for programmatic access
CREATE TABLE IF NOT EXISTS api_keys (
	id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
	name         TEXT NOT NULL,
	key_hash     TEXT NOT NULL, -- store a hash (e.g., bcrypt/argon2id), never raw keys
	active       BOOLEAN NOT NULL DEFAULT TRUE,
	last_used_at TIMESTAMPTZ,
	created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
	UNIQUE (user_id, name)
);

CREATE INDEX IF NOT EXISTS idx_api_keys_user_active ON api_keys(user_id, active);

-- Workbooks: optional persistent store of uploaded XLSX bytes with TTL
-- Current app uses in-memory cache; this table allows future persistence
CREATE TABLE IF NOT EXISTS workbooks (
	id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	token          TEXT NOT NULL UNIQUE,
	filename       TEXT,
	content_type   TEXT,
	size_bytes     BIGINT,
	data           BYTEA, -- optional raw bytes; consider external object storage in production
	uploader_id    UUID REFERENCES users(id) ON DELETE SET NULL,
	created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
	updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
	last_access_at TIMESTAMPTZ NOT NULL DEFAULT now(),
	expires_at     TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '15 minutes')
);

DO $$
BEGIN
	IF NOT EXISTS (
		SELECT 1 FROM pg_trigger WHERE tgname = 'trg_workbooks_touch_updated_at'
	) THEN
		CREATE TRIGGER trg_workbooks_touch_updated_at
		BEFORE UPDATE ON workbooks
		FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
	END IF;
END$$;

CREATE INDEX IF NOT EXISTS idx_workbooks_token ON workbooks(token);
CREATE INDEX IF NOT EXISTS idx_workbooks_expires_at ON workbooks(expires_at);
CREATE INDEX IF NOT EXISTS idx_workbooks_uploader ON workbooks(uploader_id);

-- Access and export logs for observability/rate-limiting analytics
CREATE TABLE IF NOT EXISTS sheet_access_log (
	id          BIGSERIAL PRIMARY KEY,
	token       TEXT NOT NULL REFERENCES workbooks(token) ON DELETE CASCADE,
	sheet_name  TEXT NOT NULL,
	action      TEXT NOT NULL CHECK (action IN ('preview','page','export_csv','export_json')),
	ip          INET,
	user_agent  TEXT,
	created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sheet_access_token ON sheet_access_log(token);
CREATE INDEX IF NOT EXISTS idx_sheet_access_created ON sheet_access_log(created_at DESC);

-- Maintenance: helper function to purge expired workbook rows
CREATE OR REPLACE FUNCTION purge_expired_workbooks(max_rows INT DEFAULT 1000)
RETURNS INT LANGUAGE plpgsql AS $$
DECLARE
	v_count INT;
BEGIN
	WITH del AS (
		DELETE FROM workbooks
		WHERE expires_at < now()
		ORDER BY expires_at ASC
		LIMIT max_rows
		RETURNING 1
	)
	SELECT count(*) INTO v_count FROM del;
	RETURN COALESCE(v_count, 0);
END;
$$;

-- Optional seed (disabled by default). To seed an admin, uncomment and adjust hash.
-- INSERT INTO users (email, password_hash, role)
-- VALUES ('admin@xlsx.world', '<argon2id_or_bcrypt_hash_here>', 'admin')
-- ON CONFLICT (email) DO NOTHING;

-- Notes:
-- - Consider moving workbook bytes to object storage and keeping only a pointer here.
-- - If you introduce long-lived tokens, enforce uniqueness and add rotation/expiry logic.
-- - Run: SELECT purge_expired_workbooks(); periodically via cron or an app task.

