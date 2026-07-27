-- 20260727_crm_table_grants.sql
-- Fix "permission denied for table crm_tasks" and ensure proper table-level grants
-- for Supabase standard roles (authenticated, service_role, anon) on all CRM tables.
-- Note: Row Level Security (RLS) policies on each table continue to enforce granular row access.

GRANT ALL PRIVILEGES ON TABLE public.crm_leads TO authenticated, service_role;
GRANT SELECT ON TABLE public.crm_leads TO anon;

GRANT ALL PRIVILEGES ON TABLE public.crm_tasks TO authenticated, service_role;
GRANT SELECT ON TABLE public.crm_tasks TO anon;

GRANT ALL PRIVILEGES ON TABLE public.crm_lead_services TO authenticated, service_role;
GRANT SELECT ON TABLE public.crm_lead_services TO anon;

GRANT ALL PRIVILEGES ON TABLE public.crm_lead_activities TO authenticated, service_role;
GRANT SELECT ON TABLE public.crm_lead_activities TO anon;

GRANT ALL PRIVILEGES ON TABLE public.crm_lead_notes TO authenticated, service_role;
GRANT SELECT ON TABLE public.crm_lead_notes TO anon;

GRANT ALL PRIVILEGES ON TABLE public.audit_logs_crm TO authenticated, service_role;
GRANT SELECT ON TABLE public.audit_logs_crm TO anon;

-- Ensure sequence privileges for ID generation or sequences
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated, service_role, anon;
