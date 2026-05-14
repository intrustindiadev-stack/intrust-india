-- Step 11 — Create admin_get_takeover_orders RPC

CREATE OR REPLACE FUNCTION public.admin_get_takeover_orders(p_status TEXT DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_admin_role TEXT;
    v_result JSONB;
BEGIN
    SELECT role INTO v_admin_role FROM public.user_profiles WHERE id = auth.uid();
    
    IF v_admin_role NOT IN ('admin', 'super_admin') THEN
        RETURN jsonb_build_object('success', false, 'message', 'Unauthorized');
    END IF;

    SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
            'id', og.id,
            'merchant_id', og.merchant_id,
            'merchant_name', m.business_name,
            'customer_name', p.full_name,
            'customer_phone', og.customer_phone,
            'total_amount_paise', og.total_amount_paise,
            'platform_cut_paise', og.platform_cut_paise,
            'merchant_profit_paise', og.merchant_profit_paise,
            'delivery_status', og.delivery_status,
            'created_at', og.created_at,
            'admin_takeover_at', og.admin_takeover_at,
            'items', (
                SELECT COALESCE(jsonb_agg(jsonb_build_object(
                    'product_title', pr.title,
                    'quantity', oi.quantity,
                    'unit_price_paise', oi.unit_price_paise
                )), '[]'::jsonb)
                FROM public.shopping_order_items oi
                LEFT JOIN public.shopping_products pr ON oi.product_id = pr.id
                WHERE oi.group_id = og.id
            )
        ) ORDER BY og.admin_takeover_at DESC
    ), '[]'::jsonb) INTO v_result
    FROM public.shopping_order_groups og
    LEFT JOIN public.merchants m ON og.merchant_id = m.id
    LEFT JOIN public.user_profiles p ON og.customer_id = p.id
    WHERE og.settlement_status = 'admin_takeover'
      AND (p_status IS NULL OR og.delivery_status = p_status);

    RETURN jsonb_build_object('success', true, 'orders', v_result);
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_get_takeover_orders(TEXT) TO authenticated;
