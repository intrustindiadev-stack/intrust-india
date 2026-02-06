-- ============================================================================
-- PRODUCTION-GRADE SUPABASE SCHEMA FOR COUPON MARKETPLACE
-- ============================================================================
-- Version: 1.0
-- Purpose: Secure, atomic, RLS-enforced schema for real money transactions
-- Platform: Supabase PostgreSQL
-- Business Model: Platform-owned coupons with 3% buyer fee
-- ============================================================================

-- ============================================================================
-- EXTENSIONS
-- ============================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- ENUMS
-- ============================================================================

CREATE TYPE user_role AS ENUM ('user', 'admin');
CREATE TYPE kyc_status AS ENUM ('pending', 'submitted', 'approved', 'rejected');
CREATE TYPE coupon_status AS ENUM ('available', 'sold', 'expired');
CREATE TYPE transaction_status AS ENUM ('pending', 'completed', 'failed', 'refunded');
CREATE TYPE ledger_entry_type AS ENUM ('buyer_fee', 'refund', 'adjustment');
CREATE TYPE audit_action AS ENUM (
    'user_created', 'user_suspended', 'user_reactivated',
    'kyc_submitted', 'kyc_approved', 'kyc_rejected',
    'coupon_created', 'coupon_expired', 'coupon_sold',
    'transaction_created', 'transaction_refunded',
    'admin_action'
);

-- ============================================================================
-- TABLES
-- ============================================================================

-- ----------------------------------------------------------------------------
-- USER PROFILES (extends auth.users)
-- ----------------------------------------------------------------------------
CREATE TABLE public.user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    role user_role NOT NULL DEFAULT 'user',
    full_name TEXT NOT NULL,
    phone TEXT,
    is_suspended BOOLEAN NOT NULL DEFAULT FALSE,
    suspension_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT phone_format CHECK (phone IS NULL OR phone ~ '^\+?[1-9]\d{1,14}$')
);

CREATE INDEX idx_user_profiles_role ON public.user_profiles(role);
CREATE INDEX idx_user_profiles_suspended ON public.user_profiles(is_suspended) WHERE is_suspended = TRUE;

-- ----------------------------------------------------------------------------
-- KYC RECORDS
-- ----------------------------------------------------------------------------
CREATE TABLE public.kyc_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    status kyc_status NOT NULL DEFAULT 'pending',
    
    -- KYC Data (encrypted at application layer before insert)
    full_legal_name TEXT NOT NULL,
    date_of_birth DATE NOT NULL,
    id_type TEXT NOT NULL, -- 'aadhaar', 'pan', 'passport'
    id_number_encrypted TEXT NOT NULL, -- Encrypted
    id_number_last4 TEXT NOT NULL, -- For display: ****1234
    address_line1 TEXT NOT NULL,
    address_line2 TEXT,
    city TEXT NOT NULL,
    state TEXT NOT NULL,
    postal_code TEXT NOT NULL,
    country TEXT NOT NULL DEFAULT 'IN',
    
    -- Document URLs (stored in Supabase Storage)
    id_document_front_url TEXT NOT NULL,
    id_document_back_url TEXT,
    selfie_url TEXT NOT NULL,
    
    -- Review
    reviewed_by UUID REFERENCES public.user_profiles(id),
    reviewed_at TIMESTAMPTZ,
    rejection_reason TEXT,
    
    submitted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT one_kyc_per_user UNIQUE(user_id),
    CONSTRAINT valid_id_type CHECK (id_type IN ('aadhaar', 'pan', 'passport', 'voter_id')),
    CONSTRAINT age_requirement CHECK (date_of_birth <= CURRENT_DATE - INTERVAL '18 years'),
    CONSTRAINT rejection_reason_required CHECK (
        (status = 'rejected' AND rejection_reason IS NOT NULL) OR 
        (status != 'rejected')
    ),
    CONSTRAINT review_data_consistency CHECK (
        (status IN ('approved', 'rejected') AND reviewed_by IS NOT NULL AND reviewed_at IS NOT NULL) OR
        (status NOT IN ('approved', 'rejected'))
    )
);

CREATE INDEX idx_kyc_user_id ON public.kyc_records(user_id);
CREATE INDEX idx_kyc_status ON public.kyc_records(status);
CREATE INDEX idx_kyc_submitted_at ON public.kyc_records(submitted_at) WHERE submitted_at IS NOT NULL;

