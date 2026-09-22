-- =============================================================================
-- MIGRATION: 20260917000000_merchant_feature_visibility.sql
--
-- PURPOSE:
--   Super-admin controlled per-merchant visibility of investment pages.
--   Three flags on public.merchants:
--     • show_lockin    → /merchant/lockin, /merchant/lockin/[id]
--     • show_ai_grow   → /merchant/investments (AI Grow)
--     • show_ai_orders → /merchant/ai-orders*, /merchant/vault* (AI Orders + My Vault)
--
--   DEFAULT TRUE = all existing and new merchants keep access until a super
--   admin explicitly disables it (backward compatible).
--
--   The flags are added to merchants_block_sensitive_column_updates() so a
--   merchant cannot flip them via a direct client-side UPDATE on the merchants
--   table. Writes flow only through the service-role admin API
--   (PATCH /api/admin/merchants/[id]/visibility), which is restricted to
--   super_admin.
--
--   RLS: merchants can still SELECT their own row (flags flow automatically to
--   the client layout + sidebar via existing merchant queries).
-- =============================================================================

BEGIN;

-- 1. Add the visibility columns ------------------------------------------------
ALTER TABLE public.merchants
    ADD COLUMN IF NOT EXISTS show_lockin    BOOLEAN NOT NULL DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS show_ai_grow   BOOLEAN NOT NULL DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS show_ai_orders BOOLEAN NOT NULL DEFAULT TRUE;

COMMENT ON COLUMN public.merchants.show_lockin    IS 'Super-admin toggle: merchant can access Lockin Portfolio pages (/merchant/lockin).';
COMMENT ON COLUMN public.merchants.show_ai_grow   IS 'Super-admin toggle: merchant can access AI Grow pages (/merchant/investments).';
COMMENT ON COLUMN public.merchants.show_ai_orders IS 'Super-admin toggle: merchant can access AI Orders + My Vault pages (/merchant/ai-orders*, /merchant/vault*).';


-- 2. Harden the sensitive-column guard ----------------------------------------
--    Re-codify merchants_block_sensitive_column_updates() with the three new
--    columns added to the protected set. Bypass rules (internal_bypass /
--    service_role / postgres) are preserved exactly as in the live capture
--    migration 20260606120000_capture_merchants_sensitive_column_guard.sql.
CREATE OR REPLACE FUNCTION public.merchants_block_sensitive_column_updates()
RETURNS TRIGGER AS $$
BEGIN
    -- ALLOW BYPASS for:
    --   1. Explicit internal system operations that set app.internal_bypass='true'
    --   2. Service-role connections (Supabase Admin client — createAdminClient())
    --   3. Direct postgres superuser connections (migration runner)
    IF current_setting('app.internal_bypass', true) = 'true'
       OR current_setting('role', true) = 'service_role'
       OR current_user = 'postgres'
    THEN
        RETURN NEW;
    END IF;

    -- Block financial columns
    IF NEW.wallet_balance_paise IS DISTINCT FROM OLD.wallet_balance_paise THEN
        RAISE EXCEPTION 'Column wallet_balance_paise is protected and cannot be updated directly.';
    END IF;
    IF NEW.total_commission_paid_paise IS DISTINCT FROM OLD.total_commission_paid_paise THEN
        RAISE EXCEPTION 'Column total_commission_paid_paise is protected and cannot be updated directly.';
    END IF;

    -- Block status and subscription columns
    IF NEW.status IS DISTINCT FROM OLD.status THEN
        RAISE EXCEPTION 'Column status is protected and can only be updated by admins.';
    END IF;
    IF NEW.subscription_status IS DISTINCT FROM OLD.subscription_status THEN
        RAISE EXCEPTION 'Column subscription_status is protected and cannot be updated directly.';
    END IF;
    IF NEW.subscription_expires_at IS DISTINCT FROM OLD.subscription_expires_at THEN
        RAISE EXCEPTION 'Column subscription_expires_at is protected and cannot be updated directly.';
    END IF;

    -- Block auto-mode columns
    IF NEW.auto_mode_status IS DISTINCT FROM OLD.auto_mode_status THEN
        RAISE EXCEPTION 'Column auto_mode_status is protected and controlled via RPC.';
    END IF;
    IF NEW.auto_mode_months_paid IS DISTINCT FROM OLD.auto_mode_months_paid THEN
        RAISE EXCEPTION 'Column auto_mode_months_paid is protected and cannot be updated directly.';
    END IF;
    IF NEW.auto_mode_valid_until IS DISTINCT FROM OLD.auto_mode_valid_until THEN
        RAISE EXCEPTION 'Column auto_mode_valid_until is protected and cannot be updated directly.';
    END IF;
    IF NEW.auto_mode IS DISTINCT FROM OLD.auto_mode THEN
        RAISE EXCEPTION 'Column auto_mode is protected and controlled via RPC.';
    END IF;

    -- Block super-admin feature-visibility columns (merchant cannot self-enable)
    IF NEW.show_lockin IS DISTINCT FROM OLD.show_lockin THEN
        RAISE EXCEPTION 'Column show_lockin is protected and can only be changed by a super admin.';
    END IF;
    IF NEW.show_ai_grow IS DISTINCT FROM OLD.show_ai_grow THEN
        RAISE EXCEPTION 'Column show_ai_grow is protected and can only be changed by a super admin.';
    END IF;
    IF NEW.show_ai_orders IS DISTINCT FROM OLD.show_ai_orders THEN
        RAISE EXCEPTION 'Column show_ai_orders is protected and can only be changed by a super admin.';
    END IF;

    -- Block failure tracking and admin columns
    IF NEW.fulfillment_failure_count IS DISTINCT FROM OLD.fulfillment_failure_count THEN
        RAISE EXCEPTION 'Column fulfillment_failure_count is protected and set by admin takeover only.';
    END IF;
    IF NEW.rejection_reason IS DISTINCT FROM OLD.rejection_reason THEN
        RAISE EXCEPTION 'Column rejection_reason is admin-only.';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Re-attach the trigger (idempotent)
DROP TRIGGER IF EXISTS merchants_sensitive_column_guard ON public.merchants;
CREATE TRIGGER merchants_sensitive_column_guard
    BEFORE UPDATE ON public.merchants
    FOR EACH ROW
    EXECUTE FUNCTION public.merchants_block_sensitive_column_updates();

COMMIT;