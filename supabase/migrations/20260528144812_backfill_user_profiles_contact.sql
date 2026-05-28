-- Migration: 20260528144812_backfill_user_profiles_contact.sql
-- Purpose: Backfill user_profiles.email and merchants contact info from auth.users, and make handle_new_user idempotent for non-null emails.

-- 1. Backfill user_profiles.email
DO $$
DECLARE
  _row_count int;
BEGIN
  UPDATE public.user_profiles up 
  SET 
    email = au.email, 
    updated_at = now()
  FROM auth.users au 
  WHERE up.id = au.id 
    AND (up.email IS NULL OR up.email = '');
  GET DIAGNOSTICS _row_count = ROW_COUNT;
  RAISE NOTICE 'Updated % user_profiles rows with email', _row_count;
END $$;

-- 2. Backfill merchants contact info
DO $$
DECLARE
  _row_count int;
BEGIN
  UPDATE public.merchants m 
  SET 
    business_email = COALESCE(NULLIF(m.business_email,''), up.email, au.email), 
    business_phone = COALESCE(NULLIF(m.business_phone,''), up.phone),
    updated_at = now()
  FROM public.user_profiles up 
  JOIN auth.users au ON au.id = up.id 
  WHERE up.id = m.user_id
    AND (
      (NULLIF(m.business_email,'') IS NULL AND COALESCE(up.email, au.email) IS NOT NULL)
      OR 
      (NULLIF(m.business_phone,'') IS NULL AND up.phone IS NOT NULL)
    );
  GET DIAGNOSTICS _row_count = ROW_COUNT;
  RAISE NOTICE 'Updated % merchants rows with contact info', _row_count;
END $$;

-- 3. Update public.handle_new_user() to be idempotent
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
      phone = COALESCE(NULLIF(public.user_profiles.phone, ''), public.normalize_in_phone(EXCLUDED.phone)),
      email = COALESCE(NULLIF(public.user_profiles.email, ''), EXCLUDED.email),
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

/*
-- Down migration:
-- This is destructive to real data that should be preserved, so typically we wouldn't 
-- rollback contact info backfills. But if absolutely needed:

-- Revert handle_new_user to previous logic:
CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
... (previous implementation with strict overwrite of email/phone) ...
$$;
*/
