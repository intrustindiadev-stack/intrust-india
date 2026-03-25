-- ================================================
-- MERCHANT SHOPPING RPCS V3
-- Platform Inventory Stock Protection
-- ================================================
-- This script:
-- 1. Adds a BEFORE UPDATE trigger on merchant_inventory to block
--    direct stock_quantity changes from client (authenticated/anon) users.
--    Only SECURITY DEFINER functions (running as postgres/service role)
--    can update stock_quantity through the trigger bypass.
-- 2. Adds an RPC update_merchant_inventory_stock that:
--    - Validates the calling merchant owns the inventory row
--    - Rejects changes for is_platform_product = true rows
--    - Applies the stock update via SECURITY DEFINER (bypassing the trigger)
-- 3. Adds a regression test helper function for CI use.

-- ================================================
-- STEP 1: Protect stock_quantity on merchant_inventory with a trigger
-- ================================================

CREATE OR REPLACE FUNCTION public.check_platform_inventory_stock_update()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    -- Block any stock_quantity increase when caller is 'authenticated' or 'anon'
    -- (i.e., a direct client update, not through a SECURITY DEFINER RPC).
    -- SECURITY DEFINER functions run as 'postgres' or the function owner
    -- so they will pass this check.
    IF NEW.stock_quantity <> OLD.stock_quantity THEN
        -- Only block if called from non-privileged role
        IF current_user IN ('authenticated', 'anon', 'anon_key') THEN
            RAISE EXCEPTION 'Direct stock updates are not permitted. Platform stock is managed via purchase_platform_products_bulk. Custom product stock can be updated via update_merchant_inventory_stock RPC.';
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

-- Attach trigger (drop old one if exists for idempotency)
DROP TRIGGER IF EXISTS trg_protect_inventory_stock ON public.merchant_inventory;
CREATE TRIGGER trg_protect_inventory_stock
    BEFORE UPDATE ON public.merchant_inventory
    FOR EACH ROW
    EXECUTE FUNCTION public.check_platform_inventory_stock_update();

-- ================================================
-- STEP 2: Safe RPC for updating custom product stock
-- ================================================

DROP FUNCTION IF EXISTS public.update_merchant_inventory_stock(UUID, INTEGER);

CREATE OR REPLACE FUNCTION public.update_merchant_inventory_stock(
    p_inventory_id UUID,
    p_new_stock INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
-- Runs as function owner (postgres / service_role), so it bypasses the trigger
SET search_path = public
AS $$
DECLARE
    v_item RECORD;
BEGIN
    -- 1. Validate input
    IF p_new_stock < 0 THEN
        RETURN jsonb_build_object('success', false, 'message', 'Stock quantity cannot be negative');
    END IF;

    -- 2. Fetch inventory row and verify ownership
    SELECT mi.id, mi.is_platform_product, mi.merchant_id
    INTO v_item
    FROM public.merchant_inventory mi
    WHERE mi.id = p_inventory_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Inventory item not found');
    END IF;

    -- 3. Verify the caller is the owning merchant
    IF NOT EXISTS (
        SELECT 1 FROM public.merchants
        WHERE id = v_item.merchant_id AND user_id = auth.uid()
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Unauthorized: You do not own this inventory item');
    END IF;

    -- 4. Block stock edits for platform products
    IF v_item.is_platform_product THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Stock for platform-sourced products cannot be edited manually. Please restock via the Wholesale Market.'
        );
    END IF;

    -- 5. Apply the update (SECURITY DEFINER bypasses the trigger check)
    UPDATE public.merchant_inventory
    SET stock_quantity = p_new_stock
    WHERE id = p_inventory_id;

    RETURN jsonb_build_object('success', true, 'message', 'Stock updated successfully');
END;
$$;

-- Grant to authenticated merchants; revoke from PUBLIC
REVOKE ALL ON FUNCTION public.update_merchant_inventory_stock(UUID, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_merchant_inventory_stock(UUID, INTEGER) TO authenticated, service_role;

-- ================================================
-- STEP 3: Ensure existing wholesale RPC still works
-- (purchase_platform_products_bulk is already SECURITY DEFINER,
-- so its internal UPDATE passes the trigger. No changes needed.)
-- ================================================

-- ================================================
-- VERIFICATION
-- ================================================
DO $$
BEGIN
    -- Check trigger exists
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger
        WHERE tgname = 'trg_protect_inventory_stock'
        AND tgrelid = 'public.merchant_inventory'::regclass
    ) THEN
        RAISE EXCEPTION 'Trigger trg_protect_inventory_stock was not created.';
    END IF;

    -- Check RPC exists
    IF NOT EXISTS (
        SELECT 1 FROM pg_proc
        WHERE proname = 'update_merchant_inventory_stock'
        AND pronamespace = 'public'::regnamespace
    ) THEN
        RAISE EXCEPTION 'RPC update_merchant_inventory_stock was not created.';
    END IF;

    RAISE NOTICE 'V3 migration verification passed.';
END $$;
