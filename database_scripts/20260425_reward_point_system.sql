-- ============================================================================
-- INTRUST REWARD POINT SYSTEM — Phase 1: Foundation Migration
-- Created: 2026-04-25
-- Description: Dynamic, admin-configurable, multi-level tree reward system
-- ============================================================================

-- ============================================================================
-- 1. CREATE ENUMS
-- ============================================================================

-- Reward event types
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'reward_event_type') THEN
        CREATE TYPE reward_event_type AS ENUM (
            'signup', 'purchase', 'kyc_complete', 'merchant_onboard',
            'subscription_renewal', 'daily_login', 'tier_upgrade',
            'manual_credit', 'manual_debit', 'wallet_conversion', 'expiry'
        );
    END IF;
END
$$;

-- Redemption status
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'redemption_status') THEN
        CREATE TYPE redemption_status AS ENUM ('pending', 'approved', 'rejected', 'completed');
    END IF;
END
$$;

-- ============================================================================
-- 2. REWARD CONFIGURATION TABLE (Dynamic Admin Settings)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.reward_configuration (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    config_key TEXT NOT NULL UNIQUE,
    config_value JSONB NOT NULL DEFAULT '{}',
    config_type TEXT NOT NULL DEFAULT 'global',
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    effective_from TIMESTAMPTZ DEFAULT now(),
    effective_until TIMESTAMPTZ,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT valid_config_type CHECK (config_type IN ('global', 'event', 'level', 'tier', 'eligibility'))
);

COMMENT ON TABLE public.reward_configuration IS 'Dynamic admin-configurable reward point system settings';

-- ============================================================================
-- 3. REWARD POINTS BALANCE TABLE (Per-User)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.reward_points_balance (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    total_earned BIGINT NOT NULL DEFAULT 0,
    total_redeemed BIGINT NOT NULL DEFAULT 0,
    current_balance BIGINT NOT NULL DEFAULT 0,
    tier TEXT NOT NULL DEFAULT 'bronze',
    tree_size INTEGER NOT NULL DEFAULT 0,
    direct_referrals INTEGER NOT NULL DEFAULT 0,
    active_downline INTEGER NOT NULL DEFAULT 0,
    last_calculated_at TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT non_negative_balance CHECK (current_balance >= 0),
    CONSTRAINT non_negative_earned CHECK (total_earned >= 0),
    CONSTRAINT valid_tier CHECK (tier IN ('bronze', 'silver', 'gold', 'platinum'))
);

COMMENT ON TABLE public.reward_points_balance IS 'Per-user Intrust Reward Points balance and tree stats';

CREATE INDEX IF NOT EXISTS idx_reward_points_tier ON public.reward_points_balance(tier);
CREATE INDEX IF NOT EXISTS idx_reward_points_tree_size ON public.reward_points_balance(tree_size);

-- ============================================================================
-- 4. REWARD TRANSACTIONS TABLE (Immutable Audit Trail)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.reward_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    source_user_id UUID REFERENCES auth.users(id),
    event_type reward_event_type NOT NULL,
    points BIGINT NOT NULL,
    points_before BIGINT NOT NULL,
    points_after BIGINT NOT NULL,
    level INTEGER,
    reference_id UUID,
    reference_type TEXT,
    metadata JSONB DEFAULT '{}',
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT valid_points CHECK (points != 0)
);

COMMENT ON TABLE public.reward_transactions IS 'Immutable audit trail for all reward point transactions';

CREATE INDEX IF NOT EXISTS idx_reward_txn_user_created ON public.reward_transactions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reward_txn_source ON public.reward_transactions(source_user_id);
CREATE INDEX IF NOT EXISTS idx_reward_txn_event ON public.reward_transactions(event_type);
CREATE INDEX IF NOT EXISTS idx_reward_txn_reference ON public.reward_transactions(reference_id);

-- ============================================================================
-- 5. REWARD TREE PATHS TABLE (Materialized Path / Closure Table)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.reward_tree_paths (
    ancestor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    descendant_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    level INTEGER NOT NULL CHECK (level > 0),
    created_at TIMESTAMPTZ DEFAULT now(),
    PRIMARY KEY (ancestor_id, descendant_id),
    CONSTRAINT no_self_reference CHECK (ancestor_id != descendant_id)
);

