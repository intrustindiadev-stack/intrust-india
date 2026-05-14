-- FIX MERCHANT AUTH CHECK & ADD CUSTOMER NOTIFICATIONS
-- Created: 2026-04-23

CREATE OR REPLACE FUNCTION public.update_order_delivery_v3(
    p_order_id uuid,
    p_new_status text,
    p_tracking_number text,
    p_estimated_at timestamptz,
    p_status_notes text,
    p_is_admin boolean DEFAULT false,
    p_is_merchant boolean DEFAULT false,
    p_is_customer boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_order RECORD;
    v_user_id uuid;
BEGIN
    -- Set internal bypass flag to allow column updates restricted by triggers
    PERFORM set_config('app.internal_bypass', 'true', true);

    -- Get caller ID from auth
    v_user_id := auth.uid();

    -- Verify the order exists
    SELECT * INTO v_order
    FROM public.shopping_order_groups
    WHERE id = p_order_id;
    
    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'message', 'Order not found');
    END IF;

    -- Basic Authorization Checks
    IF p_is_admin THEN
        -- Admin checks: Use the is_admin() helper
        IF NOT public.is_admin() THEN
            RETURN json_build_object('success', false, 'message', 'Unauthorized: Admin access required');
        END IF;
    ELSIF p_is_merchant THEN
        -- Step 2: Fix the merchant ownership check
        IF v_order.merchant_id IS NOT NULL AND NOT EXISTS (
            SELECT 1 FROM public.merchants
            WHERE id = v_order.merchant_id AND user_id = v_user_id
        ) THEN
            -- Check if user is an admin acting as merchant
            IF NOT public.is_admin() THEN
                RETURN json_build_object('success', false, 'message', 'Unauthorized: Access denied');
            END IF;
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
        updated_at = NOW(),
        status_updated_by = v_user_id
    WHERE id = p_order_id;

    -- Step 3: Add customer notification after the status UPDATE
    IF p_new_status IN ('packed', 'shipped', 'delivered') THEN
        INSERT INTO public.notifications (user_id, title, body, type, reference_id, reference_type)
        VALUES (
            v_order.customer_id,
            CASE p_new_status
                WHEN 'packed'    THEN 'Order Packed 📦'
                WHEN 'shipped'   THEN 'Order Shipped 🚚'
                WHEN 'delivered' THEN 'Order Delivered ✅'
            END,
            CASE p_new_status
                WHEN 'packed'    THEN 'Your order is packed and ready for dispatch.'
                WHEN 'shipped'   THEN 'Your order is on its way!' ||
                                      CASE WHEN p_tracking_number IS NOT NULL
                                           THEN ' Tracking: ' || p_tracking_number
                                           ELSE '' END
                WHEN 'delivered' THEN 'Your order has been delivered. Enjoy!'
            END,
            'info',
            p_order_id,
            'shopping_order'
        );
    END IF;

    -- SETTLEMENT LOGIC (Settle on fulfillment)
    IF p_new_status IN ('packed', 'shipped', 'delivered') 
       AND v_order.settlement_status = 'pending' 
       AND (p_is_merchant = true OR p_is_admin = true) THEN
       
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
           'Order #' || substring(p_order_id::text from 1 for 8) || ' profit settled (Fulfillment)'
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

    -- Reset bypass flag
    PERFORM set_config('app.internal_bypass', 'false', true);

    RETURN json_build_object('success', true, 'message', 'Order status updated successfully');
EXCEPTION WHEN OTHERS THEN
    -- Ensure flag is reset on error
    PERFORM set_config('app.internal_bypass', 'false', true);
    RETURN json_build_object('success', false, 'message', SQLERRM);
END;
$$;
