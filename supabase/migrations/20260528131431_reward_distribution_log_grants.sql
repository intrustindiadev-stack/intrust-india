-- Migration: Grant application-level privileges on reward_distribution_log
-- 
-- Context
-- -------
-- The table was created with RLS enabled but without explicit GRANT statements,
-- so neither the service-role logger (lib/rewardRpcResult.js) nor the PostgREST
-- authenticated reader (admin-only SELECT policy) had table-level permissions,
-- causing permission errors in the daily-login reward flow.
--
-- What this migration does
-- ------------------------
-- 1. service_role: INSERT — allows the server-side logger to write rows.
-- 2. authenticated: SELECT — allows the existing "Admins can view reward
--    distribution logs" RLS policy to work through PostgREST. Row-level access
--    is still gated by the policy; the grant only satisfies the table-level check.

-- 1. Write access for the service-role-backed logger
GRANT INSERT ON TABLE public.reward_distribution_log TO service_role;

-- 2. Read access so the admin-only SELECT RLS policy can work via PostgREST
GRANT SELECT ON TABLE public.reward_distribution_log TO authenticated;
