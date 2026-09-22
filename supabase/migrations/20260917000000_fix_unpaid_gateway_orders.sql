-- Migration: 20260917000000_fix_unpaid_gateway_orders.sql
-- Description: Fix unpaid gateway drafts appearing in merchant orders and admin/customer lists.
-- 1. Fix order_groups_merchant_update_guard trigger to allow system/admin migrations when auth.uid() is null.
-- 2. Clean up existing zombie gateway drafts.
-- 3. Update merchant_get_my_orders RPC to strictly exclude failed/cancelled and unpaid gateway drafts.
-- 4. Update draft_cart_orders RPC to cancel previous drafts with delivery_status='cancelled'.
-- 5. Update update_order_delivery_v3 RPC to block fulfillment of unpaid orders.

-- 1. Fix update guard trigger so service_role/admin/migration role is not mistakenly blocked
CREATE OR REPLACE FUNCTION public.order_groups_merchant_update_guard()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
DECLARE
    user_role text;
BEGIN
    -- Allow direct DB admin / migration / service_role updates
    IF auth.uid() IS NULL OR current_user IN ('postgres', 'supabase_admin') OR current_setting('role', true) = 'service_role' THEN
        RETURN NEW;
    END IF;

    -- 1. Get the role of the authenticated user
    SELECT role INTO user_role 
    FROM public.user_profiles 
    WHERE id = auth.uid();

    -- 2. If admin or super_admin, allow all updates
    IF user_role IN ('admin', 'super_admin') THEN
        RETURN NEW;
    END IF;

    -- 3. If merchant, restrict to allowed columns only
    IF NEW.merchant_profit_paise IS DISTINCT FROM OLD.merchant_profit_paise OR
       NEW.platform_cut_paise IS DISTINCT FROM OLD.platform_cut_paise OR
       NEW.commission_rate IS DISTINCT FROM OLD.commission_rate OR
       NEW.settlement_status IS DISTINCT FROM OLD.settlement_status OR
       NEW.total_amount_paise IS DISTINCT FROM OLD.total_amount_paise OR
       NEW.customer_id IS DISTINCT FROM OLD.customer_id OR
       NEW.merchant_id IS DISTINCT FROM OLD.merchant_id OR
       NEW.payment_method IS DISTINCT FROM OLD.payment_method OR
       NEW.payment_status IS DISTINCT FROM OLD.payment_status OR
       NEW.assigned_to IS DISTINCT FROM OLD.assigned_to OR
       NEW.admin_takeover_at IS DISTINCT FROM OLD.admin_takeover_at OR
       NEW.delivery_fee_paise IS DISTINCT FROM OLD.delivery_fee_paise OR
       NEW.is_platform_order IS DISTINCT FROM OLD.is_platform_order OR
       NEW.client_txn_id IS DISTINCT FROM OLD.client_txn_id
    THEN
        RAISE EXCEPTION 'Restricted column update detected. Merchants can only update delivery status, tracking number, and notes.';
    END IF;

    RETURN NEW;
END;
$function$;

-- 2. One-time cleanup of historical unpaid gateway draft orders
UPDATE public.shopping_order_groups
SET status = 'cancelled',
    delivery_status = 'cancelled',
    payment_status = 'failed'
WHERE payment_method = 'gateway'
  AND payment_status != 'paid'
  AND (delivery_status = 'pending' OR status = 'pending');

