BEGIN;

-- Drop the vulnerable, legacy purchase_coupon RPC
DROP FUNCTION IF EXISTS public.purchase_coupon(uuid, text);

COMMIT;
