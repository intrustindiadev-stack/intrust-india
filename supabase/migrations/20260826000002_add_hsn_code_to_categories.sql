-- Add hsn_code to shopping_categories
ALTER TABLE public.shopping_categories
ADD COLUMN IF NOT EXISTS hsn_code text;

-- Add default HSN code to existing rows if needed (assuming 9971 for now)
UPDATE public.shopping_categories
SET hsn_code = '9971'
WHERE hsn_code IS NULL;
