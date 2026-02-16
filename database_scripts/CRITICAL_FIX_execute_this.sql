-- ================================================
-- CRITICAL FIX: Execute ALL of these in order
-- ================================================
-- This will fix the "No coupons yet" issue
-- ================================================

-- ================================================
-- STEP 1: Create/Replace the RPC Function
-- ================================================
-- This is the CRITICAL missing piece!
-- Without this, payment verification fails silently.

DROP FUNCTION IF EXISTS finalize_coupon_purchase(uuid, text);

CREATE OR REPLACE FUNCTION finalize_coupon_purchase(
  p_order_id uuid,
  p_payment_id text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER -- Runs with admin privileges
AS $$
DECLARE
  v_order_record record;
  v_coupon_record record;
BEGIN
  -- 1. Fetch the Order
  SELECT * INTO v_order_record
  FROM orders
  WHERE id = p_order_id;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'message', 'Order not found');
  END IF;

  -- 2. Idempotency Check: If already paid, return success immediately
  IF v_order_record.payment_status = 'paid' THEN
    RETURN json_build_object('success', true, 'message', 'Order already processed');
  END IF;

  -- 3. Fetch the Coupon
  SELECT * INTO v_coupon_record
  FROM coupons
  WHERE id = v_order_record.giftcard_id
  FOR UPDATE; -- Lock the coupon row to prevent race conditions

  IF NOT FOUND THEN
     RETURN json_build_object('success', false, 'message', 'Coupon not found');
  END IF;

  -- 4. Verify Coupon Availability
  IF v_coupon_record.status != 'available' THEN
     -- Mark order as failed if coupon is sold/expired
     UPDATE orders
     SET payment_status = 'failed'
     WHERE id = p_order_id;
     
     RETURN json_build_object('success', false, 'message', 'Coupon is no longer available');
  END IF;

  -- 5. Update Order to Paid
  UPDATE orders
  SET 
    payment_status = 'paid',
    razorpay_payment_id = p_payment_id
  WHERE id = p_order_id;

  -- 6. Update Coupon to Sold
  UPDATE coupons
  SET 
    status = 'sold',
    purchased_by = v_order_record.user_id,
    purchased_at = NOW()
  WHERE id = v_coupon_record.id;

  -- 7. Return Success
  RETURN json_build_object('success', true, 'message', 'Purchase finalized successfully');

EXCEPTION WHEN OTHERS THEN
  -- Rollback happens automatically on exception
  RAISE EXCEPTION 'Transaction failed: %', SQLERRM;
END;
$$;

-- ================================================
-- STEP 2: Enable RLS on Orders Table
-- ================================================

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view own orders" ON public.orders;
DROP POLICY IF EXISTS "Users can insert own orders" ON public.orders;

-- Allow users to SELECT only their own orders
CREATE POLICY "Users can view own orders"
ON public.orders
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Allow users to INSERT their own orders
CREATE POLICY "Users can insert own orders"
ON public.orders
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- ================================================
-- STEP 3: Enable RLS on Coupons Table
-- ================================================

ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view purchased coupons" ON public.coupons;
DROP POLICY IF EXISTS "Public can view available coupons" ON public.coupons;

-- Allow users to view coupons they purchased
CREATE POLICY "Users can view purchased coupons"
ON public.coupons
FOR SELECT
TO authenticated
USING (auth.uid() = purchased_by);

-- Allow anyone to view available coupons (for browsing)
CREATE POLICY "Public can view available coupons"
ON public.coupons
FOR SELECT
TO authenticated, anon
USING (status = 'available');

-- ================================================
-- STEP 4: Verify Everything Works
-- ================================================

-- Check if RPC exists:
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_name = 'finalize_coupon_purchase'
  AND routine_schema = 'public';
-- Should return 1 row

-- Check RLS policies on orders:
SELECT schemaname, tablename, policyname
FROM pg_policies
WHERE tablename = 'orders';
-- Should show at least 2 policies

-- Check RLS policies on coupons:
SELECT schemaname, tablename, policyname
FROM pg_policies
WHERE tablename = 'coupons';
-- Should show at least 2 policies

-- ================================================
-- STEP 5: Test with a Real Purchase
-- ================================================
-- After running the above:
-- 1. Make a test purchase through Razorpay
-- 2. Check if order gets payment_status = 'paid'
-- 3. Check if coupon gets purchased_by set
-- 4. Visit /my-giftcards to see the card

-- Quick test query (run after purchase):
SELECT 
  o.id,
  o.payment_status,
  o.user_id,
  c.brand,
  c.purchased_by
FROM orders o
LEFT JOIN coupons c ON o.giftcard_id = c.id
WHERE o.user_id = auth.uid()
ORDER BY o.created_at DESC
LIMIT 5;
