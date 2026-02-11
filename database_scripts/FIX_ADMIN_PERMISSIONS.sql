-- ================================================
-- FIX: Grant Admin Permissions to Service Role
-- ================================================
-- Error: "permission denied for table orders" (42501)
-- Cause: Service role doesn't have explicit grants
-- ================================================

-- Grant service_role full access to orders table
GRANT ALL ON TABLE public.orders TO service_role;

-- Grant service_role full access to coupons table  
GRANT ALL ON TABLE public.coupons TO service_role;

-- Grant service_role usage on sequences (for auto-increment IDs if any)
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- ================================================
-- Verify Grants
-- ================================================
-- Run this to confirm:

SELECT 
    grantee,
    table_schema,
    table_name,
    privilege_type
FROM information_schema.role_table_grants
WHERE table_name IN ('orders', 'coupons')
  AND grantee = 'service_role';

-- Expected: Should show SELECT, INSERT, UPDATE, DELETE for both tables
