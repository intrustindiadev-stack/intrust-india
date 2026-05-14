-- Add convenience_fee_bps to merchant_udhari_settings
ALTER TABLE merchant_udhari_settings ADD COLUMN IF NOT EXISTS convenience_fee_bps INT NOT NULL DEFAULT 300;

-- Add check constraint
ALTER TABLE merchant_udhari_settings ADD CONSTRAINT chk_convenience_fee_bps CHECK (convenience_fee_bps >= 0 AND convenience_fee_bps <= 5000);

-- Backfill existing rows
UPDATE merchant_udhari_settings SET convenience_fee_bps = 300;
