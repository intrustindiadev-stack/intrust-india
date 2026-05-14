-- Quick fix for KYC records not showing
-- This creates a view that properly joins user_profiles with kyc_records

-- Option 1: If user_id in kyc_records references auth.users, not user_profiles
-- Create a view that joins through both tables

CREATE OR REPLACE VIEW user_kyc_view AS
SELECT 
    up.*,
    kr.id as kyc_record_id,
    kr.status as kyc_status_from_record,
    kr.full_legal_name,
    kr.date_of_birth,
    kr.id_type,
    kr.id_number_last4,
    kr.rejection_reason,
    kr.reviewed_by,
    kr.reviewed_at,
    kr.submitted_at,
    kr.created_at as kyc_created_at
FROM user_profiles up
LEFT JOIN kyc_records kr ON kr.user_id = up.id;

-- Grant access to this view
GRANT SELECT ON user_kyc_view TO authenticated;
GRANT SELECT ON user_kyc_view TO service_role;

-- Test the view
SELECT * FROM user_kyc_view WHERE full_name = 'Ayush Malviya';