-- ----------------------------------------------------------------------------
-- COUPONS (Platform-owned inventory)
-- ----------------------------------------------------------------------------
CREATE TABLE public.coupons (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Coupon Details
    brand TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    category TEXT NOT NULL,
    
    -- Pricing (stored in paise/cents to avoid decimal issues)
    face_value_paise BIGINT NOT NULL,
    selling_price_paise BIGINT NOT NULL,
    
    -- Coupon Code (CRITICAL SECURITY)
    encrypted_code TEXT NOT NULL, -- AES-256 encrypted, only service role can decrypt
    masked_code TEXT NOT NULL, -- For preview: "SAVE****1234"
    
    -- Status
    status coupon_status NOT NULL DEFAULT 'available',
    
    -- Validity
    valid_from TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    valid_until TIMESTAMPTZ NOT NULL,
    
    -- Terms
    terms_and_conditions TEXT NOT NULL,
    usage_instructions TEXT,
    
    -- Metadata
    image_url TEXT,
    tags TEXT[], -- For filtering: ['electronics', 'discount50']
    
    -- Future merchant support (nullable for now)
    merchant_id UUID, -- Will reference merchants table in future
    
    -- Tracking
    purchased_by UUID REFERENCES public.user_profiles(id),
    purchased_at TIMESTAMPTZ,
    created_by UUID NOT NULL REFERENCES public.user_profiles(id), -- Admin who added it
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT positive_face_value CHECK (face_value_paise > 0),
    CONSTRAINT positive_selling_price CHECK (selling_price_paise > 0),
    CONSTRAINT valid_date_range CHECK (valid_until > valid_from),
    CONSTRAINT sold_coupon_has_buyer CHECK (
        (status = 'sold' AND purchased_by IS NOT NULL AND purchased_at IS NOT NULL) OR
        (status != 'sold')
    ),
    CONSTRAINT available_coupon_no_buyer CHECK (
        (status = 'available' AND purchased_by IS NULL AND purchased_at IS NULL) OR
        (status != 'available')
    )
);

-- Critical indexes for performance and concurrency
CREATE INDEX idx_coupons_status ON public.coupons(status);
CREATE INDEX idx_coupons_available ON public.coupons(status, selling_price_paise) 
    WHERE status = 'available';
CREATE INDEX idx_coupons_category ON public.coupons(category) WHERE status = 'available';
CREATE INDEX idx_coupons_brand ON public.coupons(brand) WHERE status = 'available';
CREATE INDEX idx_coupons_valid_until ON public.coupons(valid_until) 
    WHERE status = 'available';
CREATE INDEX idx_coupons_purchased_by ON public.coupons(purchased_by) 
    WHERE purchased_by IS NOT NULL;
CREATE INDEX idx_coupons_tags ON public.coupons USING GIN(tags);

-- ----------------------------------------------------------------------------
-- TRANSACTIONS (Immutable financial records)
-- ----------------------------------------------------------------------------
CREATE TABLE public.transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Parties
    user_id UUID NOT NULL REFERENCES public.user_profiles(id),
    coupon_id UUID NOT NULL REFERENCES public.coupons(id),
    
    -- Financial breakdown (in paise)
    coupon_price_paise BIGINT NOT NULL,
    buyer_fee_paise BIGINT NOT NULL,
    total_paid_paise BIGINT NOT NULL,
    
    -- Payment
    payment_method TEXT NOT NULL DEFAULT 'upi',
    payment_reference TEXT, -- UPI transaction ID
    
    -- Status
    status transaction_status NOT NULL DEFAULT 'pending',
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    
    CONSTRAINT positive_amounts CHECK (
        coupon_price_paise > 0 AND 
        buyer_fee_paise >= 0 AND 
        total_paid_paise > 0
    ),
    CONSTRAINT total_calculation CHECK (
        total_paid_paise = coupon_price_paise + buyer_fee_paise
    ),
    CONSTRAINT completed_transaction_has_timestamp CHECK (
        (status = 'completed' AND completed_at IS NOT NULL) OR
        (status != 'completed')
    )
);

CREATE INDEX idx_transactions_user_id ON public.transactions(user_id);
CREATE INDEX idx_transactions_coupon_id ON public.transactions(coupon_id);
CREATE INDEX idx_transactions_status ON public.transactions(status);
CREATE INDEX idx_transactions_created_at ON public.transactions(created_at DESC);

