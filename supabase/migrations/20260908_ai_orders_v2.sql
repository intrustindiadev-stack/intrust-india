-- ==============================================================================
-- Migration: 20260908_ai_orders_v2.sql
-- Description: Comprehensive schema, storage bucket, RLS, sequence, settlement RPC,
--              and production-ready data seeding for AI Orders & Vault.
-- ==============================================================================

-- 1. Ensure public.ai_orders has all necessary columns
ALTER TABLE public.ai_orders
    ADD COLUMN IF NOT EXISTS order_code TEXT,
    ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'Electronics',
    ADD COLUMN IF NOT EXISTS product_image_url TEXT,
    ADD COLUMN IF NOT EXISTS payment_method TEXT,
    ADD COLUMN IF NOT EXISTS payment_received_at TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS admin_id UUID REFERENCES auth.users(id),
    ADD COLUMN IF NOT EXISTS merchant_id UUID REFERENCES auth.users(id);

-- Add unique constraint on order_code if not already existing
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'ai_orders_order_code_unique'
    ) THEN
        ALTER TABLE public.ai_orders ADD CONSTRAINT ai_orders_order_code_unique UNIQUE (order_code);
    END IF;
EXCEPTION
    WHEN OTHERS THEN NULL;
END $$;

-- 2. Format order_code sequence (Starting at 1000 for AI-1001, AI-1028, etc.)
CREATE SEQUENCE IF NOT EXISTS ai_order_code_seq START 1001;

CREATE OR REPLACE FUNCTION generate_ai_order_code()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.order_code IS NULL OR NEW.order_code = '' THEN
        NEW.order_code := 'AI-' || nextval('ai_order_code_seq')::TEXT;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_ai_order_code ON public.ai_orders;
CREATE TRIGGER trg_ai_order_code
BEFORE INSERT ON public.ai_orders
FOR EACH ROW EXECUTE FUNCTION generate_ai_order_code();

-- Backfill existing orders with AI-xxxx formatting
UPDATE public.ai_orders
SET order_code = 'AI-' || nextval('ai_order_code_seq')::TEXT
WHERE order_code IS NULL OR order_code NOT LIKE 'AI-%';

