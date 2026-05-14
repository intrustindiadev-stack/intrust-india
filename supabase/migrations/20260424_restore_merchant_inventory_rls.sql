BEGIN;

-- 1. Restore UPDATE policy for merchant_inventory
DROP POLICY IF EXISTS "Merchants update own inventory" ON public.merchant_inventory;
CREATE POLICY "Merchants update own inventory"
ON public.merchant_inventory
FOR UPDATE
TO authenticated
USING (
  merchant_id IN (
    SELECT id FROM merchants WHERE user_id = auth.uid()
  )
)
WITH CHECK (
  merchant_id IN (
    SELECT id FROM merchants WHERE user_id = auth.uid()
  )
);

-- 2. Restore INSERT policy for merchant_inventory (for adding custom products)
DROP POLICY IF EXISTS "Merchants insert own inventory" ON public.merchant_inventory;
CREATE POLICY "Merchants insert own inventory"
ON public.merchant_inventory
FOR INSERT
TO authenticated
WITH CHECK (
  merchant_id IN (
    SELECT id FROM merchants WHERE user_id = auth.uid()
  )
);

-- 3. Restore DELETE policy for merchant_inventory
DROP POLICY IF EXISTS "Merchants delete own inventory" ON public.merchant_inventory;
CREATE POLICY "Merchants delete own inventory"
ON public.merchant_inventory
FOR DELETE
TO authenticated
USING (
  merchant_id IN (
    SELECT id FROM merchants WHERE user_id = auth.uid()
  )
);

-- 4. Restore missing UPDATE policy for shopping_products (for custom product metadata)
DROP POLICY IF EXISTS "Merchants update own products" ON public.shopping_products;
CREATE POLICY "Merchants update own products"
ON public.shopping_products
FOR UPDATE
TO authenticated
USING (
  submitted_by_merchant_id IN (
    SELECT id FROM merchants WHERE user_id = auth.uid()
  )
)
WITH CHECK (
  submitted_by_merchant_id IN (
    SELECT id FROM merchants WHERE user_id = auth.uid()
  )
);

COMMIT;
