-- Migration: Fashion Commerce Integration (Schema & RPC)
-- Phase 1 of Fashion storefront integration into Intrust Commerce

BEGIN;

-- 1. Extend Core Commerce Tables
ALTER TABLE public.shopping_cart 
ADD COLUMN IF NOT EXISTS variant_id UUID REFERENCES public.fashion_variants(id) ON DELETE CASCADE;

ALTER TABLE public.user_wishlists 
ADD COLUMN IF NOT EXISTS variant_id UUID REFERENCES public.fashion_variants(id) ON DELETE CASCADE;

ALTER TABLE public.shopping_order_items 
ADD COLUMN IF NOT EXISTS variant_id UUID REFERENCES public.fashion_variants(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS variant_snapshot JSONB;

-- 2. Overloaded Add to Cart RPC (6-argument with variant_id)
CREATE OR REPLACE FUNCTION public.add_to_shopping_cart(
    p_customer_id  UUID,
    p_inventory_id UUID,
    p_product_id   UUID,
    p_variant_id   UUID,
    p_quantity     INTEGER,
    p_is_platform  BOOLEAN
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_caller_uid           UUID;
    v_customer_id          UUID;
    v_product_id           UUID := p_product_id;
    v_existing_id          UUID;
    v_cart_count           INTEGER;
    v_existing_is_platform BOOLEAN;
    v_existing_merchant_id UUID;
    v_new_merchant_id      UUID;
    v_variant_active       BOOLEAN;
    v_variant_stock        INTEGER;
    v_existing_qty         INTEGER := 0;
BEGIN
    -- AUTHORIZATION
    v_caller_uid := auth.uid();

    IF v_caller_uid IS NULL THEN
        IF p_customer_id IS NULL THEN
            RAISE EXCEPTION 'Not authenticated and no customer ID provided.';
        END IF;
        v_customer_id := p_customer_id;
    ELSE
        v_customer_id := v_caller_uid;
    END IF;

    -- Validate Variant if provided
    IF p_variant_id IS NOT NULL THEN
        SELECT is_active, inventory_quantity INTO v_variant_active, v_variant_stock
        FROM public.fashion_variants
        WHERE id = p_variant_id AND product_id = v_product_id;
        
        IF NOT FOUND THEN
            RETURN jsonb_build_object('success', false, 'message', 'Variant not found or does not belong to this product');
        END IF;
        
        IF NOT v_variant_active THEN
            RETURN jsonb_build_object('success', false, 'message', 'This variant is no longer active');
        END IF;
    END IF;

    -- 1. Get the merchant ID of the item being added
    IF NOT p_is_platform THEN
        IF p_inventory_id IS NULL THEN
            RETURN jsonb_build_object('success', false, 'message', 'Inventory ID required for merchant items');
        END IF;
        SELECT merchant_id, product_id INTO v_new_merchant_id, v_product_id
        FROM public.merchant_inventory
        WHERE id = p_inventory_id;
        IF v_product_id IS NULL THEN
            RETURN jsonb_build_object('success', false, 'message', 'Inventory item not found');
        END IF;
    ELSE
        IF v_product_id IS NULL THEN
            RETURN jsonb_build_object('success', false, 'message', 'Product ID required for platform items');
        END IF;
    END IF;

    -- 2. Check for mixed merchant conflict
    SELECT COUNT(*), COALESCE(MAX(is_platform_item::int)::boolean, false)
    INTO v_cart_count, v_existing_is_platform
    FROM public.shopping_cart
    WHERE customer_id = v_customer_id;

    IF v_cart_count > 0 THEN
        IF p_is_platform <> v_existing_is_platform THEN
            RETURN jsonb_build_object('success', false, 'message', 'MIXED_SELLER_ERROR', 'seller_type_conflict', true);
        END IF;

        IF NOT p_is_platform THEN
            SELECT DISTINCT mi.merchant_id INTO v_existing_merchant_id
            FROM public.shopping_cart sc
            JOIN public.merchant_inventory mi ON sc.inventory_id = mi.id
            WHERE sc.customer_id = v_customer_id
            LIMIT 1;

            IF v_existing_merchant_id IS NOT NULL AND v_existing_merchant_id <> v_new_merchant_id THEN
                RETURN jsonb_build_object('success', false, 'message', 'MIXED_SELLER_ERROR', 'merchant_conflict', true);
            END IF;
        END IF;
    END IF;

    -- 3. Check if item already exists in cart for this customer
    SELECT id, quantity INTO v_existing_id, v_existing_qty
    FROM public.shopping_cart
    WHERE customer_id = v_customer_id
      AND (inventory_id IS NOT DISTINCT FROM p_inventory_id)
      AND product_id = v_product_id
      AND (variant_id IS NOT DISTINCT FROM p_variant_id)
      AND is_platform_item = p_is_platform;

    -- Final inventory validation for Fashion items
    IF p_variant_id IS NOT NULL THEN
        IF (v_existing_qty + p_quantity) > v_variant_stock THEN
            RETURN jsonb_build_object('success', false, 'message', 'Not enough stock available for this variant');
        END IF;
    END IF;

    IF v_existing_id IS NOT NULL THEN
        UPDATE public.shopping_cart
        SET quantity = quantity + p_quantity,
            updated_at = now()
        WHERE id = v_existing_id;
    ELSE
        INSERT INTO public.shopping_cart (customer_id, inventory_id, product_id, variant_id, quantity, is_platform_item)
        VALUES (v_customer_id, p_inventory_id, v_product_id, p_variant_id, p_quantity, p_is_platform);
    END IF;

    RETURN jsonb_build_object('success', true);
END;
$$;

-- Secure the new 6-arg function exactly like the 5-arg version
REVOKE EXECUTE ON FUNCTION public.add_to_shopping_cart(uuid, uuid, uuid, uuid, integer, boolean) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.add_to_shopping_cart(uuid, uuid, uuid, uuid, integer, boolean) FROM anon;
GRANT  EXECUTE ON FUNCTION public.add_to_shopping_cart(uuid, uuid, uuid, uuid, integer, boolean) TO authenticated;
GRANT  EXECUTE ON FUNCTION public.add_to_shopping_cart(uuid, uuid, uuid, uuid, integer, boolean) TO service_role;

COMMIT;
