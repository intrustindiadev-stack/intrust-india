-- Fix RLS Policies for Coupons Table
-- Run this in Supabase SQL Editor

-- OPTION 1: Temporarily disable RLS on coupons table (for testing)
ALTER TABLE public.coupons DISABLE ROW LEVEL SECURITY;

-- Verify it's disabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'coupons';
-- Should show rowsecurity = false

-- After this, try creating a gift card again in the admin panel
-- It should work now!

-- ============================================
-- OPTION 2: If you want to keep RLS enabled, use these policies instead:
-- ============================================

/*
-- Re-enable RLS
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Public read access to available coupons" ON public.coupons;
DROP POLICY IF EXISTS "Users can view their purchased coupons" ON public.coupons;
DROP POLICY IF EXISTS "Admin full access to coupons" ON public.coupons;

-- Allow public to read available coupons (for marketplace)
CREATE POLICY "public_read_available_coupons"
ON public.coupons
FOR SELECT
TO anon, authenticated
USING (status = 'available');

-- Allow users to read their own purchased coupons
CREATE POLICY "users_read_own_coupons"
ON public.coupons
FOR SELECT
TO authenticated
USING (purchased_by = auth.uid());

-- Allow service role to do everything (for admin operations)
CREATE POLICY "service_role_all_access"
ON public.coupons
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);
*/
