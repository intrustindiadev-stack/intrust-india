-- ================================================
-- DEBUG: Marketplace Data Check
-- ================================================

-- 1. Check total coupons
SELECT count(*) as total_coupons FROM coupons;

-- 2. Check available coupons (status = 'available')
SELECT count(*) as available_count FROM coupons WHERE status = 'available';

-- 3. Check unexpired available coupons (what the page queries)
SELECT count(*) as visible_count 
FROM coupons 
WHERE status = 'available' 
  AND valid_until >= NOW();

-- 4. Check a sample coupon to see dates
SELECT id, title, status, valid_until, created_at 
FROM coupons 
LIMIT 5;

-- 5. Check permissions for 'anon' role (public access)
SELECT 
    grantee, 
    table_name, 
    privilege_type 
FROM information_schema.role_table_grants 
WHERE table_name = 'coupons' AND grantee = 'anon';

-- If visible_count is > 0 but the page is empty, 
-- it's almost certainly a PERMISSION issue (fixed by running FIX_ANON_PERMISSIONS.sql).
