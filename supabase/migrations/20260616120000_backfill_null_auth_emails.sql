-- Migration: Backfill NULL emails for phone users
--
-- This migration fixes the verify-otp lockout issue (Finding A1/A2) where legacy
-- phone-only accounts created via phone OTP have `email IS NULL` in auth.users,
-- which prevents the magic-link minting process used for session exchange.
--
-- Note on GoTrue direct updates: This repository deliberately routes most auth.users
-- mutations through the GoTrue admin API. A direct SQL update of email and
-- email_confirmed_at is acceptable here because phone-only users have no email
-- identity row to keep in sync, and OTP login only requires auth.users.email
-- to be populated.
-- 
-- Safe/idempotent: only updates rows where email IS NULL and ensures the derived
-- pseudo-email is not already taken.

/* 
-- PREVIEW QUERY (Run to see affected rows before committing):
SELECT 
    id, 
    phone, 
    'p' || right(regexp_replace(phone, '\D', '', 'g'), 10) || '@phone.intrust.internal' AS new_email
FROM auth.users
WHERE email IS NULL
  AND phone IS NOT NULL
  AND length(regexp_replace(phone, '\D', '', 'g')) >= 10;
*/

BEGIN;

UPDATE auth.users u
SET 
    email = 'p' || right(regexp_replace(u.phone, '\D', '', 'g'), 10) || '@phone.intrust.internal',
    email_confirmed_at = COALESCE(u.email_confirmed_at, now())
WHERE u.email IS NULL
  AND u.phone IS NOT NULL
  AND length(regexp_replace(u.phone, '\D', '', 'g')) >= 10
  -- Dedup guard: ensure the computed email doesn't already exist
  AND NOT EXISTS (
      SELECT 1 
      FROM auth.users u2 
      WHERE u2.email = 'p' || right(regexp_replace(u.phone, '\D', '', 'g'), 10) || '@phone.intrust.internal'
  );

COMMIT;
