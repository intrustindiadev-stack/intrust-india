-- Migration: Capture live merchants_block_sensitive_column_updates guard (schema-drift fix)
-- Created: 2026-06-06
-- Description:
--   Codifies the production version of merchants_block_sensitive_column_updates() that has been
--   running in prod since at least 2026-06-06. The two earlier migrations that created/modified
--   this function are:
--     • 20260422_fix_rls_security_holes.sql         — original guard, no bypass
--     • 20260423_fix_merchant_settlement_trigger.sql — added app.internal_bypass bypass
--
--   The live function additionally bypasses for role='service_role' OR current_user='postgres'.
--   This drift is the enabling factor for the J J STORE lost-update incident (see
--   docs/incident/20260606_jjstore_wallet_lost_update.md): a service-role merchant-row write
--   carrying a stale wallet_balance_paise silently overwrote the committed ₹33,000 credit.
--
--   ⚠ HARDENING NOTE: The broad service_role bypass should be narrowed in a future phase.
--      Replacing it with the explicit app.internal_bypass=true pattern is tracked as a
--      recommendation in the incident report. This migration only captures the current
--      production state; it does NOT harden it.
--
--   This migration is idempotent (CREATE OR REPLACE + DROP TRIGGER IF EXISTS).
--   It is safe to apply against production because it installs exactly what is already there.

CREATE OR REPLACE FUNCTION public.merchants_block_sensitive_column_updates()
RETURNS TRIGGER AS $$
BEGIN
    -- ALLOW BYPASS for:
    --   1. Explicit internal system operations that set app.internal_bypass='true'
    --      (e.g. perform_wallet_adjustment RPC, settlement functions)
    --   2. Service-role connections (Supabase Admin client — createAdminClient())
    --   3. Direct postgres superuser connections (migration runner, perform_wallet_adjustment owner)
    --
    -- ⚠ NOTE (2026-06-06): The service_role and postgres bypasses are broad. A service-role
    --   write carrying a stale wallet_balance_paise will silently succeed and produce no ledger
    --   row. See incident report docs/incident/20260606_jjstore_wallet_lost_update.md.
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

    -- Block failure tracking and admin columns
    IF NEW.fulfillment_failure_count IS DISTINCT FROM OLD.fulfillment_failure_count THEN
        RAISE EXCEPTION 'Column fulfillment_failure_count is protected and set by admin takeover only.';
    END IF;
    IF NEW.rejection_reason IS DISTINCT FROM OLD.rejection_reason THEN
        RAISE EXCEPTION 'Column rejection_reason is admin-only.';
    END IF;
    IF NEW.suspension_reason IS DISTINCT FROM OLD.suspension_reason THEN
        RAISE EXCEPTION 'Column suspension_reason is admin-only.';
    END IF;

    -- Block audit timestamps
    IF NEW.applied_at IS DISTINCT FROM OLD.applied_at THEN
        RAISE EXCEPTION 'Column applied_at is immutable.';
    END IF;
    IF NEW.approved_at IS DISTINCT FROM OLD.approved_at THEN
        RAISE EXCEPTION 'Column approved_at is immutable.';
    END IF;
    IF NEW.rejected_at IS DISTINCT FROM OLD.rejected_at THEN
        RAISE EXCEPTION 'Column rejected_at is immutable.';
    END IF;

    -- Block KYC columns
    IF NEW.pan_number IS DISTINCT FROM OLD.pan_number THEN
        RAISE EXCEPTION 'Column pan_number is protected and set during onboarding only.';
    END IF;
    IF NEW.pan_verified IS DISTINCT FROM OLD.pan_verified THEN
        RAISE EXCEPTION 'Column pan_verified is protected.';
    END IF;
    IF NEW.pan_data IS DISTINCT FROM OLD.pan_data THEN
        RAISE EXCEPTION 'Column pan_data is protected.';
    END IF;
    IF NEW.gstin_verified IS DISTINCT FROM OLD.gstin_verified THEN
        RAISE EXCEPTION 'Column gstin_verified is protected.';
    END IF;
    IF NEW.gstin_data IS DISTINCT FROM OLD.gstin_data THEN
        RAISE EXCEPTION 'Column gstin_data is protected.';
    END IF;
    IF NEW.bank_verified IS DISTINCT FROM OLD.bank_verified THEN
        RAISE EXCEPTION 'Column bank_verified is protected.';
    END IF;
    IF NEW.bank_data IS DISTINCT FROM OLD.bank_data THEN
        RAISE EXCEPTION 'Column bank_data is protected.';
    END IF;

    -- Block bank details
    IF NEW.bank_account_number IS DISTINCT FROM OLD.bank_account_number THEN
        RAISE EXCEPTION 'Column bank_account_number is protected and requires re-verification.';
    END IF;
    IF NEW.bank_ifsc_code IS DISTINCT FROM OLD.bank_ifsc_code THEN
        RAISE EXCEPTION 'Column bank_ifsc_code is protected and requires re-verification.';
    END IF;
    IF NEW.bank_name IS DISTINCT FROM OLD.bank_name THEN
        RAISE EXCEPTION 'Column bank_name is protected.';
    END IF;
    IF NEW.bank_account_name IS DISTINCT FROM OLD.bank_account_name THEN
        RAISE EXCEPTION 'Column bank_account_name is protected.';
    END IF;

    -- Block slug
    IF NEW.slug IS DISTINCT FROM OLD.slug THEN
        RAISE EXCEPTION 'Column slug is immutable after approval.';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Re-attach the trigger (idempotent: DROP IF EXISTS first)
DROP TRIGGER IF EXISTS merchants_sensitive_column_guard ON public.merchants;
CREATE TRIGGER merchants_sensitive_column_guard
BEFORE UPDATE ON public.merchants
FOR EACH ROW
EXECUTE FUNCTION public.merchants_block_sensitive_column_updates();
