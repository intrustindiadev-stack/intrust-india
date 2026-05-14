-- ============================================================
-- Account Merge Migration
-- Run this in the Supabase SQL Editor
-- ============================================================

-- 1. Add 'account_linked' to the audit_action enum
--    Uses the safe DO block pattern (same as email_auth_migration.sql)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumtypid = 'public.audit_action'::regtype
      AND enumlabel = 'account_linked'
  ) THEN
    ALTER TYPE public.audit_action ADD VALUE 'account_linked';
  END IF;
END;
$$;

-- 2. Update the handle_new_user trigger to gracefully handle
--    auth_provider = 'multiple' — never overwrite 'multiple' with a single-provider value.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  name_val     text;
  avatar_val   text;
  provider_val text;
BEGIN
  BEGIN
    -- Extract name and avatar from raw_user_meta_data (OAuth providers + manual signups)
    name_val   := COALESCE(
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'name',
      'New User'
    );
    avatar_val := new.raw_user_meta_data->>'avatar_url';

    -- Determine the auth provider (use raw_app_meta_data, not app_metadata)
    provider_val := COALESCE(new.raw_app_meta_data->>'provider', 'phone_otp');
    IF provider_val = 'phone' THEN
      provider_val := 'phone_otp';
    END IF;

    INSERT INTO public.user_profiles (
      id, phone, full_name, avatar_url, role, email,
      auth_provider, email_verified, email_verified_at
    )
    VALUES (
      new.id,
      new.phone,
      name_val,
      avatar_val,
      'user',
      new.email,
      provider_val,
      CASE WHEN provider_val = 'google' THEN true ELSE false END,
      CASE WHEN provider_val = 'google' THEN now() ELSE NULL END
    )
    ON CONFLICT (id) DO UPDATE
      SET email             = COALESCE(EXCLUDED.email, public.user_profiles.email),
          -- Never downgrade 'multiple' back to a single-provider value
          auth_provider     = CASE
                                WHEN public.user_profiles.auth_provider = 'multiple' THEN 'multiple'
                                ELSE EXCLUDED.auth_provider
                              END,
          email_verified    = CASE
                                WHEN EXCLUDED.auth_provider = 'google' THEN true
                                ELSE public.user_profiles.email_verified
                              END,
          email_verified_at = CASE
                                WHEN EXCLUDED.auth_provider = 'google'
                                  AND public.user_profiles.email_verified_at IS NULL
                                THEN now()
                                ELSE public.user_profiles.email_verified_at
                              END;

  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING '[handle_new_user] Failed to upsert user_profiles for user %: %', new.id, SQLERRM;
  END;

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Re-attach the trigger (idempotent)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