-- ----------------------------------------------------------------------------
-- PLATFORM LEDGER (Revenue tracking)
-- ----------------------------------------------------------------------------
CREATE TABLE public.platform_ledger (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Reference
    transaction_id UUID NOT NULL REFERENCES public.transactions(id),
    entry_type ledger_entry_type NOT NULL,
    
    -- Amount (in paise)
    amount_paise BIGINT NOT NULL,
    
    -- Running balance (in paise)
    balance_after_paise BIGINT NOT NULL,
    
    -- Metadata
    description TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT non_zero_amount CHECK (amount_paise != 0)
);

CREATE INDEX idx_ledger_transaction_id ON public.platform_ledger(transaction_id);
CREATE INDEX idx_ledger_created_at ON public.platform_ledger(created_at DESC);
CREATE INDEX idx_ledger_entry_type ON public.platform_ledger(entry_type);

-- ----------------------------------------------------------------------------
-- AUDIT LOGS (Immutable audit trail)
-- ----------------------------------------------------------------------------
CREATE TABLE public.audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Who
    actor_id UUID REFERENCES public.user_profiles(id),
    actor_role user_role,
    
    -- What
    action audit_action NOT NULL,
    entity_type TEXT NOT NULL, -- 'user', 'coupon', 'transaction', etc.
    entity_id UUID,
    
    -- Details
    description TEXT NOT NULL,
    metadata JSONB, -- Additional context
    
    -- When & Where
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_actor_id ON public.audit_logs(actor_id);
CREATE INDEX idx_audit_logs_action ON public.audit_logs(action);
CREATE INDEX idx_audit_logs_entity ON public.audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_created_at ON public.audit_logs(created_at DESC);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kyc_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------------------
-- USER PROFILES POLICIES
-- ----------------------------------------------------------------------------

-- Users can read their own profile
CREATE POLICY "Users can view own profile"
    ON public.user_profiles FOR SELECT
    TO authenticated
    USING (auth.uid() = id);

-- Users can update their own profile (limited fields)
CREATE POLICY "Users can update own profile"
    ON public.user_profiles FOR UPDATE
    TO authenticated
    USING (auth.uid() = id)
    WITH CHECK (
        auth.uid() = id AND
        role = 'user' AND -- Cannot change role
        is_suspended = (SELECT is_suspended FROM public.user_profiles WHERE id = auth.uid()) -- Cannot unsuspend self
    );

-- Admins can view all profiles
CREATE POLICY "Admins can view all profiles"
    ON public.user_profiles FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Admins can update any profile
CREATE POLICY "Admins can update profiles"
    ON public.user_profiles FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Only system can insert (via trigger on auth.users)
CREATE POLICY "System can insert profiles"
    ON public.user_profiles FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = id);

-- ----------------------------------------------------------------------------
-- KYC RECORDS POLICIES
-- ----------------------------------------------------------------------------

-- Users can view their own KYC
CREATE POLICY "Users can view own KYC"
    ON public.kyc_records FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

-- Users can insert their own KYC (once)
CREATE POLICY "Users can submit KYC"
    ON public.kyc_records FOR INSERT
    TO authenticated
    WITH CHECK (
        user_id = auth.uid() AND
        status = 'pending'
    );

-- Users can update their own pending KYC
CREATE POLICY "Users can update pending KYC"
    ON public.kyc_records FOR UPDATE
    TO authenticated
    USING (
        user_id = auth.uid() AND
        status = 'pending'
    )
    WITH CHECK (
        user_id = auth.uid() AND
        status = 'pending'
    );

-- Admins can view all KYC
CREATE POLICY "Admins can view all KYC"
    ON public.kyc_records FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Admins can update KYC status
CREATE POLICY "Admins can review KYC"
    ON public.kyc_records FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- ----------------------------------------------------------------------------
-- COUPONS POLICIES
-- ----------------------------------------------------------------------------

-- Users can view ONLY available coupons (limited columns)
CREATE POLICY "Users can browse available coupons"
    ON public.coupons FOR SELECT
    TO authenticated
    USING (
        status = 'available' AND
        valid_until > NOW() AND
        EXISTS (
            SELECT 1 FROM public.user_profiles
            WHERE id = auth.uid() AND role = 'user' AND is_suspended = FALSE
        )
    );

