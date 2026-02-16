-- =====================================================
-- COMPLETE AUTOMATED KYC SETUP
-- Purpose: Convert existing KYC system to fully automated SprintVerify integration
-- Author: Antigravity AI
-- Date: 2026-02-14
-- 
-- RUN THIS ENTIRE FILE IN SUPABASE SQL EDITOR
-- =====================================================

-- =====================================================
-- STEP 1: CLEAN UP OLD MANUAL APPROVAL COMPONENTS
-- =====================================================

-- Remove old manual approval policies that are no longer needed
DROP POLICY IF EXISTS "Users can update own pending KYC" ON kyc_records;
DROP POLICY IF EXISTS "Admins can update any KYC" ON kyc_records;

-- Remove old constraints that allowed manual approval
ALTER TABLE kyc_records DROP CONSTRAINT IF EXISTS review_data_consistency;

-- =====================================================
-- STEP 2: ADD MISSING COLUMNS FOR AUTOMATION
-- =====================================================

-- Add rejection_reason column if it doesn't exist
ALTER TABLE kyc_records
ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- Ensure SprintVerify columns exist (should already exist from your schema)
-- These are: sprint_verify_ref_id, sprint_verify_status, sprint_verify_data, sprint_verify_timestamp

-- =====================================================
-- STEP 3: ADD AUTOMATION CONSTRAINTS
-- =====================================================

-- Add constraint for automated verification consistency
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'automated_review_consistency') THEN
        ALTER TABLE kyc_records
        ADD CONSTRAINT automated_review_consistency 
        CHECK (
            -- When verified, must have SprintVerify reference
            (verification_status != 'verified' OR sprint_verify_ref_id IS NOT NULL)
            AND
            -- When rejected, must have rejection reason
            (verification_status != 'rejected' OR (rejection_reason IS NOT NULL AND rejection_reason != ''))
        );
    END IF;
END $$;

-- =====================================================
-- STEP 4: UPDATE RLS POLICIES FOR AUTOMATION
-- =====================================================

-- Enable RLS if not already enabled
ALTER TABLE kyc_records ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view own KYC" ON kyc_records;
DROP POLICY IF EXISTS "Users can create own KYC" ON kyc_records;
DROP POLICY IF EXISTS "Admins can view all KYC" ON kyc_records;

-- Users can view their own KYC records
CREATE POLICY "Users can view own KYC"
ON kyc_records
FOR SELECT
USING (auth.uid() = user_id);

-- Users can create their own KYC records (submit only - no updates)
CREATE POLICY "Users can create own KYC"
ON kyc_records
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Admins can view all KYC records (read-only - no manual approval)
CREATE POLICY "Admins can view all KYC"
ON kyc_records
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM app_admins
    WHERE app_admins.user_id = auth.uid()
  )
);

-- =====================================================
-- STEP 5: CREATE AUDIT SYSTEM
-- =====================================================

-- Create audit log table
CREATE TABLE IF NOT EXISTS kyc_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    kyc_record_id UUID NOT NULL REFERENCES kyc_records(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id),
    action TEXT NOT NULL, -- 'created', 'auto_verified', 'auto_rejected'
    old_status TEXT,
    new_status TEXT,
    sprint_verify_ref_id TEXT,
    rejection_reason TEXT,
    api_response JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on audit logs
ALTER TABLE kyc_audit_logs ENABLE ROW LEVEL SECURITY;

-- Audit log policies
CREATE POLICY "Admins can view all KYC audit logs"
ON kyc_audit_logs
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM app_admins
    WHERE app_admins.user_id = auth.uid()
  )
);

CREATE POLICY "Users can view own KYC audit logs"
ON kyc_audit_logs
FOR SELECT
USING (auth.uid() = user_id);

-- Grant permissions
GRANT SELECT, INSERT ON kyc_audit_logs TO authenticated;

