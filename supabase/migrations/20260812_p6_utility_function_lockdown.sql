-- ============================================================
-- INTRUST INDIA — P6: Information Exposure & Utility Function Lockdown
-- Migration: 20260812_p6_utility_function_lockdown.sql
--
-- Addresses:
--   FINDING-A01: decrypt_pii / encrypt_pii exposed to anon/PUBLIC
--   FINDING-A03: get_applied_migrations exposes schema history
--   FINDING-A13: get_user_id_by_phone user enumeration (restrict to authenticated)
--   FINDING-A14: recalculate_user_tier callable by anon
--   FINDING-A15: sync_platform_retail_price callable by anon
--   FINDING-A02: cancel_stale_gateway_drafts has no auth check, anon access
--
-- VERIFIED safe to revoke — all legitimate callers are server-side (supabaseAdmin)
-- or authenticated server routes. No browser-direct callers for these.
--
-- Date: 2026-08-12
-- ============================================================

BEGIN;

-- ── 1. decrypt_pii / encrypt_pii ────────────────────────────────────────────
-- Risk: MEDIUM — caller supplies their own key so DB encryption key is not exposed,
-- but the function still operates on encrypted PII columns and should not be
-- reachable by unauthenticated users.
-- Callers: Internal DB triggers and server-side KYC processing only.
REVOKE EXECUTE ON FUNCTION public.decrypt_pii(text, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.decrypt_pii(text, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.decrypt_pii(text, text) FROM authenticated;
GRANT  EXECUTE ON FUNCTION public.decrypt_pii(text, text) TO service_role;

REVOKE EXECUTE ON FUNCTION public.encrypt_pii(text, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.encrypt_pii(text, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.encrypt_pii(text, text) FROM authenticated;
GRANT  EXECUTE ON FUNCTION public.encrypt_pii(text, text) TO service_role;

-- ── 2. get_applied_migrations ────────────────────────────────────────────────
-- Risk: LOW-MEDIUM — exposes full migration version history to anon callers,
-- revealing database feature timeline and attack surface to attackers.
-- Callers: scripts/check-migration-drift.js (admin tooling, not production app)
REVOKE EXECUTE ON FUNCTION public.get_applied_migrations() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_applied_migrations() FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_applied_migrations() FROM authenticated;
GRANT  EXECUTE ON FUNCTION public.get_applied_migrations() TO service_role;

-- ── 3. get_user_id_by_phone ─────────────────────────────────────────────────
-- Risk: MEDIUM — user enumeration by phone number; exposes UUIDs to attackers
-- for IDOR targeting. Anon access is not needed.
-- Callers: All server-side API routes (supabaseAdmin):
--   /api/auth/signup-otp, /api/auth/verify-otp, /api/auth/check-phone,
--   /api/auth/email/signup, /api/auth/verify-phone
-- Browser caller: components/customer/profile/PersonalInfoForm.jsx
--   → This uses the user's own authenticated session; restrict to authenticated only.
REVOKE EXECUTE ON FUNCTION public.get_user_id_by_phone(text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_user_id_by_phone(text) FROM anon;
-- NOTE: Keeping authenticated EXECUTE because PersonalInfoForm.jsx calls it
-- directly via the user's session for phone uniqueness checks during profile updates.
-- This is the only browser-direct caller, and it uses auth.uid() session.
GRANT  EXECUTE ON FUNCTION public.get_user_id_by_phone(text) TO authenticated;
GRANT  EXECUTE ON FUNCTION public.get_user_id_by_phone(text) TO service_role;

-- ── 4. recalculate_user_tier ─────────────────────────────────────────────────
-- Risk: LOW — anon can trigger tier recalculation for any user (harassment/DoS).
-- Financial impact is low (read-only tier lookup + write to reward_points_balance).
-- Callers: Internal reward flow, supabaseAdmin only.
REVOKE EXECUTE ON FUNCTION public.recalculate_user_tier(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.recalculate_user_tier(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.recalculate_user_tier(uuid) FROM authenticated;
GRANT  EXECUTE ON FUNCTION public.recalculate_user_tier(uuid) TO service_role;

-- ── 5. sync_platform_retail_price ────────────────────────────────────────────
-- Risk: LOW-MEDIUM — unauthenticated trigger of price sync could cause
-- unintended price changes if called with manipulated parameters.
-- Callers: Admin tooling only.
REVOKE EXECUTE ON FUNCTION public.sync_platform_retail_price() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.sync_platform_retail_price() FROM anon;
REVOKE EXECUTE ON FUNCTION public.sync_platform_retail_price() FROM authenticated;
GRANT  EXECUTE ON FUNCTION public.sync_platform_retail_price() TO service_role;

-- ── 6. cancel_stale_gateway_drafts ───────────────────────────────────────────
-- Risk: LOW-MEDIUM — no auth check, anon accessible; could cancel real in-progress
-- draft orders if called maliciously during a user's checkout flow.
-- Callers: Background cron/scheduled job (service_role only expected).
REVOKE EXECUTE ON FUNCTION public.cancel_stale_gateway_drafts() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.cancel_stale_gateway_drafts() FROM anon;
REVOKE EXECUTE ON FUNCTION public.cancel_stale_gateway_drafts() FROM authenticated;
GRANT  EXECUTE ON FUNCTION public.cancel_stale_gateway_drafts() TO service_role;

-- ── 7. update_reward_tree_stats ──────────────────────────────────────────────
-- Risk: MEDIUM — no auth check; anon can update reward tree statistics for
-- any user, affecting tier eligibility and reward distributions.
-- Callers: Internal reward triggers (service_role only).
REVOKE EXECUTE ON FUNCTION public.update_reward_tree_stats(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.update_reward_tree_stats(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.update_reward_tree_stats(uuid) FROM authenticated;
GRANT  EXECUTE ON FUNCTION public.update_reward_tree_stats(uuid) TO service_role;

COMMIT;

-- ============================================================
-- ROLLBACK:
-- GRANT EXECUTE ON FUNCTION public.decrypt_pii(text,text) TO authenticated;
-- GRANT EXECUTE ON FUNCTION public.encrypt_pii(text,text) TO authenticated;
-- GRANT EXECUTE ON FUNCTION public.get_applied_migrations() TO authenticated;
-- GRANT EXECUTE ON FUNCTION public.get_user_id_by_phone(text) TO anon;
-- GRANT EXECUTE ON FUNCTION public.recalculate_user_tier(uuid) TO authenticated;
-- GRANT EXECUTE ON FUNCTION public.sync_platform_retail_price() TO authenticated;
-- GRANT EXECUTE ON FUNCTION public.cancel_stale_gateway_drafts() TO authenticated;
-- GRANT EXECUTE ON FUNCTION public.update_reward_tree_stats(uuid) TO authenticated;
-- ============================================================