COMMENT ON TABLE public.reward_tree_paths IS 'Materialized tree paths for O(1) ancestor/descendant lookups';

CREATE INDEX IF NOT EXISTS idx_tree_paths_ancestor ON public.reward_tree_paths(ancestor_id, level);
CREATE INDEX IF NOT EXISTS idx_tree_paths_descendant ON public.reward_tree_paths(descendant_id);

-- ============================================================================
-- 6. REWARD DAILY CAPS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.reward_daily_caps (
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    cap_date DATE NOT NULL DEFAULT CURRENT_DATE,
    points_earned_today BIGINT NOT NULL DEFAULT 0,
    transactions_today INTEGER NOT NULL DEFAULT 0,
    last_updated TIMESTAMPTZ DEFAULT now(),
    PRIMARY KEY (user_id, cap_date)
);

COMMENT ON TABLE public.reward_daily_caps IS 'Daily reward earning limits tracking per user';

-- ============================================================================
-- 7. REWARD REDEMPTION REQUESTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.reward_redemption_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    points_requested BIGINT NOT NULL CHECK (points_requested > 0),
    rupee_value_paise BIGINT NOT NULL,
    status redemption_status DEFAULT 'pending',
    processed_by UUID REFERENCES auth.users(id),
    processed_at TIMESTAMPTZ,
    rejection_reason TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE public.reward_redemption_requests IS 'Point-to-wallet conversion requests from users';

CREATE INDEX IF NOT EXISTS idx_redemption_user ON public.reward_redemption_requests(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_redemption_status ON public.reward_redemption_requests(status);

-- ============================================================================
-- 8. REWARD CONFIGURATION HISTORY TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.reward_configuration_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    config_key TEXT NOT NULL,
    old_value JSONB,
    new_value JSONB NOT NULL,
    changed_by UUID REFERENCES auth.users(id),
    changed_at TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE public.reward_configuration_history IS 'Audit trail for admin changes to reward configuration';

CREATE INDEX IF NOT EXISTS idx_reward_config_history_key ON public.reward_configuration_history(config_key, changed_at DESC);

-- ============================================================================
-- 9. MODIFY EXISTING TABLES
-- ============================================================================

-- Add tree and reward fields to user_profiles
ALTER TABLE public.user_profiles
ADD COLUMN IF NOT EXISTS reward_parent_id UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS tree_depth INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS reward_tier TEXT DEFAULT 'bronze',
ADD COLUMN IF NOT EXISTS total_reward_points_earned BIGINT DEFAULT 0;

-- Add constraint for reward_tier
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'valid_reward_tier' AND table_name = 'user_profiles'
    ) THEN
        ALTER TABLE public.user_profiles ADD CONSTRAINT valid_reward_tier 
        CHECK (reward_tier IN ('bronze', 'silver', 'gold', 'platinum'));
    END IF;
END
$$;

CREATE INDEX IF NOT EXISTS idx_user_profiles_reward_parent ON public.user_profiles(reward_parent_id);

-- Add REWARD type to customer_wallet_transactions
-- NOTE: We need to drop and recreate the CHECK constraint to add 'REWARD'
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'customer_wallet_transactions_type_check' 
        AND table_name = 'customer_wallet_transactions'
    ) THEN
        ALTER TABLE public.customer_wallet_transactions 
        DROP CONSTRAINT customer_wallet_transactions_type_check;
    END IF;
    
    ALTER TABLE public.customer_wallet_transactions 
    ADD CONSTRAINT customer_wallet_transactions_type_check 
    CHECK (type = ANY (ARRAY['CREDIT'::text, 'DEBIT'::text, 'CASHBACK'::text, 'TOPUP'::text, 'REFUND'::text, 'REWARD'::text]));
END
$$;

-- ============================================================================
-- 10. SEED DEFAULT CONFIGURATION
-- ============================================================================

