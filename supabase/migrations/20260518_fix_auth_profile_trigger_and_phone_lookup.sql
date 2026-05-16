-- Section 1: public.normalize_in_phone(text) helper
CREATE OR REPLACE FUNCTION public.normalize_in_phone(p_raw text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    stripped text;
BEGIN
    IF p_raw IS NULL THEN
        RETURN NULL;
    END IF;

    stripped := regexp_replace(p_raw, '\D', '', 'g');

    IF length(stripped) < 10 THEN
        RETURN NULL;
    END IF;

    RETURN '+91' || right(stripped, 10);
END;
$$;

-- Section 2: public.handle_new_user()
CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  name_val text;
  avatar_val text;
  provider_val text;
  new_code text;
  code_exists boolean;
BEGIN
  -- 1. Extract metadata
  name_val := COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', 'New User');
  avatar_val := NEW.raw_user_meta_data->>'avatar_url';

  -- 2. Determine provider
  provider_val := COALESCE(NEW.raw_app_meta_data->>'provider', 'phone_otp');
  IF provider_val = 'phone' THEN 
    provider_val := 'phone_otp'; 
  END IF;

  -- 3. Generate unique referral code
  LOOP
    new_code := upper(substring(md5(random()::text || clock_timestamp()::text) from 1 for 6));
    SELECT EXISTS (SELECT 1 FROM public.user_profiles WHERE referral_code = new_code) INTO code_exists;
    EXIT WHEN NOT code_exists;
  END LOOP;

  -- 4. Inner block for inserts
  BEGIN
    INSERT INTO public.user_profiles (
      id, phone, full_name, avatar_url, role, referral_code, email, auth_provider, email_verified, email_verified_at
    ) VALUES (
      NEW.id,
      public.normalize_in_phone(NEW.phone),
      name_val,
      avatar_val,
      'user',
      new_code,
      NEW.email,
      provider_val,
      CASE WHEN provider_val = 'google' THEN true ELSE false END,
      CASE WHEN provider_val = 'google' THEN now() ELSE NULL END
    )
    ON CONFLICT (id) DO UPDATE SET
      phone = COALESCE(public.normalize_in_phone(EXCLUDED.phone), public.user_profiles.phone),
      email = COALESCE(EXCLUDED.email, public.user_profiles.email),
      auth_provider = CASE WHEN public.user_profiles.auth_provider = 'multiple' THEN 'multiple' ELSE EXCLUDED.auth_provider END,
      email_verified = CASE WHEN EXCLUDED.auth_provider = 'google' THEN true ELSE public.user_profiles.email_verified END,
      email_verified_at = CASE WHEN EXCLUDED.auth_provider = 'google' AND public.user_profiles.email_verified_at IS NULL THEN now() ELSE public.user_profiles.email_verified_at END;

    INSERT INTO public.reward_points_balance
      (user_id, current_balance, total_earned, total_redeemed, tier, tree_size, direct_referrals, active_downline)
    VALUES (NEW.id, 0, 0, 0, 'bronze', 0, 0, 0)
    ON CONFLICT (user_id) DO NOTHING;

  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING '[handle_new_user] Failed to upsert user_profiles for user %: %', NEW.id, SQLERRM;
  END;

  RETURN NEW;
END;
$$;

-- Section 3: public.get_user_id_by_phone(phone_number text)
CREATE OR REPLACE FUNCTION public.get_user_id_by_phone(phone_number text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  _clean text;
  _user_id uuid;
BEGIN
  _clean := right(regexp_replace(phone_number, '\D', '', 'g'), 10);
  
  IF length(_clean) < 10 OR _clean IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT id INTO _user_id FROM (
    SELECT id FROM auth.users WHERE right(regexp_replace(phone, '\D', '', 'g'), 10) = _clean AND phone IS NOT NULL
    UNION ALL
    SELECT id FROM public.user_profiles WHERE right(regexp_replace(phone, '\D', '', 'g'), 10) = _clean AND phone IS NOT NULL
  ) sub LIMIT 1;

  RETURN _user_id;
END;
$$;

-- Section 4: Re-attach the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
