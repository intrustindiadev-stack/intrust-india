-- ==============================================================================
-- Migration: 20260909_ai_orders_gst_invoice.sql
-- Description: Adds GST fields and Invoice linkage to public.ai_orders
-- ==============================================================================

-- 1. Add GST and Invoice columns to ai_orders
ALTER TABLE public.ai_orders
    ADD COLUMN IF NOT EXISTS gst_rate_percent NUMERIC DEFAULT 18.00,
    ADD COLUMN IF NOT EXISTS gst_amount_paise BIGINT DEFAULT 0,
    ADD COLUMN IF NOT EXISTS invoice_id UUID REFERENCES public.invoices(id) ON DELETE SET NULL;

-- 2. Create index on invoice_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_ai_orders_invoice_id ON public.ai_orders(invoice_id);

-- 3. Update existing orders to calculate a default GST (assuming wholesale price is base)
UPDATE public.ai_orders
SET 
    gst_rate_percent = 18.00,
    gst_amount_paise = (wholesale_price_paise * 18 / 100)
WHERE gst_amount_paise = 0 AND wholesale_price_paise > 0;
