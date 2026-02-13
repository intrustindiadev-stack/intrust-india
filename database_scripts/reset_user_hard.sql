-- Hard delete for the user to reset state completely
-- Replace phone number if needed

BEGIN;

-- 1. Delete OTP codes
DELETE FROM public.otp_codes WHERE phone LIKE '%6232809817';

-- 2. Delete User Profile (if foreign key doesn't cascade)
DELETE FROM public.user_profiles WHERE phone LIKE '%6232809817';

-- 3. Delete from Auth Users (this is the main one)
DELETE FROM auth.users WHERE phone LIKE '%6232809817';

COMMIT;
