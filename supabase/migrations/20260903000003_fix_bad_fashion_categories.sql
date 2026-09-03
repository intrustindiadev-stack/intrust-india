BEGIN;

-- Fix incorrectly categorized MamyPoko and Bhujia items
UPDATE public.shopping_products
SET 
  category = 'Baby Care',
  sub_category = NULL
WHERE category = 'Fashion' 
  AND title ILIKE '%MamyPoko%';

UPDATE public.shopping_products
SET 
  category = 'Groceries',
  sub_category = NULL
WHERE category = 'Fashion' 
  AND title ILIKE '%Bhujia%';

COMMIT;
