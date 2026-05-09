-- ============================================================================
-- BACKFILL: Purchase Reward Points for Historical Orders
-- Date: 2026-05-09
-- Description:
--   One-off backfill script to credit purchase reward points that were missed
--   due to the Level 0 rate_per_100rs bug fixed in:
--   supabase/migrations/20260509_fix_purchase_level0_reward.sql
--
-- PREREQUISITES:
--   Apply 20260509_fix_purchase_level0_reward.sql FIRST so the fixed function
--   is live before running this script.
--
-- SAFETY:
--   Safe to re-run. idx_reward_txn_idempotent (defined in
--   20260508_reward_idempotency.sql) causes ON CONFLICT DO NOTHING inside the
--   function, and GET DIAGNOSTICS v_rows_inserted = 0 skips balance updates —
--   so a second run produces 0 new credits.
--
-- USAGE:
--   psql -h <host> -U <user> -d <db> -f scripts/backfill_purchase_rewards.sql
-- ============================================================================

DO $$
DECLARE
    -- Counters
    v_orders_processed   INT := 0;
    v_gift_orders_processed INT := 0;
    v_points_distributed BIGINT := 0;
    v_errors             INT := 0;
    v_skipped            INT := 0;

    -- Loop records
    v_group   RECORD;
    v_order   RECORD;
    v_result  JSONB;
    v_distributed BIGINT;
BEGIN

    -- -------------------------------------------------------------------------
    -- Pass 1: shopping_order_groups WHERE payment_status = 'paid'
    -- Mirrors the callsite in app/api/shopping/wallet-checkout/route.js
    -- p_reference_id = group id (shopping_order_groups.id)
    -- -------------------------------------------------------------------------
    RAISE NOTICE 'BACKFILL: Starting shopping_order_groups pass...';

    FOR v_group IN
        SELECT id, customer_id, total_amount_paise
        FROM public.shopping_order_groups
        WHERE payment_status = 'paid'
        ORDER BY created_at
    LOOP
        BEGIN
            v_result := public.calculate_and_distribute_rewards(
                'purchase',
                v_group.customer_id,
                v_group.id,
                'shopping_order',
                v_group.total_amount_paise
            );

            v_distributed := COALESCE((v_result->>'total_distributed')::BIGINT, 0);

            IF v_distributed = 0 THEN
                v_skipped := v_skipped + 1;
            ELSE
                v_points_distributed := v_points_distributed + v_distributed;
            END IF;

            v_orders_processed := v_orders_processed + 1;

        EXCEPTION WHEN OTHERS THEN
            v_errors := v_errors + 1;
            RAISE WARNING 'BACKFILL ERROR (shopping_order_group id=%): %', v_group.id, SQLERRM;
        END;
    END LOOP;

    RAISE NOTICE 'BACKFILL: shopping_order_groups pass complete. processed=%, points=%, skipped(idempotent)=%',
        v_orders_processed, v_points_distributed, v_skipped;

    -- -------------------------------------------------------------------------
    -- Pass 2: orders WHERE payment_status = 'paid' AND giftcard_id IS NOT NULL
    -- Mirrors the callsite in app/api/gift-cards/buy-wallet/route.js and
    -- app/api/sabpaisa/callback/route.js
    -- p_reference_id = giftcard_id (the coupon UUID) to match idx_reward_txn_idempotent
    -- -------------------------------------------------------------------------
    RAISE NOTICE 'BACKFILL: Starting gift card orders pass...';

    FOR v_order IN
        SELECT id, user_id, giftcard_id, amount
        FROM public.orders
        WHERE payment_status = 'paid'
          AND giftcard_id IS NOT NULL
        ORDER BY created_at
    LOOP
        BEGIN
            v_result := public.calculate_and_distribute_rewards(
                'purchase',
                v_order.user_id,
                v_order.giftcard_id,    -- reference_id = giftcard_id (coupon UUID)
                'gift_card_purchase',
                v_order.amount          -- amount column is BIGINT paise
            );

            v_distributed := COALESCE((v_result->>'total_distributed')::BIGINT, 0);

            IF v_distributed = 0 THEN
                v_skipped := v_skipped + 1;
            ELSE
                v_points_distributed := v_points_distributed + v_distributed;
            END IF;

            v_gift_orders_processed := v_gift_orders_processed + 1;

        EXCEPTION WHEN OTHERS THEN
            v_errors := v_errors + 1;
            RAISE WARNING 'BACKFILL ERROR (orders id=%, giftcard_id=%): %',
                v_order.id, v_order.giftcard_id, SQLERRM;
        END;
    END LOOP;

    RAISE NOTICE 'BACKFILL: gift card orders pass complete. processed=%, skipped(idempotent)=%',
        v_gift_orders_processed, v_skipped;

    -- -------------------------------------------------------------------------
    -- Summary
    -- -------------------------------------------------------------------------
    RAISE NOTICE 'BACKFILL COMPLETE: shopping_orders=%, gift_card_orders=%, total_points_distributed=%, errors=%',
        v_orders_processed,
        v_gift_orders_processed,
        v_points_distributed,
        v_errors;

    IF v_errors > 0 THEN
        RAISE NOTICE 'BACKFILL: % error(s) encountered — check WARNING messages above for details.', v_errors;
    END IF;

END;
$$;
