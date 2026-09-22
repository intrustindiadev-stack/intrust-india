-- =============================================================================
-- MIGRATION: 20260918000000_fix_merchants_guard_role_based_bypass.sql
-- Created: 2026-09-18
--
-- PURPOSE
--   Fixes the production permission bug where AUTHORIZED admin actions failed
--   with:  "Column <name> is protected."  (e.g. "Column bank_verified is
--   protected.") when an admin clicked "Verify Bank Registry".
--
-- ROOT CAUSE (verified against production, not assumed)
--   public.merchants_block_sensitive_column_updates() is the ONLY function in
--   the database that raises '% is protected%' (verified via a pg_proc scan),
--   and it is attached to public.merchants as trigger
--   `merchants_sensitive_column_guard`.
--
--   The live function had DRIFTED from the local migration history:
--     · 20260423_fix_merchant_settlement_trigger.sql  → bypass: app.internal_bypass
--     · 20260606120000_capture_...guard.sql           → bypass: internal_bypass
--                                                       OR role='service_role'
--                                                       OR current_user='postgres'
--   The live version only contained the `app.internal_bypass` branch, so
--     → createAdminClient() (service_role) writes were BLOCKED
--     → even a `postgres` superuser psql write was BLOCKED
--   Confirmed empirically before this fix:
--       BEGIN;
--       UPDATE public.merchants SET bank_verified = NOT COALESCE(bank_verified,false)
--        WHERE id = (SELECT id FROM public.merchants ORDER BY created_at LIMIT 1);
--       ROLLBACK;
--       => ERROR: Column bank_verified is protected.
--          CONTEXT: PL/pgSQL function ... line 80 at RAISE
--
--   Affected admin flows (all use the service-role client):
--     · app/api/admin/verify-bank/route.js                     (bank_verified)
--     · app/api/admin/approve-merchant/route.js                (status, subscription_status)
--     · app/api/admin/merchants/[id]/toggle-suspend/route.js   (status, suspension_reason)
--     · app/api/admin/reject-merchant/route.js                 (status, rejection_reason)
--     · app/api/merchant/bank-details/route.js                 (bank_data, bank_verified)
--
-- WHAT THIS MIGRATION CHANGES
--   1. Re-codifies the guard with ROLE-AWARE bypasses (mirrors the canonical
--      pattern already used by user_profiles_block_sensitive_column_updates()):
--        a. app.internal_bypass = 'true'  → explicit internal system ops
--        b. role = 'service_role'         → createAdminClient() / PostgREST, or
--           session_user IN ('postgres','supabase_admin') → psql migrations
--        c. authenticated user_profiles.role IN ('admin','super_admin')
--           → a secure DB lookup on auth.uid(); this deliberately does NOT trust
--             mutable JWT user_metadata (docs/incident/20260811_rls_privilege_escalation.md)
--      The protected-column checks themselves are UNCHANGED (identical messages),
--      so merchants and unprivileged users still cannot self-mutate these columns.
--
--   2. RESTORES the column set that 20260917000000_merchant_feature_visibility.sql
--      accidentally DROPPED by re-codifying an older copy of the function (it lost
--      status, subscription_*, pan_*, gstin_*, bank_account_*, bank_ifsc_code,
--      bank_name/account_name, rejection_reason, suspension_reason and the
--      applied/approved/rejected_at immutability checks). All live columns are
--      back, plus the three show_* visibility flags.
--
--   3. The function stays SECURITY INVOKER (NOT definer). Deliberate: inside a
--      SECURITY DEFINER function `current_user` resolves to the function OWNER,
--      so an owner-based bypass would silently disable the guard for every
--      caller. `session_user` is used instead so the check is reliable.
--
-- ⚠ FOLLOW-UP HARDENING (tracked in docs/incident/20260606_jjstore_wallet_lost_update.md)
--   The service_role bypass is intentionally broad, matching the canonical
--   user_profiles guard, so legitimate platform flows keep working. Narrowing it
--   for the two FINANCIAL columns (wallet_balance_paise /
--   total_commission_paid_paise) — requiring the explicit app.internal_bypass
--   flag instead — remains an open P1 recommendation and is NOT done here to
--   avoid breaking existing settlement/adjustment paths in this bug-fix release.
--
-- Idempotent: CREATE OR REPLACE + DROP TRIGGER IF EXISTS.
-- =============================================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.merchants_block_sensitive_column_updates()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_is_app_admin BOOLEAN := FALSE;
BEGIN
    -- ─ BYPASS 1: explicit internal system operations ────────────────────────
    -- Set via PERFORM set_config('app.internal_bypass', 'true', true) by RPCs
    -- such as perform_wallet_adjustment and the settlement functions.
    IF current_setting('app.internal_bypass', true) = 'true' THEN
        RETURN NEW;
    END IF;

    -- ── BYPASS 2: trusted server-side / superuser sessions ───────────────────
    --   · current_setting('role') = the role PostgREST switched to for this
    --     request (SET LOCAL ROLE). The service-role Supabase client
    --     (createAdminClient()) lands here; every admin API route in this app
    --     re-verifies profile.role IN ('admin','super_admin') before the write
    --     reaches the DB.
    --   · auth.jwt() ->> 'role' is a second, independent signal for the same
    --     thing — true whether the role came from SET ROLE or the JWT claim.
    --   · session_user covers direct psql sessions (scripts/apply_migration.py,
    --     scripts/query_db.py, backfills). Unlike current_user it is NOT
    --     affected by SET ROLE / SECURITY DEFINER, so it is reliable here.
    IF current_setting('role', true) IN ('service_role', 'supabase_admin')
       OR auth.jwt() ->> 'role' IN ('service_role', 'supabase_admin')
       OR session_user IN ('postgres', 'supabase_admin') THEN
        RETURN NEW;
    END IF;

    -- ── BYPASS 3: authenticated platform staff (admin / super_admin) ─────────
    -- Secure database lookup of the caller's role — never the mutable
    -- user_metadata claim. auth.uid() is NULL for anon/service_role (handled
    -- above) and for direct psql sessions, so this fails closed.
    SELECT EXISTS (
        SELECT 1
        FROM public.user_profiles
        WHERE id = auth.uid()
          AND role IN ('admin', 'super_admin')
    ) INTO v_is_app_admin;

    IF v_is_app_admin THEN
        RETURN NEW;
    END IF;
-- =======================================================================
    -- PROTECTED COLUMNS (unchanged semantics — merchants / non-staff only)
    -- =======================================================================

    -- Block financial columns
    IF NEW.wallet_balance_paise IS DISTINCT FROM OLD.wallet_balance_paise THEN
        RAISE EXCEPTION 'Column wallet_balance_paise is protected and cannot be updated directly.';
    END IF;
    IF NEW.total_commission_paid_paise IS DISTINCT FROM OLD.total_commission_paid_paise THEN
        RAISE EXCEPTION 'Column total_commission_paid_paise is protected and cannot be updated directly.';
    END IF;

    -- Block status and subscription columns (service-role admin APIs only — see
    -- app/api/admin/approve-merchant, reject-merchant, toggle-suspend, verify-bank)
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

    -- Block super-admin feature-visibility columns (merchant cannot self-enable).
    -- Writes flow only through PATCH /api/admin/merchants/[id]/visibility (super_admin).
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
    IF NEW.suspension_reason IS DISTINCT FROM OLD.suspension_reason THEN
        RAISE EXCEPTION 'Column suspension_reason is admin-only.';
    END IF;

    -- Block audit timestamps (immutable — set once by the status RPCs)
    IF NEW.applied_at IS DISTINCT FROM OLD.applied_at THEN
        RAISE EXCEPTION 'Column applied_at is immutable.';
    END IF;
    IF NEW.approved_at IS DISTINCT FROM OLD.approved_at THEN
        RAISE EXCEPTION 'Column approved_at is immutable.';
    END IF;
    IF NEW.rejected_at IS DISTINCT FROM OLD.rejected_at THEN
        RAISE EXCEPTION 'Column rejected_at is immutable.';
    END IF;

    -- Block KYC columns (verification is service-role / admin only)
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

    -- Block bank verification columns.
    -- Legitimate write paths:
    --   · admin marks verified  → POST /api/admin/verify-bank   (service_role)
    --   · merchant submits new  → POST /api/merchant/bank-details (service_role,
    --                             resets bank_verified to false for re-verification)
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
$$;

-- Verify the function compiles (plpgsql body parsed + NEW/OLD fields resolved).
-- plpgsql resolves NEW.<col> lazily at first execution, so a bogus column name
-- would only fail at runtime — this DO block forces validation at apply time.
DO $$
DECLARE
    v_cols text[] := ARRAY[
        'wallet_balance_paise', 'total_commission_paid_paise',
        'status', 'subscription_status', 'subscription_expires_at',
        'auto_mode_status', 'auto_mode_months_paid', 'auto_mode_valid_until', 'auto_mode',
        'show_lockin', 'show_ai_grow', 'show_ai_orders',
        'fulfillment_failure_count', 'rejection_reason', 'suspension_reason',
        'applied_at', 'approved_at', 'rejected_at',
        'pan_number', 'pan_verified', 'pan_data', 'gstin_verified', 'gstin_data',
        'bank_verified', 'bank_data',
        'bank_account_number', 'bank_ifsc_code', 'bank_name', 'bank_account_name',
        'slug'
    ];
    v_missing text[];
BEGIN
    SELECT array_agg(c) INTO v_missing
    FROM unnest(v_cols) AS c
    WHERE NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'merchants' AND column_name = c
    );

    IF v_missing IS NOT NULL THEN
        RAISE EXCEPTION 'merchants guard references non-existent columns: %', array_to_string(v_missing, ', ');
    END IF;

    RAISE NOTICE 'merchants guard column set verified (% columns)', array_length(v_cols, 1);
