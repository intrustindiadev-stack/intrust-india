-- Step 7 — Update merchant_get_my_orders RPC

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
                'commission_rate', og.commission_rate,
                'platform_cut_paise', og.platform_cut_paise,
                'merchant_profit_paise', og.merchant_profit_paise,
                'settlement_status', og.settlement_status,
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
    WHERE og.merchant_id = p_merchant_id
    AND (p_status IS NULL OR og.delivery_status = p_status);

    RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.merchant_get_my_orders TO authenticated;
