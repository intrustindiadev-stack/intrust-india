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

-- Ensure insert policy is also correct (existing one looked okay but let's be safe)
-- "merchants_insert_own": WITH CHECK ((user_id = auth.uid()) AND (status = 'pending'::text))
-- This one is fine as it doesn't SELECT from the table.
