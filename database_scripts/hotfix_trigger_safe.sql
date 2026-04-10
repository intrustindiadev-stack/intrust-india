-- ============================================================
-- HOTFIX: Safe trigger that works BEFORE the full migration is run.
-- Run this in Supabase SQL Editor immediately to restore Google/Phone auth.
-- After running the full email_auth_migration.sql, this trigger will be
-- replaced automatically by the migration's CREATE OR REPLACE FUNCTION.
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  name_val     text;
  avatar_val   text;
  provider_val text;
  has_email_col     boolean;
  has_provider_col  boolean;
BEGIN
  -- Extract name and avatar (Google OAuth + manual signups)
  name_val   := COALESCE(
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'name',
    'New User'
  );
  avatar_val := new.raw_user_meta_data->>'avatar_url';

  -- Determine the auth provider
  provider_val := COALESCE(new.app_metadata->>'provider', 'phone_otp');
  IF provider_val = 'phone' THEN
    provider_val := 'phone_otp';
  END IF;

  -- Check whether the new columns exist yet (migration may not have run)
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'user_profiles'
      AND column_name  = 'email'
  ) INTO has_email_col;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'user_profiles'
      AND column_name  = 'auth_provider'
  ) INTO has_provider_col;

  -- Insert using the appropriate column set
  IF has_email_col AND has_provider_col THEN
    INSERT INTO public.user_profiles (id, phone, full_name, avatar_url, role, email, auth_provider)
    VALUES (
      new.id,
      new.phone,
      name_val,
      avatar_val,
      'user',
      new.email,
      provider_val
    )
    ON CONFLICT (id) DO UPDATE
      SET email         = COALESCE(EXCLUDED.email, public.user_profiles.email),
          auth_provider = EXCLUDED.auth_provider;
  ELSE
    -- Fallback: original column set (pre-migration)
    INSERT INTO public.user_profiles (id, phone, full_name, avatar_url, role)
    VALUES (
      new.id,
      new.phone,
      name_val,
      avatar_val,
      'user'
    )
    ON CONFLICT (id) DO NOTHING;
  END IF;

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Re-attach the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