INSERT INTO public.reward_configuration (config_key, config_value, config_type, description, is_active)
VALUES 
    ('level_settings', '{"max_levels": 7, "levels": {"L1": {"percentage": 10, "fixed": 100}, "L2": {"percentage": 5, "fixed": 50}, "L3": {"percentage": 3, "fixed": 25}, "L4": {"percentage": 2, "fixed": 15}, "L5": {"percentage": 1, "fixed": 10}, "L6": {"percentage": 0, "fixed": 5}, "L7": {"percentage": 0, "fixed": 2}}}', 'level', 'Percentage and fixed points per tree level', true)
ON CONFLICT (config_key) DO NOTHING;

INSERT INTO public.reward_configuration (config_key, config_value, config_type, description, is_active)
VALUES 
    ('signup_reward', '{"direct": 100, "L1": 50, "L2": 25, "L3": 10, "L4": 5, "L5": 2}', 'event', 'Points awarded on new user signup', true)
ON CONFLICT (config_key) DO NOTHING;

INSERT INTO public.reward_configuration (config_key, config_value, config_type, description, is_active)
VALUES 
    ('purchase_reward', '{"rate_per_100rs": 5, "L1": 50, "L2": 25, "L3": 10, "L4": 5, "L5": 2}', 'event', 'Points awarded on purchase', true)
ON CONFLICT (config_key) DO NOTHING;

INSERT INTO public.reward_configuration (config_key, config_value, config_type, description, is_active)
VALUES 
    ('kyc_complete_reward', '{"direct": 200, "L1": 100, "L2": 50, "L3": 20, "L4": 10, "L5": 5}', 'event', 'Points awarded on KYC completion', true)
ON CONFLICT (config_key) DO NOTHING;

INSERT INTO public.reward_configuration (config_key, config_value, config_type, description, is_active)
VALUES 
    ('merchant_onboard_reward', '{"direct": 500, "L1": 250, "L2": 100, "L3": 50, "L4": 25, "L5": 10}', 'event', 'Points awarded on merchant onboarding', true)
ON CONFLICT (config_key) DO NOTHING;

INSERT INTO public.reward_configuration (config_key, config_value, config_type, description, is_active)
VALUES 
    ('subscription_renewal_reward', '{"direct": 300, "L1": 150, "L2": 75, "L3": 30, "L4": 15, "L5": 5}', 'event', 'Points awarded on subscription renewal', true)
ON CONFLICT (config_key) DO NOTHING;

INSERT INTO public.reward_configuration (config_key, config_value, config_type, description, is_active)
VALUES 
    ('daily_login_reward', '{"direct": 5, "L1": 0, "L2": 0, "L3": 0, "L4": 0, "L5": 0}', 'event', 'Points awarded on daily login', true)
ON CONFLICT (config_key) DO NOTHING;

INSERT INTO public.reward_configuration (config_key, config_value, config_type, description, is_active)
VALUES 
    ('tier_bronze', '{"min_tree_size": 0, "min_active_referrals": 0, "bonus_multiplier": 1.0}', 'tier', 'Bronze tier requirements', true)
ON CONFLICT (config_key) DO NOTHING;

INSERT INTO public.reward_configuration (config_key, config_value, config_type, description, is_active)
VALUES 
    ('tier_silver', '{"min_tree_size": 25, "min_active_referrals": 10, "bonus_multiplier": 1.2}', 'tier', 'Silver tier requirements', true)
ON CONFLICT (config_key) DO NOTHING;

INSERT INTO public.reward_configuration (config_key, config_value, config_type, description, is_active)
VALUES 
    ('tier_gold', '{"min_tree_size": 100, "min_active_referrals": 40, "bonus_multiplier": 1.5}', 'tier', 'Gold tier requirements', true)
ON CONFLICT (config_key) DO NOTHING;

INSERT INTO public.reward_configuration (config_key, config_value, config_type, description, is_active)
VALUES 
    ('tier_platinum', '{"min_tree_size": 500, "min_active_referrals": 200, "bonus_multiplier": 2.0}', 'tier', 'Platinum tier requirements', true)
