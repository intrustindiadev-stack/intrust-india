-- Update admin_update_order_status RPC to support tracking information

CREATE OR REPLACE FUNCTION public.admin_update_order_status(
    p_order_id uuid,
    p_delivery_status text,
    p_tracking_number text DEFAULT NULL,
    p_estimated_delivery_date date DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_order RECORD;
    v_merchant_id uuid;
    v_is_platform boolean;
BEGIN
    -- Verify the order exists
    SELECT * INTO v_order
    FROM public.shopping_order_groups
    WHERE id = p_order_id;
    
    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'message', 'Order not found');
    END IF;

    -- If transitioning to 'shipped', update tracking info alongside status
    IF p_delivery_status = 'shipped' THEN
        UPDATE public.shopping_order_groups
        SET delivery_status = p_delivery_status,
            tracking_number = COALESCE(p_tracking_number, tracking_number),
            estimated_delivery_date = COALESCE(p_estimated_delivery_date, estimated_delivery_date),
            updated_at = NOW()
        WHERE id = p_order_id;
    ELSE
        -- Otherwise, just update status
        UPDATE public.shopping_order_groups
        SET delivery_status = p_delivery_status,
            updated_at = NOW()
        WHERE id = p_order_id;
    END IF;

    RETURN json_build_object('success', true, 'message', 'Order status updated');
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'message', SQLERRM);
END;
$$;
