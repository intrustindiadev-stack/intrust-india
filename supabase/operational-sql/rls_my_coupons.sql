-- ================================================
-- COMPLETE DEBUGGING FIX FOR MY GIFT CARDS PAGE
-- ================================================
-- Problem: /my-giftcards shows "No coupons yet" after successful purchase
-- Root Cause: Query syntax and RLS policies
-- ================================================

-- ================================================
-- STEP 1: VERIFY RPC FUNCTION (Already Correct ✓)
-- ================================================
-- The finalize_coupon_purchase.sql is already correct.
-- It properly updates:
--   - orders.payment_status = 'paid'
--   - coupons.status = 'sold'
--   - coupons.purchased_by = user_id
--   - coupons.purchased_at = NOW()
-- No changes needed to RPC.

-- ================================================
-- STEP 2: FIX RLS POLICIES (Execute Below)
-- ================================================

-- Enable RLS on orders table
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Drop existing policy to avoid conflicts
DROP POLICY IF EXISTS "Users can view own orders" ON public.orders;

-- Allow users to SELECT only their own orders
CREATE POLICY "Users can view own orders"
ON public.orders
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Enable RLS on coupons table
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;

-- Drop existing policy to avoid conflicts
DROP POLICY IF EXISTS "Users can view purchased coupons" ON public.coupons;

-- Allow users to SELECT only coupons they purchased
CREATE POLICY "Users can view purchased coupons"
ON public.coupons
FOR SELECT
TO authenticated
USING (auth.uid() = purchased_by);

-- ================================================
-- STEP 3: VERIFY FOREIGN KEY RELATIONSHIP
-- ================================================
-- The query assumes orders.giftcard_id → coupons.id
-- Verify this foreign key exists:

SELECT
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM
    information_schema.table_constraints AS tc
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_name = 'orders'
  AND kcu.column_name = 'giftcard_id';

-- Expected result:
-- orders.giftcard_id → coupons.id

-- ================================================
-- STEP 4: VERIFY PAYMENT STATUS
-- ================================================
-- Check if your orders use 'paid' (not 'success' or 'completed'):

SELECT id, user_id, payment_status, created_at
FROM orders
WHERE payment_status IS NOT NULL
ORDER BY created_at DESC
LIMIT 10;

-- If you see 'success' or 'completed' instead of 'paid',
-- you need to update the finalize_coupon_purchase RPC to use
-- the correct status value.

-- ================================================
-- DEPLOYMENT CHECKLIST
-- ================================================
-- ✅ 1. Execute RLS policies above in Supabase SQL Editor
-- ✅ 2. Verify foreign key exists (query above)
-- ✅ 3. Check payment_status values (query above)
-- ✅ 4. Test purchase flow end-to-end
-- ✅ 5. Navigate to /my-giftcards and verify cards appear

-- ================================================
-- DEBUGGING QUERIES
-- ================================================

-- Check if user has any paid orders:
SELECT * FROM orders
WHERE user_id = auth.uid()
  AND payment_status = 'paid';

-- Check if coupons have purchased_by set:
SELECT id, brand, status, purchased_by, purchased_at
FROM coupons
WHERE purchased_by = auth.uid();

-- Check full join to see what the page will fetch:
SELECT
  o.id as order_id,
  o.amount,
  o.payment_status,
  c.id as coupon_id,
  c.brand,
  c.status,
  c.purchased_by
FROM orders o
LEFT JOIN coupons c ON o.giftcard_id = c.id
WHERE o.user_id = auth.uid()
  AND o.payment_status = 'paid'
ORDER BY o.created_at DESC;
