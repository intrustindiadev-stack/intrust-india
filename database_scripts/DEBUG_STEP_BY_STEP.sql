-- ================================================
-- STEP-BY-STEP DEBUGGING CHECKLIST
-- Run each query separately and report results
-- ================================================

-- ================================================
-- TEST 1: Verify RPC Function Exists
-- ================================================
-- Run this first:

SELECT 
    routine_name,
    routine_type,
    data_type as return_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name = 'finalize_coupon_purchase';

-- Expected: Should return 1 row showing the function exists
-- If NO ROWS: The RPC wasn't created. Re-run CRITICAL_FIX_execute_this.sql

-- ================================================
-- TEST 2: Check Foreign Key Relationship
-- ================================================
-- Verify the orders → coupons relationship exists:

SELECT
    tc.constraint_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_name = 'orders'
  AND kcu.column_name = 'giftcard_id';

-- Expected: Should show orders.giftcard_id → coupons.id
-- If NO ROWS: Foreign key is missing! Need to create it.

-- ================================================
-- TEST 3: Check Your Actual Data
-- ================================================
-- Replace YOUR_USER_ID with your actual user ID:

-- First, get your user ID:
SELECT auth.uid() as my_user_id;

-- Then check your orders:
SELECT 
    id,
    user_id,
    giftcard_id,
    amount,
    payment_status,
    created_at
FROM orders
WHERE user_id = auth.uid()
ORDER BY created_at DESC
LIMIT 5;

-- Expected: Shows your orders with payment_status
-- Are they 'created' or 'paid'?

-- ================================================
-- TEST 4: Test the Join Query (What My Gift Cards Uses)
-- ================================================
-- This is the EXACT query the page runs:

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

-- Expected: Shows your paid orders with coupon details
-- If NO ROWS: Either:
--   - No orders have payment_status = 'paid' (RPC not working)
--   - Foreign key relationship broken
--   - RLS blocking the query

-- ================================================
-- TEST 5: Bypass RLS to See Raw Data (Admin View)
-- ================================================
-- IMPORTANT: This only works if you're using Service Role Key
-- or have admin access. Regular user queries won't see this.

SELECT 
    o.id,
    o.user_id,
    o.payment_status,
    c.brand,
    c.purchased_by,
    c.status
FROM orders o
LEFT JOIN coupons c ON o.giftcard_id = c.id
WHERE o.payment_status = 'paid'
ORDER BY o.created_at DESC
LIMIT 10;

-- If this returns rows but TEST 4 doesn't:
-- → RLS policies are blocking your user queries

-- ================================================
-- FIX: If Foreign Key is Missing
-- ================================================
-- Run this ONLY if TEST 2 showed no results:

ALTER TABLE orders
ADD CONSTRAINT orders_giftcard_id_fkey
FOREIGN KEY (giftcard_id)
REFERENCES coupons(id)
ON DELETE SET NULL;

-- ================================================
-- INSTRUCTIONS:
-- ================================================
-- 1. Run TEST 1 first - paste result here
-- 2. Run TEST 2 - paste result here  
-- 3. Run TEST 3 - paste result here
-- 4. Run TEST 4 - paste result here
-- 5. Share the results so I can diagnose the exact issue
