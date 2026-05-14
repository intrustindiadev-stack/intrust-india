BEGIN;

-- PURPOSE: Allow customers to read out-of-stock merchant_inventory rows
-- so the storefront can display OOS badges instead of hiding products.
-- Previously the SELECT policy included `AND stock_quantity > 0` which
-- silently hid OOS rows from the public, making it impossible to badge them.

-- Drop the old restrictive SELECT policy
DROP POLICY IF EXISTS "Anyone can view active inventory" ON public.merchant_inventory;

-- Recreate without the stock_quantity > 0 clause
CREATE POLICY "Anyone can view active inventory"
ON public.merchant_inventory
FOR SELECT
USING (is_active = true);

-- NOTE: No change needed for shopping_products.
-- The existing "Anyone can view active products" policy already uses
-- USING (is_active = true) only — admin_stock is not gated at the RLS level.

COMMIT;
