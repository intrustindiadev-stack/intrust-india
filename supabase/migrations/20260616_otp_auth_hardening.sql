-- Step 1.1 — Extend audit_action enum
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumtypid = 'public.audit_action'::regtype
      AND enumlabel = 'otp_requested'
  ) THEN
    ALTER TYPE public.audit_action ADD VALUE 'otp_requested';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumtypid = 'public.audit_action'::regtype
      AND enumlabel = 'otp_request_blocked'
  ) THEN
    ALTER TYPE public.audit_action ADD VALUE 'otp_request_blocked';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumtypid = 'public.audit_action'::regtype
      AND enumlabel = 'otp_verify_failed'
  ) THEN
    ALTER TYPE public.audit_action ADD VALUE 'otp_verify_failed';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumtypid = 'public.audit_action'::regtype
      AND enumlabel = 'otp_login_success'
  ) THEN
    ALTER TYPE public.audit_action ADD VALUE 'otp_login_success';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumtypid = 'public.audit_action'::regtype
      AND enumlabel = 'otp_login_no_account'
  ) THEN
    ALTER TYPE public.audit_action ADD VALUE 'otp_login_no_account';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumtypid = 'public.audit_action'::regtype
      AND enumlabel = 'otp_login_account_selection'
  ) THEN
    ALTER TYPE public.audit_action ADD VALUE 'otp_login_account_selection';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumtypid = 'public.audit_action'::regtype
      AND enumlabel = 'otp_account_selected'
  ) THEN
    ALTER TYPE public.audit_action ADD VALUE 'otp_account_selected';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumtypid = 'public.audit_action'::regtype
      AND enumlabel = 'user_created'
  ) THEN
    ALTER TYPE public.audit_action ADD VALUE 'user_created';
  END IF;
END;
$$;

-- Step 1.2 — Add ip_rate_limit_store table
CREATE TABLE IF NOT EXISTS public.ip_rate_limit_store (
  key text PRIMARY KEY,
  timestamps timestamptz[],
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ip_rate_limit_store_updated_at ON public.ip_rate_limit_store(updated_at);

-- Step 1.3 — Add otp_pepper_hash column to otp_codes
ALTER TABLE public.otp_codes
  ADD COLUMN IF NOT EXISTS pepper_hash text;

-- Step 1.4 — Create resolve_identities_by_phone() set-returning function
CREATE OR REPLACE FUNCTION public.resolve_identities_by_phone(phone_number text)
RETURNS SETOF uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  _clean text;
BEGIN
  _clean := right(regexp_replace(phone_number, '\D', '', 'g'), 10);

  IF _clean IS NULL OR length(_clean) < 10 THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT id FROM (
    -- Priority 1: phone-only users (pseudo-email pattern)
    SELECT id, 1 as priority
    FROM auth.users
    WHERE right(regexp_replace(phone, '\D', '', 'g'), 10) = _clean
      AND phone IS NOT NULL
      AND email ~ '^p[0-9]+@phone\.intrust\.internal$'

    UNION ALL

    -- Priority 2: any auth.users with matching phone (fallback)
    SELECT id, 2 as priority
    FROM auth.users
    WHERE right(regexp_replace(phone, '\D', '', 'g'), 10) = _clean
      AND phone IS NOT NULL

    UNION ALL

    -- Priority 3: user_profiles (Google users who linked phone)
    SELECT id, 3 as priority
    FROM public.user_profiles
    WHERE right(regexp_replace(phone, '\D', '', 'g'), 10) = _clean
      AND phone IS NOT NULL
  ) AS combined
  GROUP BY id
  ORDER BY MIN(priority) ASC;
END;
$$;

REVOKE ALL ON FUNCTION public.resolve_identities_by_phone(text) FROM public;
REVOKE ALL ON FUNCTION public.resolve_identities_by_phone(text) FROM anon;
REVOKE ALL ON FUNCTION public.resolve_identities_by_phone(text) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.resolve_identities_by_phone(text) TO service_role;

-- Step 1.5 — Create selection_tokens table
CREATE TABLE IF NOT EXISTS public.selection_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone text NOT NULL,
  account_ids uuid[] NOT NULL,
  expires_at timestamptz NOT NULL,
  is_used boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);
