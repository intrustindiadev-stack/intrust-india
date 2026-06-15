-- =================================================================
-- 98-fix-init-passwords.sql
-- =================================================================
-- Run via supabase_admin (the only true superuser in this image).
-- Ensures all internal Supabase roles get the POSTGRES_PASSWORD set,
-- and that app.settings.jwt_secret / jwt_exp are stored in the DB.
--
-- This is idempotent — safe to run on every container start.
--
-- Mounted at: /docker-entrypoint-initdb.d/migrations/98-fix-init.sql
-- =================================================================
-- NOTE: \set with backtick expansion runs the shell command ONCE
-- during psql init and substitutes the value. POSTGRES_PASSWORD and
-- JWT_SECRET / JWT_EXP are set as Docker env vars on the db container.
-- =================================================================

\set pgpass `echo "$POSTGRES_PASSWORD"`
\set jwt_secret `echo "$JWT_SECRET"`
\set jwt_exp `echo "$JWT_EXPIRY"`

-- Set passwords for all internal supabase roles
-- (supabase_admin is the only superuser so this must run as postgres OS user
--  which connects via peer auth during initdb)
ALTER USER authenticator           WITH PASSWORD :'pgpass';
ALTER USER pgbouncer               WITH PASSWORD :'pgpass';
ALTER USER supabase_auth_admin     WITH PASSWORD :'pgpass';
ALTER USER supabase_functions_admin WITH PASSWORD :'pgpass';
ALTER USER supabase_storage_admin  WITH PASSWORD :'pgpass';

-- Set JWT config in the database (used by PostgREST and services)
ALTER DATABASE postgres SET "app.settings.jwt_secret" TO :'jwt_secret';
ALTER DATABASE postgres SET "app.settings.jwt_exp"    TO :'jwt_exp';

-- Create _realtime schema if not exists (needed by Realtime container)
CREATE SCHEMA IF NOT EXISTS _realtime;
ALTER SCHEMA _realtime OWNER TO supabase_admin;
GRANT USAGE ON SCHEMA _realtime TO postgres, authenticator, anon, authenticated, service_role;

-- Confirm
DO $$
DECLARE has_pass BOOLEAN;
BEGIN
  SELECT (rolpassword IS NOT NULL) INTO has_pass
    FROM pg_authid WHERE rolname = 'supabase_auth_admin';
  IF has_pass THEN
    RAISE NOTICE 'INIT CHECK: supabase_auth_admin password is SET ✓';
  ELSE
    RAISE WARNING 'INIT CHECK: supabase_auth_admin has NO password!';
  END IF;
END $$;
