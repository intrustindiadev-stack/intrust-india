-- ================================================
-- RE-POPULATE MARKETPLACE
-- ================================================

-- 1. Check current counts
SELECT 
    count(*) as total,
    count(*) filter (where status = 'available') as available,
    count(*) filter (where status = 'sold') as sold,
    count(*) filter (where valid_until < now()) as expired
FROM coupons;

-- 2. If 'available' is 0, let's reset some!
-- This will make 10 random coupons available again
UPDATE coupons
SET 
    status = 'available',
    purchased_by = NULL,
    purchased_at = NULL,
    valid_until = NOW() + INTERVAL '1 year'
WHERE id IN (
    SELECT id FROM coupons 
    ORDER BY RANDOM() 
    LIMIT 10
);

-- 3. Verify they are now available
SELECT id, brand, status, valid_until 
FROM coupons 
WHERE status = 'available' 
LIMIT 5;
