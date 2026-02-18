-- Drop the problematic recursive policy
DROP POLICY IF EXISTS "merchants_update_own" ON public.merchants;

-- Create a simplified policy that avoids recursion
-- We trust the client/API to handle status changes for now, or use a trigger if strict enforcement is needed.
-- The verification logic server-side handles the status transition.
CREATE POLICY "merchants_update_own"
ON public.merchants
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Enable RLS on merchants table
ALTER TABLE public.merchants ENABLE ROW LEVEL SECURITY;

-- Policy 1: Allow merchant to read their own record
DROP POLICY IF EXISTS "Merchant can read own record" ON public.merchants;

CREATE POLICY "Merchant can read own record"
ON public.merchants
FOR SELECT
USING (
  auth.uid() = user_id
);

-- Policy 2: Allow admin to read all merchants
DROP POLICY IF EXISTS "Admin can read all merchants" ON public.merchants;

CREATE POLICY "Admin can read all merchants"
ON public.merchants
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.user_profiles
    WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
  )
);

-- Policy 3: Allow system (service role) to do everything (implicit, but good to know)
-- No explicit policy needed for service role as it bypasses RLS,
-- but we should ensure no other public access is allowed.
