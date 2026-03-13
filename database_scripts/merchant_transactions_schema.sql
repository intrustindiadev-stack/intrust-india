-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create the merchant_transactions table
CREATE TABLE IF NOT EXISTS public.merchant_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    merchant_id UUID NOT NULL REFERENCES public.merchants(id),
    transaction_type TEXT NOT NULL, -- 'purchase', 'wallet_topup', 'udhari_payment', 'payout'
    amount_paise BIGINT NOT NULL,
    commission_paise BIGINT DEFAULT 0,
    balance_after_paise BIGINT,
    coupon_id UUID NULL REFERENCES public.coupons(id),
    description TEXT,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Add indexes
CREATE INDEX idx_merchant_transactions_merchant_id ON public.merchant_transactions(merchant_id);
CREATE INDEX idx_merchant_transactions_type ON public.merchant_transactions(transaction_type);

-- Enable RLS
ALTER TABLE public.merchant_transactions ENABLE ROW LEVEL SECURITY;

-- Policies

-- Merchants can view their own transactions
CREATE POLICY "Merchants can view own transactions" ON public.merchant_transactions
    FOR SELECT
    USING (
        merchant_id IN (
            SELECT id FROM public.merchants WHERE user_id = auth.uid()
        )
    );

-- Service role has full access (for backend API inserts)
CREATE POLICY "Service role has full access to merchant_transactions" ON public.merchant_transactions
    AS PERMISSIVE FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);
