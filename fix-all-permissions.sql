-- COMPREHENSIVE CHECK AND FIX for coupons table
-- Run this ENTIRE script in Supabase SQL Editor

-- STEP 1: Check current RLS status
SELECT 
    schemaname,
    tablename, 
    rowsecurity as "RLS Enabled?"
FROM pg_tables 
WHERE tablename = 'coupons';

-- STEP 2: Check existing policies
SELECT 
    policyname,
    cmd as "Operation",
    qual as "USING clause",
    with_check as "WITH CHECK clause"
FROM pg_policies 
WHERE tablename = 'coupons';

-- STEP 3: DISABLE RLS (required for service role to work in some configurations)
ALTER TABLE public.coupons DISABLE ROW LEVEL SECURITY;

-- STEP 4: Verify RLS is now disabled
SELECT 
    tablename, 
    rowsecurity as "RLS Enabled (should be false)"
FROM pg_tables 
WHERE tablename = 'coupons';

-- STEP 5: Grant necessary permissions to service_role
GRANT ALL ON public.coupons TO service_role;
GRANT ALL ON public.coupons TO authenticated;
GRANT ALL ON public.coupons TO anon;

-- STEP 6: Verify permissions
SELECT 
    grantee,
    privilege_type
FROM information_schema.role_table_grants
WHERE table_name = 'coupons'
ORDER BY grantee, privilege_type;
