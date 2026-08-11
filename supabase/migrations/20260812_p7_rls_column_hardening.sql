-- ============================================================
-- INTRUST INDIA — P7: RLS & Column Guard Hardening
-- Migration: 20260812_p7_rls_column_hardening.sql
--
-- Addresses:
--   FINDING-A07: coupons UPDATE — no column restriction allows merchants
--                to recirculate sold/expired coupons or zero-price them
--   FINDING-A08: transactions INSERT — users self-inserting records
--   FINDING-A10: draft_cart_orders — uses caller-supplied p_customer_id,
--                no auth.uid() check. Replace with internal derivation.
--
-- Verified:
--   - merchants column guard already protects wallet_balance_paise ✅
--   - user_profiles guard already protects role, kyc_status, etc. ✅
--   - shopping_order_groups has order_groups_merchant_column_guard trigger ✅
--
-- Date: 2026-08-12
-- ============================================================

BEGIN;

-- ── 1. coupons — add column guard trigger ──────────────────────────────────
-- Problem: merchants can UPDATE status back to 'available' on sold coupons,
-- and can UPDATE selling_price_paise to zero or negative.
-- The existing RLS policy has USING but no WITH CHECK column restriction.

CREATE OR REPLACE FUNCTION public.coupons_merchant_column_guard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
    -- Allow service_role and postgres superuser to bypass
    IF current_setting('role', true) = 'service_role' OR current_user = 'postgres' THEN
        RETURN NEW;
    END IF;

    -- Check if caller is an admin
    IF EXISTS (
        SELECT 1 FROM public.user_profiles
        WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    ) THEN
        RETURN NEW; -- Admins can update any column
    END IF;

    -- For non-admin callers (merchants via RLS), enforce column restrictions:

    -- Block status changes that would re-activate sold or expired coupons
    IF NEW.status IS DISTINCT FROM OLD.status THEN
        -- Merchants can only deactivate (active → inactive), not reactivate sold/expired
        IF OLD.status IN ('sold', 'expired', 'cancelled') THEN
            RAISE EXCEPTION 'Coupon status % cannot be changed by merchant. Contact admin.', OLD.status;
        END IF;
        -- Only allow active ↔ inactive transitions by merchant
        IF NEW.status NOT IN ('active', 'inactive') THEN
            RAISE EXCEPTION 'Merchants can only set coupon status to active or inactive.';
        END IF;
    END IF;

    -- Block price manipulation
    IF NEW.selling_price_paise IS DISTINCT FROM OLD.selling_price_paise THEN
        IF NEW.selling_price_paise <= 0 THEN
            RAISE EXCEPTION 'selling_price_paise must be greater than zero.';
        END IF;
    END IF;

    -- Block merchant_id reassignment (prevents coupon theft)
    IF NEW.merchant_id IS DISTINCT FROM OLD.merchant_id THEN
        RAISE EXCEPTION 'merchant_id is immutable after creation.';
    END IF;

    -- Block user_id reassignment (prevents ownership transfer)
    IF NEW.user_id IS DISTINCT FROM OLD.user_id THEN
        RAISE EXCEPTION 'user_id is immutable after creation.';
    END IF;

    -- Block sold_at and purchased_by manipulation
    IF NEW.sold_at IS DISTINCT FROM OLD.sold_at THEN
        RAISE EXCEPTION 'sold_at is system-set and immutable.';
    END IF;
    IF NEW.purchased_by IS DISTINCT FROM OLD.purchased_by THEN
        RAISE EXCEPTION 'purchased_by is system-set and immutable.';
    END IF;
    IF NEW.order_id IS DISTINCT FROM OLD.order_id THEN
        RAISE EXCEPTION 'order_id is system-set and immutable.';
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS coupons_merchant_column_guard ON public.coupons;
CREATE TRIGGER coupons_merchant_column_guard
    BEFORE UPDATE ON public.coupons
    FOR EACH ROW EXECUTE FUNCTION public.coupons_merchant_column_guard();


-- ── 2. transactions INSERT — remove direct insert capability ────────────────
-- Problem: Users can self-insert transaction records with arbitrary fields.
-- Transactions should only be created by server-side financial RPCs.
-- Current policy: WITH CHECK (auth.uid() = user_id)
-- Action: Drop the user INSERT policy entirely. Only service_role inserts.
DROP POLICY IF EXISTS "Users can insert own transactions" ON public.transactions;

-- Ensure service_role can still insert (for server-side financial flows)
-- (service_role bypasses RLS entirely, so no explicit policy needed,
--  but add a note for documentation clarity)
DO $$
BEGIN
    RAISE NOTICE 'P7: transactions INSERT policy removed. Only service_role (RLS bypass) may create transaction records.';
END;
$$;


