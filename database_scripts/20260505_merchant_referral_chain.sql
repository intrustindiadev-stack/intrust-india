-- Step 1 — Alter merchants table (new columns)
ALTER TABLE public.merchants 
  ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS referred_by_merchant_id UUID REFERENCES public.merchants(id),
  ADD COLUMN IF NOT EXISTS referral_reward_paid BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_merchants_referral_code ON public.merchants(referral_code);
CREATE INDEX IF NOT EXISTS idx_merchants_referred_by ON public.merchants(referred_by_merchant_id);

-- Step 2 — Create merchant_tree_paths table
CREATE TABLE IF NOT EXISTS public.merchant_tree_paths (
    ancestor_id UUID NOT NULL REFERENCES public.merchants(id) ON DELETE CASCADE,
    descendant_id UUID NOT NULL REFERENCES public.merchants(id) ON DELETE CASCADE,
    level INTEGER NOT NULL CHECK (level > 0),
    created_at TIMESTAMPTZ DEFAULT now(),
    PRIMARY KEY (ancestor_id, descendant_id),
    CONSTRAINT no_self_ref CHECK (ancestor_id != descendant_id)
);

CREATE INDEX IF NOT EXISTS idx_mtp_ancestor ON public.merchant_tree_paths(ancestor_id, level);
CREATE INDEX IF NOT EXISTS idx_mtp_descendant ON public.merchant_tree_paths(descendant_id);

-- Step 3 — Extend merchant_transactions_transaction_type_check constraint
DO $$ 
BEGIN
    ALTER TABLE public.merchant_transactions 
        DROP CONSTRAINT IF EXISTS merchant_transactions_transaction_type_check;

    ALTER TABLE public.merchant_transactions 
        ADD CONSTRAINT merchant_transactions_transaction_type_check 
        CHECK (transaction_type = ANY (ARRAY[
            'purchase', 'sale', 'commission', 'wallet_topup', 'withdrawal',
            'udhari_payment', 'store_credit_payment', 'subscription', 'payout', 'referral_reward'
        ]::text[]));
END $$;

-- Step 4 — Seed platform_settings key
INSERT INTO public.platform_settings (key, value, description)
VALUES (
    'merchant_referral_prize_paise',
    '50000',
    'Wallet prize (in paise) credited to referring merchant on referral activation. Default ₹500.'
)
ON CONFLICT (key) DO NOTHING;

