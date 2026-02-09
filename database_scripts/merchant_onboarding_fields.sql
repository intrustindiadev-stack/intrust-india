-- Merchant Onboarding Schema Updates
-- This script adds business-specific fields to the merchants table
-- Run this after the main merchant support migration

-- Add business and onboarding fields to merchants table
ALTER TABLE public.merchants
ADD COLUMN IF NOT EXISTS business_type TEXT,
ADD COLUMN IF NOT EXISTS business_phone TEXT,
ADD COLUMN IF NOT EXISTS business_email TEXT,
ADD COLUMN IF NOT EXISTS bank_account_name TEXT,
ADD COLUMN IF NOT EXISTS bank_account_number TEXT,
ADD COLUMN IF NOT EXISTS bank_ifsc_code TEXT,
ADD COLUMN IF NOT EXISTS bank_name TEXT,
ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
ADD COLUMN IF NOT EXISTS suspension_reason TEXT,
ADD COLUMN IF NOT EXISTS applied_at TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMPTZ;

-- Add comments
COMMENT ON COLUMN public.merchants.business_type IS 'Type of business (e.g., Sole Proprietor, Partnership, Private Ltd)';
COMMENT ON COLUMN public.merchants.business_phone IS 'Business contact phone number';
COMMENT ON COLUMN public.merchants.business_email IS 'Business contact email';
COMMENT ON COLUMN public.merchants.bank_account_name IS 'Bank account holder name';
COMMENT ON COLUMN public.merchants.bank_account_number IS 'Bank account number for settlements';
COMMENT ON COLUMN public.merchants.bank_ifsc_code IS 'Bank IFSC code';
COMMENT ON COLUMN public.merchants.bank_name IS 'Name of the bank';
COMMENT ON COLUMN public.merchants.rejection_reason IS 'Reason for application rejection (if rejected)';
COMMENT ON COLUMN public.merchants.suspension_reason IS 'Reason for account suspension (if suspended)';
COMMENT ON COLUMN public.merchants.applied_at IS 'Timestamp when merchant application was submitted';
COMMENT ON COLUMN public.merchants.approved_at IS 'Timestamp when merchant was approved';
COMMENT ON COLUMN public.merchants.rejected_at IS 'Timestamp when merchant was rejected';

-- Create function to check KYC before merchant application
CREATE OR REPLACE FUNCTION check_kyc_before_merchant()
RETURNS TRIGGER AS $$
DECLARE
    v_kyc_status TEXT;
BEGIN
    -- Check if user has KYC record
    SELECT status INTO v_kyc_status
    FROM public.kyc_records
    WHERE user_id = NEW.user_id;
    
    -- Require KYC to be submitted
    IF v_kyc_status IS NULL THEN
        RAISE EXCEPTION 'KYC not submitted. Please complete KYC verification before applying as a merchant.';
    END IF;
    
    -- Require KYC to be approved
    IF v_kyc_status != 'approved' THEN
        RAISE EXCEPTION 'KYC not approved. Current KYC status: %. Please wait for KYC approval before applying as a merchant.', v_kyc_status;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to enforce KYC requirement
DROP TRIGGER IF EXISTS ensure_kyc_approved_before_merchant ON public.merchants;
CREATE TRIGGER ensure_kyc_approved_before_merchant
    BEFORE INSERT ON public.merchants
    FOR EACH ROW
    EXECUTE FUNCTION check_kyc_before_merchant();

-- Create function to update approved_at timestamp
CREATE OR REPLACE FUNCTION update_merchant_approved_at()
RETURNS TRIGGER AS $$
BEGIN
    -- Set approved_at when status changes to approved
    IF NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status != 'approved') THEN
        NEW.approved_at = NOW();
    END IF;
    
    -- Set rejected_at when status changes to rejected
    IF NEW.status = 'rejected' AND (OLD.status IS NULL OR OLD.status != 'rejected') THEN
        NEW.rejected_at = NOW();
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for status timestamps
DROP TRIGGER IF EXISTS set_merchant_status_timestamps ON public.merchants;
CREATE TRIGGER set_merchant_status_timestamps
    BEFORE UPDATE ON public.merchants
    FOR EACH ROW
    EXECUTE FUNCTION update_merchant_approved_at();

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_merchants_status ON public.merchants(status);
CREATE INDEX IF NOT EXISTS idx_merchants_applied_at ON public.merchants(applied_at);
CREATE INDEX IF NOT EXISTS idx_merchants_approved_at ON public.merchants(approved_at) WHERE approved_at IS NOT NULL;

-- Sample data for testing (optional - comment out in production)
-- This shows how the merchant application flow works

/*
-- Example: Create a test merchant application
INSERT INTO public.merchants (
    user_id,
    business_name,
    business_type,
    gst_number,
    pan_number,
    business_phone,
    business_email,
    bank_account_name,
    bank_account_number,
    bank_ifsc_code,
    bank_name,
    status,
    wallet_balance_paise,
    total_commission_paid_paise
) VALUES (
    'USER_ID_HERE', -- Replace with actual user ID who has approved KYC
    'Test Business Pvt Ltd',
    'Private Limited',
    '22AAAAA0000A1Z5',
    'ABCDE1234F',
    '9876543210',
    'business@example.com',
    'Test Business Account',
    '1234567890',
    'SBIN0001234',
    'State Bank of India',
    'pending', -- Will be approved by admin
    0,
    0
);
*/

-- Grant necessary permissions (adjust based on your RLS setup)
-- Merchants can view their own business details
-- Admins can view and update all merchant applications

COMMENT ON TABLE public.merchants IS 'Merchant profiles with business details and onboarding information';
