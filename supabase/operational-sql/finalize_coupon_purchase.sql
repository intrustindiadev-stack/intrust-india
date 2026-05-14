-- Drop function if it exists to allow updates
DROP FUNCTION IF EXISTS finalize_coupon_purchase;

CREATE OR REPLACE FUNCTION finalize_coupon_purchase(
  p_order_id uuid,
  p_payment_id text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER -- Runs with privileges of the creator (admin)
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
  -- Note: orders table has 'giftcard_id' which references coupons(id) according to user and schema csv.
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