-- Step 5 — Create RPC build_merchant_tree_path
CREATE OR REPLACE FUNCTION public.build_merchant_tree_path(p_new_merchant_id UUID, p_parent_merchant_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- 1. Insert paths from all existing ancestors of p_parent_merchant_id
    INSERT INTO public.merchant_tree_paths (ancestor_id, descendant_id, level)
    SELECT ancestor_id, p_new_merchant_id, level + 1
    FROM public.merchant_tree_paths
    WHERE descendant_id = p_parent_merchant_id
    ON CONFLICT DO NOTHING;

    -- 2. Insert the direct parent path
    INSERT INTO public.merchant_tree_paths (ancestor_id, descendant_id, level)
    VALUES (p_parent_merchant_id, p_new_merchant_id, 1)
    ON CONFLICT DO NOTHING;
END;
$$;

-- Step 6 — Create RPC distribute_merchant_referral_reward
CREATE OR REPLACE FUNCTION public.distribute_merchant_referral_reward(p_new_merchant_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_prize_paise BIGINT;
    v_referrer_id UUID;
    v_balance_before BIGINT;
    v_balance_after BIGINT;
    v_already_paid BOOLEAN;
BEGIN
    -- Guard: check if referral reward already paid
    SELECT referral_reward_paid INTO v_already_paid
    FROM public.merchants
    WHERE id = p_new_merchant_id;

    IF v_already_paid IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Merchant not found');
    END IF;

    IF v_already_paid THEN
        RETURN jsonb_build_object('success', false, 'message', 'Referral reward already distributed');
    END IF;

    -- Get prize amount
    SELECT value::BIGINT INTO v_prize_paise
    FROM public.platform_settings
    WHERE key = 'merchant_referral_prize_paise';

    IF v_prize_paise IS NULL THEN
        RAISE EXCEPTION 'platform_settings key merchant_referral_prize_paise missing or invalid';
    END IF;

    -- Get level-1 referrer
    SELECT ancestor_id INTO v_referrer_id
    FROM public.merchant_tree_paths
    WHERE descendant_id = p_new_merchant_id AND level = 1;

    IF v_referrer_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'No referrer found');
    END IF;

    -- Lock referrer wallet and get current balance
    SELECT wallet_balance_paise INTO v_balance_before
    FROM public.merchants
    WHERE id = v_referrer_id
    FOR UPDATE;

    v_balance_after := v_balance_before + v_prize_paise;

    -- Credit referrer
    UPDATE public.merchants
    SET wallet_balance_paise = v_balance_after
    WHERE id = v_referrer_id;

    -- Insert ledger entry
    INSERT INTO public.merchant_transactions (
        merchant_id,
        transaction_type,
        amount_paise,
        balance_after_paise,
        description
    ) VALUES (
        v_referrer_id,
        'referral_reward',
        v_prize_paise,
        v_balance_after,
        'Merchant referral reward for merchant ' || p_new_merchant_id
    );

    -- Mark as paid for the new merchant
    UPDATE public.merchants
    SET referral_reward_paid = true
    WHERE id = p_new_merchant_id;

    RETURN jsonb_build_object(
        'success', true, 
        'referrer_id', v_referrer_id, 
        'prize_paise', v_prize_paise
    );
END;
$$;

-- Step 7 — Backfill referral codes for existing merchants
DO $$
DECLARE
    rec RECORD;
    new_code TEXT;
    is_unique BOOLEAN;
BEGIN
    FOR rec IN SELECT id FROM public.merchants WHERE referral_code IS NULL LOOP
        LOOP
            new_code := upper(substring(md5(random()::text || clock_timestamp()::text) from 1 for 6));
            
            SELECT NOT EXISTS (
                SELECT 1 FROM public.merchants WHERE referral_code = new_code
            ) INTO is_unique;
            
            EXIT WHEN is_unique;
        END LOOP;
        
        UPDATE public.merchants
        SET referral_code = new_code
        WHERE id = rec.id;
    END LOOP;
END $$;

-- Step 8 — Enable RLS on merchant_tree_paths and add policies
ALTER TABLE public.merchant_tree_paths ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    -- Merchants can view own tree paths
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Merchants can view own tree paths' AND tablename = 'merchant_tree_paths') THEN
        CREATE POLICY "Merchants can view own tree paths" ON public.merchant_tree_paths
            FOR SELECT TO authenticated
            USING (
                ancestor_id IN (SELECT id FROM public.merchants WHERE user_id = auth.uid())
                OR descendant_id IN (SELECT id FROM public.merchants WHERE user_id = auth.uid())
            );
    END IF;

    -- Admins can view all merchant tree paths
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can view all merchant tree paths' AND tablename = 'merchant_tree_paths') THEN
        CREATE POLICY "Admins can view all merchant tree paths" ON public.merchant_tree_paths
            FOR SELECT TO authenticated
            USING (EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin')));
    END IF;

    -- Service role can insert merchant tree paths
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Service role can insert merchant tree paths' AND tablename = 'merchant_tree_paths') THEN
        CREATE POLICY "Service role can insert merchant tree paths" ON public.merchant_tree_paths
            FOR INSERT TO service_role
            WITH CHECK (true);
    END IF;

    -- Service role can select merchant tree paths
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Service role can select merchant tree paths' AND tablename = 'merchant_tree_paths') THEN
        CREATE POLICY "Service role can select merchant tree paths" ON public.merchant_tree_paths
            FOR SELECT TO service_role
            USING (true);
    END IF;
END $$;

-- Step 9 — Verification queries
SELECT 'Check 1: Count of merchants without referral code (should be 0)' as test;
SELECT count(*) AS merchants_without_code FROM public.merchants WHERE referral_code IS NULL;

SELECT 'Check 2: Indexes on merchant_tree_paths' as test;
SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'merchant_tree_paths';

SELECT 'Check 3: Platform settings for referral prize' as test;
SELECT key, value FROM public.platform_settings WHERE key = 'merchant_referral_prize_paise';

SELECT 'Check 4: Constraint definition for merchant_transactions' as test;
SELECT pg_get_constraintdef(oid) FROM pg_constraint WHERE conname = 'merchant_transactions_transaction_type_check';

SELECT 'Check 5: RLS policies on merchant_tree_paths' as test;
SELECT policyname, roles, cmd, qual, with_check FROM pg_policies WHERE tablename = 'merchant_tree_paths';
