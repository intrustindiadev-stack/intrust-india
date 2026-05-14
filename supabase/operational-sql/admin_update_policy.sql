-- Allow Admins to UPDATE coupons
-- This requires checking the user_profiles table for the 'admin' role

CREATE POLICY "Admins can update coupons"
ON public.coupons
FOR UPDATE
USING (
  EXISTS (
    SELECT 1
    FROM public.user_profiles
    WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
  )
);
