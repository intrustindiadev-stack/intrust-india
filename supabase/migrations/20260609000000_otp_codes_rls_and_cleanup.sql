-- ==========================================================================
-- Migration: otp_codes RLS & Cleanup Index
-- Addresses: Supabase security advisor "RLS enabled, no policies" warning
-- ==========================================================================
-- This migration:
--   1. Enables RLS on otp_codes (service_role bypasses RLS, so
--      send-otp and verify-otp behavior is unchanged).
--   2. Adds a blanket deny policy so anon/authenticated users
--      cannot read or write OTP rows through PostgREST.
--   3. Adds an index on expires_at for efficient purge queries.
-- ==========================================================================

-- 1. Enable RLS
ALTER TABLE public.otp_codes ENABLE ROW LEVEL SECURITY;

-- 2. Deny all access to anon and authenticated roles.
--    service_role (used by createAdminClient in the API routes) bypasses RLS.
CREATE POLICY "deny_all_otp_codes"
  ON public.otp_codes
  FOR ALL
  USING (false)
  WITH CHECK (false);

-- 3. Index on expires_at for the purge cron DELETE WHERE expires_at < now()
CREATE INDEX IF NOT EXISTS idx_otp_codes_expires_at
  ON public.otp_codes (expires_at);