-- 3. Update merchant_get_my_orders RPC
CREATE OR REPLACE FUNCTION public.merchant_get_my_orders(p_merchant_id uuid, p_status text DEFAULT NULL::text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_merchant_user UUID;
    v_result JSONB;
BEGIN
    -- Verify this user owns the merchant account (Allow service_role bypass for Server Components)
    SELECT user_id INTO v_merchant_user FROM public.merchants WHERE id = p_merchant_id;
    IF v_merchant_user IS DISTINCT FROM auth.uid() AND current_setting('role', true) != 'service_role' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Unauthorized');
    END IF;

    SELECT jsonb_build_object(
        'success', true,
        'orders', COALESCE(jsonb_agg(
            jsonb_build_object(
                'id', og.id,
                'customer_name', og.customer_name,
                'customer_phone', og.customer_phone,
                'delivery_address', og.delivery_address,
                'total_amount_paise', og.total_amount_paise,
                'delivery_fee_paise', og.delivery_fee_paise,
                'delivery_status', og.delivery_status,
                'is_platform_order', og.is_platform_order,
                'tracking_number', og.tracking_number,
                'estimated_delivery_at', og.estimated_delivery_at,
                'status_notes', og.status_notes,
                'created_at', og.created_at,
                'packed_at', og.packed_at,
                'commission_rate', og.commission_rate,
                'platform_cut_paise', og.platform_cut_paise,
                'merchant_profit_paise', og.merchant_profit_paise,
                'settlement_status', og.settlement_status,
                'payment_method', og.payment_method,
                'assigned_to', og.assigned_to,
                'admin_takeover_at', og.admin_takeover_at,
                'items', (
                    SELECT COALESCE(jsonb_agg(jsonb_build_object(
                        'id', oi.id,
                        'product_title', sp.title,
                        'product_image', COALESCE(mi.custom_image_url, sp.product_images[1]),
                        'hsn_code', sp.hsn_code,
                        'gst_percentage', sp.gst_percentage,
                        'quantity', oi.quantity,
                        'unit_price_paise', oi.unit_price_paise,
                        'cost_price_paise', oi.cost_price_paise,
                        'total_price_paise', oi.unit_price_paise * oi.quantity,
                        'gross_profit_paise', COALESCE(oi.profit_paise, 0) + COALESCE(oi.commission_amount_paise, 0),
                        'commission_amount_paise', COALESCE(oi.commission_amount_paise, 0),
                        'net_profit_paise', COALESCE(oi.profit_paise, 0)
                    )), '[]'::jsonb)
                    FROM shopping_order_items oi
                    JOIN shopping_products sp ON sp.id = oi.product_id
                    LEFT JOIN merchant_inventory mi ON mi.id = oi.inventory_id
                    WHERE oi.group_id = og.id AND oi.seller_id = p_merchant_id
                )
            ) ORDER BY og.created_at DESC
        ), '[]'::jsonb)
    ) INTO v_result
    FROM shopping_order_groups og
    WHERE (og.merchant_id = p_merchant_id OR EXISTS (
        SELECT 1 FROM shopping_order_items oi
        WHERE oi.group_id = og.id AND oi.seller_id = p_merchant_id
    ))
      -- Drop failed / cancelled groups
      AND og.status NOT IN ('failed', 'cancelled')
      -- Drop cancelled / failed delivery
      AND og.delivery_status NOT IN ('failed', 'cancelled')
      -- Drop abandoned Sabpaisa gateway drafts (payment never confirmed)
      AND NOT (og.payment_method = 'gateway' AND og.payment_status != 'paid')
      -- Drop store-credit orders awaiting merchant approval (handled via StoreCreditRequestsTab)
      AND COALESCE(og.delivery_status, '') <> 'pending_credit'
      -- Preserve original optional delivery_status filter
      AND (p_status IS NULL OR og.delivery_status = p_status);

    RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.merchant_get_my_orders(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.merchant_get_my_orders(uuid, text) TO service_role;

-- 4. Update draft_cart_orders to cancel previous drafts with delivery_status='cancelled'
CREATE OR REPLACE FUNCTION public.draft_cart_orders(p_customer_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_total_paise BIGINT := 0;
    v_cart_items RECORD;
    v_group_id UUID;
    v_merchant_id UUID;
    v_is_platform BOOLEAN;
    v_delivery_address TEXT;
    v_customer_name TEXT;
    v_customer_phone TEXT;
    v_delivery_fee_paise BIGINT := 9900;
    v_item RECORD;
BEGIN
    -- 1. Get Customer Details and Delivery Address from profile
    SELECT full_name, phone, address INTO v_customer_name, v_customer_phone, v_delivery_address
    FROM public.user_profiles
    WHERE id = p_customer_id;
    
    -- Fallback for address from KYC if profile is incomplete
    IF v_delivery_address IS NULL OR v_delivery_address = '' THEN
        SELECT full_address INTO v_delivery_address
        FROM public.kyc_records
        WHERE user_id = p_customer_id;
    END IF;

    -- 2. Identify Merchant/Platform and Validate Stock
    SELECT is_platform_item INTO v_is_platform
    FROM public.shopping_cart
    WHERE customer_id = p_customer_id
    LIMIT 1;

    IF v_is_platform IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Cart is empty');
    END IF;

    IF NOT v_is_platform THEN
        SELECT mi.merchant_id INTO v_merchant_id
        FROM public.shopping_cart sc
        JOIN public.merchant_inventory mi ON sc.inventory_id = mi.id
        WHERE sc.customer_id = p_customer_id
        LIMIT 1;
    END IF;

    FOR v_cart_items IN 
        SELECT 
            c.*, 
            COALESCE(mi.retail_price_paise, p.suggested_retail_price_paise) as effective_price,
            mi.stock_quantity as merchant_stock,
            p.admin_stock as platform_stock,
            p.title as product_title,
            p.gst_percentage
        FROM public.shopping_cart c
        LEFT JOIN public.merchant_inventory mi ON c.inventory_id = mi.id
        JOIN public.shopping_products p ON c.product_id = p.id
        WHERE c.customer_id = p_customer_id
    LOOP
        v_total_paise := v_total_paise + (v_cart_items.effective_price * v_cart_items.quantity);
        
        -- Add GST (aligned with UI: ROUND(price * qty * percentage / 100))
        v_total_paise := v_total_paise + ROUND((v_cart_items.effective_price * v_cart_items.quantity * v_cart_items.gst_percentage / 100.0));
        
        IF v_cart_items.is_platform_item THEN
            IF v_cart_items.platform_stock < v_cart_items.quantity THEN
                RETURN jsonb_build_object('success', false, 'message', 'Insufficient platform stock for ' || v_cart_items.product_title);
            END IF;
        ELSE
            IF v_cart_items.merchant_stock < v_cart_items.quantity THEN
                RETURN jsonb_build_object('success', false, 'message', 'Insufficient merchant stock for ' || v_cart_items.product_title);
            END IF;
        END IF;
    END LOOP;

    v_total_paise := v_total_paise + v_delivery_fee_paise;

    -- 2.5 Cancel previous pending gateway drafts for this user (both status and delivery_status)
    UPDATE public.shopping_order_groups
    SET status = 'cancelled',
        delivery_status = 'cancelled',
        payment_status = 'failed'
    WHERE customer_id = p_customer_id 
      AND status = 'pending' 
      AND payment_method = 'gateway';

    -- 3. CREATE ORDER GROUP
    INSERT INTO public.shopping_order_groups (
        customer_id, 
        customer_name, 
        customer_phone, 
        total_amount_paise, 
        status, 
        delivery_status, 
        merchant_id, 
        is_platform_order, 
        delivery_address, 
        delivery_fee_paise, 
        payment_method
    )
    VALUES (
        p_customer_id, 
        v_customer_name, 
        v_customer_phone, 
        v_total_paise, 
        'pending', 
        'pending', 
        v_merchant_id, 
        v_is_platform, 
        v_delivery_address, 
        v_delivery_fee_paise, 
        'gateway'
    )
    RETURNING id INTO v_group_id;

    -- 4. PROCESS ITEMS (Draft state - record intent)
    FOR v_item IN 
        SELECT 
            c.*, 
            COALESCE(mi.retail_price_paise, p.suggested_retail_price_paise) as effective_price,
            mi.merchant_id,
            p.wholesale_price_paise as platform_cost
        FROM public.shopping_cart c
        LEFT JOIN public.merchant_inventory mi ON c.inventory_id = mi.id
        JOIN public.shopping_products p ON c.product_id = p.id
        WHERE c.customer_id = p_customer_id
    LOOP
        IF v_item.is_platform_item AND v_item.merchant_id IS NULL THEN
            INSERT INTO public.shopping_order_items (
                group_id, seller_id, product_id, inventory_id, quantity, unit_price_paise, cost_price_paise, profit_paise
            ) VALUES (
                v_group_id, NULL, v_item.product_id, NULL, v_item.quantity, v_item.effective_price, v_item.platform_cost, 
                (v_item.effective_price - v_item.platform_cost) * v_item.quantity
            );
        ELSE
            -- Merchant item OR platform item sold through merchant inventory
            INSERT INTO public.shopping_order_items (
                group_id, seller_id, product_id, inventory_id, quantity, unit_price_paise, cost_price_paise, profit_paise
            ) VALUES (
                v_group_id, v_item.merchant_id, v_item.product_id, v_item.inventory_id, v_item.quantity, v_item.effective_price, 
                0, -- Updated on finalize
                0
            );
        END IF;
    END LOOP;

    RETURN jsonb_build_object('success', true, 'group_id', v_group_id, 'total_paise', v_total_paise);
END;
$$;

GRANT EXECUTE ON FUNCTION public.draft_cart_orders(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.draft_cart_orders(uuid) TO service_role;

-- 5. Update update_order_delivery_v3 to prevent fulfilling unpaid orders
CREATE OR REPLACE FUNCTION public.update_order_delivery_v3(
    p_order_id uuid,
    p_new_status text,
    p_tracking_number text,
    p_estimated_at timestamp with time zone,
    p_status_notes text,
    p_is_admin boolean DEFAULT false,
    p_is_merchant boolean DEFAULT false,
    p_is_customer boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_order RECORD;
    v_user_id uuid;
BEGIN
    -- Get caller ID from auth
    v_user_id := auth.uid();

    -- Verify the order exists
    SELECT * INTO v_order
    FROM public.shopping_order_groups
    WHERE id = p_order_id;
    
    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'message', 'Order not found');
    END IF;

    -- Guard: Cannot fulfill unpaid gateway orders
    IF v_order.payment_method = 'gateway' AND v_order.payment_status != 'paid' THEN
        RETURN json_build_object('success', false, 'message', 'Cannot fulfill an unpaid order');
    END IF;

    -- Basic Authorization Checks
    IF p_is_admin THEN
        IF NOT public.is_admin() THEN
            RETURN json_build_object('success', false, 'message', 'Unauthorized: Admin access required');
        END IF;
    ELSIF p_is_merchant THEN
        -- Merchant checks (must own the order)
        IF v_order.merchant_id IS NOT NULL AND v_order.merchant_id != v_user_id THEN
            RETURN json_build_object('success', false, 'message', 'Unauthorized: Access denied');
        END IF;
    ELSIF p_is_customer THEN
        -- Customer checks (must own the order)
        IF v_order.customer_id != v_user_id THEN
            RETURN json_build_object('success', false, 'message', 'Unauthorized: Access denied');
        END IF;
    ELSE
         RETURN json_build_object('success', false, 'message', 'Unauthorized: Missing role flag');
    END IF;

    -- Update Order Status
    UPDATE public.shopping_order_groups
    SET delivery_status = p_new_status,
        tracking_number = p_tracking_number,
        estimated_delivery_at = p_estimated_at,
        status_notes = p_status_notes,
        updated_at = NOW()
    WHERE id = p_order_id;

    -- SETTLEMENT LOGIC (Settle on Merchant Approval)
    IF v_order.delivery_status = 'pending' AND p_new_status IN ('packed', 'shipped', 'delivered') 
       AND v_order.settlement_status = 'pending' 
       AND p_is_merchant = true THEN
       
       -- Credit the merchant wallet (70% share)
       UPDATE public.merchants 
       SET wallet_balance_paise = COALESCE(wallet_balance_paise, 0) + COALESCE(v_order.merchant_profit_paise, 0),
           total_commission_paid_paise = COALESCE(total_commission_paid_paise, 0) + COALESCE(v_order.platform_cut_paise, 0)
       WHERE id = v_order.merchant_id;

       -- Insert merchant transaction
       INSERT INTO public.merchant_transactions (
           merchant_id, transaction_type, amount_paise, commission_paise, balance_after_paise, description
       ) VALUES (
           v_order.merchant_id, 'sale', COALESCE(v_order.merchant_profit_paise, 0), COALESCE(v_order.platform_cut_paise, 0),
           (SELECT wallet_balance_paise FROM public.merchants WHERE id = v_order.merchant_id),
           'Order #' || substring(p_order_id::text from 1 for 8) || ' profit settled (Fulfillment - 70% share)'
       );

       -- INSERT platform_ledger for shopping commission
       INSERT INTO public.platform_ledger (
           transaction_id,
           entry_type,
           amount_paise,
           balance_after_paise,
           description,
           created_at
       ) VALUES (
           p_order_id,
           'shopping_commission',
           COALESCE(v_order.platform_cut_paise, 0),
           (SELECT COALESCE(SUM(amount_paise), 0)
            FROM public.platform_ledger
            WHERE entry_type = 'shopping_commission') + COALESCE(v_order.platform_cut_paise, 0),
           'Shopping commission: Order #' || substring(p_order_id::text from 1 for 8),
           NOW()
       );

       -- Update settlement_status to settled
       UPDATE public.shopping_order_groups 
       SET settlement_status = 'settled' 
       WHERE id = p_order_id;
    END IF;

    RETURN json_build_object('success', true, 'message', 'Order delivery info updated successfully');
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'message', SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_order_delivery_v3(uuid, text, text, timestamp with time zone, text, boolean, boolean, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_order_delivery_v3(uuid, text, text, timestamp with time zone, text, boolean, boolean, boolean) TO service_role;