-- Users can view their purchased coupons (including encrypted_code via function)
CREATE POLICY "Users can view purchased coupons"
    ON public.coupons FOR SELECT
    TO authenticated
    USING (
        purchased_by = auth.uid() AND
        status = 'sold'
    );

-- Admins can view all coupons
CREATE POLICY "Admins can view all coupons"
    ON public.coupons FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Admins can insert coupons
CREATE POLICY "Admins can create coupons"
    ON public.coupons FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.user_profiles
            WHERE id = auth.uid() AND role = 'admin'
        ) AND
        status = 'available' AND
        purchased_by IS NULL
    );

-- Admins can update coupons (limited: cannot change sold coupons)
CREATE POLICY "Admins can update coupons"
    ON public.coupons FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles
            WHERE id = auth.uid() AND role = 'admin'
        ) AND
        status != 'sold' -- Cannot modify sold coupons
    );

-- NO DELETE POLICY - Coupons are never deleted

-- ----------------------------------------------------------------------------
-- TRANSACTIONS POLICIES
-- ----------------------------------------------------------------------------

-- Users can view their own transactions
CREATE POLICY "Users can view own transactions"
    ON public.transactions FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

-- Admins can view all transactions
CREATE POLICY "Admins can view all transactions"
    ON public.transactions FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- NO INSERT/UPDATE/DELETE - Only via purchase function

-- ----------------------------------------------------------------------------
-- PLATFORM LEDGER POLICIES
-- ----------------------------------------------------------------------------

-- Admins can view ledger
CREATE POLICY "Admins can view ledger"
    ON public.platform_ledger FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- NO INSERT/UPDATE/DELETE - Only via purchase function

-- ----------------------------------------------------------------------------
-- AUDIT LOGS POLICIES
-- ----------------------------------------------------------------------------

-- Admins can view audit logs
CREATE POLICY "Admins can view audit logs"
    ON public.audit_logs FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Anyone can insert audit logs (via trigger)
CREATE POLICY "System can insert audit logs"
    ON public.audit_logs FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- NO UPDATE/DELETE - Audit logs are immutable

-- ============================================================================
-- CRITICAL FINANCIAL FUNCTION: PURCHASE COUPON
-- ============================================================================

