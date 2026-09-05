-- Migration: 20260905000000_expand_sub_category_all_categories.sql
-- Description: Backfill sub_category to 'General' for existing products and add compound index.

BEGIN;

-- 1. Ensure the sub_category column exists (idempotent guard)
ALTER TABLE public.shopping_products 
ADD COLUMN IF NOT EXISTS sub_category text;

-- 2. Backfill 'General' for all existing products where sub_category is NULL
UPDATE public.shopping_products
SET sub_category = 'General'
WHERE sub_category IS NULL;

-- 3. Ensure single and composite indexes exist for efficient storefront & wholesale filtering
CREATE INDEX IF NOT EXISTS idx_shopping_products_sub_category 
ON public.shopping_products(sub_category);

CREATE INDEX IF NOT EXISTS idx_shopping_products_cat_subcat 
ON public.shopping_products(category, sub_category);

-- 4. Documentation comment on column
COMMENT ON COLUMN public.shopping_products.sub_category IS 
'Sub-category taxonomy across all platform categories. Form-validated required field; legacy rows default to General.';

COMMIT;
