-- Single source of truth. Do NOT redefine in other migrations.
CREATE OR REPLACE FUNCTION public.get_user_id_by_phone(phone_number text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  _clean   text;
  _user_id uuid;
BEGIN
  _clean := right(regexp_replace(phone_number, '\D', '', 'g'), 10);

  IF _clean IS NULL OR length(_clean) < 10 THEN
    RETURN NULL;
  END IF;

  -- Priority 1: phone-only users (pseudo-email pattern)
  SELECT id INTO _user_id
  FROM auth.users
  WHERE right(regexp_replace(phone, '\D', '', 'g'), 10) = _clean
    AND phone IS NOT NULL
    AND email ~ '^p[0-9]+@phone\.intrust\.internal$'
  LIMIT 1;

  IF _user_id IS NOT NULL THEN
    RETURN _user_id;
  END IF;

  -- Priority 2: any auth.users with matching phone (fallback)
  SELECT id INTO _user_id
  FROM auth.users
  WHERE right(regexp_replace(phone, '\D', '', 'g'), 10) = _clean
    AND phone IS NOT NULL
  LIMIT 1;

  IF _user_id IS NOT NULL THEN
    RETURN _user_id;
  END IF;

  -- Priority 3: user_profiles (Google users who linked phone)
  SELECT id INTO _user_id
  FROM public.user_profiles
  WHERE right(regexp_replace(phone, '\D', '', 'g'), 10) = _clean
    AND phone IS NOT NULL
  LIMIT 1;

  RETURN _user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_user_id_by_phone(text) TO anon, authenticated, service_role;
