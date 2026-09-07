-- Migration: 20260903235354_ai_orders_schema.sql
-- Description: Creates tables, RLS policies, and RPCs for the AI Orders workflow.

-- 1. Create Enums (Idempotent)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ai_order_status') THEN
        CREATE TYPE ai_order_status AS ENUM ('PENDING', 'PAYMENT_PENDING', 'ACCEPTED', 'COMPLETED', 'REJECTED');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ai_vault_status') THEN
        CREATE TYPE ai_vault_status AS ENUM ('ACTIVE', 'FROZEN');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ai_vault_tx_type') THEN
        CREATE TYPE ai_vault_tx_type AS ENUM ('ORDER_COMPLETION_CREDIT', 'PROFIT_CREDIT', 'WITHDRAWAL');
    END IF;
END $$;

-- 2. Create AI Orders Table
CREATE TABLE IF NOT EXISTS public.ai_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    merchant_id UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL, -- Nullable initially
    product_name TEXT NOT NULL,
    wholesale_price_paise BIGINT NOT NULL,
    retail_price_paise BIGINT NOT NULL,
    profit_margin_paise BIGINT NOT NULL,
    status ai_order_status NOT NULL DEFAULT 'PENDING',
    sabpaisa_txn_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for ai_orders
CREATE INDEX IF NOT EXISTS idx_ai_orders_status ON public.ai_orders(status);
CREATE INDEX IF NOT EXISTS idx_ai_orders_merchant_id ON public.ai_orders(merchant_id);
CREATE INDEX IF NOT EXISTS idx_ai_orders_admin_id ON public.ai_orders(admin_id);
CREATE INDEX IF NOT EXISTS idx_ai_orders_sabpaisa_txn_id ON public.ai_orders(sabpaisa_txn_id);

-- RLS for ai_orders
ALTER TABLE public.ai_orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage AI orders" ON public.ai_orders;
CREATE POLICY "Admins can manage AI orders" 
ON public.ai_orders 
FOR ALL 
TO authenticated, service_role
USING (
    is_admin() OR EXISTS (SELECT 1 FROM public.user_profiles u WHERE u.id = auth.uid() AND u.role IN ('admin'::user_role, 'super_admin'::user_role))
);

DROP POLICY IF EXISTS "Merchants can view all pending orders and their own orders" ON public.ai_orders;
CREATE POLICY "Merchants can view all pending orders and their own orders"
ON public.ai_orders
FOR SELECT
TO authenticated, service_role
USING (
    status = 'PENDING' OR merchant_id = auth.uid()
);

DROP POLICY IF EXISTS "Merchants can update their own orders" ON public.ai_orders;
DROP POLICY IF EXISTS "Merchants can claim pending orders or update own orders" ON public.ai_orders;
CREATE POLICY "Merchants can claim pending orders or update own orders"
ON public.ai_orders
FOR UPDATE
TO authenticated, service_role
USING (
    merchant_id = auth.uid() OR status = 'PENDING'
)
WITH CHECK (
    merchant_id = auth.uid()
);

-- 3. Create AI Orders Vault Table
CREATE TABLE IF NOT EXISTS public.ai_orders_vault (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    merchant_id UUID NOT NULL UNIQUE REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    balance_paise BIGINT NOT NULL DEFAULT 0,
    total_profit_paise BIGINT NOT NULL DEFAULT 0,
    status ai_vault_status NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_orders_vault_merchant_id ON public.ai_orders_vault(merchant_id);

ALTER TABLE public.ai_orders_vault ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Merchants can view their own vault" ON public.ai_orders_vault;
CREATE POLICY "Merchants can view their own vault" 
ON public.ai_orders_vault 
FOR SELECT 
TO authenticated, service_role
USING (merchant_id = auth.uid());

DROP POLICY IF EXISTS "Admins can view all vaults" ON public.ai_orders_vault;
CREATE POLICY "Admins can view all vaults" 
ON public.ai_orders_vault 
FOR SELECT 
TO authenticated, service_role
USING (
    is_admin() OR EXISTS (SELECT 1 FROM public.user_profiles u WHERE u.id = auth.uid() AND u.role IN ('admin'::user_role, 'super_admin'::user_role))
);

-- 4. Create AI Orders Vault Transactions Table
CREATE TABLE IF NOT EXISTS public.ai_orders_vault_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vault_id UUID NOT NULL REFERENCES public.ai_orders_vault(id) ON DELETE CASCADE,
    type ai_vault_tx_type NOT NULL,
    amount_paise BIGINT NOT NULL,
    balance_before_paise BIGINT NOT NULL,
    balance_after_paise BIGINT NOT NULL,
    reference_order_id UUID REFERENCES public.ai_orders(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_orders_vault_tx_vault_id ON public.ai_orders_vault_transactions(vault_id);
CREATE INDEX IF NOT EXISTS idx_ai_orders_vault_tx_order_id ON public.ai_orders_vault_transactions(reference_order_id);

ALTER TABLE public.ai_orders_vault_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Merchants can view their own vault transactions" ON public.ai_orders_vault_transactions;
CREATE POLICY "Merchants can view their own vault transactions" 
ON public.ai_orders_vault_transactions 
FOR SELECT 
TO authenticated, service_role
USING (
    EXISTS (SELECT 1 FROM public.ai_orders_vault v WHERE v.id = vault_id AND v.merchant_id = auth.uid())
);

DROP POLICY IF EXISTS "Admins can view all vault transactions" ON public.ai_orders_vault_transactions;
CREATE POLICY "Admins can view all vault transactions" 
ON public.ai_orders_vault_transactions 
FOR SELECT 
TO authenticated, service_role
USING (
    is_admin() OR EXISTS (SELECT 1 FROM public.user_profiles u WHERE u.id = auth.uid() AND u.role IN ('admin'::user_role, 'super_admin'::user_role))
);

-- 5. Atomic RPC for crediting Vault
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

    -- 4. Update order status
    UPDATE public.ai_orders
    SET status = 'COMPLETED', updated_at = NOW()
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

    -- 6. Insert transactions
    -- Principal
    INSERT INTO public.ai_orders_vault_transactions (
        vault_id, type, amount_paise, balance_before_paise, balance_after_paise, reference_order_id
    ) VALUES (
        v_vault_id, 'ORDER_COMPLETION_CREDIT', p_principal_amount_paise, v_balance_before, v_balance_after_principal, p_order_id
    );

    -- Profit
    INSERT INTO public.ai_orders_vault_transactions (
        vault_id, type, amount_paise, balance_before_paise, balance_after_paise, reference_order_id
    ) VALUES (
        v_vault_id, 'PROFIT_CREDIT', p_profit_amount_paise, v_balance_after_principal, v_balance_after_profit, p_order_id
    );

    RETURN json_build_object(
        'success', true, 
        'new_balance_paise', v_balance_after_profit
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth;

-- 6. Grants & Realtime
GRANT ALL ON TABLE public.ai_orders TO authenticated, service_role;
GRANT ALL ON TABLE public.ai_orders_vault TO authenticated, service_role;
GRANT ALL ON TABLE public.ai_orders_vault_transactions TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION complete_ai_order_and_credit_vault TO authenticated, service_role;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND schemaname = 'public' 
        AND tablename = 'ai_orders'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.ai_orders;
    END IF;
END $$;
