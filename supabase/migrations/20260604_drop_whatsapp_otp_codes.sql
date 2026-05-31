-- Drop the table whatsapp_otp_codes safely

-- Revoke all grants as a defensive measure, since previous migrations
-- explicitly granted permissions to anon, authenticated, service_role
REVOKE ALL ON TABLE public.whatsapp_otp_codes FROM anon, authenticated, service_role;

-- Drop the table safely
DROP TABLE IF EXISTS public.whatsapp_otp_codes;
