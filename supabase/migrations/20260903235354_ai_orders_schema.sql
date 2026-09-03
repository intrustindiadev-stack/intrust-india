-- Migration: 20260903235354_ai_orders_schema.sql
-- Description: Creates tables and RPCs for the AI Orders workflow.

-- 1. Create Enums
CREATE TYPE ai_order_status AS ENUM ('PENDING', 'PAYMENT_PENDING', 'ACCEPTED', 'COMPLETED', 'REJECTED');
CREATE TYPE ai_vault_status AS ENUM ('ACTIVE', 'FROZEN');
CREATE TYPE ai_vault_tx_type AS ENUM ('ORDER_COMPLETION_CREDIT', 'PROFIT_CREDIT', 'WITHDRAWAL');

-- 2. Create AI Orders Table
CREATE TABLE public.ai_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID NOT NULL REFERENCES public.users(id),
    merchant_id UUID REFERENCES public.users(id), -- Nullable initially
    product_name TEXT NOT NULL,
    wholesale_price_paise BIGINT NOT NULL,
    retail_price_paise BIGINT NOT NULL,
    profit_margin_paise BIGINT NOT NULL,
    status ai_order_status NOT NULL DEFAULT 'PENDING',
    sabpaisa_txn_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS for ai_orders
ALTER TABLE public.ai_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage AI orders" 
ON public.ai_orders 
FOR ALL 
USING (
    EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND (u.role = 'ADMIN' OR u.role = 'SUPER_ADMIN'))
);

CREATE POLICY "Merchants can view all pending orders and their own orders"
ON public.ai_orders
FOR SELECT
USING (
    status = 'PENDING' OR merchant_id = auth.uid()
);

CREATE POLICY "Merchants can update their own orders"
ON public.ai_orders
FOR UPDATE
USING (
    merchant_id = auth.uid()
);

-- 3. Create AI Orders Vault Table
CREATE TABLE public.ai_orders_vault (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    merchant_id UUID NOT NULL UNIQUE REFERENCES public.users(id),
    balance_paise BIGINT NOT NULL DEFAULT 0,
    total_profit_paise BIGINT NOT NULL DEFAULT 0,
    status ai_vault_status NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.ai_orders_vault ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Merchants can view their own vault" ON public.ai_orders_vault FOR SELECT USING (merchant_id = auth.uid());
CREATE POLICY "Admins can view all vaults" ON public.ai_orders_vault FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND (u.role = 'ADMIN' OR u.role = 'SUPER_ADMIN'))
);

-- 4. Create AI Orders Vault Transactions Table
CREATE TABLE public.ai_orders_vault_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vault_id UUID NOT NULL REFERENCES public.ai_orders_vault(id),
    type ai_vault_tx_type NOT NULL,
    amount_paise BIGINT NOT NULL,
    balance_before_paise BIGINT NOT NULL,
    balance_after_paise BIGINT NOT NULL,
    reference_order_id UUID REFERENCES public.ai_orders(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.ai_orders_vault_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Merchants can view their own vault transactions" ON public.ai_orders_vault_transactions FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.ai_orders_vault v WHERE v.id = vault_id AND v.merchant_id = auth.uid())
);
CREATE POLICY "Admins can view all vault transactions" ON public.ai_orders_vault_transactions FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND (u.role = 'ADMIN' OR u.role = 'SUPER_ADMIN'))
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
$$ LANGUAGE plpgsql SECURITY DEFINER;
