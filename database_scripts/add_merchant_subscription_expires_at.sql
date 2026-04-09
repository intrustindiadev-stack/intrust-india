-- Add the subscription_expires_at column to track when the merchant's plan lapses.
-- This column is populated via the SabPaisa callback upon successful payment.

ALTER TABLE merchants
  ADD COLUMN IF NOT EXISTS subscription_expires_at TIMESTAMPTZ;
