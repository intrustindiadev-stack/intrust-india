-- ============================================================
-- AI Grow Merchant Investment Wallet Management
-- Migration: 20260831_ai_grow_wallet_ledger.sql
-- ============================================================

-- 1. Create AI Grow Wallets table if not exists
CREATE TABLE IF NOT EXISTS public.ai_grow_wallets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    merchant_id UUID NOT NULL REFERENCES public.merchants(id) ON DELETE RESTRICT,
    balance NUMERIC(14, 2) NOT NULL DEFAULT 0.00 CHECK (balance >= 0.00),
    currency VARCHAR(3) NOT NULL DEFAULT 'INR',
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'frozen', 'suspended')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_merchant_ai_grow_wallet UNIQUE (merchant_id)
);

-- 2. Create AI Grow Wallet Transactions (Immutable Audit Ledger)
CREATE TABLE IF NOT EXISTS public.ai_grow_wallet_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_id UUID NOT NULL REFERENCES public.ai_grow_wallets(id) ON DELETE RESTRICT,
    merchant_id UUID NOT NULL REFERENCES public.merchants(id) ON DELETE RESTRICT,
    admin_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    transaction_type VARCHAR(30) NOT NULL CHECK (
        transaction_type IN ('credit', 'debit', 'admin_adjustment', 'yield_payout', 'reversal')
    ),
    amount NUMERIC(14, 2) NOT NULL CHECK (amount >= 0.00),
    previous_balance NUMERIC(14, 2) NOT NULL,
    new_balance NUMERIC(14, 2) NOT NULL CHECK (new_balance >= 0.00),
    reason TEXT NOT NULL,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Indexes for fast dashboard querying and ledger lookups
CREATE INDEX IF NOT EXISTS idx_ai_grow_wallets_merchant ON public.ai_grow_wallets(merchant_id);
CREATE INDEX IF NOT EXISTS idx_ai_grow_transactions_wallet ON public.ai_grow_wallet_transactions(wallet_id);
CREATE INDEX IF NOT EXISTS idx_ai_grow_transactions_merchant ON public.ai_grow_wallet_transactions(merchant_id);
CREATE INDEX IF NOT EXISTS idx_ai_grow_transactions_created_at ON public.ai_grow_wallet_transactions(created_at DESC);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.ai_grow_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_grow_wallet_transactions ENABLE ROW LEVEL SECURITY;

