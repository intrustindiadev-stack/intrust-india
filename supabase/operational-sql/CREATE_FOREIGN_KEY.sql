-- ================================================
-- FIX: Create Missing Foreign Key Relationship
-- ================================================

-- First, check if foreign key exists
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

-- If NO ROWS returned, the foreign key is missing!

-- ================================================
-- CREATE THE FOREIGN KEY
-- ================================================

-- Drop constraint if it exists (in case it's broken)
ALTER TABLE public.orders 
DROP CONSTRAINT IF EXISTS orders_giftcard_id_fkey;

ALTER TABLE public.orders
DROP CONSTRAINT IF EXISTS fk_orders_coupons;

-- Create the foreign key relationship
ALTER TABLE public.orders
ADD CONSTRAINT orders_giftcard_id_fkey
FOREIGN KEY (giftcard_id)
REFERENCES public.coupons(id)
ON DELETE SET NULL;

-- ================================================
-- REFRESH SCHEMA CACHE
-- ================================================
-- In Supabase Dashboard, you may need to:
-- 1. Go to Settings → API
-- 2. Click "Reload schema cache"
-- OR just wait a few seconds and it will auto-refresh

-- ================================================
-- VERIFY THE FOREIGN KEY
-- ================================================
SELECT
    tc.constraint_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_name = 'orders'
  AND kcu.column_name = 'giftcard_id';

-- Expected: Should show orders_giftcard_id_fkey → coupons(id)
