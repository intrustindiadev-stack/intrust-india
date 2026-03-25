ALTER TABLE public.shopping_order_groups ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'wallet';
-- Allowed values: 'wallet', 'gateway', 'cod'
