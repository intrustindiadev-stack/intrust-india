-- =============================================================================
-- MIGRATION: 20260918000001_default_hide_investment_features.sql
-- Created: 2026-09-18
--
-- PURPOSE:
--   Change the default visibility of investment features (Lockin Portfolio,
--   AI Grow, and AI Orders) to FALSE (hidden by default) for all new and
--   existing merchants.
--
--   Super admins can manually enable any of these modules per merchant via
--   the super-admin panel (/admin/merchants/[id] -> Feature Visibility).
--
-- TARGET COLUMNS (public.merchants):
--   • show_lockin    → /merchant/lockin (Lockin Portfolio)
--   • show_ai_grow   → /merchant/investments (AI Grow)
--   • show_ai_orders → /merchant/ai-orders, /merchant/vault (AI Orders + My Vault)
-- =============================================================================

BEGIN;

-- 1. Alter default values to FALSE for new merchants
ALTER TABLE public.merchants
    ALTER COLUMN show_lockin SET DEFAULT FALSE,
    ALTER COLUMN show_ai_grow SET DEFAULT FALSE,
    ALTER COLUMN show_ai_orders SET DEFAULT FALSE;

COMMENT ON COLUMN public.merchants.show_lockin    IS 'Super-admin toggle: merchant can access Lockin Portfolio pages (/merchant/lockin). Default FALSE (hidden).';
COMMENT ON COLUMN public.merchants.show_ai_grow   IS 'Super-admin toggle: merchant can access AI Grow pages (/merchant/investments). Default FALSE (hidden).';
COMMENT ON COLUMN public.merchants.show_ai_orders IS 'Super-admin toggle: merchant can access AI Orders + My Vault pages (/merchant/ai-orders*, /merchant/vault*). Default FALSE (hidden).';

-- 2. Backfill existing merchants to FALSE (hidden by default)
--    Uses app.internal_bypass so the sensitive column guard allows the update.
DO $$
BEGIN
    PERFORM set_config('app.internal_bypass', 'true', true);
    
    UPDATE public.merchants
    SET show_lockin = FALSE,
        show_ai_grow = FALSE,
        show_ai_orders = FALSE;
        
    PERFORM set_config('app.internal_bypass', 'false', true);
END $$;

COMMIT;
