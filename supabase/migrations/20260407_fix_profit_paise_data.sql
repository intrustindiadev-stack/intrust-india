-- ============================================================
-- Migration: Fix profit_paise in shopping_order_items
-- Created: 2026-04-07
-- Purpose: Previously, finalize_gateway_orders stored
--          profit_paise = v_merchant_credit (95% of sale total),
--          instead of the true margin:
--          v_merchant_credit - (wholesale_cost × qty).
--          This migration backfills all affected rows.
-- ============================================================

BEGIN;

-- ── PASS 1 ──────────────────────────────────────────────────
-- Fix rows where cost_price_paise is already populated (>0).
-- These were finalized with the old code that set cost correctly
-- but stored profit_paise as the full merchant credit.
UPDATE public.shopping_order_items
SET profit_paise = (unit_price_paise * quantity)
                   - commission_amount_paise
                   - (cost_price_paise * quantity)
WHERE seller_id IS NOT NULL
  AND commission_amount_paise > 0
  AND cost_price_paise > 0;

-- ── PASS 2 ──────────────────────────────────────────────────
-- For rows where cost_price_paise was never set (= 0),
-- backfill cost from the product catalogue, then recalculate.
UPDATE public.shopping_order_items soi
SET cost_price_paise  = sp.wholesale_price_paise,
    profit_paise      = (soi.unit_price_paise * soi.quantity)
                        - soi.commission_amount_paise
                        - (sp.wholesale_price_paise * soi.quantity)
FROM public.shopping_products sp
WHERE soi.product_id          = sp.id
  AND soi.seller_id IS NOT NULL
  AND soi.commission_amount_paise > 0
  AND soi.cost_price_paise    = 0
  AND sp.wholesale_price_paise > 0;



COMMIT;
