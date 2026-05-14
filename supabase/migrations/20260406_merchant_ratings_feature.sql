-- Migration: Add Merchant Ratings Feature and update shopping_order_groups

-- 1. Add delivered_at column to shopping_order_groups if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'shopping_order_groups' 
        AND column_name = 'delivered_at'
    ) THEN
        ALTER TABLE public.shopping_order_groups ADD COLUMN delivered_at TIMESTAMPTZ;
    END IF;
END $$;

-- 2. Create merchant_ratings table
CREATE TABLE IF NOT EXISTS public.merchant_ratings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    merchant_id UUID NOT NULL REFERENCES public.merchants(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    rating_value INTEGER NOT NULL CHECK (rating_value >= 1 AND rating_value <= 5),
    feedback_text TEXT,
    shopping_order_group_id UUID NOT NULL REFERENCES public.shopping_order_groups(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Unique constraint on (customer_id, shopping_order_group_id)
    CONSTRAINT unique_order_rating UNIQUE (customer_id, shopping_order_group_id)
);

-- 3. Create merchant_rating_stats view
CREATE OR REPLACE VIEW public.merchant_rating_stats AS
SELECT 
    merchant_id,
    ROUND(AVG(rating_value), 1) as avg_rating,
    COUNT(*) as total_ratings
FROM public.merchant_ratings
GROUP BY merchant_id;

-- 4. Set up RLS Policies
ALTER TABLE public.merchant_ratings ENABLE ROW LEVEL SECURITY;

-- Customers can insert their own ratings
DROP POLICY IF EXISTS "Customers can insert own ratings" ON public.merchant_ratings;
CREATE POLICY "Customers can insert own ratings" ON public.merchant_ratings
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = customer_id);

-- Anyone can read ratings (customers, merchants, admin)
DROP POLICY IF EXISTS "Anyone can read ratings" ON public.merchant_ratings;
CREATE POLICY "Anyone can read ratings" ON public.merchant_ratings
    FOR SELECT
    TO authenticated
    USING (true);

-- 5. Update update_order_delivery_v3 RPC to populate delivered_at
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
        updated_at = NOW(),
        delivered_at = CASE 
            WHEN p_new_status = 'delivered' AND delivery_status != 'delivered' THEN NOW()
            WHEN p_new_status = 'delivered' AND delivery_status = 'delivered' THEN delivered_at
            ELSE NULL 
        END
    WHERE id = p_order_id;

    RETURN json_build_object('success', true, 'message', 'Order delivery info updated successfully');
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'message', SQLERRM);
END;
$$;

-- 6. Grant Table Permissions
GRANT ALL ON merchant_ratings TO anon, authenticated, service_role;
-- (No sequence needed as ID is UUID, but keeping table grants for PostgREST access)
