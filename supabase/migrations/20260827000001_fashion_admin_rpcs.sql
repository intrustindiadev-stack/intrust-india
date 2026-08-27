-- 20260827000001_fashion_admin_rpcs.sql

CREATE OR REPLACE FUNCTION public.upsert_fashion_product_data(
    p_product_id UUID,
    p_category_id UUID,
    p_variants JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_variant JSONB;
    v_variant_id UUID;
    v_media JSONB;
    v_media_item JSONB;
BEGIN
    -- Delete existing variants and category links to cleanly replace
    DELETE FROM public.fashion_product_categories WHERE product_id = p_product_id;
    DELETE FROM public.fashion_variants WHERE product_id = p_product_id;

    -- Re-insert category link
    INSERT INTO public.fashion_product_categories (product_id, category_id, is_primary)
    VALUES (p_product_id, p_category_id, true);

    -- Loop through variants and insert
    FOR v_variant IN SELECT * FROM jsonb_array_elements(p_variants)
    LOOP
        INSERT INTO public.fashion_variants (
            product_id, sku, color, size, fit, fabric, 
            price_paise, compare_at_price_paise, inventory_quantity, is_active
        ) VALUES (
            p_product_id,
            v_variant->>'sku',
            v_variant->>'color',
            v_variant->>'size',
            v_variant->>'fit',
            v_variant->>'fabric',
            (v_variant->>'price_paise')::BIGINT,
            NULLIF((v_variant->>'compare_at_price_paise'), '')::BIGINT,
            (v_variant->>'inventory_quantity')::INTEGER,
            COALESCE((v_variant->>'is_active')::BOOLEAN, true)
        )
        RETURNING id INTO v_variant_id;

        -- Insert media for this variant
        v_media := v_variant->'media';
        IF v_media IS NOT NULL AND jsonb_typeof(v_media) = 'array' THEN
            FOR v_media_item IN SELECT * FROM jsonb_array_elements(v_media)
            LOOP
                INSERT INTO public.fashion_variant_media (
                    variant_id, image_url, alt_text, display_order
                ) VALUES (
                    v_variant_id,
                    v_media_item->>'image_url',
                    v_media_item->>'alt_text',
                    COALESCE((v_media_item->>'display_order')::INTEGER, 0)
                );
            END LOOP;
        END IF;
    END LOOP;

    RETURN jsonb_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION public.upsert_fashion_product_data(UUID, UUID, JSONB) TO service_role;

CREATE OR REPLACE FUNCTION public.delete_fashion_product_data(
    p_product_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    DELETE FROM public.fashion_product_categories WHERE product_id = p_product_id;
    DELETE FROM public.fashion_variants WHERE product_id = p_product_id;
    
    RETURN jsonb_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_fashion_product_data(UUID) TO service_role;
