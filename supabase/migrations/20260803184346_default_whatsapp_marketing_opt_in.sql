-- Update the default value for new rows
ALTER TABLE public.user_channel_bindings 
ALTER COLUMN whatsapp_marketing_opt_in SET DEFAULT true;

-- Update existing rows that already have whatsapp_opt_in = true (both customer and merchant)
UPDATE public.user_channel_bindings
SET whatsapp_marketing_opt_in = true
WHERE whatsapp_opt_in = true;
