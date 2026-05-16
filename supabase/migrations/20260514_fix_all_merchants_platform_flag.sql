-- ============================================================
-- 20260514_fix_all_merchants_platform_flag.sql
-- ============================================================
-- Purpose:
--   Any merchant_inventory row whose product_id exists in the
--   platform catalog (shopping_products) was sourced through
--   Intrust's wholesale system, so it should be treated as a
--   platform-managed product:
--
--     is_platform_product = true
--       → storefront shows authoritative platform SRP
--       → trg_sync_platform_retail_price keeps price in sync
--         automatically whenever admin edits shopping_products
--
--   This migration fixes the entire table in one shot, regardless
--   of which merchant owns the row. It was previously only applied
--   to rows created via the wholesale RPCs; rows seeded manually
--   (e.g. Intrust Mart's inventory on 2026-05-06) were missed.
--
--   Safe to re-run — the WHERE clause is idempotent (only touches
--   rows that are still wrong).
-- ============================================================

BEGIN;

DO $fix$
DECLARE
    v_count INTEGER;
BEGIN
    UPDATE public.merchant_inventory mi
       SET is_platform_product = true,
           retail_price_paise  = sp.suggested_retail_price_paise,
           updated_at          = now()
      FROM public.shopping_products sp
     WHERE mi.product_id = sp.id
       AND (
             mi.is_platform_product = false
          OR mi.retail_price_paise IS DISTINCT FROM sp.suggested_retail_price_paise
           );

    GET DIAGNOSTICS v_count = ROW_COUNT;

    RAISE NOTICE
        'Platform flag fix complete: % merchant_inventory rows updated '
        '(is_platform_product = true, retail_price synced to platform SRP).',
        v_count;
END;
$fix$;

COMMIT;


-- ============================================================
-- Verification query (run after deploy — expect 0 rows)
-- ============================================================
-- SELECT
--     mi.id            AS inventory_id,
--     m.business_name,
--     sp.title,
--     mi.is_platform_product,
--     mi.retail_price_paise           AS inventory_price,
--     sp.suggested_retail_price_paise AS platform_srp
-- FROM public.merchant_inventory mi
-- JOIN public.shopping_products  sp ON sp.id  = mi.product_id
-- JOIN public.merchants          m  ON m.id   = mi.merchant_id
-- WHERE mi.is_platform_product = false
--    OR mi.retail_price_paise IS DISTINCT FROM sp.suggested_retail_price_paise
-- ORDER BY m.business_name, sp.title;
