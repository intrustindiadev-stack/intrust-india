-- Migration: Reward Point Expiry System
-- Date: 2026-05-08
-- Description: Implements daily reward point expiry for inactivity and warning notifications.

-- 1. Seed the point_expiry configuration row
INSERT INTO public.reward_configuration (config_key, config_type, config_value, description)
VALUES (
  'point_expiry',
  'global',
  '{"enabled": true, "expiry_days": 365, "warn_days_before": 30}'::jsonb,
  'Configuration for reward point expiry and inactivity warnings'
)
ON CONFLICT (config_key) DO NOTHING;

-- 2. Create expire_stale_reward_points() function
CREATE OR REPLACE FUNCTION public.expire_stale_reward_points()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_config jsonb;
  v_enabled boolean;
  v_expiry_days int;
  v_cutoff timestamp;
  v_expired_count int := 0;
  v_user_row record;
  v_points_to_expire bigint;
BEGIN
  -- Read config
  SELECT config_value INTO v_config 
  FROM public.reward_configuration 
  WHERE config_key = 'point_expiry';

  IF v_config IS NULL OR NOT (v_config->>'enabled')::boolean THEN
    RETURN jsonb_build_object('success', false, 'reason', 'disabled');
  END IF;

  v_expiry_days := (v_config->>'expiry_days')::int;
  
  -- Compute cutoff
  v_cutoff := now() - (v_expiry_days || ' days')::INTERVAL;

  -- Loop over qualifying balances
  FOR v_user_row IN 
    SELECT user_id, current_balance 
    FROM public.reward_points_balance
    WHERE current_balance > 0 
    AND last_calculated_at < v_cutoff
  LOOP
    -- Idempotency guard: check if already expired today
    IF EXISTS (
      SELECT 1 FROM public.reward_transactions
      WHERE user_id = v_user_row.user_id
      AND event_type = 'expiry'
      AND created_at::date = CURRENT_DATE
    ) THEN
      CONTINUE;
    END IF;

    v_points_to_expire := v_user_row.current_balance;

    -- Insert expiry transaction
    INSERT INTO public.reward_transactions (
      user_id, 
      event_type, 
      points, 
      points_before, 
      points_after, 
      description
    ) VALUES (
      v_user_row.user_id,
      'expiry',
      -v_points_to_expire,
      v_user_row.current_balance,
      0,
      'Points expired due to inactivity'
    );

    -- Update balance (do not touch last_calculated_at as expiry is not activity)
    UPDATE public.reward_points_balance
    SET 
      current_balance = 0,
      updated_at = now()
    WHERE user_id = v_user_row.user_id;

    -- Send notification
    INSERT INTO public.notifications (
      user_id, 
      title, 
      body, 
      type, 
      reference_type
    ) VALUES (
      v_user_row.user_id,
      '⏰ Reward Points Expired',
      v_points_to_expire || ' reward points have expired due to inactivity.',
      'warning',
      'reward_expiry'
    );

    v_expired_count := v_expired_count + 1;
  END LOOP;

  RETURN jsonb_build_object('success', true, 'expired_count', v_expired_count);
END;
$$;

-- 3. Create warn_expiring_reward_points() function
CREATE OR REPLACE FUNCTION public.warn_expiring_reward_points()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_config jsonb;
  v_expiry_days int;
  v_warn_days_before int;
  v_warn_cutoff timestamp;
  v_expiry_cutoff timestamp;
  v_warned_count int := 0;
  v_user_row record;
BEGIN
  -- Read config
  SELECT config_value INTO v_config 
  FROM public.reward_configuration 
  WHERE config_key = 'point_expiry';

  IF v_config IS NULL OR NOT (v_config->>'enabled')::boolean THEN
    RETURN jsonb_build_object('success', false, 'reason', 'disabled');
  END IF;

  v_expiry_days := (v_config->>'expiry_days')::int;
  v_warn_days_before := (v_config->>'warn_days_before')::int;
  
  -- Compute cutoffs
  v_warn_cutoff := now() - ((v_expiry_days - v_warn_days_before) || ' days')::INTERVAL;
  v_expiry_cutoff := now() - (v_expiry_days || ' days')::INTERVAL;

  -- Loop over qualifying users
  FOR v_user_row IN 
    SELECT user_id, current_balance 
    FROM public.reward_points_balance
    WHERE current_balance > 0 
    AND last_calculated_at < v_warn_cutoff
    AND last_calculated_at >= v_expiry_cutoff
  LOOP
    -- Idempotency guard: check if already warned today
    IF EXISTS (
      SELECT 1 FROM public.notifications
      WHERE user_id = v_user_row.user_id
      AND reference_type = 'reward_expiry_warning'
      AND created_at::date = CURRENT_DATE
    ) THEN
      CONTINUE;
    END IF;

    -- Send warning notification
    INSERT INTO public.notifications (
      user_id, 
      title, 
      body, 
      type, 
      reference_type
    ) VALUES (
      v_user_row.user_id,
      '⚠️ Reward Points Expiring Soon',
      v_user_row.current_balance || ' reward points will expire in ' || v_warn_days_before || ' days. Earn or redeem to keep them active.',
      'warning',
      'reward_expiry_warning'
    );

    v_warned_count := v_warned_count + 1;
  END LOOP;

  RETURN jsonb_build_object('success', true, 'warned_count', v_warned_count);
END;
$$;

-- 4. Create trigger to reset last_calculated_at on every credit OR redemption
--    Redemption (wallet_conversion) counts as activity because the user is
--    actively engaging with their points, consistent with UX messaging that
--    says "redeem to keep them active."
CREATE OR REPLACE FUNCTION public.reset_expiry_clock_on_activity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.reward_points_balance
  SET
    last_calculated_at = now(),
    updated_at = now()
  WHERE user_id = NEW.user_id;
  RETURN NEW;
END;
$$;

-- Drop old function if it still exists
DROP FUNCTION IF EXISTS public.reset_expiry_clock_on_credit() CASCADE;

DROP TRIGGER IF EXISTS trg_reset_expiry_clock ON public.reward_transactions;
CREATE TRIGGER trg_reset_expiry_clock
  AFTER INSERT ON public.reward_transactions
  FOR EACH ROW
  WHEN (
    -- Positive points (credit events)
    NEW.points > 0
    OR
    -- wallet_conversion (redemption) also qualifies as activity
    NEW.event_type = 'wallet_conversion'
  )
  EXECUTE FUNCTION public.reset_expiry_clock_on_activity();

-- 5. Schedule pg_cron jobs
DO $$
BEGIN
  -- Unschedule existing jobs if any for idempotency
  PERFORM cron.unschedule('reward-expiry-daily');
  PERFORM cron.unschedule('reward-expiry-warn-daily');

  -- Schedule daily at 2:00 AM IST (approx 20:30 UTC previous day)
  -- Note: pg_cron uses UTC by default unless configured otherwise.
  -- 20:30 UTC = 02:00 AM IST (+5:30)
  PERFORM cron.schedule('reward-expiry-daily', '30 20 * * *', 'SELECT public.expire_stale_reward_points()');
  PERFORM cron.schedule('reward-expiry-warn-daily', '30 20 * * *', 'SELECT public.warn_expiring_reward_points()');
END $$;

-- 6. Add RLS policies for service_role on notifications
DROP POLICY IF EXISTS "Service role can insert notifications" ON public.notifications;
CREATE POLICY "Service role can insert notifications"
  ON public.notifications FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Verification Queries:
-- SELECT * FROM cron.job;
-- SELECT public.expire_stale_reward_points();
-- SELECT public.warn_expiring_reward_points();
