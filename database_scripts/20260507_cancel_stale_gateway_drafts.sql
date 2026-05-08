-- =========================================================
-- MIGRATION: 20260507_cancel_stale_gateway_drafts.sql
--
-- PURPOSE:
--   Belt-and-braces safety net for payment gateway modal abandonment.
--   When a customer opens the SabPaisa modal and closes the browser tab
--   (or navigates away) before the CartClient.jsx onClose handler fires,
--   the shopping_order_groups row is left with:
--       payment_method = 'gateway'
--       payment_status = 'pending'
--       status         = 'pending'
--   and no SabPaisa callback ever arrives to clean it up.
--
--   This migration creates cancel_stale_gateway_drafts() and schedules
--   it every 6 hours via pg_cron so any draft older than 24 h is
--   automatically flipped to cancelled/cancelled.
--
-- IDEMPOTENT:
--   - CREATE OR REPLACE FUNCTION is safe to re-run.
--   - The cron schedule block uses IF NOT EXISTS so re-running does not
--     create duplicate jobs.
--   - The UPDATE itself is a no-op if no qualifying rows exist.
--
-- DATE: 2026-05-07
-- =========================================================


-- =========================================================
-- SECTION A: Define the sweep function
-- =========================================================
CREATE OR REPLACE FUNCTION public.cancel_stale_gateway_drafts()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_rows_affected integer;
BEGIN
    UPDATE public.shopping_order_groups
    SET status         = 'cancelled',
        payment_status = 'cancelled',
        updated_at     = NOW()
    WHERE payment_method  = 'gateway'
      AND payment_status  = 'pending'
      AND status          = 'pending'
      AND created_at      < NOW() - INTERVAL '24 hours';

    GET DIAGNOSTICS v_rows_affected = ROW_COUNT;

    IF v_rows_affected > 0 THEN
        RAISE NOTICE '[cancel_stale_gateway_drafts] Cancelled % stale gateway draft(s).', v_rows_affected;
    END IF;

    RETURN v_rows_affected;
END;
$$;

-- Grant execute only to service_role (no client-facing exposure)
GRANT EXECUTE ON FUNCTION public.cancel_stale_gateway_drafts() TO service_role;


-- =========================================================
-- SECTION B: Schedule the sweep via pg_cron
--   Runs every 6 hours — sensible cadence given a 24-hour
--   staleness window.  Pattern mirrors reward-expiry-daily.
-- =========================================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM cron.job WHERE jobname = 'cancel-stale-gateway-drafts'
    ) THEN
        PERFORM cron.schedule(
            'cancel-stale-gateway-drafts',
            '0 */6 * * *',
            $cmd$SELECT public.cancel_stale_gateway_drafts()$cmd$
        );
        RAISE NOTICE '[cancel_stale_gateway_drafts] pg_cron job scheduled (every 6 h).';
    ELSE
        RAISE NOTICE '[cancel_stale_gateway_drafts] pg_cron job already exists — skipping.';
    END IF;
END $$;


-- =========================================================
-- Verification Queries:
--   SELECT public.cancel_stale_gateway_drafts();
--   SELECT * FROM cron.job WHERE jobname = 'cancel-stale-gateway-drafts';
-- =========================================================
