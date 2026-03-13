-- Add merchant_id to orders table to allow filtering orders by merchant in admin panel
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS merchant_id UUID REFERENCES public.merchants(id);

-- Add index on merchant_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_orders_merchant_id ON public.orders(merchant_id);
