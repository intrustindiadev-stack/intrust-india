-- Clear OTP history for a specific phone number to reset rate limits
-- Replace the phone number with yours
DELETE FROM public.otp_codes WHERE phone = '6232809817';

-- OR clear all history (for development only)
-- TRUNCATE TABLE public.otp_codes;
