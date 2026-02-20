-- ================================================
-- FIX: Grant Permissions to Anon Role
-- ================================================
-- The marketplace page uses the client-side Supabase client.
-- If the user is not logged in, they are 'anon'.
-- Even logged-in users uses the client which might rely on public access for public data.
-- We MUST grant SELECT to anon for the coupons table.
-- ================================================

GRANT SELECT ON public.coupons TO anon;

-- Also ensure the policy allows anon (it does, but let's be explicit)
-- The policy "anyone_view_available_coupons" covers it.

-- Let's also check if we need to grant usage on the schema
GRANT USAGE ON SCHEMA public TO anon;

-- Verify
SELECT 
    grantee, 
    table_name, 
    privilege_type 
FROM information_schema.role_table_grants 
WHERE table_name = 'coupons' AND grantee = 'anon';