END $$;

-- Re-attach the trigger (idempotent: DROP IF EXISTS first)
DROP TRIGGER IF EXISTS merchants_sensitive_column_guard ON public.merchants;
CREATE TRIGGER merchants_sensitive_column_guard
BEFORE UPDATE ON public.merchants
FOR EACH ROW
EXECUTE FUNCTION public.merchants_block_sensitive_column_updates();

COMMIT;

-- =============================================================================
-- POST-APPLY VERIFICATION (run manually)
-- =============================================================================
-- 1. Bypass present:
--      SELECT l FROM regexp_split_to_table(
--          (SELECT pg_get_functiondef(oid) FROM pg_proc
--            WHERE proname = 'merchants_block_sensitive_column_updates'), E'\n') l
--       WHERE l LIKE '%service_role%' OR l LIKE '%session_user%' OR l LIKE '%auth.uid%';
--
-- 2. Service-role write now succeeds (rolled back, no data change):
--      BEGIN; SET LOCAL ROLE service_role;
--      UPDATE public.merchants SET bank_verified = NOT COALESCE(bank_verified,false)
--       WHERE id = (SELECT id FROM public.merchants ORDER BY created_at LIMIT 1);
--      ROLLBACK;
--
-- 3. Merchant-level write still BLOCKED (as an authenticated non-staff caller):
--      BEGIN; SET LOCAL ROLE authenticated;
--      UPDATE public.merchants SET bank_verified = NOT COALESCE(bank_verified,false)
--       WHERE id = (SELECT id FROM public.merchants ORDER BY created_at LIMIT 1);
--      ROLLBACK;   -- must still RAISE 'Column bank_verified is protected.'
-- =============================================================================