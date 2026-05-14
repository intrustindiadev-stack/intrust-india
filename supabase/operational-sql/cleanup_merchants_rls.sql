-- Drop ALL existing policies to clean up the mess
DROP POLICY IF EXISTS "Users can view own merchant profile" ON public.merchants;
DROP POLICY IF EXISTS "Users can insert own merchant profile" ON public.merchants;
DROP POLICY IF EXISTS "Users can update own merchant profile" ON public.merchants;
DROP POLICY IF EXISTS "Users can create own merchant profile" ON public.merchants;
DROP POLICY IF EXISTS "Merchants can update own merchant data" ON public.merchants;
DROP POLICY IF EXISTS "merchants_select_own" ON public.merchants;
DROP POLICY IF EXISTS "merchants_insert_own" ON public.merchants;
DROP POLICY IF EXISTS "merchants_update_own" ON public.merchants;
DROP POLICY IF EXISTS "merchants_select_admin" ON public.merchants;
DROP POLICY IF EXISTS "merchants_update_admin" ON public.merchants;

-- Re-enable RLS to be sure
ALTER TABLE public.merchants ENABLE ROW LEVEL SECURITY;

-- 1. SELECT: Users can see their own, Admins can see all
CREATE POLICY "merchants_select_policy"
ON public.merchants
FOR SELECT
TO authenticated
USING (
    user_id = auth.uid()
    OR 
    (SELECT role FROM public.user_profiles WHERE id = auth.uid()) = 'admin'
);

-- 2. INSERT: Users can insert their own profile
-- We allow them to insert if they are authenticated and setting their own user_id
CREATE POLICY "merchants_insert_policy"
ON public.merchants
FOR INSERT
TO authenticated
WITH CHECK (
    user_id = auth.uid()
);

-- 3. UPDATE: Users can update their own profile
CREATE POLICY "merchants_update_policy"
ON public.merchants
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- 4. DELETE: Admins only (optional, but good practice)
CREATE POLICY "merchants_delete_policy"
ON public.merchants
FOR DELETE
TO authenticated
USING (
    (SELECT role FROM public.user_profiles WHERE id = auth.uid()) = 'admin'
);
