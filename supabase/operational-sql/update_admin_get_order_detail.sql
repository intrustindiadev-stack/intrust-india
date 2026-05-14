-- Step 8 — Update admin_get_order_detail RPC

CREATE OR REPLACE FUNCTION public.admin_get_order_detail(
    p_order_id uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_order json;
    v_admin_role text;
BEGIN
    SELECT role INTO v_admin_role FROM public.user_profiles WHERE id = auth.uid();
    
    IF v_admin_role NOT IN ('admin', 'super_admin') THEN
        RETURN json_build_object('success', false, 'message', 'Unauthorized');
    END IF;

    SELECT jsonb_build_object(
        'id', og.id,
        'customer_id', og.customer_id,
        'merchant_id', og.merchant_id,
        'delivery_status', og.delivery_status,
        'tracking_number', og.tracking_number,
        'estimated_delivery_at', og.estimated_delivery_at,
        'status_notes', og.status_notes,
        'total_amount_paise', og.total_amount_paise,
        'delivery_fee_paise', og.delivery_fee_paise,
        'delivery_address', og.delivery_address,
        'contact_phone', og.customer_phone,
        'is_platform_order', og.is_platform_order,
        'created_at', og.created_at,
        'updated_at', og.updated_at,
        'customer_name', p.full_name,
        'customer_phone', p.phone,
        'merchant_name', m.business_name,
        'merchant_phone', m.business_phone,
        'commission_rate', og.commission_rate,
        'platform_cut_paise', og.platform_cut_paise,
        'merchant_profit_paise', og.merchant_profit_paise,
        'settlement_status', og.settlement_status,
        'assigned_to', og.assigned_to,
        'admin_takeover_at', og.admin_takeover_at,
        'items', (
            SELECT json_agg(
                jsonb_build_object(
                    'id', oi.id,
                    'product_id', oi.product_id,
                    'product_title', pr.title,
                    'quantity', oi.quantity,
                    'unit_price_paise', oi.unit_price_paise,
                    'total_price_paise', (oi.unit_price_paise * oi.quantity),
                    'profit_paise', oi.profit_paise,
                    'product_image', pr.product_images[1],
                    'hsn_code', pr.hsn_code,
                    'gst_percentage', pr.gst_percentage,
                    'cost_price_paise', oi.cost_price_paise
                )
            )
            FROM public.shopping_order_items oi
            LEFT JOIN public.shopping_products pr ON oi.product_id = pr.id
            WHERE oi.group_id = og.id
        )
    ) INTO v_order
    FROM public.shopping_order_groups og
    LEFT JOIN public.user_profiles p ON og.customer_id = p.id
    LEFT JOIN public.merchants m ON og.merchant_id = m.id
    WHERE og.id = p_order_id;

    IF v_order IS NULL THEN
        RETURN json_build_object('success', false, 'message', 'Order not found');
    END IF;

    RETURN json_build_object('success', true, 'order', v_order);
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'message', SQLERRM);
END;
$$;
