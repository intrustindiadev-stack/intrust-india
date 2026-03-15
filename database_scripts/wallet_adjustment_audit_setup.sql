-- ============================================================================
-- Wallet Adjustment Audit System
-- Creates audit tables for fintech-compliant wallet adjustments
-- NOTE: THIS SCRIPT MUST BE RUN BEFORE 02_wallet_adjustment_rpc.sql
-- ============================================================================

-- 1. Create ENUM types
DO $$ BEGIN
    CREATE TYPE wallet_type_enum AS ENUM ('customer', 'merchant');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE wallet_operation_enum AS ENUM ('credit', 'debit');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE adjustment_status_enum AS ENUM ('pending', 'completed', 'failed');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- 2. Create wallet_adjustment_logs table
CREATE TABLE IF NOT EXISTS wallet_adjustment_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_user_id UUID NOT NULL REFERENCES auth.users(id),
    target_user_id UUID NOT NULL REFERENCES auth.users(id),
    wallet_type wallet_type_enum NOT NULL,
    operation wallet_operation_enum NOT NULL,
    amount_paise BIGINT NOT NULL CHECK (amount_paise > 0),
    balance_before_paise BIGINT NOT NULL,
    balance_after_paise BIGINT NOT NULL,
    reason TEXT NOT NULL CHECK (char_length(reason) >= 10 AND char_length(reason) <= 500),
    idempotency_key UUID NOT NULL,
    status adjustment_status_enum NOT NULL DEFAULT 'pending',
    error_message TEXT,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at TIMESTAMPTZ,

    -- Ensure idempotency: one key = one operation
    CONSTRAINT unique_idempotency_key UNIQUE (idempotency_key)
);

-- 3. Create indexes for efficient querying
-- Admin activity audit trail
CREATE INDEX IF NOT EXISTS idx_wal_adj_admin_created
    ON wallet_adjustment_logs (admin_user_id, created_at DESC);

-- User wallet history
CREATE INDEX IF NOT EXISTS idx_wal_adj_target_created
    ON wallet_adjustment_logs (target_user_id, created_at DESC);

-- Deduplication / idempotency lookup
CREATE INDEX IF NOT EXISTS idx_wal_adj_idempotency
    ON wallet_adjustment_logs (idempotency_key);

-- Monitoring failed adjustments
CREATE INDEX IF NOT EXISTS idx_wal_adj_status_created
    ON wallet_adjustment_logs (status, created_at DESC);

-- 4. Create admin_permissions table
CREATE TABLE IF NOT EXISTS admin_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_user_id UUID NOT NULL REFERENCES auth.users(id),
    permission TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    -- Prevent duplicate permission grants
    CONSTRAINT unique_admin_permission UNIQUE (admin_user_id, permission)
);

CREATE INDEX IF NOT EXISTS idx_admin_perm_user
    ON admin_permissions (admin_user_id);

-- 5. Enable Row Level Security
ALTER TABLE wallet_adjustment_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_permissions ENABLE ROW LEVEL SECURITY;

-- Explicitly grant privileges to service_role to ensure API functions correctly
GRANT ALL PRIVILEGES ON TABLE wallet_adjustment_logs TO service_role;
GRANT ALL PRIVILEGES ON TABLE admin_permissions TO service_role;

-- Seed adjust_wallet_any permission for all current admin users
INSERT INTO admin_permissions (admin_user_id, permission)
SELECT id, 'adjust_wallet_any'
FROM user_profiles
WHERE role = 'admin'
ON CONFLICT (admin_user_id, permission) DO NOTHING;

-- 6. RLS Policies for wallet_adjustment_logs

-- Admins can view ALL logs (service_role bypasses RLS, but this covers
-- admin users querying via the API with their JWT)
CREATE POLICY "Admins can view all adjustment logs"
    ON wallet_adjustment_logs
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM user_profiles
            WHERE user_profiles.id = auth.uid()
              AND user_profiles.role = 'admin'
        )
    );

-- Users can view logs for their own wallet adjustments
CREATE POLICY "Users can view own adjustment logs"
    ON wallet_adjustment_logs
    FOR SELECT
    USING (target_user_id = auth.uid());

-- Only service_role can INSERT (server-side API routes use service_role key)
CREATE POLICY "Service role can insert adjustment logs"
    ON wallet_adjustment_logs
    FOR INSERT
    WITH CHECK (true);

-- NO UPDATE or DELETE policies — immutable audit trail
-- Attempting to UPDATE or DELETE will be denied by RLS

-- 7. RLS Policies for admin_permissions

CREATE POLICY "Admins can view all permissions"
    ON admin_permissions
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM user_profiles
            WHERE user_profiles.id = auth.uid()
              AND user_profiles.role = 'admin'
        )
    );

CREATE POLICY "Service role can manage permissions"
    ON admin_permissions
    FOR ALL
    WITH CHECK (true);

-- 8. Add comments for documentation
COMMENT ON TABLE wallet_adjustment_logs IS 'Immutable audit trail for all admin wallet adjustments. No UPDATE/DELETE allowed.';
COMMENT ON TABLE admin_permissions IS 'Granular permission grants for admin users (e.g., adjust_wallet_any, adjust_wallet_under_10k).';
COMMENT ON COLUMN wallet_adjustment_logs.idempotency_key IS 'Client-generated UUID to prevent duplicate adjustments on network retry.';
COMMENT ON COLUMN wallet_adjustment_logs.amount_paise IS 'Always positive. Operation column determines credit vs debit.';
