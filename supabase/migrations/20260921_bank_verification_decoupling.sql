-- =============================================================================
-- MIGRATION: 20260921_bank_verification_decoupling.sql
-- Created: 2026-09-21
--
-- PURPOSE
--   Decouples Merchant *Account Approval* from *Financial (bank) Verification*.
--
--   Bank details are now OPTIONAL on the merchant application form
--   (app/api/merchant/apply/route.js already inserts NULL bank columns when the
--   applicant skips them). Two flows had to be updated for that to be safe:
--
--     1. Admin approval     — app/api/admin/approve-merchant/route.js used to
--                             hard-block with 400 "Bank details must be
--                             verified first." That gate is removed in code;
--                             status/rejection stay in the audit trail.
--     2. Catch-up flow      — the merchant submits bank details later from
--                             Merchant Settings. To make that submission show up
--                             as a queue item for admins we need an explicit,
--                             queryable lifecycle flag. `bank_verified` alone
--                             cannot express "submitted, awaiting review" vs
--                             "never submitted" (both are bank_verified = false).
--
-- WHAT THIS MIGRATION CHANGES
--   1. Adds public.merchants.bank_verification_status (TEXT, NOT NULL,
--      DEFAULT 'not_submitted') with a CHECK constraint enumerating the
--      lifecycle: not_submitted | pending | verified | failed.
--
--   2. Backfills every existing row from the current data so the admin queue is
--      correct immediately:
--        · bank_verified = true                                  → 'verified'
--        · bank_verified IS NOT TRUE but bank details present     → 'pending'
--        · no bank details at all                                → 'not_submitted'
--
--   3. Re-codifies public.merchants_block_sensitive_column_updates() to also
--      protect bank_verification_status. Without this a merchant could PATCH the
--      column straight from the browser (the RLS update policy only checks
--      user_id = auth.uid()) and forge a 'verified' queue state. All existing
--      bypasses (app.internal_bypass / service_role / admin role lookup) and all
--      previously protected columns are preserved verbatim.
--
-- WRITE PATHS AFTER THIS MIGRATION (all service_role, all bypass the guard)
--   · merchant submits  → POST /api/merchant/bank-details  → 'pending'
--   · penny-drop OK     → same route, inline verifyBank()  → 'verified'
--   · admin manual mark → POST /api/admin/verify-bank      → 'verified'
--
-- Idempotent: ADD COLUMN IF NOT EXISTS + CREATE OR REPLACE + DROP TRIGGER IF EXISTS.
-- =============================================================================

BEGIN;

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Lifecycle column
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.merchants
    ADD COLUMN IF NOT EXISTS bank_verification_status TEXT;

-- Existing rows (and any legacy insert) get an explicit value before NOT NULL.
UPDATE public.merchants
   SET bank_verification_status = 'not_submitted'
 WHERE bank_verification_status IS NULL;

ALTER TABLE public.merchants
    ALTER COLUMN bank_verification_status SET DEFAULT 'not_submitted';

ALTER TABLE public.merchants
    ALTER COLUMN bank_verification_status SET NOT NULL;

ALTER TABLE public.merchants
    DROP CONSTRAINT IF EXISTS merchants_bank_verification_status_check;

ALTER TABLE public.merchants
    ADD CONSTRAINT merchants_bank_verification_status_check
    CHECK (bank_verification_status IN ('not_submitted', 'pending', 'verified', 'failed'));

COMMENT ON COLUMN public.merchants.bank_verification_status IS
    'Bank-settlement lifecycle: not_submitted (no details yet) | pending (submitted, awaiting admin/penny-drop review) | verified | failed. Writable only by service_role (admin APIs) — protected by merchants_sensitive_column_guard.';

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Backfill from live data
-- ─────────────────────────────────────────────────────────────────────────────
-- 2a. Already verified by an admin.
UPDATE public.merchants
   SET bank_verification_status = 'verified'
 WHERE bank_verified IS TRUE
   AND bank_verification_status IS DISTINCT FROM 'verified';

