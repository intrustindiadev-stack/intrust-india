-- Migration: 20260926020000_expire_stale_gateway_orders.sql
-- Description: Automatically expire stale pending gateway orders, wholesale drafts, and initiated transactions older than timeout (default 30 mins)

-- 1. Create or replace public.expire_stale_gateway_orders function
CREATE OR REPLACE FUNCTION public.expire_stale_gateway_orders(p_timeout_minutes INT DEFAULT 30)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_threshold TIMESTAMPTZ;
    v_expired_orders INT := 0;
    v_backfilled_orders INT := 0;
    v_expired_wholesale INT := 0;
    v_expired_txns INT := 0;
BEGIN
    v_threshold := NOW() - (p_timeout_minutes || ' minutes')::interval;

    -- A. Expire stale draft shopping order groups (payment_method = 'gateway' AND status = 'pending' AND payment_status = 'pending')
    WITH expired_groups AS (
        UPDATE public.shopping_order_groups
        SET status = 'cancelled',
            payment_status = 'failed',
            delivery_status = 'cancelled',
            updated_at = NOW()
        WHERE payment_method = 'gateway'
          AND status = 'pending'
          AND payment_status = 'pending'
          AND created_at < v_threshold
        RETURNING id
    )
    SELECT COUNT(*) INTO v_expired_orders FROM expired_groups;

    -- B. Also backfill older cancelled gateway orders whose payment_status was left as 'pending'
    WITH backfilled_groups AS (
        UPDATE public.shopping_order_groups
        SET payment_status = 'failed',
            updated_at = NOW()
        WHERE payment_method = 'gateway'
          AND status = 'cancelled'
          AND payment_status = 'pending'
        RETURNING id
    )
    SELECT COUNT(*) INTO v_backfilled_orders FROM backfilled_groups;

    -- C. Expire stale wholesale drafts that were left in pending
    WITH expired_wdrafts AS (
        UPDATE public.wholesale_order_drafts
        SET status = 'failed',
            failure_reason = 'Payment session timed out (auto-expired)',
            updated_at = NOW()
        WHERE status = 'pending'
          AND created_at < v_threshold
        RETURNING id
    )
    SELECT COUNT(*) INTO v_expired_wholesale FROM expired_wdrafts;

    -- D. Mark initiated transactions that are older than the threshold and not yet fulfilled as failed
    WITH expired_transactions AS (
        UPDATE public.transactions
        SET status = 'failed',
            sabpaisa_message = 'Payment session timed out (auto-expired)',
            updated_at = NOW()
        WHERE status = 'initiated'
          AND fulfilled_at IS NULL
          AND created_at < v_threshold
        RETURNING id
    )
    SELECT COUNT(*) INTO v_expired_txns FROM expired_transactions;

    RETURN jsonb_build_object(
        'success', true,
        'threshold', v_threshold,
        'expired_orders', v_expired_orders,
        'backfilled_orders', v_backfilled_orders,
        'expired_wholesale', v_expired_wholesale,
        'expired_transactions', v_expired_txns
    );
END;
$$;

-- 2. Restrict execute permissions
REVOKE EXECUTE ON FUNCTION public.expire_stale_gateway_orders(INT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.expire_stale_gateway_orders(INT) FROM anon;
GRANT EXECUTE ON FUNCTION public.expire_stale_gateway_orders(INT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.expire_stale_gateway_orders(INT) TO service_role;

-- 3. Initial run to reconcile historical stale records
SELECT public.expire_stale_gateway_orders(30);