-- ── 3. draft_cart_orders — replace caller-supplied p_customer_id with auth.uid() ──
-- Problem: Browser passes p_customer_id from JS — can be any UUID.
-- Fix: Derive customer_id from auth.uid() internally; ignore p_customer_id.
-- The function's parameter is kept for signature compatibility but overridden.
-- Browser-side code passes userId which equals auth.uid() for legitimate users,
-- so this change is transparent for all legitimate calls.

CREATE OR REPLACE FUNCTION public.draft_cart_orders(p_customer_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_caller_uid    UUID;
    v_customer_id   UUID;
    v_draft_group   UUID;
    v_cart_items    RECORD;
    v_item_count    INTEGER := 0;
    v_total_paise   BIGINT := 0;
BEGIN
    -- ── AUTHORIZATION: Always derive caller identity from auth.uid() ──────
    -- Ignore p_customer_id entirely. This prevents IDOR — a browser cannot
    -- order on behalf of another user by supplying a different UUID.
    v_caller_uid := auth.uid();

    IF v_caller_uid IS NULL THEN
        -- service_role calls (e.g. server-side cart seeding) can still supply p_customer_id
        -- because auth.uid() is NULL for service_role calls inside SECURITY DEFINER.
        -- In that case, trust p_customer_id (caller is already authenticated at server level).
        IF p_customer_id IS NULL THEN
            RAISE EXCEPTION 'Caller identity could not be determined.';
        END IF;
        v_customer_id := p_customer_id;
    ELSE
        -- Regular authenticated user: ALWAYS use auth.uid(), never p_customer_id.
        v_customer_id := v_caller_uid;
    END IF;

    -- ── Cancel any existing DRAFT for this customer ───────────────────────
    UPDATE public.shopping_order_groups
    SET status = 'cancelled', updated_at = now()
    WHERE customer_id = v_customer_id
      AND status = 'draft';

    -- ── Create new DRAFT group ────────────────────────────────────────────
    INSERT INTO public.shopping_order_groups (customer_id, status, created_at, updated_at)
    VALUES (v_customer_id, 'draft', now(), now())
    RETURNING id INTO v_draft_group;

    -- ── Copy cart items into draft order items ────────────────────────────
    FOR v_cart_items IN
        SELECT
            sc.product_id,
            sc.quantity,
            mi.retail_price_paise,
            mi.merchant_id,
            mi.id AS inventory_id
        FROM public.shopping_cart sc
        JOIN public.merchant_inventory mi ON mi.id = sc.inventory_id
        WHERE sc.user_id = v_customer_id
          AND mi.is_active = true
          AND mi.stock_quantity >= sc.quantity
    LOOP
        INSERT INTO public.shopping_order_items (
            order_group_id,
            inventory_id,
            merchant_id,
            quantity,
            unit_price_paise,
            created_at,
            updated_at
        ) VALUES (
            v_draft_group,
            v_cart_items.inventory_id,
            v_cart_items.merchant_id,
            v_cart_items.quantity,
            v_cart_items.retail_price_paise,
            now(),
            now()
        );

        v_total_paise := v_total_paise + (v_cart_items.retail_price_paise * v_cart_items.quantity);
        v_item_count  := v_item_count + 1;
    END LOOP;

    IF v_item_count = 0 THEN
        -- Clean up the empty draft
        DELETE FROM public.shopping_order_groups WHERE id = v_draft_group;
        RETURN jsonb_build_object(
            'success', false,
            'message', 'No valid items in cart. Items may be out of stock or unavailable.'
        );
    END IF;

    -- ── Update draft with total ───────────────────────────────────────────
    UPDATE public.shopping_order_groups
    SET total_amount_paise = v_total_paise, updated_at = now()
    WHERE id = v_draft_group;

    RETURN jsonb_build_object(
        'success', true,
        'group_id', v_draft_group,
        'item_count', v_item_count,
        'total_paise', v_total_paise
    );
END;
$$;

-- Revoke anon access (authenticated browser users keep EXECUTE via session)
REVOKE EXECUTE ON FUNCTION public.draft_cart_orders(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.draft_cart_orders(uuid) FROM anon;
GRANT  EXECUTE ON FUNCTION public.draft_cart_orders(uuid) TO authenticated;
GRANT  EXECUTE ON FUNCTION public.draft_cart_orders(uuid) TO service_role;

DO $$
BEGIN
    RAISE NOTICE 'P7: draft_cart_orders now derives customer_id from auth.uid() internally. p_customer_id is only used for service_role server-side calls. anon access revoked.';
END;
$$;

COMMIT;

-- ============================================================
-- ROLLBACK:
-- DROP TRIGGER IF EXISTS coupons_merchant_column_guard ON public.coupons;
-- DROP FUNCTION IF EXISTS public.coupons_merchant_column_guard();
-- CREATE POLICY "Users can insert own transactions" ON public.transactions
--   FOR INSERT WITH CHECK (auth.uid() = user_id);
-- (restore original draft_cart_orders from backup or previous migration)
-- ============================================================
