-- 1. Add subscription_status column
ALTER TABLE merchants
  ADD COLUMN IF NOT EXISTS subscription_status TEXT NOT NULL DEFAULT 'unpaid'
  CHECK (subscription_status IN ('unpaid', 'active', 'expired'));

-- 2. Backfill: existing approved merchants who already have merchant role = active
UPDATE merchants m
SET subscription_status = 'active'
WHERE m.status = 'approved'
  AND EXISTS (
    SELECT 1 FROM user_profiles u
    WHERE u.id = m.user_id AND u.role = 'merchant'
  );
