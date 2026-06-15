-- Create atomic rate limiting function
CREATE OR REPLACE FUNCTION public.check_rate_limit(p_key text, p_max_requests int, p_window_seconds int)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_timestamps timestamp[];
    v_threshold timestamp;
BEGIN
    v_threshold := (now() at time zone 'utc') - (p_window_seconds || ' seconds')::interval;

    -- Ensure row exists and lock it
    INSERT INTO public.ip_rate_limit_store (key, timestamps, updated_at)
    VALUES (p_key, ARRAY[]::timestamp[], (now() at time zone 'utc')::timestamp)
    ON CONFLICT (key) DO NOTHING;

    SELECT ARRAY(
        SELECT t FROM unnest(timestamps) t WHERE t > v_threshold
    ) INTO v_timestamps
    FROM public.ip_rate_limit_store
    WHERE key = p_key FOR UPDATE;

    IF coalesce(array_length(v_timestamps, 1), 0) >= p_max_requests THEN
        -- Trim old timestamps even if rejecting
        UPDATE public.ip_rate_limit_store
        SET timestamps = v_timestamps,
            updated_at = (now() at time zone 'utc')::timestamp
        WHERE key = p_key;
        RETURN false;
    ELSE
        -- Append current timestamp and allow
        UPDATE public.ip_rate_limit_store
        SET timestamps = array_append(v_timestamps, (now() at time zone 'utc')::timestamp),
            updated_at = (now() at time zone 'utc')::timestamp
        WHERE key = p_key;
        RETURN true;
    END IF;
END;
$$;
