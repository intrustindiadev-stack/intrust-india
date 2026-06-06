-- Reconciliation: RUNNR DEVS (merchant 925818d5-e1b9-4178-a27a-fe3f1f04bf7f)
-- Created: 2026-06-06
-- Context:
--   An orphan debit of Rs. 5,999 (599900 paise) occurred due to the payout RPC atomicity bug
--   where the wallet balance was debited but the transaction returned early (skipped inserts for
--   payout_requests and wallet_transactions).
--
--   This correction:
--     (a) Restores merchants.wallet_balance_paise to 2217344 (= expected balance based on ledger).
--         Runs as postgres (migration runner) -- bypassed by current_user='postgres' in the guard.
--     (b) Inserts a zero-net CREDIT row (amount=0) in wallet_transactions so the
--         reconciliation is auditable. balance_before=balance_after=22173.44.
--         transaction_type CREDIT with amount=0 + reference_type=RECONCILIATION is the audit marker.
--         This does NOT add new funds.
--

BEGIN;

-- Step (a): Restore balance to match ledger anchor
UPDATE public.merchants
SET
    wallet_balance_paise = 2217344,
    updated_at           = now()
WHERE id = '925818d5-e1b9-4178-a27a-fe3f1f04bf7f';

-- Step (b): Zero-net corrective ledger entry
-- CREDIT with amount=0 + reference_type=RECONCILIATION is the zero-net audit marker.
INSERT INTO public.wallet_transactions (
    user_id,
    merchant_id,
    transaction_type,
    amount,
    balance_before,
    balance_after,
    reference_type,
    status,
    description
) VALUES (
    'fffaeff7-eaf7-48da-a0e9-7801108a38b1',
    '925818d5-e1b9-4178-a27a-fe3f1f04bf7f',
    'CREDIT',
    0,
    22173.44,
    22173.44,
    'RECONCILIATION',
    'COMPLETED',
    'RECONCILIATION: Balance restored to Rs.22,173.44 to match ledger. An orphan debit of Rs.5,999.00 occurred due to the payout RPC atomicity bug where the wallet balance was debited but the transaction returned early (skipped inserts). amount=0 -- no new funds added.'
);

COMMIT;
