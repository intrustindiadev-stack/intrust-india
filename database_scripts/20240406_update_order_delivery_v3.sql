-- Migration: Update Order Delivery System V3
-- Description: Adds delivery-related columns and creates a consolidated RPC function for status/delivery updates.

-- 1. Add/Modify Columns in shopping_order_groups
DO $$
BEGIN
    -- Rename estimated_delivery_date to estimated_delivery_at if it exists AND the new name DOES NOT exist
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'shopping_order_groups' 
        AND column_name = 'estimated_delivery_date'
    ) AND NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'shopping_order_groups' 
        AND column_name = 'estimated_delivery_at'
    ) THEN
        ALTER TABLE public.shopping_order_groups RENAME COLUMN estimated_delivery_date TO estimated_delivery_at;
    END IF;

    -- Ensure estimated_delivery_at is TIMESTAMPTZ
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'shopping_order_groups' 
        AND column_name = 'estimated_delivery_at'
    ) THEN
        ALTER TABLE public.shopping_order_groups ALTER COLUMN estimated_delivery_at TYPE TIMESTAMPTZ;
    ELSE
        -- Add it if it doesn't exist
        ALTER TABLE public.shopping_order_groups ADD COLUMN estimated_delivery_at TIMESTAMPTZ;
    END IF;

    -- Add status_notes column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'shopping_order_groups' 
        AND column_name = 'status_notes'
    ) THEN
        ALTER TABLE public.shopping_order_groups ADD COLUMN status_notes TEXT;
    END IF;

    -- Ensure updated_at exists
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'shopping_order_groups' 
        AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE public.shopping_order_groups ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
    END IF;
END $$;

-- 2. Create/Update update_order_delivery_v3 RPC
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
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

    -- Basic Authorization Checks
    IF p_is_admin THEN
        -- Admin checks (e.g., must be in app_admins)
        IF NOT EXISTS (SELECT 1 FROM public.app_admins WHERE user_id = v_user_id) THEN
            RETURN json_build_object('success', false, 'message', 'Unauthorized: Admin access required');
        END IF;
    ELSIF p_is_merchant THEN
        -- Merchant checks (must own the order)
        IF v_order.merchant_id IS NOT NULL AND v_order.merchant_id != v_user_id THEN
            -- Check if user is the merchant
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

    -- Update Order
    UPDATE public.shopping_order_groups
    SET delivery_status = p_new_status,
        tracking_number = p_tracking_number,
        estimated_delivery_at = p_estimated_at,
        status_notes = p_status_notes,
        updated_at = NOW()
    WHERE id = p_order_id;

    RETURN json_build_object('success', true, 'message', 'Order delivery info updated successfully');
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'message', SQLERRM);
END;
$$;

-- 3. Create/Update admin_get_order_detail RPC
DROP FUNCTION IF EXISTS public.admin_get_order_detail(uuid);

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
