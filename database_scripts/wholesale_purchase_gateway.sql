-- Wholesale Purchase Gateway Migration
-- This script sets up the draft system for merchant wholesale purchases via SabPaisa.

-- 1. Create Draft Table
CREATE TABLE IF NOT EXISTS public.wholesale_order_drafts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    merchant_id UUID NOT NULL REFERENCES public.merchants(id),
    items JSONB NOT NULL, -- Array of {product_id, quantity, unit_price_paise}
    total_amount_paise BIGINT NOT NULL,
    status TEXT DEFAULT 'pending', -- 'pending', 'completed', 'failed'
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Enable RLS
ALTER TABLE public.wholesale_order_drafts ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies
-- Merchants can view their own drafts
CREATE POLICY "Merchants can view their own wholesale drafts"
    ON public.wholesale_order_drafts
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.merchants m
            WHERE m.id = wholesale_order_drafts.merchant_id
            AND m.user_id = auth.uid()
        )
    );

-- Merchants can insert their own drafts (via draft route)
CREATE POLICY "Merchants can insert their own wholesale drafts"
    ON public.wholesale_order_drafts
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.merchants m
            WHERE m.id = merchant_id
            AND m.user_id = auth.uid()
        )
    );

-- 4. Atomic Fulfillment RPC
CREATE OR REPLACE FUNCTION public.finalize_wholesale_gateway_purchase(
    p_draft_id UUID,
    p_amount_paise BIGINT
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_draft RECORD;
    v_item JSONB;
    v_product_id UUID;
    v_quantity INT;
    v_unit_price BIGINT;
    v_merchant_user_id UUID;
BEGIN
    -- 1. Fetch and Validate Draft
    SELECT * INTO v_draft FROM public.wholesale_order_drafts 
    WHERE id = p_draft_id AND status = 'pending'
    FOR UPDATE; -- Lock the row

    IF v_draft.id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Draft not found or already processed');
    END IF;

    -- 2. Validate Amount
    IF v_draft.total_amount_paise != p_amount_paise THEN
        RETURN jsonb_build_object('success', false, 'message', 'Amount mismatch during fulfillment');
    END IF;

    -- 3. Get Merchant User ID for Transactions
    SELECT user_id INTO v_merchant_user_id FROM public.merchants WHERE id = v_draft.merchant_id;

    -- 4. Process Each Item
    FOR v_item IN SELECT * FROM jsonb_array_elements(v_draft.items)
    LOOP
        v_product_id := (v_item->>'product_id')::UUID;
        v_quantity := (v_item->>'quantity')::INT;
        v_unit_price := (v_item->>'unit_price_paise')::BIGINT;

        -- Check Stock
        IF NOT EXISTS (
            SELECT 1 FROM public.shopping_products 
            WHERE id = v_product_id AND admin_stock >= v_quantity
        ) THEN
            RETURN jsonb_build_object('success', false, 'message', 'Stock ran out for one or more items since draft creation');
        END IF;

        -- Deduct from Platform Stock
        UPDATE public.shopping_products 
        SET admin_stock = admin_stock - v_quantity,
            updated_at = now()
        WHERE id = v_product_id;

        -- Upsert into Merchant Inventory
        INSERT INTO public.merchant_inventory (
            merchant_id, product_id, stock_quantity, retail_price_paise, updated_at
        ) VALUES (
            v_draft.merchant_id, v_product_id, v_quantity, 
            (SELECT suggested_retail_price_paise FROM public.shopping_products WHERE id = v_product_id),
            now()
        )
        ON CONFLICT (merchant_id, product_id)
        DO UPDATE SET 
            stock_quantity = public.merchant_inventory.stock_quantity + v_quantity,
            updated_at = now();

        -- Log Order Item (for history)
        -- Note: Bulk purchase tracking usually goes to shopping_orders, but this is wholesale.
        -- We'll log it as a transaction for the merchant.
    END LOOP;

    -- 5. Record Transaction
    INSERT INTO public.merchant_transactions (
        merchant_id, transaction_type, amount_paise, balance_after_paise, description
    ) VALUES (
        v_draft.merchant_id,
        'purchase',
        p_amount_paise,
        (SELECT wallet_balance_paise FROM public.merchants WHERE id = v_draft.merchant_id), -- Wallet doesn't change
        'Wholesale Inventory Purchase via Gateway (Admin Stock)'
    );

    -- 6. Mark Draft as Completed
    UPDATE public.wholesale_order_drafts SET status = 'completed', updated_at = now() WHERE id = p_draft_id;

    RETURN jsonb_build_object('success', true);
END;
$$;
