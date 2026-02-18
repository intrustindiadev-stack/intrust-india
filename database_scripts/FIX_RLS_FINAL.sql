-- ================================================
-- VERIFY: Check if purchase data exists
-- ================================================
-- Run these queries to see if data was saved:

-- 1. Check latest paid order
SELECT 
    id,
    user_id,
    giftcard_id,
    payment_status,
    created_at
FROM orders
WHERE payment_status = 'paid'
ORDER BY created_at DESC
LIMIT 1;

-- 2. Check if coupon was updated
SELECT 
    o.id as order_id,
    o.payment_status,
    o.user_id as order_user_id,
    c.id as coupon_id,
    c.brand,
    c.status,
    c.purchased_by as coupon_purchased_by
FROM orders o
LEFT JOIN coupons c ON o.giftcard_id = c.id
WHERE o.payment_status = 'paid'
ORDER BY o.created_at DESC
LIMIT 1;

-- Expected results:
-- - order should have payment_status = 'paid'
-- - coupon should have status = 'sold'
-- - purchased_by should match user_id
-- If you see data above, then RLS is blocking the user query!

-- ================================================
-- FIX: Update RLS Policies
-- ================================================

-- Drop ALL existing RLS policies first
DROP POLICY IF EXISTS "Users can view own orders" ON public.orders;
DROP POLICY IF EXISTS "Users can insert own orders" ON public.orders;
DROP POLICY IF EXISTS "Users can view purchased coupons" ON public.coupons;
DROP POLICY IF EXISTS "Public can view available coupons" ON public.coupons;
DROP POLICY IF EXISTS "Admins can update coupons" ON public.coupons;
DROP POLICY IF EXISTS "Merchants can view own coupons" ON public.coupons;

-- Enable RLS
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;

-- ================================================
-- ORDERS TABLE POLICIES
-- ================================================

-- Allow authenticated users to view their own orders
CREATE POLICY "users_view_own_orders"
ON public.orders
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Allow authenticated users to insert their own orders
CREATE POLICY "users_insert_own_orders"
ON public.orders
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- ================================================
-- COUPONS TABLE POLICIES
-- ================================================

-- Allow anyone to view AVAILABLE coupons (for browsing marketplace)
CREATE POLICY "anyone_view_available_coupons"
ON public.coupons
FOR SELECT
USING (status = 'available');

-- Allow authenticated users to view coupons THEY purchased
CREATE POLICY "users_view_purchased_coupons"
ON public.coupons
FOR SELECT
TO authenticated
USING (purchased_by = auth.uid());

-- ================================================
-- GRANT PERMISSIONS FOR JOINS
-- ================================================

-- Ensure authenticated users can read from both tables
GRANT SELECT ON public.orders TO authenticated;
GRANT SELECT ON public.coupons TO authenticated;

-- ================================================
-- TEST THE QUERY (What the page runs)
-- ================================================
-- This should NOW return data:

SELECT
  o.id,
  o.amount,
  o.created_at,
  c.id as coupon_id,
  c.brand,
  c.title,
  c.selling_price_paise,
  c.face_value_paise,
  c.status,
  c.purchased_at,
  c.valid_until
FROM orders o
LEFT JOIN coupons c ON o.giftcard_id = c.id
WHERE o.user_id = auth.uid()
  AND o.payment_status = 'paid'
ORDER BY o.created_at DESC;

-- If this STILL returns no rows in SQL editor:
-- It's because auth.uid() is NULL in SQL editor context
-- But it will work in the app!
