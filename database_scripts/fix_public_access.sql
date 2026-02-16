-- 1. Grant SELECT on merchants to anon and authenticated
-- This is required because the "Merchants can view own coupons" policy on the coupons table
-- performs a subquery on the merchants table. Even for users who don't pass the check,
-- Postgres must be able to "attempt" the read (which RLS will then filter to 0 rows).
GRANT SELECT ON public.merchants TO anon, authenticated;

-- 2. Ensure public/customers can view ALL available coupons
-- The existing policy "Merchants can view platform coupons" limited view to merchant_id IS NULL.
-- But customers should see ALL available coupons, whether from platform or merchants.

CREATE POLICY "Public can view available coupons"
ON public.coupons
FOR SELECT
USING (
  status = 'available'
);
