-- 20260424_fix_wholesale_draft_expected_amount.sql
-- 1a. Add the missing column
ALTER TABLE public.wholesale_order_drafts
  ADD COLUMN IF NOT EXISTS expected_amount_paise BIGINT;

-- 1b. Backfill existing pending drafts
UPDATE public.wholesale_order_drafts
SET expected_amount_paise = total_amount_paise
WHERE expected_amount_paise IS NULL;

-- 1c. Redeploy finalize_wholesale_gateway_purchase with correct version (total_amount_paise check)
DROP FUNCTION IF EXISTS public.finalize_wholesale_gateway_purchase(UUID, BIGINT);
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
    -- Fix: Use total_amount_paise (which is set by the draft route) instead of expected_amount_paise
    IF v_draft.total_amount_paise != p_amount_paise THEN
        RETURN jsonb_build_object('success', false, 'message', 'Amount mismatch during fulfillment');
    END IF;

    -- 3. Get Merchant User ID for Transactions
    SELECT user_id INTO v_merchant_user_id FROM public.merchants WHERE id = v_draft.merchant_id;

    -- 4. Process Each Item
    FOR v_item IN SELECT unnest(v_draft.items)
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
            merchant_id, product_id, stock_quantity, retail_price_paise, updated_at, is_platform_product
        ) VALUES (
            v_draft.merchant_id, v_product_id, v_quantity, 
            (SELECT suggested_retail_price_paise FROM public.shopping_products WHERE id = v_product_id),
            now(),
            true
        )
        ON CONFLICT (merchant_id, product_id)
        DO UPDATE SET 
            stock_quantity = public.merchant_inventory.stock_quantity + v_quantity,
            is_platform_product = true,
            updated_at = now();

        -- Log to shopping orders (for history)
        INSERT INTO public.shopping_orders (
            buyer_id,
            buyer_type,
            seller_id,
            seller_type,
            product_id,
            quantity,
            unit_price_paise,
            total_price_paise,
            order_type,
            status
        ) VALUES (
            v_draft.merchant_id,
            'merchant',
            NULL, -- From admin
            'admin',
            v_product_id,
            v_quantity,
            v_unit_price,
            v_quantity * v_unit_price,
            'wholesale',
            'completed'
        );
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
