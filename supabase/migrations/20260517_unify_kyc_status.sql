-- One-time data fix
UPDATE user_profiles SET kyc_status = 'verified' WHERE kyc_status = 'approved';

-- Drop existing constraint if any, just to be safe
ALTER TABLE user_profiles DROP CONSTRAINT IF EXISTS chk_kyc_status;

-- Add CHECK constraint
ALTER TABLE user_profiles ADD CONSTRAINT chk_kyc_status CHECK (kyc_status IN ('not_started', 'pending', 'verified', 'rejected'));

-- Create normalizing trigger
CREATE OR REPLACE FUNCTION normalize_kyc_status()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.kyc_status = 'approved' THEN
    NEW.kyc_status := 'verified';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_normalize_kyc_status ON user_profiles;
CREATE TRIGGER trg_normalize_kyc_status
  BEFORE INSERT OR UPDATE OF kyc_status ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION normalize_kyc_status();
