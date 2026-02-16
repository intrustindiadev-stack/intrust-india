-- Performance Optimization Indexes for INTRUST Platform
-- Run these in Supabase SQL Editor
-- Expected impact: 30-40% faster queries

-- KYC Records - User lookup (most common query)
CREATE INDEX IF NOT EXISTS idx_kyc_records_user_id 
ON kyc_records(user_id);

-- KYC Records - Status filtering (admin panel)
CREATE INDEX IF NOT EXISTS idx_kyc_records_status 
ON kyc_records(verification_status);

-- Coupons - Status and validity (gift cards page)
CREATE INDEX IF NOT EXISTS idx_coupons_status_valid 
ON coupons(status, valid_until);

-- Orders - Payment status and date (dashboard, reports)
CREATE INDEX IF NOT EXISTS idx_orders_payment_created 
ON orders(payment_status, created_at DESC);

-- User Profiles - Role-based queries (admin operations)
CREATE INDEX IF NOT EXISTS idx_user_profiles_role 
ON user_profiles(role);

-- Merchants - Status filtering (admin approvals)
CREATE INDEX IF NOT EXISTS idx_merchants_status 
ON merchants(status);

-- Orders - User purchases (user dashboard)
CREATE INDEX IF NOT EXISTS idx_orders_user_id 
ON orders(user_id);
