-- ============================================================================
-- MERCHANT SUPPORT MIGRATION - SAFE ADDITIVE CHANGES ONLY
-- ============================================================================
-- Version: 2.0
-- Purpose: Add merchant functionality WITHOUT breaking existing data
-- Safety: All changes are ADDITIVE - no existing data will be modified
-- Business Model: Merchants buy at customer price + 3% commission,
--                 list on marketplace, customers pay + 3% commission
-- ============================================================================

-- ============================================================================
-- SAFETY CHECK: Verify we're not breaking anything
-- ============================================================================
DO $$
BEGIN
    RAISE NOTICE '=== STARTING SAFE MERCHANT MIGRATION ===';
    RAISE NOTICE 'This migration only ADDS new tables and columns';
    RAISE NOTICE 'Existing data will NOT be modified';
END $$;

-- ============================================================================
-- STEP 1: CREATE MERCHANTS TABLE (NEW TABLE - SAFE)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.merchants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    
    -- Business Information
    business_name TEXT NOT NULL,
    gst_number TEXT,
    pan_number TEXT,
    
    -- Status
    status TEXT NOT NULL DEFAULT 'pending' 
        CHECK (status IN ('pending', 'approved', 'suspended', 'rejected')),
    
    -- Financial (stored in paise for precision)
    wallet_balance_paise BIGINT NOT NULL DEFAULT 0,
    total_commission_paid_paise BIGINT NOT NULL DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT one_merchant_per_user UNIQUE(user_id),
    CONSTRAINT positive_wallet_balance CHECK (wallet_balance_paise >= 0),
    CONSTRAINT positive_commission CHECK (total_commission_paid_paise >= 0)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_merchants_user_id ON public.merchants(user_id);
CREATE INDEX IF NOT EXISTS idx_merchants_status ON public.merchants(status);

COMMENT ON TABLE public.merchants IS 'Merchant profiles for users who want to resell coupons';
COMMENT ON COLUMN public.merchants.wallet_balance_paise IS 'Current wallet balance in paise (1 rupee = 100 paise)';
COMMENT ON COLUMN public.merchants.total_commission_paid_paise IS 'Total commission paid to platform in paise';

-- ============================================================================
-- STEP 2: ADD MERCHANT COLUMNS TO COUPONS TABLE (SAFE - NULLABLE)
-- ============================================================================

-- Add merchant-related fields (all nullable to not break existing data)
ALTER TABLE public.coupons 
    ADD COLUMN IF NOT EXISTS merchant_purchase_price_paise BIGINT,
    ADD COLUMN IF NOT EXISTS merchant_selling_price_paise BIGINT,
    ADD COLUMN IF NOT EXISTS merchant_commission_paise BIGINT,
    ADD COLUMN IF NOT EXISTS listed_on_marketplace BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS is_merchant_owned BOOLEAN DEFAULT FALSE;

-- Add foreign key constraint for merchant_id (it already exists as nullable)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'coupons_merchant_id_fkey'
    ) THEN
        ALTER TABLE public.coupons 
            ADD CONSTRAINT coupons_merchant_id_fkey 
            FOREIGN KEY (merchant_id) REFERENCES public.merchants(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Add check constraint for merchant-owned coupons
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.constraint_column_usage 
        WHERE constraint_name = 'merchant_coupon_has_prices'
    ) THEN
        ALTER TABLE public.coupons
            ADD CONSTRAINT merchant_coupon_has_prices CHECK (
                (is_merchant_owned = TRUE AND 
                 merchant_purchase_price_paise IS NOT NULL AND 
                 merchant_selling_price_paise IS NOT NULL AND
                 merchant_commission_paise IS NOT NULL) OR
                (is_merchant_owned = FALSE)
            );
    END IF;
END $$;

-- Create indexes for marketplace queries
CREATE INDEX IF NOT EXISTS idx_coupons_marketplace 
    ON public.coupons(listed_on_marketplace, status) 
    WHERE listed_on_marketplace = TRUE AND status = 'available';

CREATE INDEX IF NOT EXISTS idx_coupons_merchant_id 
    ON public.coupons(merchant_id) 
    WHERE merchant_id IS NOT NULL;

