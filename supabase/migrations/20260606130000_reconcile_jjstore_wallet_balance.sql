-- Reconciliation: J J STORE (merchant b68cf52f-f04d-4ef4-bbe8-35e5afa33219)
-- Created: 2026-06-06
-- Context:
--   The committed Rs.33,000 credit (wallet_adjustment_log 29c7afee-6739-49b5-ab52-48439c22a683,
--   wallet_transaction 7b9a43b0-081d-40e6-9713-2b3c02ddeef0) set merchants.wallet_balance_paise
--   to 103590700 at 2026-06-06 05:08:51. A stale service-role merchant-row write at 07:49:31
--   silently reverted it to 100290700. No ledger row was written for that revert.
--   Ledger anchor (latest wallet_transactions.balance_after) = 1035907.00 (Rs.10,35,907).
--
--   This correction:
--     (a) Restores merchants.wallet_balance_paise to 103590700 (= ledger anchor).
--         Runs as postgres (migration runner) -- bypassed by current_user='postgres' in the guard.
--     (b) Inserts a zero-net CREDIT row (amount=0) in wallet_transactions so the
--         reconciliation is auditable. balance_before=balance_after=1035907.00.
--         transaction_type CHECK allows: CREDIT, DEBIT, REFUND only; using CREDIT with amount=0.
--         This does NOT add new funds.
--
--   DO NOT call perform_wallet_adjustment again. Credit 7b9a43b0 already exists.
--   DO NOT send a wallet-credit notification. Merchant (Satyendra singh) was notified at 05:08:52.
--
--   Post-check results (applied 2026-06-06 09:14:27):
--     merchants.wallet_balance_paise = 103590700 ✓
--     latest wallet_transactions.balance_after   = 1035907.00 ✓
--     reconciliation row id = d9524f99-ce3d-4d56-ad2a-ecc123dfa963

BEGIN;

-- Step (a): Restore balance to match ledger anchor
UPDATE public.merchants
SET
    wallet_balance_paise = 103590700,
    updated_at           = now()
WHERE id = 'b68cf52f-f04d-4ef4-bbe8-35e5afa33219';

-- Step (b): Zero-net corrective ledger entry
-- transaction_type must be one of: CREDIT, DEBIT, REFUND (check constraint).
-- CREDIT with amount=0 + reference_type=RECONCILIATION is the zero-net audit marker.
INSERT INTO public.wallet_transactions (
    user_id,
    transaction_type,
    amount,
    balance_before,
    balance_after,
    reference_id,
    reference_type,
    status,
    description
) VALUES (
    'c3377912-a61c-439c-a4a5-d2dccb40b99f',
    'CREDIT',
    0,
    1035907.00,
    1035907.00,
    '29c7afee-6739-49b5-ab52-48439c22a683',
    'RECONCILIATION',
    'COMPLETED',
    'RECONCILIATION: Balance restored to Rs.10,35,907 to match committed credit 29c7afee (Rs.33,000 credited 2026-06-06 05:08:51). A stale service-role merchant-row write at 2026-06-06 07:49:31 silently reverted wallet_balance_paise to 100290700 with no ledger row. amount=0 -- no new funds added.'
);

COMMIT;
