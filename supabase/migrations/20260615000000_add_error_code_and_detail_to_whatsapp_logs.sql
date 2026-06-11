-- Migration: Add error columns to whatsapp_message_logs
-- Adds error_code and error_detail columns to whatsapp_message_logs for failure logging

ALTER TABLE public.whatsapp_message_logs
  ADD COLUMN IF NOT EXISTS error_code text NULL,
  ADD COLUMN IF NOT EXISTS error_detail text NULL;

COMMENT ON COLUMN public.whatsapp_message_logs.error_code IS 'Omniflow/Meta provider error code';
COMMENT ON COLUMN public.whatsapp_message_logs.error_detail IS 'Detailed error message or raw response snippet';
