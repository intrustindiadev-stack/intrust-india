-- ============================================================
-- 20260530_restore_custom_product_flag.sql
-- ============================================================
-- Purpose:
--   Two migrations from 2026-05-14 incorrectly set
--   is_platform_product = true for merchant_inventory rows where
--   the merchant IS the submitter of the custom product
--   (sp.submitted_by_merchant_id = mi.merchant_id). The root cause
--   was a JOIN on mi.product_id = sp.id without excluding the
--   submitting merchant's own row.
--
--   This migration restores is_platform_product = false for the
--   ~50 affected rows. It does NOT touch retail_price_paise — the
--   merchant's own price for their custom product is preserved as-is.
--
--   Safe to re-run — the WHERE clause is idempotent (only touches
--   rows that are still wrong).
-- ============================================================

BEGIN;

DO $restore$
DECLARE
    v_count INTEGER;
BEGIN
    UPDATE public.merchant_inventory mi
       SET is_platform_product = false,
           updated_at          = now()
      FROM public.shopping_products sp
     WHERE mi.product_id                   = sp.id
       AND sp.submitted_by_merchant_id     IS NOT NULL
       AND mi.merchant_id                  = sp.submitted_by_merchant_id
       AND mi.is_platform_product          = true;  -- idempotent guard

    GET DIAGNOSTICS v_count = ROW_COUNT;

    RAISE NOTICE
        'Custom product flag restore complete: % merchant_inventory rows '
        'restored to is_platform_product = false.',
        v_count;
END;
$restore$;

COMMIT;


-- ============================================================
-- Verification query (run after deploy — expect 0 rows)
-- ============================================================
-- SELECT count(*)
-- FROM public.merchant_inventory mi
-- JOIN public.shopping_products  sp ON sp.id = mi.product_id
-- WHERE sp.submitted_by_merchant_id = mi.merchant_id
--   AND mi.is_platform_product = true;
