-- ============================================================
-- Email Auth Migration
-- Run this in the Supabase SQL Editor
-- ============================================================

-- 1. Add email-auth columns to user_profiles
ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS email_verified       boolean     NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS email_verified_at    timestamptz,
  ADD COLUMN IF NOT EXISTS failed_login_attempts integer    NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS locked_until         timestamptz,
  ADD COLUMN IF NOT EXISTS auth_provider        text        NOT NULL DEFAULT 'phone_otp';

-- 2. Create auth_tokens table for OTP rate-limiting and email verification
-- NOTE: Live schema uses email + token_type columns (not token_hash + type).
-- This matches the application code in lib/ and app/api/auth/.
CREATE TABLE IF NOT EXISTS public.auth_tokens (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email       text        NOT NULL,
  token_type  text        NOT NULL CHECK (token_type IN ('email_verification', 'password_reset', 'otp')),
  sent_at     timestamptz NOT NULL DEFAULT now(),
  expires_at  timestamptz NOT NULL,
  used_at     timestamptz,
  ip_address  text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- Index for fast lookup by user + token type
CREATE INDEX IF NOT EXISTS idx_auth_tokens_user_type
  ON public.auth_tokens (user_id, token_type, created_at DESC);

-- 3. RLS on auth_tokens – only service_role may read/write
ALTER TABLE public.auth_tokens ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies first (idempotent)
DROP POLICY IF EXISTS "Service role only - auth_tokens" ON public.auth_tokens;

CREATE POLICY "Service role only - auth_tokens"
  ON public.auth_tokens
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- 4. Extend the audit_action enum with email-auth events
-- NOTE: Postgres does not support IF NOT EXISTS on ALTER TYPE … ADD VALUE.
-- Use a DO block to check first.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumtypid = 'public.audit_action'::regtype
      AND enumlabel = 'email_signup'
  ) THEN
    ALTER TYPE public.audit_action ADD VALUE 'email_signup';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumtypid = 'public.audit_action'::regtype
      AND enumlabel = 'email_login'
  ) THEN
    ALTER TYPE public.audit_action ADD VALUE 'email_login';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumtypid = 'public.audit_action'::regtype
      AND enumlabel = 'email_login_failed'
  ) THEN
    ALTER TYPE public.audit_action ADD VALUE 'email_login_failed';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumtypid = 'public.audit_action'::regtype
      AND enumlabel = 'password_reset_requested'
  ) THEN
    ALTER TYPE public.audit_action ADD VALUE 'password_reset_requested';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumtypid = 'public.audit_action'::regtype
      AND enumlabel = 'password_reset_completed'
  ) THEN
    ALTER TYPE public.audit_action ADD VALUE 'password_reset_completed';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumtypid = 'public.audit_action'::regtype
      AND enumlabel = 'account_locked'
  ) THEN
    ALTER TYPE public.audit_action ADD VALUE 'account_locked';
  END IF;
END;
$$;

-- 5. Update the handle_new_user trigger to capture email + auth_provider
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

    -- Determine the auth provider (FIXED: use raw_app_meta_data, not app_metadata)
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
          auth_provider     = EXCLUDED.auth_provider,
          email_verified    = CASE WHEN EXCLUDED.auth_provider = 'google' THEN true ELSE public.user_profiles.email_verified END,
          email_verified_at = CASE WHEN EXCLUDED.auth_provider = 'google' AND public.user_profiles.email_verified_at IS NULL THEN now() ELSE public.user_profiles.email_verified_at END;

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
