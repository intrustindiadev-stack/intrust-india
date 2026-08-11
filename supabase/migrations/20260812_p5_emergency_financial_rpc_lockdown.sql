-- ============================================================
-- INTRUST INDIA — Emergency Financial RPC Lockdown
-- Migration: 20260812_p5_emergency_financial_rpc_lockdown.sql
-- Phase 1 Containment: Revoke direct user/anon access to
-- financial SECURITY DEFINER functions with no internal auth.
--
-- VERIFIED: All legitimate callers use supabaseAdmin (service_role).
-- SAFE: No signatures changed. No data modified.
-- REVERSIBLE: Rollback GRANTs documented at bottom.
--
-- Closes: VULN-P1-01 through VULN-P1-10 (emergency tier)
-- Date: 2026-08-12
-- ============================================================

BEGIN;

-- ── 1. perform_wallet_adjustment ────────────────────────────────────────────
-- Risk: CRITICAL — no auth.uid() check, accepts arbitrary p_target_user_id
-- Callers: lib/wallet/walletService.js (supabaseAdmin), lib/wallet/customerWalletService.js (supabaseAdmin)
REVOKE EXECUTE ON FUNCTION public.perform_wallet_adjustment(uuid, text, text, bigint, uuid, text, uuid, text, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.perform_wallet_adjustment(uuid, text, text, bigint, uuid, text, uuid, text, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.perform_wallet_adjustment(uuid, text, text, bigint, uuid, text, uuid, text, text) FROM authenticated;
GRANT  EXECUTE ON FUNCTION public.perform_wallet_adjustment(uuid, text, text, bigint, uuid, text, uuid, text, text) TO service_role;

-- ── 2. increment_customer_wallet ────────────────────────────────────────────
-- Risk: CRITICAL — no auth.uid() check, accepts arbitrary p_user_id + p_amount_paise
-- Callers: NONE in production application code (internal legacy function)
REVOKE EXECUTE ON FUNCTION public.increment_customer_wallet(uuid, bigint, text, text, text, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.increment_customer_wallet(uuid, bigint, text, text, text, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.increment_customer_wallet(uuid, bigint, text, text, text, text) FROM authenticated;
GRANT  EXECUTE ON FUNCTION public.increment_customer_wallet(uuid, bigint, text, text, text, text) TO service_role;

-- ── 3. customer_purchase_from_merchant ──────────────────────────────────────
-- Risk: CRITICAL — no auth.uid() check, accepts p_customer_id; drains wallet + inventory
-- Callers: NONE in production application code
REVOKE EXECUTE ON FUNCTION public.customer_purchase_from_merchant(uuid, integer, uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.customer_purchase_from_merchant(uuid, integer, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.customer_purchase_from_merchant(uuid, integer, uuid) FROM authenticated;
GRANT  EXECUTE ON FUNCTION public.customer_purchase_from_merchant(uuid, integer, uuid) TO service_role;

-- ── 4. customer_purchase_from_platform ──────────────────────────────────────
-- Risk: CRITICAL — no auth.uid() check, accepts p_customer_id, drains wallet + stock
-- Callers: NONE in production application code
REVOKE EXECUTE ON FUNCTION public.customer_purchase_from_platform(uuid, integer, uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.customer_purchase_from_platform(uuid, integer, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.customer_purchase_from_platform(uuid, integer, uuid) FROM authenticated;
GRANT  EXECUTE ON FUNCTION public.customer_purchase_from_platform(uuid, integer, uuid) TO service_role;

-- ── 5. customer_bulk_purchase ────────────────────────────────────────────────
-- Risk: CRITICAL — bulk IDOR wallet drain, no auth.uid()
-- Callers: NONE in production application code
REVOKE EXECUTE ON FUNCTION public.customer_bulk_purchase(jsonb, uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.customer_bulk_purchase(jsonb, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.customer_bulk_purchase(jsonb, uuid) FROM authenticated;
GRANT  EXECUTE ON FUNCTION public.customer_bulk_purchase(jsonb, uuid) TO service_role;

-- ── 6. customer_bulk_purchase_v2 ─────────────────────────────────────────────
-- Risk: CRITICAL — v2 bulk IDOR, no auth.uid()
-- Callers: NONE in production application code
REVOKE EXECUTE ON FUNCTION public.customer_bulk_purchase_v2(jsonb[], uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.customer_bulk_purchase_v2(jsonb[], uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.customer_bulk_purchase_v2(jsonb[], uuid) FROM authenticated;
GRANT  EXECUTE ON FUNCTION public.customer_bulk_purchase_v2(jsonb[], uuid) TO service_role;

-- ── 7. finalize_gateway_orders ───────────────────────────────────────────────
-- Risk: CRITICAL — finalizes any order as paid without payment proof
-- Callers: lib/sabpaisa/fulfillment.js (supabaseAdmin), /api/shopping/wallet-checkout (supabaseAdmin)
REVOKE EXECUTE ON FUNCTION public.finalize_gateway_orders(uuid, uuid, bigint) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.finalize_gateway_orders(uuid, uuid, bigint) FROM anon;
REVOKE EXECUTE ON FUNCTION public.finalize_gateway_orders(uuid, uuid, bigint) FROM authenticated;
GRANT  EXECUTE ON FUNCTION public.finalize_gateway_orders(uuid, uuid, bigint) TO service_role;

-- ── 8. wallet_buy_gift_card ──────────────────────────────────────────────────
-- Risk: CRITICAL — drains any user wallet via IDOR on p_user_id
-- Callers: /api/gift-cards/buy-wallet/route.js (supabaseAdmin, JWT-validated)
REVOKE EXECUTE ON FUNCTION public.wallet_buy_gift_card(uuid, uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.wallet_buy_gift_card(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.wallet_buy_gift_card(uuid, uuid) FROM authenticated;
GRANT  EXECUTE ON FUNCTION public.wallet_buy_gift_card(uuid, uuid) TO service_role;

-- ── 9. wallet_activate_gold_subscription ────────────────────────────────────
-- Risk: CRITICAL — drains wallet for subscription without payment proof from caller
-- Callers: lib/sabpaisa/fulfillment.js (supabaseAdmin) after verified payment
REVOKE EXECUTE ON FUNCTION public.wallet_activate_gold_subscription(uuid, text, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.wallet_activate_gold_subscription(uuid, text, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.wallet_activate_gold_subscription(uuid, text, text) FROM authenticated;
GRANT  EXECUTE ON FUNCTION public.wallet_activate_gold_subscription(uuid, text, text) TO service_role;

-- ── 10. calculate_and_distribute_rewards ────────────────────────────────────
-- Risk: CRITICAL — any user can inflate points for themselves or anyone else
-- Callers: Multiple /api/* routes (supabaseAdmin), fulfillment.js (supabaseAdmin)
REVOKE EXECUTE ON FUNCTION public.calculate_and_distribute_rewards(text, uuid, uuid, text, bigint) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.calculate_and_distribute_rewards(text, uuid, uuid, text, bigint) FROM anon;
REVOKE EXECUTE ON FUNCTION public.calculate_and_distribute_rewards(text, uuid, uuid, text, bigint) FROM authenticated;
GRANT  EXECUTE ON FUNCTION public.calculate_and_distribute_rewards(text, uuid, uuid, text, bigint) TO service_role;

-- ── 11. finalize_coupon_purchase ─────────────────────────────────────────────
-- Risk: HIGH — marks any pending order as paid with a fake payment_id
-- Callers: NONE (legacy Razorpay function; gateway removed, route returns 410)
REVOKE EXECUTE ON FUNCTION public.finalize_coupon_purchase(uuid, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.finalize_coupon_purchase(uuid, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.finalize_coupon_purchase(uuid, text) FROM authenticated;
GRANT  EXECUTE ON FUNCTION public.finalize_coupon_purchase(uuid, text) TO service_role;

-- ── 12. distribute_merchant_referral_reward ──────────────────────────────────
-- Risk: HIGH — triggers merchant referral rewards for arbitrary merchant
-- Callers: lib/sabpaisa/fulfillment.js (supabaseAdmin) only
REVOKE EXECUTE ON FUNCTION public.distribute_merchant_referral_reward(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.distribute_merchant_referral_reward(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.distribute_merchant_referral_reward(uuid) FROM authenticated;
GRANT  EXECUTE ON FUNCTION public.distribute_merchant_referral_reward(uuid) TO service_role;

-- ── 13. settle_udhari_gateway_payment ────────────────────────────────────────
-- Risk: HIGH — settles store credit without gateway verification by caller
-- Callers: lib/sabpaisa/fulfillment.js (supabaseAdmin) after decrypted + verified callback
REVOKE EXECUTE ON FUNCTION public.settle_udhari_gateway_payment(uuid, uuid, bigint, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.settle_udhari_gateway_payment(uuid, uuid, bigint, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.settle_udhari_gateway_payment(uuid, uuid, bigint, text) FROM authenticated;
GRANT  EXECUTE ON FUNCTION public.settle_udhari_gateway_payment(uuid, uuid, bigint, text) TO service_role;

-- ── 14. settle_udhari_payment ────────────────────────────────────────────────
-- Risk: HIGH — settles wallet payment for udhari without caller verification
-- Callers: /api/udhari/pay/route.js (supabaseAdmin, JWT-validated)
REVOKE EXECUTE ON FUNCTION public.settle_udhari_payment(uuid, uuid, bigint, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.settle_udhari_payment(uuid, uuid, bigint, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.settle_udhari_payment(uuid, uuid, bigint, text) FROM authenticated;
GRANT  EXECUTE ON FUNCTION public.settle_udhari_payment(uuid, uuid, bigint, text) TO service_role;

-- ── 15. settle_store_credit_for_cart ─────────────────────────────────────────
-- Risk: HIGH — settles cart store credit without caller verification
-- Callers: /api/shopping/settle-store-credit/route.js (adminSupabase, JWT-validated)
REVOKE EXECUTE ON FUNCTION public.settle_store_credit_for_cart(uuid, uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.settle_store_credit_for_cart(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.settle_store_credit_for_cart(uuid, uuid) FROM authenticated;
GRANT  EXECUTE ON FUNCTION public.settle_store_credit_for_cart(uuid, uuid) TO service_role;

-- ── 16. finalize_wholesale_gateway_purchase ──────────────────────────────────
-- Risk: HIGH — finalizes wholesale order; no caller verification
-- Callers: lib/sabpaisa/fulfillment.js (supabaseAdmin) after verified payment
REVOKE EXECUTE ON FUNCTION public.finalize_wholesale_gateway_purchase(uuid, bigint) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.finalize_wholesale_gateway_purchase(uuid, bigint) FROM anon;
REVOKE EXECUTE ON FUNCTION public.finalize_wholesale_gateway_purchase(uuid, bigint) FROM authenticated;
GRANT  EXECUTE ON FUNCTION public.finalize_wholesale_gateway_purchase(uuid, bigint) TO service_role;

COMMIT;

-- ============================================================
-- VERIFICATION QUERY (run after apply to confirm grants):
-- SELECT routine_name, grantee, privilege_type
-- FROM information_schema.routine_privileges
-- WHERE routine_schema='public'
-- AND routine_name IN (
--   'perform_wallet_adjustment','increment_customer_wallet',
--   'customer_purchase_from_merchant','customer_purchase_from_platform',
--   'customer_bulk_purchase','customer_bulk_purchase_v2',
--   'finalize_gateway_orders','wallet_buy_gift_card',
--   'wallet_activate_gold_subscription','calculate_and_distribute_rewards',
--   'finalize_coupon_purchase','distribute_merchant_referral_reward',
--   'settle_udhari_gateway_payment','settle_udhari_payment',
--   'settle_store_credit_for_cart','finalize_wholesale_gateway_purchase'
-- )
-- ORDER BY routine_name, grantee;
-- Expected: only postgres and service_role rows appear for each function.
-- ============================================================

-- ============================================================
-- ROLLBACK (paste and run if any production flow breaks):
-- ============================================================
-- GRANT EXECUTE ON FUNCTION public.perform_wallet_adjustment(uuid,text,text,bigint,uuid,text,uuid,text,text) TO authenticated;
-- GRANT EXECUTE ON FUNCTION public.increment_customer_wallet(uuid,bigint,text,text,text,text) TO authenticated;
-- GRANT EXECUTE ON FUNCTION public.customer_purchase_from_merchant(uuid,integer,uuid) TO authenticated;
-- GRANT EXECUTE ON FUNCTION public.customer_purchase_from_platform(uuid,integer,uuid) TO authenticated;
-- GRANT EXECUTE ON FUNCTION public.customer_bulk_purchase(jsonb,uuid) TO authenticated;
-- GRANT EXECUTE ON FUNCTION public.customer_bulk_purchase_v2(jsonb[],uuid) TO authenticated;
-- GRANT EXECUTE ON FUNCTION public.finalize_gateway_orders(uuid,uuid,bigint) TO authenticated;
-- GRANT EXECUTE ON FUNCTION public.wallet_buy_gift_card(uuid,uuid) TO authenticated;
-- GRANT EXECUTE ON FUNCTION public.wallet_activate_gold_subscription(uuid,text,text) TO authenticated;
-- GRANT EXECUTE ON FUNCTION public.calculate_and_distribute_rewards(text,uuid,uuid,text,bigint) TO authenticated;
-- GRANT EXECUTE ON FUNCTION public.finalize_coupon_purchase(uuid,text) TO authenticated;
-- GRANT EXECUTE ON FUNCTION public.distribute_merchant_referral_reward(uuid) TO authenticated;
-- GRANT EXECUTE ON FUNCTION public.settle_udhari_gateway_payment(uuid,uuid,bigint,text) TO authenticated;
-- GRANT EXECUTE ON FUNCTION public.settle_udhari_payment(uuid,uuid,bigint,text) TO authenticated;
-- GRANT EXECUTE ON FUNCTION public.settle_store_credit_for_cart(uuid,uuid) TO authenticated;
-- GRANT EXECUTE ON FUNCTION public.finalize_wholesale_gateway_purchase(uuid,bigint) TO authenticated;
