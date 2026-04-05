-- Execute this in your Supabase SQL Editor to enable Auto Mode fields for Merchants

ALTER TABLE merchants ADD COLUMN IF NOT EXISTS auto_mode_status VARCHAR DEFAULT 'inactive';
ALTER TABLE merchants ADD COLUMN IF NOT EXISTS auto_mode_months_paid INT DEFAULT 0;
ALTER TABLE merchants ADD COLUMN IF NOT EXISTS auto_mode_valid_until TIMESTAMPTZ;