ON CONFLICT (config_key) DO NOTHING;

INSERT INTO public.reward_configuration (config_key, config_value, config_type, description, is_active)
VALUES 
    ('daily_cap', '{"max_points": 10000, "max_transactions": 100}', 'global', 'Daily earning limits per user', true)
ON CONFLICT (config_key) DO NOTHING;

INSERT INTO public.reward_configuration (config_key, config_value, config_type, description, is_active)
VALUES 
    ('point_value', '{"points_per_rupee": 1, "min_withdrawal_points": 100}', 'global', 'Point to rupee conversion settings', true)
ON CONFLICT (config_key) DO NOTHING;

INSERT INTO public.reward_configuration (config_key, config_value, config_type, description, is_active)
VALUES 
    ('eligibility', '{"require_kyc": true, "min_account_age_days": 0, "min_direct_referrals_for_earnings": 0}', 'eligibility', 'Minimum requirements to earn rewards', true)
ON CONFLICT (config_key) DO NOTHING;

-- ============================================================================
-- 11. INITIALIZE BALANCE RECORDS FOR EXISTING USERS
-- ============================================================================

INSERT INTO public.reward_points_balance (user_id, total_earned, total_redeemed, current_balance, tier, tree_size, direct_referrals, active_downline)
SELECT id, 0, 0, 0, 'bronze', 0, 0, 0
FROM public.user_profiles
WHERE id NOT IN (SELECT user_id FROM public.reward_points_balance)
ON CONFLICT (user_id) DO NOTHING;

-- ============================================================================
-- 12. BUILD TREE PATHS FOR EXISTING USERS
-- ============================================================================

-- Clear existing paths first (idempotent)
DELETE FROM public.reward_tree_paths;

-- Insert direct referral paths (Level 1)
INSERT INTO public.reward_tree_paths (ancestor_id, descendant_id, level)
SELECT referred_by, id, 1
FROM public.user_profiles
WHERE referred_by IS NOT NULL AND referred_by != id
ON CONFLICT (ancestor_id, descendant_id) DO NOTHING;

-- Build higher-level paths using iterative closure
DO $$
DECLARE
    v_max_depth INTEGER := 10;
    v_current_depth INTEGER := 2;
    v_rows_inserted INTEGER;
BEGIN
    LOOP
        INSERT INTO public.reward_tree_paths (ancestor_id, descendant_id, level)
        SELECT p1.ancestor_id, p2.descendant_id, p1.level + p2.level
        FROM public.reward_tree_paths p1
        JOIN public.reward_tree_paths p2 ON p1.descendant_id = p2.ancestor_id
        WHERE p1.level + p2.level = v_current_depth
        ON CONFLICT (ancestor_id, descendant_id) DO NOTHING;
        
        GET DIAGNOSTICS v_rows_inserted = ROW_COUNT;
        
        EXIT WHEN v_rows_inserted = 0 OR v_current_depth >= v_max_depth;
        v_current_depth := v_current_depth + 1;
    END LOOP;
END
$$;

-- ============================================================================
-- 13. UPDATE USER_PROFILES TREE STATS
-- ============================================================================

-- Update tree_depth
UPDATE public.user_profiles up
SET tree_depth = COALESCE((
    SELECT MAX(level) FROM public.reward_tree_paths 
    WHERE descendant_id = up.id
), 0);

-- Update reward_parent_id to mirror referred_by for existing users
UPDATE public.user_profiles
SET reward_parent_id = referred_by
WHERE reward_parent_id IS NULL AND referred_by IS NOT NULL;

-- Update tree_size (total downline count)
UPDATE public.reward_points_balance rpb
SET tree_size = COALESCE((
    SELECT COUNT(*) FROM public.reward_tree_paths 
    WHERE ancestor_id = rpb.user_id
), 0);

-- Update direct_referrals (Level 1 count)
UPDATE public.reward_points_balance rpb
SET direct_referrals = COALESCE((
    SELECT COUNT(*) FROM public.reward_tree_paths 
    WHERE ancestor_id = rpb.user_id AND level = 1
), 0);

