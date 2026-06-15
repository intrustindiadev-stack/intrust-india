BEGIN;

UPDATE coupons 
SET image_url = REPLACE(image_url, 'https://intrustindia.com/storage', 'https://intrustindia.com/api/supabase/storage')
WHERE image_url LIKE 'https://intrustindia.com/storage%';

UPDATE merchants 
SET shopping_banner_url = REPLACE(shopping_banner_url, 'https://intrustindia.com/storage', 'https://intrustindia.com/api/supabase/storage')
WHERE shopping_banner_url LIKE 'https://intrustindia.com/storage%';

UPDATE platform_banners 
SET image_url = REPLACE(image_url, 'https://intrustindia.com/storage', 'https://intrustindia.com/api/supabase/storage')
WHERE image_url LIKE 'https://intrustindia.com/storage%';

UPDATE user_profiles 
SET avatar_url = REPLACE(avatar_url, 'https://intrustindia.com/storage', 'https://intrustindia.com/api/supabase/storage')
WHERE avatar_url LIKE 'https://intrustindia.com/storage%';

UPDATE shopping_products
SET product_images = (
    SELECT array_agg(REPLACE(img, 'https://intrustindia.com/storage', 'https://intrustindia.com/api/supabase/storage'))
    FROM unnest(product_images) AS img
)
WHERE array_to_string(product_images, ',') LIKE '%https://intrustindia.com/storage%';

COMMIT;
