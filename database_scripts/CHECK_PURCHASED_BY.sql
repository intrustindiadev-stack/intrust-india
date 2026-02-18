-- ================================================
-- DEBUG: Check the purchased_by field
-- ================================================

-- Check if purchased_by matches user_id
SELECT 
    o.id as order_id,
    o.user_id as order_user_id,
    o.payment_status,
    c.id as coupon_id,
    c.brand,
    c.status as coupon_status,
    c.purchased_by as coupon_purchased_by,
    -- This will show if they match
    CASE 
        WHEN o.user_id = c.purchased_by THEN '✓ MATCH'
        WHEN c.purchased_by IS NULL THEN '✗ NULL'
        ELSE '✗ MISMATCH'
    END as match_status
FROM orders o
LEFT JOIN coupons c ON o.giftcard_id = c.id
WHERE o.payment_status = 'paid'
ORDER BY o.created_at DESC
LIMIT 3;

-- If purchased_by is NULL or doesn't match, 
-- the RLS policy blocks the query!
