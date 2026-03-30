-- Add 'deleted' status to coupon_status ENUM to allow soft deletion without violating foreign keys
ALTER TYPE coupon_status ADD VALUE IF NOT EXISTS 'deleted';
