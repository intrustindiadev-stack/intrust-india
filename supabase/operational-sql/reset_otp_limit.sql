-- =============================================================================
-- Reset OTP and Rate Limits for a Specific Phone Number
-- =============================================================================
-- This script clears both the OTP codes history and the rate limiter rows
-- to instantly unblock a user who is hitting rate limits.
--
-- Usage in psql:
--   psql -U postgres -d postgres -v phone='9425993111' -f reset_otp_limit.sql
--
-- Usage in SQL Editor (Supabase Dashboard / pgAdmin):
--   Change the '9425993111' phone number to the target 10-digit phone number.
-- =============================================================================

-- 1. Parameter setting (for psql CLI use)
-- If not running in psql CLI, you can comment out the line below and replace
-- :'phone' in queries with your literal phone number (e.g. '9425993111').
\set phone '9425993111'

-- 2. Clear OTP attempts/codes
DELETE FROM public.otp_codes 
WHERE phone = :'phone';

-- 3. Clear rate limit store key for this phone
DELETE FROM public.ip_rate_limit_store 
WHERE key = 'otp:phone:' || :'phone';

-- =============================================================================
-- Alternative: Using the reset_otp_rate_limit() RPC function
-- =============================================================================
-- You can also run the following single-call query:
--
-- SELECT public.reset_otp_rate_limit(:'phone');
-- =============================================================================