-- Create audit trigger function
CREATE OR REPLACE FUNCTION audit_kyc_automation()
RETURNS TRIGGER AS $$
BEGIN
    -- Log KYC creation
    IF TG_OP = 'INSERT' THEN
        INSERT INTO kyc_audit_logs (kyc_record_id, user_id, action, new_status, sprint_verify_ref_id, rejection_reason, api_response)
        VALUES (NEW.id, NEW.user_id, 'created', NEW.verification_status, NEW.sprint_verify_ref_id, NEW.rejection_reason, NEW.sprint_verify_data);
        RETURN NEW;
    END IF;
    
    -- Log KYC status changes
    IF TG_OP = 'UPDATE' THEN
        IF OLD.verification_status IS DISTINCT FROM NEW.verification_status THEN
            INSERT INTO kyc_audit_logs (kyc_record_id, user_id, action, old_status, new_status, sprint_verify_ref_id, rejection_reason, api_response)
            VALUES (NEW.id, NEW.user_id, 
                    CASE 
                        WHEN NEW.verification_status = 'verified' THEN 'auto_verified'
                        WHEN NEW.verification_status = 'rejected' THEN 'auto_rejected'
                        ELSE 'status_changed'
                    END,
                    OLD.verification_status, NEW.verification_status, 
                    NEW.sprint_verify_ref_id, NEW.rejection_reason, NEW.sprint_verify_data);
        END IF;
        RETURN NEW;
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
DROP TRIGGER IF EXISTS kyc_automation_audit_trigger ON kyc_records;
CREATE TRIGGER kyc_automation_audit_trigger
    AFTER INSERT OR UPDATE ON kyc_records
    FOR EACH ROW EXECUTE FUNCTION audit_kyc_automation();

-- =====================================================
-- STEP 6: ADD PERFORMANCE INDEXES
-- =====================================================

-- Index for SprintVerify reference lookup
CREATE INDEX IF NOT EXISTS idx_kyc_sprint_ref_id 
ON kyc_records(sprint_verify_ref_id) WHERE sprint_verify_ref_id IS NOT NULL;

-- Index for rejection reasons (support queries)
CREATE INDEX IF NOT EXISTS idx_kyc_rejection_reason 
ON kyc_records(rejection_reason) WHERE rejection_reason IS NOT NULL;

-- Composite index for admin dashboard (status + date)
CREATE INDEX IF NOT EXISTS idx_kyc_admin_dashboard 
ON kyc_records(verification_status, created_at DESC);

-- Index for audit logs queries
CREATE INDEX IF NOT EXISTS idx_audit_kyc_record_id 
ON kyc_audit_logs(kyc_record_id);

-- Index for audit logs user queries
CREATE INDEX IF NOT EXISTS idx_audit_user_id 
ON kyc_audit_logs(user_id);

-- Index for audit logs date queries
CREATE INDEX IF NOT EXISTS idx_audit_created_at 
ON kyc_audit_logs(created_at DESC);

-- =====================================================
-- STEP 7: CREATE MONITORING VIEWS
-- =====================================================

-- KYC automation statistics (last 30 days)
CREATE OR REPLACE VIEW kyc_automation_stats AS
SELECT 
    DATE_TRUNC('day', created_at) as date,
    COUNT(*) as total_submissions,
    COUNT(*) FILTER (WHERE verification_status = 'verified') as auto_verified,
    COUNT(*) FILTER (WHERE verification_status = 'rejected') as auto_rejected,
    COUNT(*) FILTER (WHERE verification_status = 'pending') as pending,
    ROUND(
        (COUNT(*) FILTER (WHERE verification_status = 'verified') * 100.0 / NULLIF(COUNT(*), 0)), 2
    ) as auto_verification_rate,
    COUNT(*) FILTER (WHERE sprint_verify_status = 'verified') as sprint_verify_success,
    COUNT(*) FILTER (WHERE sprint_verify_status = 'rejected') as sprint_verify_failed
FROM kyc_records
WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE_TRUNC('day', created_at)
ORDER BY date DESC;

