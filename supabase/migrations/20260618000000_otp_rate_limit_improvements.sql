-- 20260618000000_otp_rate_limit_improvements.sql

-- Drop the old function if the signature is different
DROP FUNCTION IF EXISTS public.check_rate_limit(text, int, int);

-- Create atomic rate limiting function returning jsonb to include retry_after
CREATE OR REPLACE FUNCTION public.check_rate_limit(p_key text, p_max_requests int, p_window_seconds int)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_timestamps timestamptz[];
    v_threshold timestamptz;
    v_retry_after int := 0;
BEGIN
    v_threshold := now() - make_interval(secs => p_window_seconds);

    -- Ensure row exists and lock it
    INSERT INTO public.ip_rate_limit_store (key, timestamps, updated_at)
    VALUES (p_key, ARRAY[]::timestamptz[], now())
    ON CONFLICT (key) DO NOTHING;

    SELECT ARRAY(
        SELECT t FROM unnest(timestamps) t WHERE t > v_threshold
    ) INTO v_timestamps
    FROM public.ip_rate_limit_store
    WHERE key = p_key FOR UPDATE;

    IF coalesce(array_length(v_timestamps, 1), 0) >= p_max_requests THEN
        -- Reject
        v_retry_after := GREATEST(0, CEIL(EXTRACT(epoch FROM (v_timestamps[1] + make_interval(secs => p_window_seconds) - now()))))::int;
        UPDATE public.ip_rate_limit_store
        SET timestamps = v_timestamps,
            updated_at = now()
        WHERE key = p_key;
        RETURN jsonb_build_object('allowed', false, 'retry_after', v_retry_after);
    ELSE
        -- Allow
        UPDATE public.ip_rate_limit_store
        SET timestamps = array_append(v_timestamps, now()),
            updated_at = now()
        WHERE key = p_key;
        RETURN jsonb_build_object('allowed', true, 'retry_after', 0);
    END IF;
END;
$$;

-- Create rollback function to remove the most recent timestamp for a key
CREATE OR REPLACE FUNCTION public.rollback_rate_limit(p_key text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_timestamps timestamptz[];
BEGIN
    SELECT timestamps INTO v_timestamps
    FROM public.ip_rate_limit_store
    WHERE key = p_key FOR UPDATE;

    IF FOUND AND coalesce(array_length(v_timestamps, 1), 0) > 0 THEN
        -- Remove the most recent timestamp (which is at the end of the array)
        UPDATE public.ip_rate_limit_store
        SET timestamps = v_timestamps[1 : array_length(v_timestamps, 1) - 1],
            updated_at = now()
        WHERE key = p_key;
    END IF;
END;
$$;
