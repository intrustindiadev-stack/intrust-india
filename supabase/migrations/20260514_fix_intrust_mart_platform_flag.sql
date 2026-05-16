-- ============================================================
-- 20260514_fix_intrust_mart_platform_flag.sql
-- ============================================================
-- Purpose:
--   Intrust Mart's entire merchant_inventory was seeded manually
--   (2026-05-06) with is_platform_product = false, even though
--   every product belongs to the platform catalog (shopping_products).
--   Since these products were sourced from Intrust's wholesale
--   system, they should be treated as platform-managed so that:
--     a) retail_price_paise auto-syncs when suggested_retail_price_paise
--        changes in shopping_products (via trg_sync_platform_retail_price).
--     b) the storefront UI shows the authoritative platform price.
--
--   This migration:
--     1. Marks all Intrust Mart rows (where product_id exists in
--        shopping_products) as is_platform_product = true.
--     2. Immediately syncs retail_price_paise = suggested_retail_price_paise
--        so live prices are correct right now.
-- ============================================================

BEGIN;

DO $fix$
DECLARE
    v_merchant_id UUID := 'aa1d570b-1f38-4b4c-b1e0-59f009f28959'; -- Intrust Mart
    v_count       INTEGER;
BEGIN
    -- Step 1: Mark as platform products and sync retail price in one UPDATE
    UPDATE public.merchant_inventory mi
       SET is_platform_product = true,
           retail_price_paise  = sp.suggested_retail_price_paise,
           updated_at          = now()
      FROM public.shopping_products sp
     WHERE mi.product_id   = sp.id
       AND mi.merchant_id  = v_merchant_id
       AND (
             mi.is_platform_product = false
          OR mi.retail_price_paise IS DISTINCT FROM sp.suggested_retail_price_paise
           );

    GET DIAGNOSTICS v_count = ROW_COUNT;

    RAISE NOTICE
        'Intrust Mart fix complete: % merchant_inventory rows updated '
        '(is_platform_product = true, retail_price synced to platform SRP).',
        v_count;
END;
$fix$;

COMMIT;

-- ============================================================
-- Verification query (run after deploy to confirm 0 drifted rows)
-- ============================================================
-- SELECT
--     mi.id,
--     sp.title,
--     mi.is_platform_product,
--     mi.retail_price_paise         AS inventory_price,
--     sp.suggested_retail_price_paise AS platform_srp,
--     (sp.suggested_retail_price_paise - mi.retail_price_paise) AS drift
-- FROM public.merchant_inventory mi
-- JOIN public.shopping_products  sp ON sp.id = mi.product_id
-- WHERE mi.merchant_id = 'aa1d570b-1f38-4b4c-b1e0-59f009f28959'
--   AND (
--         mi.is_platform_product = false
--      OR mi.retail_price_paise IS DISTINCT FROM sp.suggested_retail_price_paise
--       )
-- ORDER BY sp.title;
