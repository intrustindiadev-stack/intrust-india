-- Migration to add whatsapp_transaction_alerts to merchant_notification_settings
-- Replaces the older wallet-adjust customer template reuse hack.

ALTER TABLE public.merchant_notification_settings
ADD COLUMN whatsapp_transaction_alerts boolean NOT NULL DEFAULT true;
