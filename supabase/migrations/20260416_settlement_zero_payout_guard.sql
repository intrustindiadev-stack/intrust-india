-- ============================================================
-- Migration: 20260416_settlement_zero_payout_guard
-- Description:
--   1. Extends settlement_status CHECK constraint to allow 'settled_zero'
--      (terminal state used when computed merchant payout is zero/negative).
--   2. Replaces update_order_delivery_v3 with a hardened version that:
--      a. Requires order.status = 'completed', order.merchant_id IS NOT NULL,
--         and order.settlement_status = 'pending' before entering settlement.
--      b. Skips wallet credit and ledger INSERT when merchant_profit_paise <= 0,
--         setting settlement_status = 'settled_zero' instead.
--      c. Performs normal positive-payout settlement otherwise.
-- ============================================================

-- Step 1: Extend the CHECK constraint to include 'settled_zero'
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'shopping_order_groups_settlement_status_check'
    ) THEN
        ALTER TABLE public.shopping_order_groups
        DROP CONSTRAINT shopping_order_groups_settlement_status_check;
    END IF;

    ALTER TABLE public.shopping_order_groups
    ADD CONSTRAINT shopping_order_groups_settlement_status_check
    CHECK (settlement_status IN ('pending', 'settled', 'admin_takeover', 'settled_zero'));
END $$;

-- Step 2: Replace update_order_delivery_v3
CREATE OR REPLACE FUNCTION public.update_order_delivery_v3(
    p_order_id      uuid,
    p_new_status    text,
    p_tracking_number text,
    p_estimated_at  timestamptz,
    p_status_notes  text,
    p_is_admin      boolean DEFAULT false,
    p_is_merchant   boolean DEFAULT false,
    p_is_customer   boolean DEFAULT false
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_order       RECORD;
    v_user_id     uuid;
    v_caller_role text;
    v_payout      BIGINT;
BEGIN
    v_user_id := auth.uid();

    -- Verify the order exists
    SELECT * INTO v_order
    FROM public.shopping_order_groups
    WHERE id = p_order_id;

    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'message', 'Order not found');
    END IF;

    -- ── Authorization ────────────────────────────────────────────────────────
    IF p_is_admin THEN
        SELECT role INTO v_caller_role
        FROM public.user_profiles
        WHERE id = v_user_id;

        IF v_caller_role NOT IN ('admin', 'super_admin') THEN
            RETURN json_build_object('success', false, 'message', 'Unauthorized: Admin access required');
        END IF;

    ELSIF p_is_merchant THEN
        IF v_order.merchant_id IS NOT NULL THEN
            IF NOT EXISTS (
                SELECT 1 FROM public.merchants
                WHERE id = v_order.merchant_id AND user_id = v_user_id
            ) THEN
                RETURN json_build_object('success', false, 'message', 'Unauthorized: Access denied');
            END IF;
        END IF;

    ELSIF p_is_customer THEN
        IF v_order.customer_id != v_user_id THEN
            RETURN json_build_object('success', false, 'message', 'Unauthorized: Access denied');
        END IF;

    ELSE
        RETURN json_build_object('success', false, 'message', 'Unauthorized: Missing role flag');
    END IF;

    -- ── Apply delivery status update ─────────────────────────────────────────
    UPDATE public.shopping_order_groups
    SET delivery_status       = p_new_status,
        tracking_number       = p_tracking_number,
        estimated_delivery_at = p_estimated_at,
        status_notes          = p_status_notes,
        updated_at            = NOW()
    WHERE id = p_order_id;

    -- ── Settlement logic ─────────────────────────────────────────────────────
    -- Eligibility:
    --   • Order must be in 'completed' payment state (not pending/cancelled)
    --   • Must be a merchant order (merchant_id IS NOT NULL)
    --   • Settlement must still be pending (not already settled/taken over)
    --   • Delivery is progressing past 'pending' stage (merchant action)
    --   • Caller must be the merchant
    IF  v_order.status            = 'completed'
    AND v_order.merchant_id       IS NOT NULL
    AND v_order.settlement_status = 'pending'
    AND v_order.delivery_status   = 'pending'
    AND p_new_status IN ('packed', 'shipped', 'delivered')
    AND p_is_merchant = true
    THEN
        v_payout := COALESCE(v_order.merchant_profit_paise, 0);

        IF v_payout <= 0 THEN
            -- ── Zero / negative payout: mark terminal, skip wallet & ledger ──
            UPDATE public.shopping_order_groups
            SET settlement_status = 'settled_zero',
                updated_at        = NOW()
            WHERE id = p_order_id;

        ELSE
            -- ── Positive payout: credit wallet and write ledger row ───────────
            UPDATE public.merchants
            SET wallet_balance_paise        = COALESCE(wallet_balance_paise, 0)        + v_payout,
                total_commission_paid_paise = COALESCE(total_commission_paid_paise, 0) + COALESCE(v_order.platform_cut_paise, 0),
                updated_at = NOW()
            WHERE id = v_order.merchant_id;

            INSERT INTO public.merchant_transactions (
                merchant_id,
                transaction_type,
                amount_paise,
                commission_paise,
                balance_after_paise,
                description
            ) VALUES (
                v_order.merchant_id,
                'sale',
                v_payout,
                COALESCE(v_order.platform_cut_paise, 0),
                (SELECT wallet_balance_paise FROM public.merchants WHERE id = v_order.merchant_id),
                'Order #' || substring(p_order_id::text from 1 for 8) || ' profit settled (Merchant kept 70% profit share).'
            );

            UPDATE public.shopping_order_groups
            SET settlement_status = 'settled',
                updated_at        = NOW()
            WHERE id = p_order_id;
        END IF;
    END IF;

    RETURN json_build_object('success', true, 'message', 'Order delivery info updated successfully');
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'message', SQLERRM);
END;
$$;
