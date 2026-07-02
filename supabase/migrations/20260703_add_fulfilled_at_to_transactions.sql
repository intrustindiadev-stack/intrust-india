-- 20260703_add_fulfilled_at_to_transactions.sql
--
-- Adds two missing columns to `public.transactions`:
--
--   expected_amount_paise  BIGINT  — server-canonical payment amount (paise) stored at
--                                    initiation time.  Used by callback and webhook to
--                                    detect tampered or partial amounts before fulfillment.
--                                    Defined here because the base schema
--                                    (20240101000000_sabpaisa_schema.sql) predates this field.
--
--   fulfilled_at  TIMESTAMPTZ      — written once, immediately after fulfillTransaction()
--                                    completes without error.  Routes use this field (not
--                                    the raw 'gateway_success' status) to gate retries:
--                                      • fulfilled_at IS NULL  → fulfillment must still run
--                                      • fulfilled_at IS NOT NULL → idempotency stop
--                                    This prevents permanently stranded paid orders when the
--                                    first callback/webhook attempt crashes after persisting
--                                    gateway_success but before completing fulfillment.
--

-- ── expected_amount_paise ─────────────────────────────────────────────────────
ALTER TABLE public.transactions
    ADD COLUMN IF NOT EXISTS expected_amount_paise BIGINT;

COMMENT ON COLUMN public.transactions.expected_amount_paise IS
    'Canonical payment amount in paise derived server-side at initiation time. '
    'Compared against the gateway-reported amount in callback/webhook to block '
    'tampered or partial payments before any fulfillment side-effects run.';

-- ── fulfilled_at ──────────────────────────────────────────────────────────────
ALTER TABLE public.transactions
    ADD COLUMN IF NOT EXISTS fulfilled_at TIMESTAMPTZ;

COMMENT ON COLUMN public.transactions.fulfilled_at IS
    'Timestamp written once fulfillTransaction() completes successfully. '
    'NULL means fulfillment has not yet succeeded (may still be pending or '
    'may have failed part-way through).  Routes use this to allow safe retries '
    'after a crash that left gateway_success set but fulfillment incomplete.';

-- ── Backfill: historical gateway_success rows ─────────────────────────────────
-- Rows that were fully processed before this column existed are assumed
-- fulfilled.  We use updated_at as a conservative proxy timestamp.
UPDATE public.transactions
SET    fulfilled_at = updated_at
WHERE  status        = 'gateway_success'
  AND  fulfilled_at IS NULL;