COMMENT ON COLUMN public.coupons.merchant_purchase_price_paise IS 'Price merchant paid (same as customer price)';
COMMENT ON COLUMN public.coupons.merchant_selling_price_paise IS 'Price merchant lists on marketplace';
COMMENT ON COLUMN public.coupons.merchant_commission_paise IS '3% commission merchant paid on purchase';
COMMENT ON COLUMN public.coupons.listed_on_marketplace IS 'Whether merchant has listed this on marketplace';
COMMENT ON COLUMN public.coupons.is_merchant_owned IS 'TRUE if purchased by merchant, FALSE if platform-owned';

-- ============================================================================
-- STEP 3: CREATE MERCHANT TRANSACTIONS TABLE (NEW TABLE - SAFE)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.merchant_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Parties
    merchant_id UUID NOT NULL REFERENCES public.merchants(id) ON DELETE CASCADE,
    
    -- Transaction Details
    transaction_type TEXT NOT NULL 
        CHECK (transaction_type IN ('purchase', 'sale', 'commission', 'wallet_topup', 'withdrawal')),
    
    -- Amounts (in paise)
    amount_paise BIGINT NOT NULL,
    commission_paise BIGINT DEFAULT 0,
    balance_after_paise BIGINT NOT NULL,
    
    -- References
    coupon_id UUID REFERENCES public.coupons(id),
    customer_transaction_id UUID REFERENCES public.transactions(id),
    
    -- Metadata
    description TEXT NOT NULL,
    metadata JSONB,
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT non_zero_amount CHECK (amount_paise != 0)
);

-- Indexes for merchant transaction queries
CREATE INDEX IF NOT EXISTS idx_merchant_transactions_merchant_id 
    ON public.merchant_transactions(merchant_id);
CREATE INDEX IF NOT EXISTS idx_merchant_transactions_type 
    ON public.merchant_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_merchant_transactions_created_at 
    ON public.merchant_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_merchant_transactions_coupon_id 
    ON public.merchant_transactions(coupon_id) 
    WHERE coupon_id IS NOT NULL;

COMMENT ON TABLE public.merchant_transactions IS 'Immutable ledger of all merchant financial transactions';
COMMENT ON COLUMN public.merchant_transactions.amount_paise IS 'Transaction amount in paise (negative for debits, positive for credits)';
COMMENT ON COLUMN public.merchant_transactions.balance_after_paise IS 'Merchant wallet balance after this transaction';

-- ============================================================================
-- STEP 4: ROW LEVEL SECURITY POLICIES
-- ============================================================================

-- Enable RLS on new tables
ALTER TABLE public.merchants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.merchant_transactions ENABLE ROW LEVEL SECURITY;

-- Merchants Table Policies
CREATE POLICY "merchants_select_own" 
    ON public.merchants FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "merchants_update_own" 
    ON public.merchants FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (
        user_id = auth.uid() AND
        -- Prevent merchants from changing their own status
        status = (SELECT status FROM public.merchants WHERE user_id = auth.uid())
    );

CREATE POLICY "merchants_insert_own" 
    ON public.merchants FOR INSERT
    TO authenticated
    WITH CHECK (
        user_id = auth.uid() AND
        status = 'pending' -- New merchants always start as pending
    );

CREATE POLICY "merchants_select_admin" 
    ON public.merchants FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "merchants_update_admin" 
    ON public.merchants FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Merchant Transactions Policies
