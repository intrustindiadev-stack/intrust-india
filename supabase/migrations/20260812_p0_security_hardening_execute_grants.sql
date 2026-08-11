-- ============================================================================
-- MIGRATION: 20260812_p0_security_hardening_execute_grants.sql
-- 
-- PURPOSE:
--   Revoke EXECUTE privileges from 'anon' and 'authenticated' roles on
--   privileged SECURITY DEFINER functions that must only be called by the
--   server-side service role.
--
-- ROOT CAUSE:
--   During the Aug 11 2026 security incident, the attacker exploited the fact
--   that Supabase RPC functions are callable via REST API with just an anon or
--   user JWT. Some functions (e.g. atomic_customer_wallet_credit) had no
--   internal auth check, making them directly exploitable.
--
-- STRATEGY:
--   Functions in two categories:
--   A) Functions with NO internal auth.uid() check → REVOKE from all, restrict
--      to service_role only. These MUST be called via the Next.js API layer.
--   B) Functions WITH an internal auth check (e.g. admin_update_user_role) →
--      still REVOKE from anon (no anon should ever call admin functions), keep
--      authenticated only to avoid breaking the admin panel RPC call pattern.
--
-- ROLLBACK:
--   GRANT EXECUTE ON FUNCTION <name> TO authenticated;
--   GRANT EXECUTE ON FUNCTION <name> TO anon;
-- ============================================================================

-- ─── CATEGORY A: NO internal auth check — restrict to service_role only ─────

-- atomic_customer_wallet_credit: credits wallet balance.
-- CRITICAL: No auth.uid() check. Any user can call this with any user_id.
-- Must only be called by server-side code (sabapaisa callback, wallet topup API)
REVOKE EXECUTE ON FUNCTION public.atomic_customer_wallet_credit(uuid, bigint, text, text, text, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.atomic_customer_wallet_credit(uuid, bigint, text, text, text, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.atomic_customer_wallet_credit(uuid, bigint, text, text, text, text) FROM authenticated;
-- Note: service_role bypasses REVOKE (it's a superuser). To be explicit:
GRANT EXECUTE ON FUNCTION public.atomic_customer_wallet_credit(uuid, bigint, text, text, text, text) TO service_role;

-- ─── CATEGORY B: Has internal auth check, but should not be callable by anon ─

-- admin_update_user_role: Has internal auth.uid() check. However, anon should
-- never be able to call admin functions. Keep authenticated so admin panel works.
REVOKE EXECUTE ON FUNCTION public.admin_update_user_role(uuid, text) FROM anon;

-- admin_suspend_user: Revoke anon
REVOKE EXECUTE ON FUNCTION public.admin_suspend_user(uuid, text) FROM anon;

-- admin_unsuspend_user: Revoke anon
REVOKE EXECUTE ON FUNCTION public.admin_unsuspend_user(uuid) FROM anon;

-- admin_approve_payout: Revoke anon.
REVOKE EXECUTE ON FUNCTION public.admin_approve_payout FROM anon;

-- admin_reject_payout: Revoke anon.
REVOKE EXECUTE ON FUNCTION public.admin_reject_payout FROM anon;

-- admin_bulk_insert_coupons: Admin-only operations
REVOKE EXECUTE ON FUNCTION public.admin_bulk_insert_coupons FROM anon;

-- admin_bulk_insert_coupons_v2: Admin-only operations
REVOKE EXECUTE ON FUNCTION public.admin_bulk_insert_coupons_v2 FROM anon;

-- admin_insert_shopping_product: Admin-only
REVOKE EXECUTE ON FUNCTION public.admin_insert_shopping_product FROM anon;

-- admin_update_shopping_product: Admin-only
REVOKE EXECUTE ON FUNCTION public.admin_update_shopping_product FROM anon;

-- admin_update_product_stock: Admin-only
REVOKE EXECUTE ON FUNCTION public.admin_update_product_stock FROM anon;

-- admin_takeover_stale_orders: Cron job via service role, not user-callable
REVOKE EXECUTE ON FUNCTION public.admin_takeover_stale_orders FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_takeover_stale_orders FROM authenticated;

-- adjust_employee_leave_balance: HR admin operation
REVOKE EXECUTE ON FUNCTION public.adjust_employee_leave_balance FROM anon;

-- admin_get_all_orders / admin_get_order_detail / admin_get_takeover_orders:
-- Read-only but admin-only. Revoke from anon.
REVOKE EXECUTE ON FUNCTION public.admin_get_all_orders FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_get_order_detail FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_get_takeover_orders FROM anon;

-- admin_mark_expired_coupons: Admin operation
REVOKE EXECUTE ON FUNCTION public.admin_mark_expired_coupons FROM anon;

-- admin_takeover_single_order: Admin operation
REVOKE EXECUTE ON FUNCTION public.admin_takeover_single_order FROM anon;

-- merge_duplicate_user_data: Admin/service operation - dangerous
REVOKE EXECUTE ON FUNCTION public.merge_duplicate_user_data FROM anon;
REVOKE EXECUTE ON FUNCTION public.merge_duplicate_user_data FROM authenticated;
GRANT EXECUTE ON FUNCTION public.merge_duplicate_user_data TO service_role;

-- reset_otp_rate_limit: Admin operation
REVOKE EXECUTE ON FUNCTION public.reset_otp_rate_limit FROM anon;

-- admin_link_email_identity: Admin operation
REVOKE EXECUTE ON FUNCTION public.admin_link_email_identity FROM anon;

-- admin_reassign_lead: Admin/CRM operation - keep authenticated for CRM panel
REVOKE EXECUTE ON FUNCTION public.admin_reassign_lead FROM anon;

-- admin_review_leave_request: HR admin operation
REVOKE EXECUTE ON FUNCTION public.admin_review_leave_request FROM anon;

-- ─── Log this migration ───────────────────────────────────────────────────────
DO $$
BEGIN
    RAISE NOTICE 'Security hardening: P0 EXECUTE grant revocations applied successfully.';
    RAISE NOTICE 'atomic_customer_wallet_credit now restricted to service_role only.';
    RAISE NOTICE 'Admin functions: anon access revoked.';
END $$;
