-- =============================================================================
-- MIGRATION: 20260918_ai_grow_ledger_backfill.sql
--
-- PURPOSE (system fix, not a one-off):
--   Restore the invariant: ai_grow_wallets.balance = sum(active
--   merchant_investments principals) per merchant.
--
--   Deposit paths (wallet pay + SabPaisa fulfillment) write ONLY
--   merchant_investments rows; the authoritative ai_grow_wallets ledger row
--   is created lazily by the adjust_merchant_investment_wallet RPC on first
--   manual credit. Merchants whose capital arrived only via deposits (e.g.
--   Mahakal Enterprises) therefore have active investment rows but NO wallet
--   row — breaking settle-vault with "AI Grow Vault not found".
--
--   This migration backfills, per merchant:
--     1. an ai_grow_wallets row (balance = outstanding active principal / 100)
--     2. one 'credit' ai_grow_wallet_transactions ledger entry referencing
--        the original gateway_txn_id(s) in metadata for audit traceability
--
--   Merchants that already have a wallet row are left untouched.
--   Rows already settled (status completed/released) are excluded.
-- =============================================================================

BEGIN;

-- 1. Create missing wallet rows for merchants with active investment principal
INSERT INTO public.ai_grow_wallets (merchant_id, balance)
SELECT
    mi.merchant_id,
    ROUND(SUM(mi.amount_paise)::numeric / 100, 2)
FROM public.merchant_investments mi
LEFT JOIN public.ai_grow_wallets w ON w.merchant_id = mi.merchant_id
WHERE mi.status = 'active'
  AND w.id IS NULL
GROUP BY mi.merchant_id
HAVING SUM(mi.amount_paise) > 0;

-- 2. Write one immutable ledger 'credit' entry per backfilled wallet.
--    Metadata carries the original gateway_txn_id(s) for audit traceability.
INSERT INTO public.ai_grow_wallet_transactions (
    wallet_id, merchant_id, admin_id, transaction_type,
    amount, previous_balance, new_balance, reason, metadata
)
SELECT
    w.id,
    w.merchant_id,
    NULL,
    'credit',
    w.balance,
    0.00,
    w.balance,
    'System backfill: sync AI Grow vault ledger with outstanding active merchant_investments principal. Deposits previously wrote rows without crediting the ledger.',
    jsonb_build_object(
        'source', 'system_backfill_20260918',
        'gateway_txn_ids', COALESCE(gateway_txns.txns, '[]'::jsonb),
        'backfilled_at', NOW()
    )
FROM public.ai_grow_wallets w
LEFT JOIN LATERAL (
    SELECT jsonb_agg(mi.gateway_txn_id ORDER BY mi.created_at) AS txns
    FROM public.merchant_investments mi
    WHERE mi.merchant_id = w.merchant_id
      AND mi.status = 'active'
      AND mi.gateway_txn_id IS NOT NULL
) gateway_txns ON true
WHERE NOT EXISTS (
    SELECT 1 FROM public.ai_grow_wallet_transactions t
    WHERE t.wallet_id = w.id
);

COMMIT;