-- Helper function to check if current user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN (
        auth.jwt() ->> 'role' = 'service_role' OR
        (auth.jwt() -> 'user_metadata' ->> 'role') IN ('admin', 'super_admin') OR
        EXISTS (
            SELECT 1 FROM public.user_profiles
            WHERE id = auth.uid() AND role IN ('admin'::user_role, 'super_admin'::user_role)
        )
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing policies before recreating (idempotent)
DROP POLICY IF EXISTS "Admins can view all AI Grow wallets" ON public.ai_grow_wallets;
DROP POLICY IF EXISTS "Admins can view all AI Grow transactions" ON public.ai_grow_wallet_transactions;

-- RLS Policies
CREATE POLICY "Admins can view all AI Grow wallets"
    ON public.ai_grow_wallets FOR SELECT
    TO authenticated
    USING (public.is_admin());

CREATE POLICY "Admins can view all AI Grow transactions"
    ON public.ai_grow_wallet_transactions FOR SELECT
    TO authenticated
    USING (public.is_admin());

-- 5. Atomic RPC for Manual Wallet Adjustments with Row-Locking
CREATE OR REPLACE FUNCTION public.adjust_merchant_investment_wallet(
    p_merchant_id UUID,
    p_adjustment_type VARCHAR(30),
    p_amount NUMERIC(14, 2),
    p_admin_id UUID,
    p_reason TEXT,
    p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB AS $$
DECLARE
    v_wallet RECORD;
    v_new_balance NUMERIC(14, 2);
    v_tx_id UUID;
BEGIN
    -- Validate adjustment type
    IF p_adjustment_type NOT IN ('credit', 'debit', 'admin_adjustment') THEN
        RAISE EXCEPTION 'Invalid adjustment type: %', p_adjustment_type USING ERRCODE = '22023';
    END IF;

    -- Validate reason
    IF p_reason IS NULL OR length(trim(p_reason)) < 10 THEN
        RAISE EXCEPTION 'A mandatory audit reason of at least 10 characters is required.' USING ERRCODE = '22023';
    END IF;

    -- Lock the wallet row for update to ensure concurrency safety
    SELECT * INTO v_wallet
    FROM public.ai_grow_wallets
    WHERE merchant_id = p_merchant_id
    FOR UPDATE;

    -- If wallet does not exist, create it if credit/override, otherwise throw
    IF NOT FOUND THEN
        IF p_adjustment_type IN ('credit', 'admin_adjustment') THEN
            INSERT INTO public.ai_grow_wallets (merchant_id, balance)
            VALUES (p_merchant_id, 0.00)
            RETURNING * INTO v_wallet;
        ELSE
            RAISE EXCEPTION 'Wallet for merchant % does not exist.', p_merchant_id USING ERRCODE = 'P0002';
        END IF;
    END IF;

    -- Check if wallet is suspended or frozen
    IF v_wallet.status <> 'active' THEN
        RAISE EXCEPTION 'Cannot adjust wallet. Current wallet status is %.', v_wallet.status USING ERRCODE = '55000';
    END IF;

    -- Calculate new balance
    IF p_adjustment_type = 'credit' THEN
        IF p_amount <= 0 THEN
            RAISE EXCEPTION 'Credit amount must be greater than zero.' USING ERRCODE = '22023';
        END IF;
        v_new_balance := v_wallet.balance + p_amount;

    ELSIF p_adjustment_type = 'debit' THEN
        IF p_amount <= 0 THEN
            RAISE EXCEPTION 'Debit amount must be greater than zero.' USING ERRCODE = '22023';
        END IF;
        IF v_wallet.balance < p_amount THEN
            RAISE EXCEPTION 'Insufficient balance: Current balance is %, requested debit is %.', v_wallet.balance, p_amount USING ERRCODE = '22003';
        END IF;
        v_new_balance := v_wallet.balance - p_amount;

    ELSIF p_adjustment_type = 'admin_adjustment' THEN
        -- Direct override to new target amount
        IF p_amount < 0 THEN
            RAISE EXCEPTION 'Override balance cannot be negative.' USING ERRCODE = '22023';
        END IF;
        v_new_balance := p_amount;
    END IF;

    -- Update wallet balance
    UPDATE public.ai_grow_wallets
    SET balance = v_new_balance,
        updated_at = NOW()
    WHERE id = v_wallet.id;

    -- Insert into immutable transaction log
    INSERT INTO public.ai_grow_wallet_transactions (
        wallet_id,
        merchant_id,
        admin_id,
        transaction_type,
        amount,
        previous_balance,
        new_balance,
        reason,
        metadata
    ) VALUES (
        v_wallet.id,
        p_merchant_id,
        p_admin_id,
        p_adjustment_type,
        p_amount,
        v_wallet.balance,
        v_new_balance,
        trim(p_reason),
        p_metadata
    ) RETURNING id INTO v_tx_id;

    RETURN jsonb_build_object(
        'success', true,
        'transaction_id', v_tx_id,
        'wallet_id', v_wallet.id,
        'merchant_id', p_merchant_id,
        'previous_balance', v_wallet.balance,
        'new_balance', v_new_balance,
        'adjustment_type', p_adjustment_type,
        'amount', p_amount,
        'timestamp', NOW()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Grant execution permissions only to authenticated users
GRANT EXECUTE ON FUNCTION public.adjust_merchant_investment_wallet TO authenticated;
