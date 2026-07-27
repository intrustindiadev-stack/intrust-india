-- 20260727_grant_all_public_tables.sql
-- Fix "permission denied for table salary_records" and ensure proper table-level grants
-- across all existing and future tables in the public schema for standard Supabase roles.
-- Note: Row Level Security (RLS) policies remain active on all tables to enforce granular row access control.

-- 1. Explicitly grant permissions on all HRM & Career tables
GRANT ALL PRIVILEGES ON TABLE public.salary_records TO authenticated, service_role, anon;
GRANT ALL PRIVILEGES ON TABLE public.attendance TO authenticated, service_role, anon;
GRANT ALL PRIVILEGES ON TABLE public.leave_requests TO authenticated, service_role, anon;
GRANT ALL PRIVILEGES ON TABLE public.employees TO authenticated, service_role, anon;
GRANT ALL PRIVILEGES ON TABLE public.employee_documents TO authenticated, service_role, anon;
GRANT ALL PRIVILEGES ON TABLE public.attendance_logs TO authenticated, service_role, anon;
GRANT ALL PRIVILEGES ON TABLE public.leave_balances TO authenticated, service_role, anon;
GRANT ALL PRIVILEGES ON TABLE public.audit_logs_hrm TO authenticated, service_role, anon;
GRANT ALL PRIVILEGES ON TABLE public.training_materials TO authenticated, service_role, anon;
GRANT ALL PRIVILEGES ON TABLE public.career_job_roles TO authenticated, service_role, anon;
GRANT ALL PRIVILEGES ON TABLE public.career_applications TO authenticated, service_role, anon;

-- 2. Grant table-level access across ALL existing tables and sequences in public schema
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO authenticated, service_role, anon;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO authenticated, service_role, anon;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO authenticated, service_role, anon;

-- 3. Configure default privileges so future tables automatically receive table-level permissions
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO authenticated, service_role, anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO authenticated, service_role, anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO authenticated, service_role, anon;
