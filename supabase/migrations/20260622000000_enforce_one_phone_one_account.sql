-- 20260622000000_enforce_one_phone_one_account.sql

-- Add a unique constraint/index on the normalized last-10 phone number in user_profiles
CREATE UNIQUE INDEX IF NOT EXISTS user_profiles_normalized_phone_idx
ON public.user_profiles (right(regexp_replace(phone, '\D', '', 'g'), 10))
WHERE phone IS NOT NULL AND length(regexp_replace(phone, '\D', '', 'g')) >= 10;

-- Update reset_otp_rate_limit to handle both format types
CREATE OR REPLACE FUNCTION public.reset_otp_rate_limit(p_phone text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  _norm text;
  _clean text;
BEGIN
  _norm := public.normalize_in_phone(p_phone);
  _clean := right(regexp_replace(p_phone, '\D', '', 'g'), 10);

  -- Delete OTP codes matching either format
  DELETE FROM public.otp_codes 
  WHERE phone = _norm OR phone = _clean;

  -- Delete rate limit store records matching either format
  DELETE FROM public.ip_rate_limit_store 
  WHERE key = 'otp:phone:' || _norm OR key = 'otp:phone:' || _clean;
END;
$$;
