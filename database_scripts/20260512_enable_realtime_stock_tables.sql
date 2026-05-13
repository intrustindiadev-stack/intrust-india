BEGIN;

-- Add shopping_products and merchant_inventory to the realtime publication
-- so that admin/merchant stock updates propagate to the storefront within 1 page load.
-- shopping_order_groups and merchant_transactions were already added in 20260422.

ALTER PUBLICATION supabase_realtime ADD TABLE public.shopping_products;
ALTER PUBLICATION supabase_realtime ADD TABLE public.merchant_inventory;

-- Set REPLICA IDENTITY FULL so the full row payload is available for
-- row-level filtering (e.g. id=in.(...)) in UPDATE/DELETE events.
ALTER TABLE public.shopping_products REPLICA IDENTITY FULL;
ALTER TABLE public.merchant_inventory REPLICA IDENTITY FULL;

COMMIT;
