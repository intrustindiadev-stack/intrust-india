-- Migration: 20260519_backfill_phone_and_pseudo_emails
-- Normalizes user_profiles.phone, clears legacy UUID pseudo-emails from user_profiles,
-- and defensively backfills any auth.users rows without a corresponding profile.

-- =============================================================================
-- Section A — Normalize user_profiles.phone to canonical +91XXXXXXXXXX
-- =============================================================================
-- Targets the 8 rows confirmed to be in 91XXXXXXXXXX form (missing the + prefix).
-- Uses the normalize_in_phone() helper deployed in the previous migration.
-- Idempotent: rows already in +91... form are unchanged.
UPDATE public.user_profiles
SET phone = public.normalize_in_phone(phone)
WHERE phone IS NOT NULL
  AND phone <> ''
  AND phone <> public.normalize_in_phone(phone);

-- =============================================================================
-- Section B — Clear legacy UUID pseudo-emails from user_profiles
-- =============================================================================
-- The old auth flow stored phone-<uuid>@intrust.internal in user_profiles.email
-- for phone-only users. These should be NULL in user_profiles; the stable
-- p<phone>@phone.intrust.internal address lives only in auth.users and is managed
-- by the Node script (Step 3). Only real user emails belong in user_profiles.email.
UPDATE public.user_profiles
SET email = NULL
WHERE email ~ '^phone-[0-9a-f]{8}-([0-9a-f]{4}-){3}[0-9a-f]{12}@intrust\.internal$';

-- =============================================================================
-- Section C — Defensive missing-profile backfill
-- =============================================================================
-- Even though counts are currently 48 = 48, this guard ensures any auth.users
-- row without a profile gets one, using the same logic as the handle_new_user
-- trigger deployed in the previous migration.
INSERT INTO public.user_profiles (
  id,
  phone,
  full_name,
  avatar_url,
  role,
  referral_code,
  email,
  auth_provider,
  email_verified,
  email_verified_at
)
SELECT
  u.id,
  public.normalize_in_phone(u.phone),
  COALESCE(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name', 'New User'),
  u.raw_user_meta_data->>'avatar_url',
  'user',
  upper(substring(md5(random()::text || u.id::text) from 1 for 6)),
  CASE
    WHEN u.email ~ '^phone-[0-9a-f]{8}-([0-9a-f]{4}-){3}[0-9a-f]{12}@intrust\.internal$'
    THEN NULL
    ELSE u.email
  END,
  COALESCE(NULLIF(u.raw_app_meta_data->>'provider', 'phone'), 'phone_otp'),
  CASE
    WHEN COALESCE(u.raw_app_meta_data->>'provider', '') = 'google' THEN true
    ELSE false
  END,
  CASE
    WHEN COALESCE(u.raw_app_meta_data->>'provider', '') = 'google' THEN now()
    ELSE NULL
  END
FROM auth.users u
LEFT JOIN public.user_profiles p ON p.id = u.id
WHERE p.id IS NULL
ON CONFLICT (id) DO NOTHING;

-- Backfill reward_points_balance for any newly inserted profiles.
INSERT INTO public.reward_points_balance (
  user_id,
  current_balance,
  total_earned,
  total_redeemed,
  tier,
  tree_size,
  direct_referrals,
  active_downline
)
SELECT
  id,
  0, 0, 0,
  'bronze',
  0, 0, 0
FROM public.user_profiles
WHERE id NOT IN (SELECT user_id FROM public.reward_points_balance)
ON CONFLICT (user_id) DO NOTHING;
