-- FIX MERCHANT PURCHASE SECURITY BYPASS
-- Created: 2026-04-24

-- 1. 8a. RPC: Purchase Platform Products (Single Wholesale)
DROP FUNCTION IF EXISTS public.purchase_platform_products(UUID, INTEGER, UUID);
CREATE OR REPLACE FUNCTION public.purchase_platform_products(
    p_product_id UUID,
    p_quantity INTEGER,
    p_merchant_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_wholesale_price BIGINT;
    v_total_cost BIGINT;
    v_merchant_balance BIGINT;
    v_admin_stock INTEGER;
    v_new_balance BIGINT;
BEGIN
    PERFORM set_config('app.internal_bypass', 'true', true);

    IF NOT EXISTS (
        SELECT 1 FROM public.merchants 
        WHERE id = p_merchant_id AND user_id = auth.uid()
    ) THEN
        PERFORM set_config('app.internal_bypass', 'false', true);
        RETURN jsonb_build_object('success', false, 'message', 'Unauthorized: Merchant identity mismatch');
    END IF;

    SELECT wholesale_price_paise, admin_stock INTO v_wholesale_price, v_admin_stock
    FROM public.shopping_products WHERE id = p_product_id FOR UPDATE;

    IF v_admin_stock < p_quantity THEN
        PERFORM set_config('app.internal_bypass', 'false', true);
        RETURN jsonb_build_object('success', false, 'message', 'Insufficient admin stock');
    END IF;

    v_total_cost := v_wholesale_price * p_quantity;

    SELECT wallet_balance_paise INTO v_merchant_balance
    FROM public.merchants WHERE id = p_merchant_id FOR UPDATE;

    IF v_merchant_balance < v_total_cost THEN
        PERFORM set_config('app.internal_bypass', 'false', true);
        RETURN jsonb_build_object('success', false, 'message', 'Insufficient merchant balance');
    END IF;

    UPDATE public.merchants SET wallet_balance_paise = wallet_balance_paise - v_total_cost 
    WHERE id = p_merchant_id 
    RETURNING wallet_balance_paise INTO v_new_balance;
    
    UPDATE public.shopping_products SET admin_stock = admin_stock - p_quantity WHERE id = p_product_id;

    INSERT INTO public.merchant_inventory (
        merchant_id, product_id, stock_quantity, retail_price_paise, 
        is_platform_product, is_active, custom_title, custom_description
    )
    SELECT 
        p_merchant_id, p_product_id, p_quantity, suggested_retail_price_paise, 
        true, false, title, description
    FROM public.shopping_products WHERE id = p_product_id
    ON CONFLICT (merchant_id, product_id) DO UPDATE
    SET stock_quantity = merchant_inventory.stock_quantity + p_quantity;

    INSERT INTO public.shopping_orders (buyer_id, buyer_type, seller_id, seller_type, product_id, quantity, unit_price_paise, total_price_paise, order_type)
    VALUES (p_merchant_id, 'merchant', NULL, 'admin', p_product_id, p_quantity, v_wholesale_price, v_total_cost, 'wholesale');

    INSERT INTO public.merchant_transactions (merchant_id, transaction_type, amount_paise, balance_after_paise, description, metadata)
    VALUES (p_merchant_id, 'purchase', -v_total_cost, v_new_balance, 'Wholesale purchase of products', jsonb_build_object('product_id', p_product_id, 'quantity', p_quantity));

    PERFORM set_config('app.internal_bypass', 'false', true);
    RETURN jsonb_build_object('success', true, 'message', 'Purchase successful');

EXCEPTION WHEN OTHERS THEN
    PERFORM set_config('app.internal_bypass', 'false', true);
    RAISE;
END;
$$;

-- 2. 8b. RPC: Purchase Platform Products Bulk
DROP FUNCTION IF EXISTS public.purchase_platform_products_bulk(JSONB[], UUID);
CREATE OR REPLACE FUNCTION public.purchase_platform_products_bulk(
    p_items JSONB[], 
    p_merchant_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_item JSONB;
    v_product_id UUID;
    v_qty INTEGER;
    v_item_price BIGINT;
    v_total_cost BIGINT := 0;
    v_merchant_balance BIGINT;
    v_new_balance BIGINT;
    v_product RECORD;
BEGIN
    PERFORM set_config('app.internal_bypass', 'true', true);

    IF NOT EXISTS (
        SELECT 1 FROM public.merchants 
        WHERE id = p_merchant_id AND user_id = auth.uid()
    ) THEN
        PERFORM set_config('app.internal_bypass', 'false', true);
        RETURN jsonb_build_object('success', false, 'message', 'Unauthorized: Merchant identity mismatch');
    END IF;

    FOREACH v_item IN ARRAY p_items LOOP
        v_product_id := (v_item->>'product_id')::UUID;
        v_qty := (v_item->>'quantity')::INTEGER;

        IF v_qty <= 0 THEN
            PERFORM set_config('app.internal_bypass', 'false', true);
            RETURN jsonb_build_object('success', false, 'message', 'Quantity must be greater than zero');
        END IF;

        SELECT wholesale_price_paise, admin_stock, title INTO v_product
        FROM public.shopping_products WHERE id = v_product_id;

        IF v_product.admin_stock < v_qty THEN
            PERFORM set_config('app.internal_bypass', 'false', true);
            RETURN jsonb_build_object('success', false, 'message', 'Insufficient stock for ' || v_product.title);
        END IF;

        v_total_cost := v_total_cost + (v_product.wholesale_price_paise * v_qty);
    END LOOP;

    SELECT wallet_balance_paise INTO v_merchant_balance
    FROM public.merchants WHERE id = p_merchant_id FOR UPDATE;

    IF v_merchant_balance < v_total_cost THEN
        PERFORM set_config('app.internal_bypass', 'false', true);
        RETURN jsonb_build_object('success', false, 'message', 'Insufficient merchant balance');
    END IF;

    v_new_balance := v_merchant_balance;

    FOREACH v_item IN ARRAY p_items LOOP
        v_product_id := (v_item->>'product_id')::UUID;
        v_qty := (v_item->>'quantity')::INTEGER;

        SELECT wholesale_price_paise INTO v_item_price
        FROM public.shopping_products WHERE id = v_product_id FOR UPDATE;

        UPDATE public.shopping_products SET admin_stock = admin_stock - v_qty WHERE id = v_product_id;

        INSERT INTO public.merchant_inventory (
            merchant_id, product_id, stock_quantity, retail_price_paise, 
            is_platform_product, is_active, custom_title, custom_description
        )
        SELECT 
            p_merchant_id, v_product_id, v_qty, suggested_retail_price_paise, 
            true, false, title, description
        FROM public.shopping_products WHERE id = v_product_id
        ON CONFLICT (merchant_id, product_id) DO UPDATE
        SET stock_quantity = merchant_inventory.stock_quantity + v_qty;

        INSERT INTO public.shopping_orders (buyer_id, buyer_type, seller_id, seller_type, product_id, quantity, unit_price_paise, total_price_paise, order_type)
        VALUES (p_merchant_id, 'merchant', NULL, 'admin', v_product_id, v_qty, v_item_price, v_item_price * v_qty, 'wholesale');

        v_new_balance := v_new_balance - (v_item_price * v_qty);

        INSERT INTO public.merchant_transactions (merchant_id, transaction_type, amount_paise, balance_after_paise, description, metadata)
        VALUES (p_merchant_id, 'purchase', -(v_item_price * v_qty), v_new_balance, 'Wholesale bulk purchase', jsonb_build_object('product_id', v_product_id, 'quantity', v_qty));
    END LOOP;

    UPDATE public.merchants SET wallet_balance_paise = v_new_balance WHERE id = p_merchant_id;

    PERFORM set_config('app.internal_bypass', 'false', true);
    RETURN jsonb_build_object('success', true, 'message', 'Bulk purchase successful');

EXCEPTION WHEN OTHERS THEN
    PERFORM set_config('app.internal_bypass', 'false', true);
    RAISE;
END;
$$;

-- 3. 9. RPC: Customer Purchase From Merchant (Retail)
DROP FUNCTION IF EXISTS public.customer_purchase_from_merchant(UUID, INTEGER, UUID);
CREATE OR REPLACE FUNCTION public.customer_purchase_from_merchant(
    p_inventory_id UUID,
    p_quantity INTEGER,
    p_customer_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_inventory RECORD;
    v_total_cost BIGINT;
    v_customer_balance BIGINT;
    v_new_merchant_balance BIGINT;
BEGIN
    PERFORM set_config('app.internal_bypass', 'true', true);

    SELECT * INTO v_inventory FROM public.merchant_inventory WHERE id = p_inventory_id FOR UPDATE;

    IF NOT FOUND THEN
        PERFORM set_config('app.internal_bypass', 'false', true);
        RETURN jsonb_build_object('success', false, 'message', 'Inventory item not found');
    END IF;

    IF v_inventory.stock_quantity < p_quantity THEN
        PERFORM set_config('app.internal_bypass', 'false', true);
        RETURN jsonb_build_object('success', false, 'message', 'Insufficient merchant stock');
    END IF;

    v_total_cost := v_inventory.retail_price_paise * p_quantity;

    SELECT wallet_balance_paise INTO v_customer_balance
    FROM public.user_profiles WHERE id = p_customer_id FOR UPDATE;

    IF v_customer_balance < v_total_cost THEN
        PERFORM set_config('app.internal_bypass', 'false', true);
        RETURN jsonb_build_object('success', false, 'message', 'Insufficient wallet balance');
    END IF;

    UPDATE public.user_profiles SET wallet_balance_paise = wallet_balance_paise - v_total_cost WHERE id = p_customer_id;
    
    UPDATE public.merchants SET wallet_balance_paise = wallet_balance_paise + v_total_cost 
    WHERE id = v_inventory.merchant_id 
    RETURNING wallet_balance_paise INTO v_new_merchant_balance;
    
    UPDATE public.merchant_inventory SET stock_quantity = stock_quantity - p_quantity WHERE id = p_inventory_id;

    INSERT INTO public.shopping_orders (buyer_id, buyer_type, seller_id, seller_type, product_id, quantity, unit_price_paise, total_price_paise, order_type)
    VALUES (p_customer_id, 'customer', v_inventory.merchant_id, 'merchant', v_inventory.product_id, p_quantity, v_inventory.retail_price_paise, v_total_cost, 'retail');

    INSERT INTO public.merchant_transactions (merchant_id, transaction_type, amount_paise, balance_after_paise, description, metadata)
    VALUES (v_inventory.merchant_id, 'sale_earnings', v_total_cost, v_new_merchant_balance, 'Product sale to customer', jsonb_build_object('buyer_id', p_customer_id, 'product_id', v_inventory.product_id));

    PERFORM set_config('app.internal_bypass', 'false', true);
    RETURN jsonb_build_object('success', true, 'message', 'Order placed successfully');

EXCEPTION WHEN OTHERS THEN
    PERFORM set_config('app.internal_bypass', 'false', true);
    RAISE;
END;
$$;

-- 4. Admin Takeover Single Order
DROP FUNCTION IF EXISTS public.admin_takeover_single_order(UUID, UUID);
CREATE OR REPLACE FUNCTION public.admin_takeover_single_order(p_order_id UUID, p_admin_id UUID)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_order RECORD;
    v_new_platform_cut BIGINT;
    v_new_merchant_profit BIGINT;
    v_merchant_user_id UUID;
    v_total_product_value BIGINT;
    v_total_cost_price BIGINT;
    v_total_profit BIGINT;
BEGIN
    PERFORM set_config('app.internal_bypass', 'true', true);

    SELECT sog.*, m.user_id INTO v_order 
    FROM public.shopping_order_groups sog
    JOIN public.merchants m ON sog.merchant_id = m.id
    WHERE sog.id = p_order_id
      AND sog.delivery_status = 'pending'
      AND sog.settlement_status = 'pending'
      AND sog.is_platform_order = false;
    
    IF NOT FOUND THEN
        PERFORM set_config('app.internal_bypass', 'false', true);
        RETURN jsonb_build_object('success', false, 'message', 'Order not eligible for takeover');
    END IF;

    v_merchant_user_id := v_order.user_id;
    v_total_product_value := v_order.total_amount_paise - COALESCE(v_order.delivery_fee_paise, 0);

    SELECT COALESCE(SUM(p.wholesale_price_paise * i.quantity), 0)
    INTO v_total_cost_price
    FROM public.shopping_order_items i
    JOIN public.shopping_products p ON i.product_id = p.id
    WHERE i.group_id = p_order_id;

    v_total_profit := GREATEST(0, v_total_product_value - v_total_cost_price);
    v_new_platform_cut := ROUND(v_total_profit * 70 / 100);
    v_new_merchant_profit := v_total_product_value - v_new_platform_cut;
    
    UPDATE public.shopping_order_groups
    SET commission_rate = 0.30,
        platform_cut_paise = v_new_platform_cut,
        merchant_profit_paise = v_new_merchant_profit,
        assigned_to = p_admin_id,
        admin_takeover_at = NOW(),
        settlement_status = 'admin_takeover'
    WHERE id = v_order.id;

    UPDATE public.shopping_order_items soi
    SET commission_amount_paise = GREATEST(0, (soi.unit_price_paise - COALESCE(p.wholesale_price_paise, 0))) * soi.quantity * 70 / 100,
        profit_paise = (soi.unit_price_paise * soi.quantity)
                       - GREATEST(0, (soi.unit_price_paise - COALESCE(p.wholesale_price_paise, 0))) * soi.quantity * 70 / 100
                       - (COALESCE(p.wholesale_price_paise, 0) * soi.quantity)
    FROM public.shopping_products p
    WHERE soi.product_id = p.id
      AND soi.group_id = v_order.id;

    UPDATE public.merchants
    SET wallet_balance_paise = COALESCE(wallet_balance_paise, 0) + v_new_merchant_profit,
        total_commission_paid_paise = COALESCE(total_commission_paid_paise, 0) + v_new_platform_cut
    WHERE id = v_order.merchant_id;

    UPDATE public.merchants
    SET fulfillment_failure_count = fulfillment_failure_count + 1
    WHERE id = v_order.merchant_id;

    INSERT INTO public.merchant_transactions (
       merchant_id, transaction_type, amount_paise, commission_paise, balance_after_paise, description
    ) VALUES (
       v_order.merchant_id, 'sale', v_new_merchant_profit, v_new_platform_cut,
       (SELECT wallet_balance_paise FROM public.merchants WHERE id = v_order.merchant_id),
       'Order manually taken over by admin. Commission reduced to 30%.'
    );

    INSERT INTO public.notifications (user_id, title, body, type, reference_id, reference_type)
    VALUES (
        v_merchant_user_id, 
        'Order Reassigned ⚠️', 
        'Order #' || substring(v_order.id::text from 1 for 8) || ' was taken over by admin. Your commission reduced to 30%.', 
        'warning', 
        v_order.id, 
        'shopping_order'
    );

    PERFORM set_config('app.internal_bypass', 'false', true);
    RETURN jsonb_build_object('success', true);

EXCEPTION WHEN OTHERS THEN
    PERFORM set_config('app.internal_bypass', 'false', true);
    RAISE;
END;
$$;
