-- ============================================================
-- AI Grow Wallet - Merchant RLS Policy
-- Migration: 20260912_ai_grow_wallet_merchant_rls.sql
--
-- Adds a merchant-facing SELECT policy on ai_grow_wallets so
-- each merchant can read their own wallet row. This is required
-- so the merchant investments page can display the authoritative
-- wallet balance that the admin ledger manages.
-- ============================================================

-- Drop before recreate (idempotent)
DROP POLICY IF EXISTS "Merchants can view their own AI Grow wallet" ON public.ai_grow_wallets;
DROP POLICY IF EXISTS "Merchants can view their own AI Grow wallet transactions" ON public.ai_grow_wallet_transactions;

-- Allow a merchant to SELECT their own wallet row
CREATE POLICY "Merchants can view their own AI Grow wallet"
    ON public.ai_grow_wallets FOR SELECT
    TO authenticated
    USING (
        merchant_id IN (
            SELECT id FROM public.merchants WHERE user_id = auth.uid()
        )
    );

-- Allow a merchant to SELECT their own wallet transactions (for future audit trail on merchant side)
CREATE POLICY "Merchants can view their own AI Grow wallet transactions"
    ON public.ai_grow_wallet_transactions FOR SELECT
    TO authenticated
    USING (
        merchant_id IN (
            SELECT id FROM public.merchants WHERE user_id = auth.uid()
        )
    );