-- ============================================================================
-- 14. ENABLE RLS ON NEW TABLES
-- ============================================================================

ALTER TABLE public.reward_configuration ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reward_points_balance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reward_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reward_tree_paths ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reward_daily_caps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reward_redemption_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reward_configuration_history ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 15. RLS POLICIES
-- ============================================================================

-- reward_configuration: Admins can manage, anyone can view active
DROP POLICY IF EXISTS "Admins can manage reward config" ON public.reward_configuration;
CREATE POLICY "Admins can manage reward config"
    ON public.reward_configuration FOR ALL
    USING (EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin')));

DROP POLICY IF EXISTS "Anyone can view active reward config" ON public.reward_configuration;
CREATE POLICY "Anyone can view active reward config"
    ON public.reward_configuration FOR SELECT
    USING (is_active = true);

-- reward_points_balance: Users view own, admins view all
DROP POLICY IF EXISTS "Users can view own balance" ON public.reward_points_balance;
CREATE POLICY "Users can view own balance"
    ON public.reward_points_balance FOR SELECT
    USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Admins can view all balances" ON public.reward_points_balance;
CREATE POLICY "Admins can view all balances"
    ON public.reward_points_balance FOR SELECT
    USING (EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin')));

-- reward_transactions: Users view own, admins view all, service role insert
DROP POLICY IF EXISTS "Users can view own transactions" ON public.reward_transactions;
CREATE POLICY "Users can view own transactions"
    ON public.reward_transactions FOR SELECT
    USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Admins can view all transactions" ON public.reward_transactions;
CREATE POLICY "Admins can view all transactions"
    ON public.reward_transactions FOR SELECT
    USING (EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin')));

-- reward_tree_paths: Users view own tree, admins view all
DROP POLICY IF EXISTS "Users can view own tree paths" ON public.reward_tree_paths;
CREATE POLICY "Users can view own tree paths"
    ON public.reward_tree_paths FOR SELECT
    USING (ancestor_id = auth.uid() OR descendant_id = auth.uid());

DROP POLICY IF EXISTS "Admins can view all tree paths" ON public.reward_tree_paths;
CREATE POLICY "Admins can view all tree paths"
    ON public.reward_tree_paths FOR SELECT
    USING (EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin')));

-- reward_daily_caps: Users view own, admins view all
DROP POLICY IF EXISTS "Users can view own caps" ON public.reward_daily_caps;
CREATE POLICY "Users can view own caps"
    ON public.reward_daily_caps FOR SELECT
    USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Admins can view all caps" ON public.reward_daily_caps;
CREATE POLICY "Admins can view all caps"
    ON public.reward_daily_caps FOR SELECT
    USING (EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin')));

-- reward_redemption_requests: Users manage own, admins manage all
DROP POLICY IF EXISTS "Users can manage own requests" ON public.reward_redemption_requests;
CREATE POLICY "Users can manage own requests"
    ON public.reward_redemption_requests FOR ALL
    USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Admins can manage all requests" ON public.reward_redemption_requests;
CREATE POLICY "Admins can manage all requests"
    ON public.reward_redemption_requests FOR ALL
    USING (EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin')));

-- reward_configuration_history: Admins view all
DROP POLICY IF EXISTS "Admins can view config history" ON public.reward_configuration_history;
CREATE POLICY "Admins can view config history"
    ON public.reward_configuration_history FOR SELECT
    USING (EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin')));

-- ============================================================================
-- 16. RPC FUNCTIONS
-- ============================================================================

-- Function: Build tree path for a new user
CREATE OR REPLACE FUNCTION public.build_reward_tree_path(p_new_user_id UUID, p_parent_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Insert paths from all ancestors of the parent to the new user
    INSERT INTO public.reward_tree_paths (ancestor_id, descendant_id, level)
    SELECT ancestor_id, p_new_user_id, level + 1
    FROM public.reward_tree_paths
    WHERE descendant_id = p_parent_id
    ON CONFLICT (ancestor_id, descendant_id) DO NOTHING;
    
    -- Insert direct parent path
    INSERT INTO public.reward_tree_paths (ancestor_id, descendant_id, level)
    VALUES (p_parent_id, p_new_user_id, 1)
    ON CONFLICT (ancestor_id, descendant_id) DO NOTHING;
END;
$$;

-- Function: Calculate and distribute rewards
CREATE OR REPLACE FUNCTION public.calculate_and_distribute_rewards(
    p_event_type TEXT,
    p_source_user_id UUID,
    p_reference_id UUID DEFAULT NULL,
    p_reference_type TEXT DEFAULT NULL,
    p_amount_paise BIGINT DEFAULT 0
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_config JSONB;
    v_ancestor RECORD;
    v_points BIGINT;
    v_tier_multiplier NUMERIC;
    v_daily_cap BIGINT;
    v_earned_today BIGINT;
    v_balance_record RECORD;
    v_eligibility JSONB;
    v_source_profile RECORD;
    v_total_distributed BIGINT := 0;
BEGIN
    -- 1. Fetch active configuration for this event
    SELECT config_value INTO v_config
    FROM public.reward_configuration
    WHERE config_key = p_event_type || '_reward' AND is_active = true;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'No active config for event: ' || p_event_type);
    END IF;

    -- 2. Fetch eligibility rules
    SELECT config_value INTO v_eligibility
    FROM public.reward_configuration
    WHERE config_key = 'eligibility' AND is_active = true;

    -- 3. Get source user profile for eligibility checks
    SELECT kyc_status, created_at INTO v_source_profile
    FROM public.user_profiles
    WHERE id = p_source_user_id;

    -- 4. Get all ancestors (upline)
    FOR v_ancestor IN
        SELECT ancestor_id, level 
        FROM public.reward_tree_paths
        WHERE descendant_id = p_source_user_id
        ORDER BY level
    LOOP
        -- 5. Check if this level is configured
        IF v_config->>('L' || v_ancestor.level) IS NULL THEN
            CONTINUE;
        END IF;

        -- 6. Get ancestor balance/tier info
        SELECT * INTO v_balance_record 
        FROM public.reward_points_balance 
        WHERE user_id = v_ancestor.ancestor_id;

        IF NOT FOUND THEN
            -- Create balance record if missing
            INSERT INTO public.reward_points_balance (user_id) VALUES (v_ancestor.ancestor_id);
            SELECT * INTO v_balance_record 
            FROM public.reward_points_balance 
            WHERE user_id = v_ancestor.ancestor_id;
        END IF;

        -- 7. Check eligibility (KYC requirement)
        IF COALESCE(v_eligibility->>'require_kyc', 'false')::BOOLEAN THEN
            DECLARE
                v_ancestor_kyc TEXT;
            BEGIN
                SELECT kyc_status INTO v_ancestor_kyc 
                FROM public.user_profiles 
                WHERE id = v_ancestor.ancestor_id;
                IF v_ancestor_kyc NOT IN ('approved', 'verified') THEN
                    CONTINUE;
                END IF;
            END;
        END IF;

        -- 8. Calculate base points from config
        v_points := (v_config->>('L' || v_ancestor.level))::BIGINT;
        
        -- For purchase events, calculate based on amount
        IF p_event_type = 'purchase' AND p_amount_paise > 0 THEN
            v_points := (p_amount_paise * v_points / 10000); -- points per 100 rs
        END IF;

        -- 9. Apply tier multiplier
        SELECT (config_value->>'bonus_multiplier')::NUMERIC INTO v_tier_multiplier
        FROM public.reward_configuration 
        WHERE config_key = 'tier_' || COALESCE(v_balance_record.tier, 'bronze') AND is_active = true;
        
        v_points := ROUND(v_points * COALESCE(v_tier_multiplier, 1));

        IF v_points <= 0 THEN CONTINUE; END IF;

        -- 10. Check daily cap
        SELECT points_earned_today INTO v_earned_today
        FROM public.reward_daily_caps
        WHERE user_id = v_ancestor.ancestor_id AND cap_date = CURRENT_DATE;
        
        SELECT (config_value->>'max_points')::BIGINT INTO v_daily_cap
        FROM public.reward_configuration WHERE config_key = 'daily_cap';

        IF COALESCE(v_earned_today, 0) + v_points > COALESCE(v_daily_cap, 999999999) THEN
            v_points := GREATEST(0, COALESCE(v_daily_cap, 999999999) - COALESCE(v_earned_today, 0));
        END IF;

        IF v_points <= 0 THEN CONTINUE; END IF;

        -- 11. Insert transaction and update balance atomically
        INSERT INTO public.reward_transactions (
            user_id, source_user_id, event_type, points, points_before, points_after,
            level, reference_id, reference_type, description
        )
        VALUES (
            v_ancestor.ancestor_id, p_source_user_id, p_event_type::reward_event_type,
            v_points, v_balance_record.current_balance, v_balance_record.current_balance + v_points,
            v_ancestor.level, p_reference_id, p_reference_type,
            'Reward from ' || p_event_type || ' at level ' || v_ancestor.level
        );

        UPDATE public.reward_points_balance
        SET current_balance = current_balance + v_points,
            total_earned = total_earned + v_points,
            updated_at = now()
        WHERE user_id = v_ancestor.ancestor_id;

        -- 12. Update user_profiles total
        UPDATE public.user_profiles
        SET total_reward_points_earned = COALESCE(total_reward_points_earned, 0) + v_points
        WHERE id = v_ancestor.ancestor_id;

        -- 13. Update daily cap tracking
        INSERT INTO public.reward_daily_caps (user_id, cap_date, points_earned_today, transactions_today)
        VALUES (v_ancestor.ancestor_id, CURRENT_DATE, v_points, 1)
        ON CONFLICT (user_id, cap_date)
        DO UPDATE SET 
            points_earned_today = reward_daily_caps.points_earned_today + v_points,
            transactions_today = reward_daily_caps.transactions_today + 1,
            last_updated = now();

        v_total_distributed := v_total_distributed + v_points;
    END LOOP;

    RETURN jsonb_build_object('success', true, 'total_distributed', v_total_distributed, 'message', 'Rewards distributed');
END;
$$;

-- Function: Convert points to wallet
CREATE OR REPLACE FUNCTION public.convert_points_to_wallet(
    p_user_id UUID,
    p_points BIGINT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_point_value NUMERIC;
    v_rupee_paise BIGINT;
    v_current_points BIGINT;
    v_min_withdrawal BIGINT;
    v_wallet_id UUID;
    v_wallet_balance BIGINT;
BEGIN
    -- Check min withdrawal
    SELECT (config_value->>'min_withdrawal_points')::BIGINT INTO v_min_withdrawal
    FROM public.reward_configuration WHERE config_key = 'point_value';
    
    IF p_points < COALESCE(v_min_withdrawal, 100) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Below minimum withdrawal of ' || COALESCE(v_min_withdrawal, 100) || ' points');
    END IF;

    -- Get current balance
    SELECT current_balance INTO v_current_points FROM public.reward_points_balance WHERE user_id = p_user_id;
    IF v_current_points IS NULL OR v_current_points < p_points THEN
        RETURN jsonb_build_object('success', false, 'message', 'Insufficient points. Available: ' || COALESCE(v_current_points, 0));
    END IF;

    -- Calculate rupee value (points_per_rupee = how many points = 1 rupee)
    SELECT (config_value->>'points_per_rupee')::NUMERIC INTO v_point_value
    FROM public.reward_configuration WHERE config_key = 'point_value';
    
    v_rupee_paise := ROUND((p_points::NUMERIC / COALESCE(v_point_value, 1)) * 100);

    -- Deduct points
    UPDATE public.reward_points_balance
    SET current_balance = current_balance - p_points,
        total_redeemed = total_redeemed + p_points,
        updated_at = now()
    WHERE user_id = p_user_id;

    -- Log reward transaction (debit)
    INSERT INTO public.reward_transactions (
        user_id, event_type, points, points_before, points_after,
        description, metadata
    )
    VALUES (
        p_user_id, 'wallet_conversion', -p_points,
        v_current_points, v_current_points - p_points,
        'Converted ' || p_points || ' Intrust Reward Points to wallet',
        jsonb_build_object('rupee_paise', v_rupee_paise, 'points_per_rupee', COALESCE(v_point_value, 1))
    );

    -- Credit customer wallet
    SELECT id, balance_paise INTO v_wallet_id, v_wallet_balance
    FROM public.customer_wallets WHERE user_id = p_user_id;

    IF v_wallet_id IS NULL THEN
        INSERT INTO public.customer_wallets (user_id, balance_paise)
        VALUES (p_user_id, v_rupee_paise)
        RETURNING id INTO v_wallet_id;
    ELSE
        UPDATE public.customer_wallets
        SET balance_paise = balance_paise + v_rupee_paise,
            updated_at = now()
        WHERE id = v_wallet_id;
    END IF;

    -- Insert wallet transaction
    INSERT INTO public.customer_wallet_transactions (
        wallet_id, user_id, type, amount_paise, balance_before_paise, balance_after_paise,
        description, reference_type
    )
    VALUES (
        v_wallet_id, p_user_id, 'REWARD', v_rupee_paise,
        COALESCE(v_wallet_balance, 0), COALESCE(v_wallet_balance, 0) + v_rupee_paise,
        'Intrust Reward Points conversion: ' || p_points || ' points = ₹' || (v_rupee_paise/100.0),
        'REWARD_CONVERSION'
    );

    RETURN jsonb_build_object('success', true, 'rupee_paise', v_rupee_paise, 'points_deducted', p_points);
END;
$$;

-- Function: Update tree statistics (for batch recalculation)
CREATE OR REPLACE FUNCTION public.update_reward_tree_stats(p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_tree_size INTEGER;
    v_direct_refs INTEGER;
    v_active_downline INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_tree_size
    FROM public.reward_tree_paths WHERE ancestor_id = p_user_id;
    
    SELECT COUNT(*) INTO v_direct_refs
    FROM public.reward_tree_paths WHERE ancestor_id = p_user_id AND level = 1;
    
    SELECT COUNT(DISTINCT rtp.descendant_id) INTO v_active_downline
    FROM public.reward_tree_paths rtp
    JOIN public.user_profiles up ON up.id = rtp.descendant_id
    WHERE rtp.ancestor_id = p_user_id 
    AND up.kyc_status IN ('approved', 'verified');

    INSERT INTO public.reward_points_balance (user_id, tree_size, direct_referrals, active_downline)
    VALUES (p_user_id, v_tree_size, v_direct_refs, v_active_downline)
    ON CONFLICT (user_id) DO UPDATE SET
        tree_size = v_tree_size,
        direct_referrals = v_direct_refs,
        active_downline = v_active_downline,
        updated_at = now();
END;
$$;

-- ============================================================================
-- 17. GRANT PERMISSIONS
-- ============================================================================

GRANT ALL ON public.reward_configuration TO authenticated;
GRANT ALL ON public.reward_points_balance TO authenticated;
GRANT ALL ON public.reward_transactions TO authenticated;
GRANT ALL ON public.reward_tree_paths TO authenticated;
GRANT ALL ON public.reward_daily_caps TO authenticated;
GRANT ALL ON public.reward_redemption_requests TO authenticated;
GRANT ALL ON public.reward_configuration_history TO authenticated;

GRANT USAGE ON SEQUENCE public.reward_configuration_id_seq TO authenticated;
GRANT USAGE ON SEQUENCE public.reward_transactions_id_seq TO authenticated;
GRANT USAGE ON SEQUENCE public.reward_redemption_requests_id_seq TO authenticated;
GRANT USAGE ON SEQUENCE public.reward_configuration_history_id_seq TO authenticated;

-- ============================================================================
-- 18. UPDATE EXISTING TREE STATS FOR ALL USERS
-- ============================================================================

DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN SELECT id FROM public.user_profiles LOOP
        PERFORM public.update_reward_tree_stats(r.id);
    END LOOP;
END
$$;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
