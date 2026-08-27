-- Migration: Add Men's Fashion Categories and Seed Data

-- 1. Insert Men's Category Tree
INSERT INTO public.fashion_categories (id, name, path, level, sort_order, title, slug, description, banner_url)
VALUES 
    ('c0000000-0000-0000-0000-000000000002', 'Men', 'men', 1, 20, 'Men''s Fashion', 'men', 'Discover the latest trends in men''s clothing, footwear, and accessories.', 'https://images.unsplash.com/photo-1617137968427-85924c800a22?auto=format&fit=crop&q=80&w=1200')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.fashion_categories (id, parent_id, name, path, level, sort_order, title, slug, description)
VALUES 
    ('c2100000-0000-0000-0000-000000000000', 'c0000000-0000-0000-0000-000000000002', 'Topwear', 'men/topwear', 2, 10, 'Men''s Topwear', 'topwear', 'Shirts, T-shirts, Jackets and more.'),
    ('c2200000-0000-0000-0000-000000000000', 'c0000000-0000-0000-0000-000000000002', 'Bottomwear', 'men/bottomwear', 2, 20, 'Men''s Bottomwear', 'bottomwear', 'Jeans, Trousers, Shorts and more.'),
    ('c2300000-0000-0000-0000-000000000000', 'c0000000-0000-0000-0000-000000000002', 'Footwear', 'men/footwear', 2, 30, 'Men''s Footwear', 'footwear', 'Sneakers, Formal Shoes, Sandals.'),
    ('c2400000-0000-0000-0000-000000000000', 'c0000000-0000-0000-0000-000000000002', 'Accessories', 'men/accessories', 2, 40, 'Men''s Accessories', 'accessories', 'Watches, Belts, Wallets, and Sunglasses.')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.fashion_categories (id, parent_id, name, path, level, sort_order, title, slug, description)
VALUES 
    -- Men / Topwear
    ('c2110000-0000-0000-0000-000000000000', 'c2100000-0000-0000-0000-000000000000', 'T-Shirts', 'men/topwear/tshirts', 3, 10, 'T-Shirts', 'tshirts', 'Casual and smart t-shirts.'),
    ('c2120000-0000-0000-0000-000000000000', 'c2100000-0000-0000-0000-000000000000', 'Casual Shirts', 'men/topwear/casual-shirts', 3, 20, 'Casual Shirts', 'casual-shirts', 'Perfect for everyday wear.'),
    ('c2130000-0000-0000-0000-000000000000', 'c2100000-0000-0000-0000-000000000000', 'Formal Shirts', 'men/topwear/formal-shirts', 3, 30, 'Formal Shirts', 'formal-shirts', 'Sharp and professional formal wear.'),
    
    -- Men / Bottomwear
    ('c2210000-0000-0000-0000-000000000000', 'c2200000-0000-0000-0000-000000000000', 'Jeans', 'men/bottomwear/jeans', 3, 10, 'Jeans', 'jeans', 'Denim for every occasion.'),
    ('c2220000-0000-0000-0000-000000000000', 'c2200000-0000-0000-0000-000000000000', 'Trousers', 'men/bottomwear/trousers', 3, 20, 'Trousers', 'trousers', 'Chinos, formal trousers, and more.')
ON CONFLICT (id) DO NOTHING;

-- 2. Insert Mock Products for Men (Using strictly valid UUIDs and providing wholesale_price_paise)
INSERT INTO public.shopping_products (id, title, description, category_id, suggested_retail_price_paise, platform_price_paise, wholesale_price_paise, is_active, platform_listed)
VALUES 
    ('44444444-4444-4444-4444-444444444441', 'Premium Cotton T-Shirt', 'Breathable everyday cotton t-shirt with a modern fit.', NULL, 129900, 99900, 60000, true, true),
    ('44444444-4444-4444-4444-444444444442', 'Slim Fit Denim Jeans', 'Classic blue slim fit jeans with slight stretch for comfort.', NULL, 299900, 199900, 120000, true, true)
ON CONFLICT (id) DO NOTHING;

-- 3. Link Products to Categories
INSERT INTO public.fashion_product_categories (product_id, category_id, is_primary)
VALUES 
    ('44444444-4444-4444-4444-444444444441', 'c2110000-0000-0000-0000-000000000000', true), -- T-Shirts
    ('44444444-4444-4444-4444-444444444442', 'c2210000-0000-0000-0000-000000000000', true)  -- Jeans
ON CONFLICT (product_id, category_id) DO NOTHING;

-- 4. Insert Variants and Media
-- T-Shirt Variants
INSERT INTO public.fashion_variants (id, product_id, sku, size, color, fit, fabric, price_paise, compare_at_price_paise, inventory_quantity, is_active)
VALUES 
    ('55555555-5555-5555-5555-555555555551', '44444444-4444-4444-4444-444444444441', 'TSHIRT-M-BLK', 'M', 'Black', 'Modern', '100% Cotton', 99900, 129900, 50, true),
    ('55555555-5555-5555-5555-555555555552', '44444444-4444-4444-4444-444444444441', 'TSHIRT-L-BLK', 'L', 'Black', 'Modern', '100% Cotton', 99900, 129900, 30, true),
    ('55555555-5555-5555-5555-555555555553', '44444444-4444-4444-4444-444444444441', 'TSHIRT-M-WHT', 'M', 'White', 'Modern', '100% Cotton', 99900, 129900, 45, true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.fashion_variant_media (variant_id, image_url, display_order)
VALUES 
    ('55555555-5555-5555-5555-555555555551', 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&q=80&w=800', 1),
    ('55555555-5555-5555-5555-555555555552', 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&q=80&w=800', 1),
    ('55555555-5555-5555-5555-555555555553', 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&q=80&w=800', 1)
ON CONFLICT DO NOTHING;

-- Jeans Variants
INSERT INTO public.fashion_variants (id, product_id, sku, size, color, fit, fabric, price_paise, compare_at_price_paise, inventory_quantity, is_active)
VALUES 
    ('55555555-5555-5555-5555-555555555554', '44444444-4444-4444-4444-444444444442', 'JEANS-32-BLU', '32', 'Blue', 'Slim', 'Denim', 199900, 299900, 20, true),
    ('55555555-5555-5555-5555-555555555555', '44444444-4444-4444-4444-444444444442', 'JEANS-34-BLU', '34', 'Blue', 'Slim', 'Denim', 199900, 299900, 25, true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.fashion_variant_media (variant_id, image_url, display_order)
VALUES 
    ('55555555-5555-5555-5555-555555555554', 'https://images.unsplash.com/photo-1542272604-780c8d52a5ce?auto=format&fit=crop&q=80&w=800', 1),
    ('55555555-5555-5555-5555-555555555555', 'https://images.unsplash.com/photo-1542272604-780c8d52a5ce?auto=format&fit=crop&q=80&w=800', 1)
ON CONFLICT DO NOTHING;