-- SprintVerify API monitoring (last 7 days)
CREATE OR REPLACE VIEW sprintverify_api_monitoring AS
SELECT 
    DATE_TRUNC('hour', sprint_verify_timestamp) as hour,
    COUNT(*) as total_api_calls,
    COUNT(*) FILTER (WHERE sprint_verify_status = 'verified') as successful_calls,
    COUNT(*) FILTER (WHERE sprint_verify_status = 'rejected') as failed_calls,
    COUNT(*) FILTER (WHERE sprint_verify_status IS NULL) as error_calls,
    ROUND(
        (COUNT(*) FILTER (WHERE sprint_verify_status = 'verified') * 100.0 / NULLIF(COUNT(*), 0)), 2
    ) as api_success_rate
FROM kyc_records
WHERE sprint_verify_timestamp >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY DATE_TRUNC('hour', sprint_verify_timestamp)
ORDER BY hour DESC;

-- Dashboard summary function
CREATE OR REPLACE FUNCTION get_kyc_dashboard_stats()
RETURNS TABLE (
    total_submissions BIGINT,
    verified_count BIGINT,
    rejected_count BIGINT,
    pending_count BIGINT,
    verification_rate DECIMAL,
    today_submissions BIGINT,
    api_success_rate DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*)::BIGINT,
        COUNT(*) FILTER (WHERE verification_status = 'verified')::BIGINT,
        COUNT(*) FILTER (WHERE verification_status = 'rejected')::BIGINT,
        COUNT(*) FILTER (WHERE verification_status = 'pending')::BIGINT,
        ROUND(COUNT(*) FILTER (WHERE verification_status = 'verified') * 100.0 / NULLIF(COUNT(*), 0), 2)::DECIMAL,
        COUNT(*) FILTER (WHERE DATE(created_at) = CURRENT_DATE)::BIGINT,
        ROUND(COUNT(*) FILTER (WHERE sprint_verify_status = 'verified') * 100.0 / NULLIF(COUNT(*), 0), 2)::DECIMAL
    FROM kyc_records
    WHERE created_at >= CURRENT_DATE - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- STEP 8: UPDATE TABLE COMMENTS
-- =====================================================

COMMENT ON COLUMN kyc_records.rejection_reason IS 'Reason for automatic rejection via SprintVerify API (required when verification_status = rejected)';
COMMENT ON COLUMN kyc_records.sprint_verify_ref_id IS 'Reference ID from SprintVerify API for tracking and audit';
COMMENT ON COLUMN kyc_records.sprint_verify_status IS 'Raw status returned by SprintVerify API';
COMMENT ON COLUMN kyc_records.sprint_verify_data IS 'Complete API response from SprintVerify (JSONB)';
COMMENT ON COLUMN kyc_records.sprint_verify_timestamp IS 'Timestamp when SprintVerify API was called';
COMMENT ON TABLE kyc_audit_logs IS 'Audit trail for all automated KYC verifications and changes';
COMMENT ON CONSTRAINT automated_review_consistency ON kyc_records IS 'Ensures data consistency for automated verification system';

-- =====================================================
-- STEP 9: VERIFICATION QUERIES
-- =====================================================

-- Uncomment and run these to verify setup:

-- Check constraints
-- SELECT constraint_name, check_clause FROM information_schema.check_constraints WHERE constraint_name LIKE '%automated%';

-- Check RLS policies  
-- SELECT policyname, cmd FROM pg_policies WHERE tablename = 'kyc_records';

-- Check audit trigger
-- SELECT trigger_name FROM information_schema.triggers WHERE trigger_name = 'kyc_automation_audit_trigger';

-- Test monitoring views
-- SELECT * FROM kyc_automation_stats LIMIT 5;
-- SELECT * FROM sprintverify_api_monitoring LIMIT 5;

-- =====================================================
-- SETUP COMPLETE
-- =====================================================

-- Your KYC system is now fully automated!
-- 
-- What changed:
-- ❌ Removed: Manual admin approval policies and constraints
-- ✅ Added: Automation constraints, audit system, monitoring views
-- 🔒 Updated: RLS policies (read-only for admins, create-only for users)
-- 📊 Added: Performance indexes and monitoring capabilities
-- 
-- Next steps:
-- 1. Set SprintVerify environment variables
-- 2. Test KYC submission flow  
-- 3. Monitor via sprintverify_api_monitoring view
-- 4. Deploy to production
