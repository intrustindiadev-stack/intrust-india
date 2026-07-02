-- 20260703_fulfillment_idempotency_keys.sql
--
-- Adds durable source-transaction reference columns to the business records that are
-- created or mutated by fulfillTransaction() in lib/sabpaisa/fulfillment.js.
-- These columns let each fulfillment branch check whether the gateway transaction has
-- already been applied before mutating state, making retries safe under the new
-- fulfilled_at retry model introduced by 20260703_add_fulfilled_at_to_transactions.sql.
--
-- Columns added:
--   user_profiles.gateway_txn_id            TEXT  — set on GOLD_SUBSCRIPTION fulfillment
--   merchants.last_sub_gateway_txn_id       TEXT  — set on MERCHANT_SUBSCRIPTION fulfillment
--   merchant_lockin_balances.gateway_txn_id TEXT  — set on MERCHANT_LOCKIN fulfillment
--   merchant_investments.gateway_txn_id     TEXT  — set on MERCHANT_AIGROW fulfillment
--
-- Unique constraints / indexes added (this migration):
--   UNIQUE on merchant_lockin_balances.gateway_txn_id (WHERE NOT NULL)
--   UNIQUE on merchant_investments.gateway_txn_id     (WHERE NOT NULL)
--   UNIQUE on customer_wallet_transactions(reference_id, reference_type)
--       WHERE reference_type = 'TOPUP'
--
-- These DB-enforced constraints ensure that concurrent callback + webhook processing
-- cannot double-apply the same payment even if both arrive simultaneously.
-- The application layer still does a SELECT-before-INSERT to short-circuit quickly,
-- but the constraint is the definitive safety net.

-- ── user_profiles ─────────────────────────────────────────────────────────────
ALTER TABLE public.user_profiles
    ADD COLUMN IF NOT EXISTS gateway_txn_id TEXT;

COMMENT ON COLUMN public.user_profiles.gateway_txn_id IS
    'clientTxnId of the SabPaisa transaction that last activated/extended the Gold '
    'subscription on this profile. Used by fulfillTransaction(GOLD_SUBSCRIPTION) to '
    'detect and skip duplicate applications on retry.';

-- ── merchants ─────────────────────────────────────────────────────────────────
ALTER TABLE public.merchants
    ADD COLUMN IF NOT EXISTS last_sub_gateway_txn_id TEXT;

COMMENT ON COLUMN public.merchants.last_sub_gateway_txn_id IS
    'clientTxnId of the SabPaisa transaction that last activated/renewed this '
    'merchant subscription. Used by fulfillTransaction(MERCHANT_SUBSCRIPTION) to '
    'detect and skip duplicate activations on retry.';

-- ── merchant_lockin_balances ──────────────────────────────────────────────────
ALTER TABLE public.merchant_lockin_balances
    ADD COLUMN IF NOT EXISTS gateway_txn_id TEXT;

COMMENT ON COLUMN public.merchant_lockin_balances.gateway_txn_id IS
    'clientTxnId of the SabPaisa transaction that created this Lockin balance entry. '
    'Used by fulfillTransaction(MERCHANT_LOCKIN) to detect duplicate inserts on retry.';

-- Unique partial index: only one lockin row per gateway transaction.
-- Partial (WHERE NOT NULL) so that manually inserted rows without a txnId remain allowed.
CREATE UNIQUE INDEX IF NOT EXISTS uq_merchant_lockin_balances_gateway_txn_id
    ON public.merchant_lockin_balances (gateway_txn_id)
    WHERE gateway_txn_id IS NOT NULL;

-- ── merchant_investments ──────────────────────────────────────────────────────
ALTER TABLE public.merchant_investments
    ADD COLUMN IF NOT EXISTS gateway_txn_id TEXT;

COMMENT ON COLUMN public.merchant_investments.gateway_txn_id IS
    'clientTxnId of the SabPaisa transaction that created this AI Grow investment row. '
    'Used by fulfillTransaction(MERCHANT_AIGROW) to detect duplicate inserts on retry.';

-- Unique partial index: only one investment row per gateway transaction.
CREATE UNIQUE INDEX IF NOT EXISTS uq_merchant_investments_gateway_txn_id
    ON public.merchant_investments (gateway_txn_id)
    WHERE gateway_txn_id IS NOT NULL;

-- ── customer_wallet_transactions — TOPUP uniqueness ───────────────────────────
-- Prevent a second wallet credit for the same SabPaisa TOPUP transaction.
-- Scoped to reference_type = 'TOPUP' so that other credit types (CASHBACK, REFUND,
-- etc.) that reuse reference_id for their own semantics are unaffected.
CREATE UNIQUE INDEX IF NOT EXISTS uq_customer_wallet_transactions_topup_reference
    ON public.customer_wallet_transactions (reference_id, reference_type)
    WHERE reference_type = 'TOPUP';
