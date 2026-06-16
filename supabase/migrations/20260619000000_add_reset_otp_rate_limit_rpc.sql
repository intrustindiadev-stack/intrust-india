-- 20260619000000_add_reset_otp_rate_limit_rpc.sql

CREATE OR REPLACE FUNCTION public.reset_otp_rate_limit(p_phone text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Delete OTP codes for this phone number
    DELETE FROM public.otp_codes WHERE phone = p_phone;

    -- Delete rate limit store records for this phone number
    DELETE FROM public.ip_rate_limit_store WHERE key = 'otp:phone:' || p_phone;
END;
$$;
