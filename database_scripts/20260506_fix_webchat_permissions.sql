-- 20260506_fix_webchat_permissions.sql
-- Grant permissions to authenticated users and service_role for webchat tables

GRANT ALL ON TABLE public.webchat_sessions TO authenticated, service_role;
GRANT ALL ON TABLE public.webchat_messages TO authenticated, service_role;

-- Verify grants (optional, for manual check)
-- SELECT grantee, privilege_type FROM information_schema.role_table_grants WHERE table_name = 'webchat_sessions';
