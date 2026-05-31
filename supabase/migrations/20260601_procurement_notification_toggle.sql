-- Migration: Add whatsapp_sale_notifications to merchant_notification_settings
-- Created: 2026-06-01

ALTER TABLE merchant_notification_settings 
ADD COLUMN IF NOT EXISTS whatsapp_sale_notifications boolean NOT NULL DEFAULT true;
