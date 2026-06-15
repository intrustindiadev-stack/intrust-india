-- ============================================================
-- Postgres Extension Initialization for InTrust India
-- Mounted at: /docker-entrypoint-initdb.d/migrations/99-extensions.sql
-- Runs automatically on first container start (empty data dir).
-- ============================================================
-- NOTE: pg_cron's shared library is already loaded via:
--   shared_preload_libraries=pg_cron,pg_stat_statements,pg_net
-- and cron.database_name=postgres is set via -c flag in compose.
-- ============================================================

\connect postgres

-- Core cryptography
CREATE EXTENSION IF NOT EXISTS pgcrypto SCHEMA extensions;

-- UUID generation (both v1 and v4)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" SCHEMA extensions;

-- Scheduled jobs (background worker, needs shared_preload_libraries)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Query statistics (needs shared_preload_libraries)
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- Encrypted secrets vault (requires pgsodium, bundled in supabase/postgres)
CREATE EXTENSION IF NOT EXISTS supabase_vault SCHEMA vault;

-- Async HTTP calls from Postgres (used by realtime/webhooks)
CREATE EXTENSION IF NOT EXISTS pg_net SCHEMA extensions;

-- Confirm extensions installed
DO $$
DECLARE
  exts TEXT;
BEGIN
  SELECT string_agg(extname, ', ' ORDER BY extname)
    INTO exts
    FROM pg_extension
   WHERE extname IN ('pgcrypto','uuid-ossp','pg_cron','pg_stat_statements','supabase_vault','pg_net');
  RAISE NOTICE 'Installed extensions: %', exts;
END;
$$;
