BEGIN;

-- SECTION A: DRY RUN — Identify duplicate phone-only auth.users created after regression
-- Find auth.users rows created on/after 2026-06-15 where:
--   • email matches the pseudo-email pattern (^p[0-9]+@phone\.intrust\.internal$)
--   • AND another auth.users row exists with the same normalized phone (last 10 digits)
--     that was created BEFORE 2026-06-15

SELECT 
    new_user.id AS duplicate_id,
    new_user.created_at AS duplicate_created_at,
    new_user.phone AS duplicate_phone,
    orig_user.id AS original_id,
    orig_user.created_at AS original_created_at
FROM auth.users new_user
JOIN auth.users orig_user 
  ON right(regexp_replace(new_user.phone, '\D', '', 'g'), 10) = right(regexp_replace(orig_user.phone, '\D', '', 'g'), 10)
WHERE new_user.created_at >= '2026-06-15'
  AND new_user.email ~ '^p[0-9]+@phone\.intrust\.internal$'
  AND orig_user.created_at < '2026-06-15'
  AND new_user.id <> orig_user.id;

-- SECTION B: DRY RUN — Identify affected user_profiles with NULL phone
-- Find user_profiles where phone IS NULL but the corresponding auth.users.phone is non-null

SELECT up.id, au.phone AS auth_phone, au.email AS auth_email
FROM public.user_profiles up
JOIN auth.users au ON up.id = au.id
WHERE up.phone IS NULL 
  AND au.phone IS NOT NULL;


-- SECTION C: MERGE/RELINK — For each duplicate new row:
--   1. Identify the original merchant's user_id (the pre-regression row)
--   2. UPDATE merchants SET user_id = <original_id> WHERE user_id = <duplicate_id>
--   3. UPDATE any other FK tables (reward_points_balance, otp_codes, etc.) similarly
--   4. DELETE the duplicate auth.users row via auth.admin API (note: must be done via
--      Supabase Admin API or service-role call, not raw SQL on auth.users)

-- (Manual step to be done by admin/script, but here is the template for relinking)
/*
UPDATE merchants SET user_id = '<original_id>' WHERE user_id = '<duplicate_id>';
UPDATE reward_points_balance SET user_id = '<original_id>' WHERE user_id = '<duplicate_id>';
UPDATE otp_codes SET phone = '<original_phone>' WHERE phone = '<duplicate_phone>';
*/


-- SECTION D: BACKFILL user_profiles.phone
-- UPDATE public.user_profiles up
-- SET phone = public.normalize_in_phone(au.phone)
-- FROM auth.users au
-- WHERE au.id = up.id
--   AND up.phone IS NULL
--   AND au.phone IS NOT NULL
--   AND au.email ~ '^p[0-9]+@phone\.intrust\.internal$'

UPDATE public.user_profiles up
SET phone = public.normalize_in_phone(au.phone)
FROM auth.users au
WHERE au.id = up.id
  AND up.phone IS NULL
  AND au.phone IS NOT NULL
  AND au.email ~ '^p[0-9]+@phone\.intrust\.internal$';

ROLLBACK; -- Remove this line and replace with COMMIT after dry-run review