-- 3. Ensure Vault & Transactions Tables Exist
CREATE TABLE IF NOT EXISTS public.ai_orders_vault (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    merchant_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    balance_paise BIGINT NOT NULL DEFAULT 0,
    total_profit_paise BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.ai_orders_vault_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vault_id UUID NOT NULL REFERENCES public.ai_orders_vault(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    amount_paise BIGINT NOT NULL,
    balance_before_paise BIGINT NOT NULL,
    balance_after_paise BIGINT NOT NULL,
    reference_order_id UUID REFERENCES public.ai_orders(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'COMPLETED',
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_orders_vault_merchant ON public.ai_orders_vault(merchant_id);
CREATE INDEX IF NOT EXISTS idx_ai_orders_transactions_vault ON public.ai_orders_vault_transactions(vault_id);
CREATE INDEX IF NOT EXISTS idx_ai_orders_status ON public.ai_orders(status);
CREATE INDEX IF NOT EXISTS idx_ai_orders_merchant ON public.ai_orders(merchant_id);

-- 4. Supabase Storage Bucket for Product Images
INSERT INTO storage.buckets (id, name, public)
VALUES ('product-images', 'product-images', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Storage RLS: Public read access
DO $$
BEGIN
    DROP POLICY IF EXISTS "Public read access for product images" ON storage.objects;
    CREATE POLICY "Public read access for product images"
    ON storage.objects FOR SELECT
    TO public
    USING (bucket_id = 'product-images');

    DROP POLICY IF EXISTS "Authenticated users can upload product images" ON storage.objects;
    CREATE POLICY "Authenticated users can upload product images"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (bucket_id = 'product-images');
EXCEPTION
    WHEN OTHERS THEN NULL;
END $$;

-- 5. Row Level Security Policies
ALTER TABLE public.ai_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_orders_vault ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_orders_vault_transactions ENABLE ROW LEVEL SECURITY;

-- Admins full access
DROP POLICY IF EXISTS "Admins have full access to ai_orders" ON public.ai_orders;
CREATE POLICY "Admins have full access to ai_orders"
ON public.ai_orders FOR ALL
TO authenticated, service_role
USING (
    EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
    OR auth.role() = 'service_role'
);

-- Merchants view assigned or open pending orders
DROP POLICY IF EXISTS "Merchants can view assigned or open pending orders" ON public.ai_orders;
CREATE POLICY "Merchants can view assigned or open pending orders"
ON public.ai_orders FOR SELECT
TO authenticated, service_role
USING (
    merchant_id = auth.uid() OR (merchant_id IS NULL AND status = 'PENDING')
);

-- Merchants claim or update own orders
DROP POLICY IF EXISTS "Merchants can claim assigned or open pending orders" ON public.ai_orders;
CREATE POLICY "Merchants can claim assigned or open pending orders"
ON public.ai_orders FOR UPDATE
TO authenticated, service_role
USING (
    merchant_id = auth.uid() OR (merchant_id IS NULL AND status = 'PENDING')
)
WITH CHECK (
    merchant_id = auth.uid()
);

-- Vault RLS
DROP POLICY IF EXISTS "Merchants can view own vault" ON public.ai_orders_vault;
CREATE POLICY "Merchants can view own vault"
ON public.ai_orders_vault FOR SELECT
TO authenticated, service_role
USING (merchant_id = auth.uid() OR auth.role() = 'service_role');

DROP POLICY IF EXISTS "Merchants can view own vault transactions" ON public.ai_orders_vault_transactions;
CREATE POLICY "Merchants can view own vault transactions"
ON public.ai_orders_vault_transactions FOR SELECT
TO authenticated, service_role
USING (
    EXISTS (
        SELECT 1 FROM public.ai_orders_vault
        WHERE ai_orders_vault.id = ai_orders_vault_transactions.vault_id
        AND ai_orders_vault.merchant_id = auth.uid()
    ) OR auth.role() = 'service_role'
);

-- 6. Atomic Order Completion and Escrow Release RPC
CREATE OR REPLACE FUNCTION complete_ai_order_and_credit_vault(
    p_order_id UUID,
    p_merchant_id UUID,
    p_principal_amount_paise BIGINT,
    p_profit_amount_paise BIGINT
) RETURNS json AS $$
DECLARE
    v_vault_id UUID;
    v_balance_before BIGINT;
    v_balance_after_principal BIGINT;
    v_balance_after_profit BIGINT;
    v_total_profit_before BIGINT;
BEGIN
    -- 1. Ensure vault exists
    INSERT INTO public.ai_orders_vault (merchant_id, balance_paise, total_profit_paise)
    VALUES (p_merchant_id, 0, 0)
    ON CONFLICT (merchant_id) DO NOTHING;

    -- 2. Lock vault for update
    SELECT id, balance_paise, total_profit_paise INTO v_vault_id, v_balance_before, v_total_profit_before
    FROM public.ai_orders_vault
    WHERE merchant_id = p_merchant_id
    FOR UPDATE;

    -- 3. Calculate balances
    v_balance_after_principal := v_balance_before + p_principal_amount_paise;
    v_balance_after_profit := v_balance_after_principal + p_profit_amount_paise;

    -- 4. Update order status and completed_at timestamp
    UPDATE public.ai_orders
    SET status = 'COMPLETED', completed_at = NOW(), updated_at = NOW()
    WHERE id = p_order_id AND status = 'ACCEPTED' AND merchant_id = p_merchant_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Order not found, not accepted, or does not belong to the merchant';
    END IF;

    -- 5. Update vault
    UPDATE public.ai_orders_vault
    SET balance_paise = v_balance_after_profit, 
        total_profit_paise = v_total_profit_before + p_profit_amount_paise,
        updated_at = NOW()
    WHERE id = v_vault_id;

    -- 6. Insert ledger transactions
    -- Principal Return
    INSERT INTO public.ai_orders_vault_transactions (
        vault_id, type, amount_paise, balance_before_paise, balance_after_paise, reference_order_id, status
    ) VALUES (
        v_vault_id, 'ORDER_COMPLETION_CREDIT', p_principal_amount_paise, v_balance_before, v_balance_after_principal, p_order_id, 'COMPLETED'
    );

    -- Profit Credit
    INSERT INTO public.ai_orders_vault_transactions (
        vault_id, type, amount_paise, balance_before_paise, balance_after_paise, reference_order_id, status
    ) VALUES (
        v_vault_id, 'PROFIT_CREDIT', p_profit_amount_paise, v_balance_after_principal, v_balance_after_profit, p_order_id, 'COMPLETED'
    );

    RETURN json_build_object(
        'success', true, 
        'new_balance_paise', v_balance_after_profit
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth;

-- 7. Atomic Withdrawal RPC from Vault
CREATE OR REPLACE FUNCTION withdraw_from_ai_vault(
    p_merchant_id UUID,
    p_amount_paise BIGINT,
    p_payout_details JSONB DEFAULT '{}'::jsonb
) RETURNS json AS $$
DECLARE
    v_vault_id UUID;
    v_balance_before BIGINT;
    v_balance_after BIGINT;
BEGIN
    SELECT id, balance_paise INTO v_vault_id, v_balance_before
    FROM public.ai_orders_vault
    WHERE merchant_id = p_merchant_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Vault not found for merchant';
    END IF;

    IF v_balance_before < p_amount_paise THEN
        RAISE EXCEPTION 'Insufficient balance in vault';
    END IF;

    v_balance_after := v_balance_before - p_amount_paise;

    UPDATE public.ai_orders_vault
    SET balance_paise = v_balance_after, updated_at = NOW()
    WHERE id = v_vault_id;

    INSERT INTO public.ai_orders_vault_transactions (
        vault_id, type, amount_paise, balance_before_paise, balance_after_paise, status, metadata
    ) VALUES (
        v_vault_id, 'WITHDRAWAL', p_amount_paise, v_balance_before, v_balance_after, 'PROCESSING', p_payout_details
    );

    RETURN json_build_object(
        'success', true,
        'remaining_balance_paise', v_balance_after
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth;

-- ==============================================================================
-- 8. Seed Production-Ready Realistic Sample Orders (If table has fewer than 5 rows)
-- ==============================================================================
DO $$
DECLARE
    v_merchant_id UUID;
    v_admin_id UUID;
BEGIN
    -- Pick an active merchant or user profile if available
    SELECT user_id INTO v_merchant_id FROM public.merchants LIMIT 1;
    IF v_merchant_id IS NULL THEN
        SELECT id INTO v_merchant_id FROM public.user_profiles LIMIT 1;
    END IF;

    SELECT id INTO v_admin_id FROM public.user_profiles WHERE role IN ('admin', 'super_admin') LIMIT 1;

    -- Only seed if ai_orders is empty or has fewer than 3 records
    IF (SELECT count(*) FROM public.ai_orders) < 3 THEN
        INSERT INTO public.ai_orders (
            order_code, product_name, category, product_image_url, wholesale_price_paise, retail_price_paise, profit_margin_paise, status, merchant_id, admin_id, created_at
        ) VALUES 
        (
            'AI-1028', 'iPhone 15 (128GB)', 'Electronics', 
            'https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=300&auto=format&fit=crop&q=80',
            7000000, 7700000, 700000, 'ACCEPTED', v_merchant_id, v_admin_id, NOW() - INTERVAL '2 hours'
        ),
        (
            'AI-1027', 'Samsung TV 55"', 'Electronics', 
            'https://images.unsplash.com/photo-1593784991095-a205069470b6?w=300&auto=format&fit=crop&q=80',
            6000000, 6600000, 600000, 'PAYMENT_PENDING', v_merchant_id, v_admin_id, NOW() - INTERVAL '5 hours'
        ),
        (
            'AI-1026', 'Nike Air Max', 'Footwear', 
            'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=300&auto=format&fit=crop&q=80',
            1500000, 1700000, 200000, 'PENDING', v_merchant_id, v_admin_id, NOW() - INTERVAL '1 day'
        ),
        (
            'AI-1025', 'Dyson Hair Dryer', 'Personal Care', 
            'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=300&auto=format&fit=crop&q=80',
            2500000, 2800000, 300000, 'COMPLETED', v_merchant_id, v_admin_id, NOW() - INTERVAL '2 days'
        ),
        (
            'AI-1024', 'MacBook Air M2', 'Computers', 
            'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=300&auto=format&fit=crop&q=80',
            8000000, 8800000, 800000, 'ACCEPTED', v_merchant_id, v_admin_id, NOW() - INTERVAL '3 days'
        ),
        (
            'AI-1023', 'Adidas Hoodie', 'Fashion', 
            'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=300&auto=format&fit=crop&q=80',
            1000000, 1200000, 200000, 'COMPLETED', v_merchant_id, v_admin_id, NOW() - INTERVAL '4 days'
        ),
        (
            'AI-1022', 'Apple Watch Series 9', 'Wearables', 
            'https://images.unsplash.com/photo-1508685096489-7aacd43bd3b1?w=300&auto=format&fit=crop&q=80',
            3500000, 4000000, 500000, 'PENDING', v_merchant_id, v_admin_id, NOW() - INTERVAL '5 days'
        ),
        (
            'AI-1021', 'Sony WH-1000XM5', 'Audio', 
            'https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=300&auto=format&fit=crop&q=80',
            2200000, 2600000, 400000, 'ACCEPTED', v_merchant_id, v_admin_id, NOW() - INTERVAL '6 days'
        )
        ON CONFLICT DO NOTHING;

        -- Ensure sample vault exists for this merchant
        IF v_merchant_id IS NOT NULL THEN
            INSERT INTO public.ai_orders_vault (merchant_id, balance_paise, total_profit_paise)
            VALUES (v_merchant_id, 1240000, 3850000)
            ON CONFLICT (merchant_id) DO UPDATE 
            SET balance_paise = 1240000, total_profit_paise = 3850000;
        END IF;
    END IF;
END $$;
