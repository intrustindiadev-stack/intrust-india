-- Migration: 20260509_add_whatsapp_master_toggle
-- Adds the missing whatsapp_notifications master toggle column to
-- merchant_notification_settings and backfills one row per merchant
-- that has no settings row yet.
-- No DROP statements — purely additive.

-- 1. Add master toggle column
ALTER TABLE public.merchant_notification_settings
  ADD COLUMN IF NOT EXISTS whatsapp_notifications boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN public.merchant_notification_settings.whatsapp_notifications
  IS 'Master toggle for all WhatsApp alerts. When false, dispatcher short-circuits regardless of sub-flags.';

-- 2. Backfill one row per merchant that has no settings row yet.
--    Column defaults (whatsapp_notifications = true, all sub-flags = true,
--    whatsapp_marketing = false) handle the remaining columns.
INSERT INTO public.merchant_notification_settings (merchant_id)
SELECT m.id FROM public.merchants m
WHERE NOT EXISTS (
  SELECT 1 FROM public.merchant_notification_settings mns
  WHERE mns.merchant_id = m.id
);