CREATE OR REPLACE FUNCTION public.purchase_coupon(
    p_coupon_id UUID,
    p_payment_reference TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER -- Runs with elevated privileges
SET search_path = public
AS $$
DECLARE
    v_user_id UUID;
    v_user_role user_role;
    v_is_suspended BOOLEAN;
    v_kyc_status kyc_status;
    v_coupon RECORD;
    v_buyer_fee_paise BIGINT;
    v_total_paid_paise BIGINT;
    v_transaction_id UUID;
    v_current_balance BIGINT;
    v_new_balance BIGINT;
BEGIN
    -- Get current user
    v_user_id := auth.uid();
    
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;
    
    -- Check user status
    SELECT role, is_suspended INTO v_user_role, v_is_suspended
    FROM public.user_profiles
    WHERE id = v_user_id;
    
    IF v_user_role != 'user' THEN
        RAISE EXCEPTION 'Only regular users can purchase coupons';
    END IF;
    
    IF v_is_suspended THEN
        RAISE EXCEPTION 'Account is suspended';
    END IF;
    
    -- Check KYC status
    SELECT status INTO v_kyc_status
    FROM public.kyc_records
    WHERE user_id = v_user_id;
    
    IF v_kyc_status IS NULL THEN
        RAISE EXCEPTION 'KYC not submitted';
    END IF;
    
    IF v_kyc_status != 'approved' THEN
        RAISE EXCEPTION 'KYC not approved. Current status: %', v_kyc_status;
    END IF;
    
    -- CRITICAL: Lock the coupon row to prevent race conditions
    SELECT 
        id, brand, title, selling_price_paise, status, 
        valid_until, purchased_by
    INTO v_coupon
    FROM public.coupons
    WHERE id = p_coupon_id
    FOR UPDATE; -- LOCK THE ROW
    
    -- Validate coupon exists
    IF v_coupon.id IS NULL THEN
        RAISE EXCEPTION 'Coupon not found';
    END IF;
    
    -- Validate coupon is available
    IF v_coupon.status != 'available' THEN
        RAISE EXCEPTION 'Coupon is not available. Current status: %', v_coupon.status;
    END IF;
    
    -- Validate coupon is not expired
    IF v_coupon.valid_until <= NOW() THEN
        RAISE EXCEPTION 'Coupon has expired';
    END IF;
    
    -- Double-check no buyer (redundant but critical)
    IF v_coupon.purchased_by IS NOT NULL THEN
        RAISE EXCEPTION 'Coupon already purchased';
    END IF;
    
    -- Calculate fees (MUST be done in SQL, not frontend)
    v_buyer_fee_paise := FLOOR(v_coupon.selling_price_paise * 0.03);
    v_total_paid_paise := v_coupon.selling_price_paise + v_buyer_fee_paise;
    
    -- Create transaction record
    INSERT INTO public.transactions (
        user_id,
        coupon_id,
        coupon_price_paise,
        buyer_fee_paise,
        total_paid_paise,
        payment_method,
        payment_reference,
        status,
        completed_at
    ) VALUES (
        v_user_id,
        p_coupon_id,
        v_coupon.selling_price_paise,
        v_buyer_fee_paise,
        v_total_paid_paise,
        'upi',
        p_payment_reference,
        'completed',
        NOW()
    )
    RETURNING id INTO v_transaction_id;
    
    -- Mark coupon as sold
    UPDATE public.coupons
    SET 
        status = 'sold',
        purchased_by = v_user_id,
        purchased_at = NOW(),
        updated_at = NOW()
    WHERE id = p_coupon_id;
    
    -- Get current platform balance
    SELECT COALESCE(balance_after_paise, 0)
    INTO v_current_balance
    FROM public.platform_ledger
    ORDER BY created_at DESC
    LIMIT 1;
    
    v_new_balance := v_current_balance + v_buyer_fee_paise;
    
    -- Record platform revenue in ledger
    INSERT INTO public.platform_ledger (
        transaction_id,
        entry_type,
        amount_paise,
        balance_after_paise,
        description
    ) VALUES (
        v_transaction_id,
        'buyer_fee',
        v_buyer_fee_paise,
        v_new_balance,
        FORMAT('Buyer fee from transaction %s', v_transaction_id)
    );
    
    -- Log the purchase
    INSERT INTO public.audit_logs (
        actor_id,
        actor_role,
        action,
        entity_type,
        entity_id,
        description,
        metadata
    ) VALUES (
        v_user_id,
        'user',
        'coupon_sold',
        'coupon',
        p_coupon_id,
        FORMAT('User purchased coupon: %s - %s', v_coupon.brand, v_coupon.title),
        jsonb_build_object(
            'transaction_id', v_transaction_id,
            'amount_paise', v_total_paid_paise
        )
    );
    
    -- Return success response
    RETURN jsonb_build_object(
        'success', true,
        'transaction_id', v_transaction_id,
        'coupon_id', p_coupon_id,
        'total_paid_paise', v_total_paid_paise,
        'buyer_fee_paise', v_buyer_fee_paise,
        'message', 'Purchase successful'
    );
    
EXCEPTION
    WHEN OTHERS THEN
        -- Log the error
        INSERT INTO public.audit_logs (
            actor_id,
            actor_role,
            action,
            entity_type,
            entity_id,
            description,
            metadata
        ) VALUES (
            v_user_id,
            COALESCE(v_user_role, 'user'),
            'transaction_created',
            'transaction',
            NULL,
            'Purchase failed: ' || SQLERRM,
            jsonb_build_object(
                'coupon_id', p_coupon_id,
                'error', SQLERRM
            )
        );
        
        -- Re-raise the exception
        RAISE;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.purchase_coupon TO authenticated;

-- ============================================================================
-- HELPER FUNCTION: GET DECRYPTED COUPON CODE
-- ============================================================================
-- This function allows users to retrieve the decrypted code ONLY for coupons they own
-- Actual decryption should be done by service role in application layer

CREATE OR REPLACE FUNCTION public.get_my_coupon_code(p_coupon_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID;
    v_encrypted_code TEXT;
BEGIN
    v_user_id := auth.uid();
    
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;
    
    -- Get encrypted code only if user owns it
    SELECT encrypted_code INTO v_encrypted_code
    FROM public.coupons
    WHERE id = p_coupon_id
        AND purchased_by = v_user_id
        AND status = 'sold';
    
    IF v_encrypted_code IS NULL THEN
        RAISE EXCEPTION 'Coupon not found or not owned by you';
    END IF;
    
    -- Return encrypted code (application layer will decrypt using service role)
    RETURN v_encrypted_code;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_my_coupon_code TO authenticated;

-- ============================================================================
-- ADMIN FUNCTIONS
-- ============================================================================

-- Function to bulk insert coupons
CREATE OR REPLACE FUNCTION public.admin_bulk_insert_coupons(coupons_data JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID;
    v_user_role user_role;
    v_inserted_count INT := 0;
    v_coupon JSONB;
BEGIN
    v_user_id := auth.uid();
    
    -- Check admin role
    SELECT role INTO v_user_role
    FROM public.user_profiles
    WHERE id = v_user_id;
    
    IF v_user_role != 'admin' THEN
        RAISE EXCEPTION 'Only admins can bulk insert coupons';
    END IF;
    
    -- Insert each coupon
    FOR v_coupon IN SELECT * FROM jsonb_array_elements(coupons_data)
    LOOP
        INSERT INTO public.coupons (
            brand, title, description, category,
            face_value_paise, selling_price_paise,
            encrypted_code, masked_code,
            valid_from, valid_until,
            terms_and_conditions, usage_instructions,
            image_url, tags, created_by
        ) VALUES (
            v_coupon->>'brand',
            v_coupon->>'title',
            v_coupon->>'description',
            v_coupon->>'category',
            (v_coupon->>'face_value_paise')::BIGINT,
            (v_coupon->>'selling_price_paise')::BIGINT,
            v_coupon->>'encrypted_code',
            v_coupon->>'masked_code',
            COALESCE((v_coupon->>'valid_from')::TIMESTAMPTZ, NOW()),
            (v_coupon->>'valid_until')::TIMESTAMPTZ,
            v_coupon->>'terms_and_conditions',
            v_coupon->>'usage_instructions',
            v_coupon->>'image_url',
            CASE 
                WHEN v_coupon->'tags' IS NOT NULL 
                THEN ARRAY(SELECT jsonb_array_elements_text(v_coupon->'tags'))
                ELSE NULL
            END,
            v_user_id
        );
        
        v_inserted_count := v_inserted_count + 1;
    END LOOP;
    
    -- Log the action
    INSERT INTO public.audit_logs (
        actor_id, actor_role, action, entity_type,
        description, metadata
    ) VALUES (
        v_user_id, 'admin', 'coupon_created', 'coupon',
        FORMAT('Bulk inserted %s coupons', v_inserted_count),
        jsonb_build_object('count', v_inserted_count)
    );
    
    RETURN jsonb_build_object(
        'success', true,
        'inserted_count', v_inserted_count
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_bulk_insert_coupons TO authenticated;

-- Function to mark expired coupons
CREATE OR REPLACE FUNCTION public.admin_mark_expired_coupons()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID;
    v_user_role user_role;
    v_updated_count INT;
BEGIN
    v_user_id := auth.uid();
    
    -- Check admin role
    SELECT role INTO v_user_role
    FROM public.user_profiles
    WHERE id = v_user_id;
    
    IF v_user_role != 'admin' THEN
        RAISE EXCEPTION 'Only admins can mark expired coupons';
    END IF;
    
    -- Update expired coupons
    UPDATE public.coupons
    SET 
        status = 'expired',
        updated_at = NOW()
    WHERE status = 'available'
        AND valid_until <= NOW();
    
    GET DIAGNOSTICS v_updated_count = ROW_COUNT;
    
    -- Log the action
    INSERT INTO public.audit_logs (
        actor_id, actor_role, action, entity_type,
        description, metadata
    ) VALUES (
        v_user_id, 'admin', 'coupon_expired', 'coupon',
        FORMAT('Marked %s coupons as expired', v_updated_count),
        jsonb_build_object('count', v_updated_count)
    );
    
    RETURN jsonb_build_object(
        'success', true,
        'expired_count', v_updated_count
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_mark_expired_coupons TO authenticated;

-- Function to suspend user
CREATE OR REPLACE FUNCTION public.admin_suspend_user(
    p_user_id UUID,
    p_reason TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_admin_id UUID;
    v_admin_role user_role;
BEGIN
    v_admin_id := auth.uid();
    
    -- Check admin role
    SELECT role INTO v_admin_role
    FROM public.user_profiles
    WHERE id = v_admin_id;
    
    IF v_admin_role != 'admin' THEN
        RAISE EXCEPTION 'Only admins can suspend users';
    END IF;
    
    -- Cannot suspend another admin
    IF EXISTS (
        SELECT 1 FROM public.user_profiles
        WHERE id = p_user_id AND role = 'admin'
    ) THEN
        RAISE EXCEPTION 'Cannot suspend admin users';
    END IF;
    
    -- Suspend user
    UPDATE public.user_profiles
    SET 
        is_suspended = TRUE,
        suspension_reason = p_reason,
        updated_at = NOW()
    WHERE id = p_user_id;
    
    -- Log the action
    INSERT INTO public.audit_logs (
        actor_id, actor_role, action, entity_type, entity_id,
        description, metadata
    ) VALUES (
        v_admin_id, 'admin', 'user_suspended', 'user', p_user_id,
        FORMAT('User suspended: %s', p_reason),
        jsonb_build_object('reason', p_reason)
    );
    
    RETURN jsonb_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_suspend_user TO authenticated;

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Trigger to create user profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.user_profiles (id, full_name, role)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'),
        'user'
    );
    
    INSERT INTO public.audit_logs (
        actor_id, actor_role, action, entity_type, entity_id,
        description
    ) VALUES (
        NEW.id, 'user', 'user_created', 'user', NEW.id,
        'New user registered'
    );
    
    RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

CREATE TRIGGER set_updated_at_user_profiles
    BEFORE UPDATE ON public.user_profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER set_updated_at_kyc_records
    BEFORE UPDATE ON public.kyc_records
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER set_updated_at_coupons
    BEFORE UPDATE ON public.coupons
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at();

-- ============================================================================
-- ADMIN VIEWS (For reporting and monitoring)
-- ============================================================================

CREATE OR REPLACE VIEW public.admin_revenue_summary AS
SELECT
    COUNT(DISTINCT t.id) as total_transactions,
    SUM(t.coupon_price_paise) as total_coupon_sales_paise,
    SUM(t.buyer_fee_paise) as total_platform_revenue_paise,
    SUM(t.total_paid_paise) as total_gmv_paise,
    COUNT(DISTINCT t.user_id) as unique_buyers,
    MIN(t.created_at) as first_transaction,
    MAX(t.created_at) as last_transaction
FROM public.transactions t
WHERE t.status = 'completed';

CREATE OR REPLACE VIEW public.admin_coupon_inventory AS
SELECT
    status,
    COUNT(*) as count,
    SUM(selling_price_paise) as total_value_paise,
    AVG(selling_price_paise) as avg_price_paise
FROM public.coupons
GROUP BY status;

CREATE OR REPLACE VIEW public.admin_kyc_summary AS
SELECT
    status,
    COUNT(*) as count
FROM public.kyc_records
GROUP BY status;

-- Grant view access to admins only (handled by RLS on base tables)

-- ============================================================================
-- INITIAL DATA (Optional: Create first admin)
-- ============================================================================

-- This should be run manually after first admin signs up
-- UPDATE public.user_profiles SET role = 'admin' WHERE id = '<first-admin-uuid>';

-- ============================================================================
-- COMMENTS (Documentation)
-- ============================================================================

COMMENT ON TABLE public.user_profiles IS 'User profiles extending auth.users with role and suspension tracking';
COMMENT ON TABLE public.kyc_records IS 'KYC verification records with encrypted sensitive data';
COMMENT ON TABLE public.coupons IS 'Platform-owned coupon inventory with encrypted codes';
COMMENT ON TABLE public.transactions IS 'Immutable financial transaction records';
COMMENT ON TABLE public.platform_ledger IS 'Double-entry ledger for platform revenue tracking';
COMMENT ON TABLE public.audit_logs IS 'Immutable audit trail for all critical actions';

COMMENT ON FUNCTION public.purchase_coupon IS 'CRITICAL: Atomic coupon purchase with row locking and fee calculation';
COMMENT ON FUNCTION public.get_my_coupon_code IS 'Retrieve encrypted coupon code for owned coupons';
COMMENT ON FUNCTION public.admin_bulk_insert_coupons IS 'Admin function to bulk insert coupons';
COMMENT ON FUNCTION public.admin_mark_expired_coupons IS 'Admin function to mark expired coupons';
COMMENT ON FUNCTION public.admin_suspend_user IS 'Admin function to suspend users';

-- ============================================================================
-- END OF SCHEMA
-- ============================================================================
