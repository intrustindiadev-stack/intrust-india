-- Migration: Add product_images array column to shopping_products
-- This stores the ordered list of all image URLs.
-- image_url remains as the primary/cover image for backward compatibility.

ALTER TABLE shopping_products
    ADD COLUMN IF NOT EXISTS product_images text[] NOT NULL DEFAULT '{}';

-- Backfill existing rows: if image_url is set, seed the array with it
UPDATE shopping_products
SET product_images = ARRAY[image_url]
WHERE image_url IS NOT NULL
  AND image_url <> ''
  AND (product_images IS NULL OR array_length(product_images, 1) IS NULL);
