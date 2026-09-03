BEGIN;

-- 1. Groceries & Food
UPDATE public.shopping_products
SET category = 'Groceries', sub_category = NULL
WHERE category = 'Fashion' 
  AND (
    title ILIKE '%candy%' OR 
    title ILIKE '%namkeen%' OR 
    title ILIKE '%coffee%' OR 
    title ILIKE '%rice%' OR 
    title ILIKE '%cookies%' OR 
    title ILIKE '%puffs%' OR 
    title ILIKE '%soda%' OR
    title ILIKE '%crisps%' OR
    title ILIKE '%chatka%'
  );

-- 2. Beauty & Health
UPDATE public.shopping_products
SET category = 'Beauty & Personal Care', sub_category = NULL
WHERE category = 'Fashion' 
  AND (
    title ILIKE '%capsules%' OR 
    title ILIKE '%soap%' OR 
    title ILIKE '%serum%' OR 
    title ILIKE '%body wash%' OR 
    title ILIKE '%hand wash%' OR 
    title ILIKE '%cream%' OR
    title ILIKE '%gummies%'
  );

-- 3. Baby Care & Adult Diapers
UPDATE public.shopping_products
SET category = 'Baby Care', sub_category = NULL
WHERE category = 'Fashion' 
  AND (
    title ILIKE '%diaper%' OR 
    title ILIKE '%huggies%' OR 
    title ILIKE '%adult dry pants%' OR
    title ILIKE '%fluffy soft pants%'
  );

-- 4. Toys
UPDATE public.shopping_products
SET category = 'Toys & Games', sub_category = NULL
WHERE category = 'Fashion' 
  AND (
    title ILIKE '%toy%' OR 
    title ILIKE '%doll%'
  );

-- 5. Fix remaining "Women" incorrectly assigned to Men/Unisex items
UPDATE public.shopping_products
SET sub_category = 'Men'
WHERE category = 'Fashion' AND sub_category = 'Women'
  AND (
    title ILIKE '%men%' OR
    title ILIKE '%unisex%' OR
    title ILIKE '%boy%'
  );

COMMIT;
