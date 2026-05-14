-- Shop Performance Optimization Indexes
-- Run these in Supabase SQL Editor
-- Addresses the 5 sequential DB calls and missing indexes on the /shop page
-- Consistent style with performance_indexes.sql

-- ── merchant_inventory ────────────────────────────────────────────────────────

-- Primary filter on every storefront load (.eq('merchant_id'))
CREATE INDEX IF NOT EXISTS idx_merchant_inventory_merchant_id
ON merchant_inventory(merchant_id);

-- Composite — matches the exact .eq('merchant_id').eq('is_active', true) query
CREATE INDEX IF NOT EXISTS idx_merchant_inventory_merchant_id_is_active
ON merchant_inventory(merchant_id, is_active);

-- Covers the .gt('stock_quantity', 0) filter in addition to the composite above
CREATE INDEX IF NOT EXISTS idx_merchant_inventory_merchant_id_active_stock
ON merchant_inventory(merchant_id, is_active, stock_quantity);

-- ── shopping_products ─────────────────────────────────────────────────────────

-- Used in the official store query (.eq('is_active', true))
CREATE INDEX IF NOT EXISTS idx_shopping_products_is_active
ON shopping_products(is_active);

-- Covers .eq('is_active', true).gt('admin_stock', 0) for the official storefront
CREATE INDEX IF NOT EXISTS idx_shopping_products_active_admin_stock
ON shopping_products(is_active, admin_stock);

-- Used for client-side category filtering; prepares for future server-side filtering
CREATE INDEX IF NOT EXISTS idx_shopping_products_category
ON shopping_products(category);
