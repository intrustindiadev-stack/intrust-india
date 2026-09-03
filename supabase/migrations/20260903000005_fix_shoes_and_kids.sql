BEGIN;

-- Kids
UPDATE public.shopping_products
SET sub_category = 'Kids'
WHERE category = 'Fashion' AND sub_category = 'Women'
  AND (
    title ILIKE '%kid%' OR
    title ILIKE '%girl%' OR
    title ILIKE '%boy%'
  );

-- Men (Sneakers, Shoe Polish, Socks, Caps)
UPDATE public.shopping_products
SET sub_category = 'Men'
WHERE category = 'Fashion' AND sub_category = 'Women'
  AND (
    title ILIKE '%sneaker%' OR
    title ILIKE '%shoe polish%' OR
    title ILIKE '%shoe cream%' OR
    title ILIKE '%shoe shiner%' OR
    title ILIKE '%shoe brush%' OR
    title ILIKE '%shoe bag%' OR
    title ILIKE '%shoefix%' OR
    title ILIKE '%insole%' OR
    title ILIKE '%socks%' OR
    title ILIKE '%swimming cap%' OR
    title ILIKE '%shoes%'
  );

-- Home Care & Others (Not Fashion)
UPDATE public.shopping_products
SET category = 'Home Care', sub_category = NULL
WHERE category = 'Fashion'
  AND (
    title ILIKE '%freshener%' OR
    title ILIKE '%exam pad%' OR
    title ILIKE '%yoga block%'
  );

-- Pet Supplies
UPDATE public.shopping_products
SET category = 'Pet Supplies', sub_category = NULL
WHERE category = 'Fashion'
  AND title ILIKE '%dog shoe%';

COMMIT;
