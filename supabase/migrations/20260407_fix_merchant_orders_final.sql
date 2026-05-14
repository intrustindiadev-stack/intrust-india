-- Final fix for merchant order visibility and missing columns
-- Created: 2026-04-07

-- 1. Add missing columns to shopping_order_items
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'shopping_order_items' AND column_name = 'commission_amount_paise') THEN
        ALTER TABLE public.shopping_order_items ADD COLUMN commission_amount_paise BIGINT DEFAULT 0;
    END IF;
END $$;

-- 2. Add missing columns to shopping_products
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'shopping_products' AND column_name = 'cost_price_paise') THEN
        ALTER TABLE public.shopping_products ADD COLUMN cost_price_paise BIGINT DEFAULT 0;
    END IF;
END $$;

-- 3. Update the RPC for merchant orders
CREATE OR REPLACE FUNCTION public.merchant_get_my_orders(
    p_merchant_id uuid,
    p_status text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'auth'
AS $$
DECLARE
    v_merchant_user uuid;
    v_result jsonb;
BEGIN
    -- 1. Verify merchant ownership or admin access. 
    -- Allow bypass if called from service_role (e.g. server-side admin client).
    SELECT user_id INTO v_merchant_user FROM merchants WHERE id = p_merchant_id;
    
    IF auth.role() <> 'service_role' 
       AND v_merchant_user IS DISTINCT FROM auth.uid() 
       AND NOT EXISTS (SELECT 1 FROM app_admins WHERE user_id = auth.uid()) THEN
        RETURN jsonb_build_object('success', false, 'error', 'Unauthorized');
    END IF;

    -- 2. Fetch orders where this merchant has items
    -- We use EXISTS on items instead of a simple merchant_id filter on the group
    -- to handle platform-wide orders correctly.
    SELECT jsonb_build_object(
        'success', true,
        'orders', COALESCE(jsonb_agg(order_data), '[]'::jsonb)
    ) INTO v_result
    FROM (
        SELECT 
            jsonb_build_object(
                'id', og.id,
                'customer_id', og.customer_id,
                'customer_name', COALESCE(og.customer_name, up.full_name, 'Guest User'),
                'customer_phone', COALESCE(og.customer_phone, up.phone, ''),
                'total_amount_paise', og.total_amount_paise,
                'delivery_fee_paise', og.delivery_fee_paise,
                'delivery_status', og.delivery_status,
                'status', og.status,
                'payment_method', og.payment_method,
                'delivery_address', og.delivery_address,
                'created_at', og.created_at,
                'is_platform_order', og.is_platform_order,
                'items', (
                    SELECT jsonb_agg(
                        jsonb_build_object(
                            'id', oi.id,
                            'product_title', p.title,
                            'quantity', oi.quantity,
                            'unit_price_paise', oi.unit_price_paise,
                            'gross_profit_paise', COALESCE(oi.profit_paise, 0) + COALESCE(oi.commission_amount_paise, 0),
                            'commission_amount_paise', COALESCE(oi.commission_amount_paise, 0),
                            'net_profit_paise', COALESCE(oi.profit_paise, 0),
                            'image_url', p.product_images[1],
                            'gst_percentage', p.gst_percentage,
                            'hsn_code', p.hsn_code
                        )
                    )
                    FROM shopping_order_items oi
                    JOIN shopping_products p ON oi.product_id = p.id
                    WHERE oi.group_id = og.id 
                    AND oi.seller_id = p_merchant_id
                )
            ) as order_data
        FROM shopping_order_groups og
        LEFT JOIN user_profiles up ON og.customer_id = up.id
        WHERE (p_status IS NULL OR og.delivery_status = p_status)
        AND og.status = 'completed'
        AND EXISTS (
            SELECT 1 FROM shopping_order_items oi
            WHERE oi.group_id = og.id AND oi.seller_id = p_merchant_id
        )
        ORDER BY og.created_at DESC
    ) sub;

    RETURN v_result;
END;
$$;

-- 4. Ensure permissions are correct
GRANT EXECUTE ON FUNCTION public.merchant_get_my_orders(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.merchant_get_my_orders(uuid, text) TO anon;
GRANT EXECUTE ON FUNCTION public.merchant_get_my_orders(uuid, text) TO service_role;