-- 2b. Bank details on file but not yet verified → sits in the admin queue.
--     Detail presence is checked on BOTH the flat columns and the bank_data JSONB
--     so rows written by either historical path are classified correctly.
UPDATE public.merchants
   SET bank_verification_status = 'pending'
 WHERE bank_verified IS NOT TRUE
   AND (
        NULLIF(TRIM(COALESCE(bank_account_number, '')), '') IS NOT NULL
        OR NULLIF(TRIM(COALESCE(bank_data->>'account_number', '')), '') IS NOT NULL
        OR NULLIF(TRIM(COALESCE(bank_ifsc_code, '')), '') IS NOT NULL
        OR NULLIF(TRIM(COALESCE(bank_data->>'ifsc', bank_data->>'ifsc_code', '')), '') IS NOT NULL
   )
   AND bank_verification_status IS DISTINCT FROM 'pending';

-- 2c. Everything else is an approved-or-pending merchant who never supplied
--     details — exactly the population this feature targets.
UPDATE public.merchants
   SET bank_verification_status = 'not_submitted'
 WHERE bank_verified IS NOT TRUE
   AND bank_verification_status IS DISTINCT FROM 'not_submitted'
   AND NULLIF(TRIM(COALESCE(bank_account_number, '')), '') IS NULL
   AND NULLIF(TRIM(COALESCE(bank_data->>'account_number', '')), '') IS NULL
   AND NULLIF(TRIM(COALESCE(bank_ifsc_code, '')), '') IS NULL
   AND NULLIF(TRIM(COALESCE(bank_data->>'ifsc', bank_data->>'ifsc_code', '')), '') IS NULL;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Re-codify the merchants sensitive-column guard
--    (only change vs 20260918000000: the bank_verification_status block below)
-- ─────────────────────────────────────────────────────────────────────────────
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
    --   · admin marks verified  → POST /api/admin/verify-bank     (service_role)
    --   · merchant submits new  → POST /api/merchant/bank-details (service_role,
    --                             resets bank_verified = false for re-verification
    --                             and sets bank_verification_status = 'pending')
    IF NEW.bank_verified IS DISTINCT FROM OLD.bank_verified THEN
        RAISE EXCEPTION 'Column bank_verified is protected.';
    END IF;
    IF NEW.bank_data IS DISTINCT FROM OLD.bank_data THEN
        RAISE EXCEPTION 'Column bank_data is protected.';
    END IF;

    -- Block bank verification lifecycle (NEW in this migration).
    -- A merchant must never self-declare 'verified' from the browser (the RLS
    -- update policy only checks user_id = auth.uid()); only the two service-role
    -- routes above may advance this column.
    IF NEW.bank_verification_status IS DISTINCT FROM OLD.bank_verification_status THEN
        RAISE EXCEPTION 'Column bank_verification_status is protected.';
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

-- Forcibly resolve every NEW.<col> / OLD.<col> reference at apply time.
-- plpgsql resolves record fields lazily at first execution, so a typo in a column
-- name would otherwise only surface on the first merchant UPDATE.
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
        'bank_verified', 'bank_data', 'bank_verification_status',
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

DROP TRIGGER IF EXISTS merchants_sensitive_column_guard ON public.merchants;
CREATE TRIGGER merchants_sensitive_column_guard
BEFORE UPDATE ON public.merchants
FOR EACH ROW
EXECUTE FUNCTION public.merchants_block_sensitive_column_updates();

COMMIT;

-- =============================================================================
-- POST-APPLY VERIFICATION
-- =============================================================================
-- 1. Column + constraint exist and every row is classified:
--      SELECT bank_verification_status, count(*) FROM public.merchants
--       GROUP BY 1 ORDER BY 1;
--
-- 2. Service-role write still succeeds (rolled back, no data change):
--      BEGIN; SET LOCAL ROLE service_role;
--      UPDATE public.merchants SET bank_verification_status = 'pending'
--       WHERE id = (SELECT id FROM public.merchants ORDER BY created_at LIMIT 1);
--      ROLLBACK;
--
-- 3. Merchant-level write is BLOCKED:
--      BEGIN; SET LOCAL ROLE authenticated;
--      UPDATE public.merchants SET bank_verification_status = 'verified'
--       WHERE id = (SELECT id FROM public.merchants ORDER BY created_at LIMIT 1);
--      ROLLBACK;   -- must RAISE 'Column bank_verification_status is protected.'
-- =============================================================================

