-- Fix permissions for WhatsApp related tables so the service_role (and backend APIs) can access them.
-- These tables were missing standard Supabase role grants.

GRANT ALL ON TABLE public.user_channel_bindings TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.whatsapp_otp_codes TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.whatsapp_message_logs TO anon, authenticated, service_role;
