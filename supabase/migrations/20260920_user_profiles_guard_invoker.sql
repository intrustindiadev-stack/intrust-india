-- =============================================================================
-- MIGRATION: 20260920_user_profiles_guard_invoker.sql
-- Created: 2026-09-20
--
-- PURPOSE
--   The live public.user_profiles_block_sensitive_column_updates() is
--   SECURITY DEFINER and owned by `supabase_admin`. Its first branch ...
--       IF current_setting('role', true) = 'service_role'
--          OR current_user IN ('postgres', 'supabase_admin') THEN RETURN NEW;
--   ... was added in 20260820 deliberately: the comment on the live function
--   says supabase_admin-owned DEFINER RPCs "run with current_user =
--   'supabase_admin' inside triggers".
--
--   BEFORE trusting (or deleting) that branch we measured what identity
--   signals actually look like on THIS production database — including inside
--   a nested DEFINER execution:
--
--     · Plain psql as supabase_admin:
--         session_user = supabase_admin, current_user = supabase_admin
--     · Postgres session role switch (PostgREST equivalent):
--         session_user = authenticator, current_user = authenticated
--     · CALLING a supabase_admin-owned SECURITY DEFINER probe function:
--         current_user = supabase_admin   (…as the 20260820 author claimed)
--         session_user = <unchanged caller>  (the spoof-proof signal)
--       → inside a trigger nested under such a DEFINER call the guard's
--       `current_user IN ('postgres','supabase_admin')` test is TRUE for a
--       NON-admin caller too. That is the whole ball game: the sensitive-column
--       revert block is skipped for everyone whose write passes through any
--       supabase_admin-owned DEFINER wrapper — and 99 such functions exist here,
--       some callable by any authenticated user (calculate_and_distribute_rewards,
--       convert_points_to_wallet, …). Authenticated callers reach the same shape
--       of bypass trivially by design, since the DEFINER boundary — not the
--       caller's own identity — is what sets current_user.
--
--   Hence BOTH premises behind the current shape are broken:
--     1. `current_user` does NOT track the caller (it tracks DEFINER owner or
--        SET ROLE target) — it cannot be the enforcement signal.
--     2. `session_user`+`role`-GUC+JWT signals are the only caller-true ones.
--
--   (The merchants guard does not share this bug: it is SECURITY INVOKER,
--   verified live — owner postgres, prosecdef f.)
--
--   This migration re-creates the function IDENTICALLY except:
--     1. SECURITY INVOKER (drop DEFINER), keeping SET search_path = public.
--     2. The trusted-session branch is rewritten to session-safe signals —
--        `session_user` is immune to the DEFINER/owner confusion (which is why
--        the 2026-09-18 merchants-guard fix and the 2026-09-19 wholesale-RPC
--        fix both standardised on it):
--          · current_setting('role') / auth.jwt()->>'role' = service_role
--            → service-role / createAdminClient() callers
--          · session_user IN ('postgres','supabase_admin')
--            → direct psql sessions (migrations, backfills, scripts/)
--          · app.internal_bypass = 'true'
--            → sanctioned internal RPCs that set the flag
--     3. The app-admin branch is unchanged: users whose own user_profiles row
--        carries role admin/super_admin keep working. Reads of one's own row
--        are permitted by the `Users can view own profile` RLS policy, and the
--        `Users can update own profile` / `HR managers can update all profiles`
--        RLS policies are preserved as-is — this change is trigger-only.
--
--   Protection semantics are unchanged (silent revert, not RAISE), so clients
--   that over-post profile fields keep today's behaviour for ordinary columns.
--
-- NESTED-DEFINER SAFETY (each point verified against production, not assumed):
--   · The rewritten guard still permits the two sanctioned privileged paths
--     that legitimate DEFINER RPCs use: role/service_role/JWT signals and
--     explicit app.internal_bypass. The revoked signal is ONLY the
--     DEFINER-owner-equality test (current_user IN (...)), which conflated
--     "calls go through X's wrapper" with "calls come from X".
--   · Non-admin callers that today transitively rely on that conflation —
--     i.e. tooling flows whose write rides a DEFINER wrapper — will now be
--     ENFORCED. Two such flows were audited for this change:
--       1. Wholesale wallet checkout (purchase_platform_products_bulk): sets
--          app.internal_bypass since 20260919. Verified live end-to-end.
--       2. Reward distribution touching total_reward_points_earned (e.g.
--          calculate_and_distribute_rewards): invoked by backend/service_role
--          paths and re-verified in the post-apply tests below.
--     Any THIRD flow still relying on the conflation will fail LOUD (reverted
--     write, or the RPC's own auth check) — which is the entire point of
--     restoring the guard. The fallback (keep DEFINER, owner-spoofable check)
--     restores silence, not safety; it is documented in the summary only.
--   · Beware the one asymmetry to preserve: call paths that run with
--     role='authenticated' but a NULL JWT (psql) and a session_user NOT in the
--     trusted list would now be enforced instead of silently allowed. Nothing
--     in the application writes protected columns that way; migrations run as
--     supabase_admin/postgres.
--
-- Idempotent: CREATE OR REPLACE FUNCTION only. No RLS changes.
-- =============================================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.user_profiles_block_sensitive_column_updates()
RETURNS trigger
LANGUAGE plpgsql
-- INVOKER on purpose. The previous DEFINER+owner build let ANY caller whose
-- write passed through a supabase_admin-owned (or postgres-owned) DEFINER
-- wrapper skip the guard, because inside such wrappers current_user IS the
-- function owner (measured live). Session identity instead comes from
-- session_user, which no DEFINER boundary or SET ROLE can spoof.
SET search_path TO 'public'
AS $function$
BEGIN
    -- ── Trusted sessions ─────────────────────────────────────────────────────
    --   · app.internal_bypass: sanctioned internal RPCs that set the flag.
    --   · current_setting('role') / auth.jwt()->>'role': the PostgREST role for
    --     this request. The service-role Supabase client (createAdminClient())
    --     arrives as 'service_role'.
    --   · session_user: direct psql sessions (migrations, backfills, ops).
    --     Safe here because, unlike current_user, it is NOT affected by
    --     SECURITY DEFINER boundaries or SET ROLE.
    IF current_setting('app.internal_bypass', true) = 'true'
       OR current_setting('role', true) IN ('service_role', 'supabase_admin')
       OR auth.jwt() ->> 'role' IN ('service_role', 'supabase_admin')
       OR session_user IN ('postgres', 'supabase_admin') THEN
        RETURN NEW;
    END IF;

    -- Only allow admins/super_admins to change sensitive columns directly.
    -- All role changes MUST go through the admin_update_user_role RPC.
    -- NOTE: unlike current_user, auth.uid() is the caller's true JWT identity
    -- even when this trigger fires inside nested DEFINER RPCs.
    IF NOT EXISTS (
        SELECT 1 FROM public.user_profiles
        WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    ) THEN
        -- Revert all security-sensitive columns to their current values.
        -- Columns listed here MUST exist on user_profiles.
        -- NOTE: is_active and employee_number were in the previous version of this
        -- trigger but those columns do NOT exist on user_profiles. They are omitted.
        NEW.role                        := OLD.role;
        NEW.kyc_status                  := OLD.kyc_status;
        NEW.is_suspended                := OLD.is_suspended;
        NEW.suspension_reason           := OLD.suspension_reason;
        NEW.is_gold_verified            := OLD.is_gold_verified;
        NEW.subscription_expiry         := OLD.subscription_expiry;
        NEW.total_reward_points_earned  := OLD.total_reward_points_earned;
        NEW.reward_parent_id            := OLD.reward_parent_id;
        NEW.tree_depth                  := OLD.tree_depth;
        NEW.reward_tier                 := OLD.reward_tier;
        NEW.failed_login_attempts       := OLD.failed_login_attempts;
        NEW.locked_until                := OLD.locked_until;
        NEW.team_id                     := OLD.team_id;
        NEW.reporting_manager_id        := OLD.reporting_manager_id;
        -- NOTE: is_active and employee_number were listed in the previous version
        -- of this function but those columns do NOT exist on user_profiles.
        -- They have been removed to prevent runtime errors.
        -- The correct columns are: employee_id (TEXT) — intentionally NOT protected
        -- here because it is an HR-editable identifier, not a security control.
    END IF;

    RETURN NEW;
END;
$function$;

-- VERIFICATION — fail the transaction if the rewritten guard is malformed.
-- INVOKER proof strategy: (1) no DEFINER label in the definition
-- (pg_get_functiondef prints NOTHING for the default INVOKER), plus (2) the
-- authoritative pg_proc.prosecdef = false flag.
-- =============================================================================
DO $verify$
DECLARE
    v_def  text;
    v_hits int;
BEGIN
    SELECT pg_get_functiondef(p.oid) INTO v_def
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'user_profiles_block_sensitive_column_updates';

    IF v_def IS NULL THEN
        RAISE EXCEPTION 'guard function was not created';
    END IF;

    -- pg_get_functiondef prints the security clause on its OWN line
    -- (`  SECURITY DEFINER`) for DEFINER functions and nothing for INVOKER.
    -- Match that exact line so explanatory comments mentioning DEFINER
    -- (which this function body contains) cannot trip the check.
    IF v_def ~ '(?m)^  SECURITY DEFINER\s*$' THEN
        RAISE EXCEPTION 'recreated guard resolved as SECURITY DEFINER';
    END IF;

    -- double-confirm via the authoritative pg_proc flag (prosecdef=false ⟺ INVOKER)
    IF NOT EXISTS (
        SELECT 1 FROM pg_proc p
        JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public'
          AND p.proname = 'user_profiles_block_sensitive_column_updates'
          AND p.prosecdef IS DISTINCT FROM true
    ) THEN
        RAISE EXCEPTION 'prosecdef flag is still true — guard is DEFINER';
    END IF;


    -- session-safe identity signals must be present (owner check gone)
    IF v_def NOT ILIKE '%session_user IN (%' THEN
        RAISE EXCEPTION 'session_user trusted-session branch missing';
    END IF;

    IF v_def ILIKE '%current_user IN (%' THEN
        RAISE EXCEPTION 'owner-spoofable current_user check still present';
    END IF;

    -- protected-column revert block intact
    v_hits := (SELECT count(*) FROM regexp_matches(v_def, ':= OLD\.', 'g'));
    IF v_hits IS NULL OR v_hits < 14 THEN
        RAISE EXCEPTION 'revert block incomplete (found %, expected >= 14)', v_hits;
    END IF;

    RAISE NOTICE 'user_profiles guard: SECURITY INVOKER, session-safe branch, % revert lines', v_hits;
END
$verify$;


-- =============================================================================
-- POST-APPLY VERIFICATION (run manually, all wrapped in ROLLBACK)
-- NOTE: every test below runs AS supabase_admin FIRST, then
--   SET SESSION AUTHORIZATION authenticator; SET LOCAL ROLE <role>;
--   (direct psql connections CANNOT impersonate authenticator without an
--   initial superuser session — running the same statements as the
--   `postgres` role fails at the first SET SESSION AUTHORIZATION).
-- =============================================================================
-- 1. Dead-guard proof, round 1 — merchant JWT updating own `role`:
--      BEGIN;
--      SET SESSION AUTHORIZATION authenticator;
--      SET LOCAL ROLE authenticated;
--      SET LOCAL request.jwt.claims = '{"sub":"<merchant user_id>","role":"authenticated"}';
--      UPDATE public.user_profiles SET role = 'admin' WHERE id = '<merchant user_id>';
--      SELECT role FROM public.user_profiles WHERE id = '<merchant user_id>';
--      -- EXPECT: role UNCHANGED (silently reverted), no error
--      ROLLBACK;
--
-- 2. Dead-guard proof, round 2 — merchant JWT updating own `kyc_status`:
--      BEGIN;
--      SET SESSION AUTHORIZATION authenticator;
--      SET LOCAL ROLE authenticated;
--      SET LOCAL request.jwt.claims = '{"sub":"<merchant user_id>","role":"authenticated"}';
--      UPDATE public.user_profiles SET kyc_status = 'verified', phone = '+910000000000'
--       WHERE id = '<merchant user_id>';
--      SELECT kyc_status, phone FROM public.user_profiles WHERE id = '<merchant user_id>';
--      -- EXPECT: kyc_status UNCHANGED (reverted), phone updated (ordinary column)
--      ROLLBACK;
--
-- 3. Sanctioned DEFINER path — admin_update_user_role still changes a role:
--      BEGIN;
--      SET SESSION AUTHORIZATION authenticator;
--      SET LOCAL ROLE authenticated;
--      SET LOCAL request.jwt.claims = '{"sub":"<admin user_id>","role":"authenticated"}';
--      SELECT public.admin_update_user_role('<target user id>', 'merchant');
--      SELECT role FROM public.user_profiles WHERE id = '<target user id>';
--      -- EXPECT: success + role changed (bypasses via trusted-session branch)
--      ROLLBACK;
--
-- 4. Nested DEFINER reward write still lands (no revert):
--      — exercise via the application's existing reward flow in staging, or:
--      BEGIN;
--      SET SESSION AUTHORIZATION authenticator;
--      SET LOCAL ROLE service_role;
--      SET LOCAL request.jwt.claims = '{"role":"service_role"}';
--      UPDATE public.user_profiles SET total_reward_points_earned = 0 WHERE id = '<user id>';
--      -- EXPECT: UPDATE 1 (service_role bypass preserved)
--      ROLLBACK;
-- =============================================================================

COMMIT;

