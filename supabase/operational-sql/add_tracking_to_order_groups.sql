-- Add tracking number and estimated delivery date to shopping_order_groups table

ALTER TABLE public.shopping_order_groups ADD COLUMN IF NOT EXISTS tracking_number TEXT;
ALTER TABLE public.shopping_order_groups ADD COLUMN IF NOT EXISTS estimated_delivery_date DATE;
