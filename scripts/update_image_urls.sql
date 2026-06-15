BEGIN;

UPDATE coupons 
SET image_url = REPLACE(image_url, 'https://bhgbylyzlwmmabegxlfc.supabase.co', 'https://intrustindia.com/api/supabase')
WHERE image_url LIKE '%bhgbylyzlwmmabegxlfc.supabase.co%';

UPDATE merchants 
SET shopping_banner_url = REPLACE(shopping_banner_url, 'https://bhgbylyzlwmmabegxlfc.supabase.co', 'https://intrustindia.com/api/supabase')
WHERE shopping_banner_url LIKE '%bhgbylyzlwmmabegxlfc.supabase.co%';

-- Update product_images array using unnest and array_agg
UPDATE shopping_products
SET product_images = (
    SELECT array_agg(REPLACE(img, 'https://bhgbylyzlwmmabegxlfc.supabase.co', 'https://intrustindia.com/api/supabase'))
    FROM unnest(product_images) AS img
)
WHERE array_to_string(product_images, ',') LIKE '%bhgbylyzlwmmabegxlfc.supabase.co%';

COMMIT;
