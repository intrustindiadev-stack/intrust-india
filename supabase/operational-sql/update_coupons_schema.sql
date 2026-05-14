-- Add merchant_id to coupons table
ALTER TABLE public.coupons
ADD COLUMN IF NOT EXISTS merchant_id uuid REFERENCES public.merchants(id);

-- Add purchased_by_merchant_at timestamp
ALTER TABLE public.coupons
ADD COLUMN IF NOT EXISTS purchased_by_merchant_at timestamp with time zone;

-- Create RLS policies for coupons
-- First, drop existing policies to ensure clean state
DROP POLICY IF EXISTS "Merchants can view own coupons" ON public.coupons;
DROP POLICY IF EXISTS "Merchants can view platform coupons" ON public.coupons;
DROP POLICY IF EXISTS "Admins can view all coupons" ON public.coupons;

-- Enable RLS
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;

-- 1. Merchants can view their own coupons
CREATE POLICY "Merchants can view own coupons"
ON public.coupons
FOR SELECT
USING (
  merchant_id IN (
    SELECT id FROM public.merchants 
    WHERE user_id = auth.uid()
  )
);

-- 2. Merchants can view platform coupons (available to buy)
CREATE POLICY "Merchants can view platform coupons"
ON public.coupons
FOR SELECT
USING (
  merchant_id IS NULL 
  AND status = 'available'
);

-- 3. Admins can view all coupons
CREATE POLICY "Admins can view all coupons"
ON public.coupons
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
);
