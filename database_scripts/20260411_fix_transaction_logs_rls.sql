-- ============================================================
-- Migration: Fix transaction_logs RLS blocking service-role inserts
-- Date: 2026-04-11
-- Reason: The original "No access for anon/authenticated on logs" policy
--   used FOR ALL USING (false), which in some Supabase configurations
--   overrides even the service-role bypass and silently blocks INSERT
--   calls from logTransactionEvent. This caused every callback to fail
--   silently on the log step, masking the real error state.
--
-- Fix:
--   1. Drop the FOR ALL USING (false) policy on transaction_logs
--   2. Replace with SELECT-only block (users cannot read logs)
--   3. Service role can now INSERT without restriction
--   4. Drop duplicate SELECT policy on transactions table
-- ============================================================

-- 1. Drop the blocking catch-all policy on transaction_logs
DROP POLICY IF EXISTS "No access for anon/authenticated on logs" ON public.transaction_logs;

-- 2. Re-create as SELECT-only block so users cannot read the audit log
--    but the service role is free to INSERT log entries.
CREATE POLICY "No read access on logs for users"
    ON public.transaction_logs
    FOR SELECT
    USING (false);

-- 3. Remove duplicate SELECT policy on transactions to avoid confusion
DROP POLICY IF EXISTS "user_can_view_own_transactions" ON public.transactions;

-- 4. Document the intent
COMMENT ON TABLE public.transaction_logs IS
    'Immutable callback audit log. Service role can INSERT; no user SELECT allowed.';
