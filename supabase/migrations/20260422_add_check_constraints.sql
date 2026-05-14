-- H1 — Add admin_stock_non_negative CHECK constraint
ALTER TABLE shopping_products
  ADD CONSTRAINT admin_stock_non_negative
  CHECK (admin_stock >= 0);

-- H9 — Add commission_rate_range CHECK constraint
ALTER TABLE shopping_order_groups
  ADD CONSTRAINT commission_rate_range
  CHECK (commission_rate >= 0 AND commission_rate <= 1);

/* 
-- Post-fix verification queries (run these selectively to confirm):

-- Confirm admin_stock constraint exists
SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'shopping_products'::regclass
AND conname = 'admin_stock_non_negative';

-- Confirm zero admin_stock violations
SELECT COUNT(*) FROM shopping_products WHERE admin_stock < 0;


-- Confirm commission_rate constraint exists
SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'shopping_order_groups'::regclass
AND conname = 'commission_rate_range';

-- Confirm zero commission_rate violations
SELECT COUNT(*) FROM shopping_order_groups
WHERE commission_rate < 0 OR commission_rate > 1;

*/