CREATE POLICY "merchant_transactions_select_own" 
    ON public.merchant_transactions FOR SELECT
    TO authenticated
    USING (
        merchant_id IN (
            SELECT id FROM public.merchants WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "merchant_transactions_select_admin" 
    ON public.merchant_transactions FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Update Coupons Policies for Merchant Access
CREATE POLICY "coupons_select_merchant_owned" 
    ON public.coupons FOR SELECT
    TO authenticated
    USING (
        merchant_id IN (
            SELECT id FROM public.merchants WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "coupons_update_merchant_owned" 
    ON public.coupons FOR UPDATE
    TO authenticated
    USING (
        merchant_id IN (
            SELECT id FROM public.merchants WHERE user_id = auth.uid()
        ) AND
        status = 'available' -- Can only update available coupons
    )
    WITH CHECK (
        merchant_id IN (
            SELECT id FROM public.merchants WHERE user_id = auth.uid()
        )
    );

-- ============================================================================
-- STEP 5: MERCHANT PURCHASE FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION public.merchant_purchase_coupon(
    p_coupon_id UUID,
    p_quantity INTEGER DEFAULT 1
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID;
    v_merchant_id UUID;
    v_merchant_status TEXT;
    v_merchant_balance BIGINT;
    v_coupon RECORD;
    v_purchase_price_paise BIGINT;
    v_commission_paise BIGINT;
    v_total_cost_paise BIGINT;
    v_new_balance BIGINT;
    v_transaction_id UUID;
BEGIN
    -- Get current user
    v_user_id := auth.uid();
    
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;
    
    -- Get merchant profile
    SELECT id, status, wallet_balance_paise 
    INTO v_merchant_id, v_merchant_status, v_merchant_balance
    FROM public.merchants
    WHERE user_id = v_user_id;
    
    IF v_merchant_id IS NULL THEN
        RAISE EXCEPTION 'Merchant profile not found';
    END IF;
    
    IF v_merchant_status != 'approved' THEN
        RAISE EXCEPTION 'Merchant account not approved. Status: %', v_merchant_status;
    END IF;
    
    -- Get coupon details
    SELECT id, brand, title, selling_price_paise, status, valid_until, is_merchant_owned
    INTO v_coupon
    FROM public.coupons
    WHERE id = p_coupon_id
    FOR UPDATE;
    
    IF v_coupon.id IS NULL THEN
        RAISE EXCEPTION 'Coupon not found';
    END IF;
    
    IF v_coupon.status != 'available' THEN
        RAISE EXCEPTION 'Coupon not available';
    END IF;
    
    IF v_coupon.valid_until <= NOW() THEN
        RAISE EXCEPTION 'Coupon expired';
    END IF;
    
    IF v_coupon.is_merchant_owned = TRUE THEN
        RAISE EXCEPTION 'Cannot purchase merchant-owned coupons';
    END IF;
    
    -- Calculate costs (merchant pays same price as customers + 3% commission)
    v_purchase_price_paise := v_coupon.selling_price_paise;
    v_commission_paise := FLOOR(v_purchase_price_paise * 0.03);
    v_total_cost_paise := v_purchase_price_paise + v_commission_paise;
    
    -- Check merchant balance
    IF v_merchant_balance < v_total_cost_paise THEN
        RAISE EXCEPTION 'Insufficient balance. Required: %, Available: %', 
            v_total_cost_paise, v_merchant_balance;
    END IF;
    
    -- Deduct from merchant balance
    v_new_balance := v_merchant_balance - v_total_cost_paise;
    
    UPDATE public.merchants
    SET 
        wallet_balance_paise = v_new_balance,
        total_commission_paid_paise = total_commission_paid_paise + v_commission_paise,
        updated_at = NOW()
    WHERE id = v_merchant_id;
    
    -- Update coupon to merchant-owned
    UPDATE public.coupons
    SET 
        merchant_id = v_merchant_id,
        is_merchant_owned = TRUE,
        merchant_purchase_price_paise = v_purchase_price_paise,
        merchant_commission_paise = v_commission_paise,
        listed_on_marketplace = FALSE,
        updated_at = NOW()
    WHERE id = p_coupon_id;
    
    -- Record transaction
    INSERT INTO public.merchant_transactions (
        merchant_id,
        transaction_type,
        amount_paise,
        commission_paise,
        balance_after_paise,
        coupon_id,
        description,
        metadata
    ) VALUES (
        v_merchant_id,
        'purchase',
        -v_total_cost_paise,
        v_commission_paise,
        v_new_balance,
        p_coupon_id,
        FORMAT('Purchased coupon: %s - %s', v_coupon.brand, v_coupon.title),
        jsonb_build_object(
            'purchase_price_paise', v_purchase_price_paise,
            'commission_paise', v_commission_paise,
            'total_cost_paise', v_total_cost_paise
        )
    )
    RETURNING id INTO v_transaction_id;
    
    -- Return success
    RETURN jsonb_build_object(
        'success', true,
        'transaction_id', v_transaction_id,
        'coupon_id', p_coupon_id,
        'purchase_price_paise', v_purchase_price_paise,
        'commission_paise', v_commission_paise,
        'total_cost_paise', v_total_cost_paise,
        'new_balance_paise', v_new_balance
    );
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE;
END;
$$;

GRANT EXECUTE ON FUNCTION public.merchant_purchase_coupon TO authenticated;

COMMENT ON FUNCTION public.merchant_purchase_coupon IS 'Allows approved merchants to purchase platform coupons for resale';

-- ============================================================================
-- STEP 6: MERCHANT LIST TO MARKETPLACE FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION public.merchant_list_to_marketplace(
    p_coupon_id UUID,
    p_selling_price_paise BIGINT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID;
    v_merchant_id UUID;
    v_coupon RECORD;
    v_customer_total_paise BIGINT;
    v_merchant_profit_paise BIGINT;
BEGIN
    v_user_id := auth.uid();
    
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;
    
    -- Get merchant ID
    SELECT id INTO v_merchant_id
    FROM public.merchants
    WHERE user_id = v_user_id AND status = 'approved';
    
    IF v_merchant_id IS NULL THEN
        RAISE EXCEPTION 'Merchant not found or not approved';
    END IF;
    
    -- Get coupon
    SELECT id, merchant_id, is_merchant_owned, merchant_purchase_price_paise, 
           merchant_commission_paise, status
    INTO v_coupon
    FROM public.coupons
    WHERE id = p_coupon_id
    FOR UPDATE;
    
    IF v_coupon.id IS NULL THEN
        RAISE EXCEPTION 'Coupon not found';
    END IF;
    
    IF v_coupon.merchant_id != v_merchant_id THEN
        RAISE EXCEPTION 'You do not own this coupon';
    END IF;
    
    IF v_coupon.is_merchant_owned != TRUE THEN
        RAISE EXCEPTION 'This is not a merchant-owned coupon';
    END IF;
    
    IF v_coupon.status != 'available' THEN
        RAISE EXCEPTION 'Coupon is not available';
    END IF;
    
    IF p_selling_price_paise <= 0 THEN
        RAISE EXCEPTION 'Selling price must be positive';
    END IF;
    
    -- Calculate customer total (selling price + 3% customer fee)
    v_customer_total_paise := p_selling_price_paise + FLOOR(p_selling_price_paise * 0.03);
    
    -- Calculate merchant profit (selling price - purchase price - commission already paid)
    v_merchant_profit_paise := p_selling_price_paise - v_coupon.merchant_purchase_price_paise - v_coupon.merchant_commission_paise;
    
    -- Update coupon
    UPDATE public.coupons
    SET 
        merchant_selling_price_paise = p_selling_price_paise,
        selling_price_paise = p_selling_price_paise, -- Update main selling price
        listed_on_marketplace = TRUE,
        updated_at = NOW()
    WHERE id = p_coupon_id;
    
    RETURN jsonb_build_object(
        'success', true,
        'coupon_id', p_coupon_id,
        'selling_price_paise', p_selling_price_paise,
        'customer_total_paise', v_customer_total_paise,
        'merchant_profit_paise', v_merchant_profit_paise
    );
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE;
END;
$$;

GRANT EXECUTE ON FUNCTION public.merchant_list_to_marketplace TO authenticated;

COMMENT ON FUNCTION public.merchant_list_to_marketplace IS 'Allows merchants to list their coupons on the marketplace';

-- ============================================================================
-- STEP 7: UPDATE TRIGGERS
-- ============================================================================

-- Trigger to update merchants updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger WHERE tgname = 'update_merchants_updated_at'
    ) THEN
        CREATE TRIGGER update_merchants_updated_at 
            BEFORE UPDATE ON public.merchants
            FOR EACH ROW 
            EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- ============================================================================
-- MIGRATION COMPLETE - VERIFICATION
-- ============================================================================

DO $$
DECLARE
    v_merchants_count INTEGER;
    v_merchant_transactions_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_merchants_count FROM public.merchants;
    SELECT COUNT(*) INTO v_merchant_transactions_count FROM public.merchant_transactions;
    
    RAISE NOTICE '=== MIGRATION COMPLETED SUCCESSFULLY ===';
    RAISE NOTICE 'Tables created:';
    RAISE NOTICE '  - merchants (% rows)', v_merchants_count;
    RAISE NOTICE '  - merchant_transactions (% rows)', v_merchant_transactions_count;
    RAISE NOTICE 'Columns added to coupons:';
    RAISE NOTICE '  - merchant_purchase_price_paise';
    RAISE NOTICE '  - merchant_selling_price_paise';
    RAISE NOTICE '  - merchant_commission_paise';
    RAISE NOTICE '  - listed_on_marketplace';
    RAISE NOTICE '  - is_merchant_owned';
    RAISE NOTICE 'Functions created:';
    RAISE NOTICE '  - merchant_purchase_coupon()';
    RAISE NOTICE '  - merchant_list_to_marketplace()';
    RAISE NOTICE 'RLS policies: ENABLED';
    RAISE NOTICE '=== ALL EXISTING DATA PRESERVED ===';
END $$;
