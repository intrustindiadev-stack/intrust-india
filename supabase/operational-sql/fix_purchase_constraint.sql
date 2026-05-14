CREATE OR REPLACE FUNCTION public.merchant_purchase_coupon(
    p_coupon_id uuid,
    p_quantity integer DEFAULT 1,
    p_merchant_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
    v_user_role TEXT;
BEGIN
    -- Get current user
    v_user_id := auth.uid();
    
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;
    
    -- Check user role
    SELECT role INTO v_user_role FROM public.user_profiles WHERE id = v_user_id;

    -- Determine merchant_id
    IF v_user_role = 'admin' AND p_merchant_id IS NOT NULL THEN
        v_merchant_id := p_merchant_id;
    ELSE
        -- Get merchant profile for the user
        SELECT id, status, wallet_balance_paise 
        INTO v_merchant_id, v_merchant_status, v_merchant_balance
        FROM public.merchants
        WHERE user_id = v_user_id;
    END IF;

    -- If we selected by ID (admin case), we need to fetch status and balance
    IF v_user_role = 'admin' AND p_merchant_id IS NOT NULL THEN
        SELECT id, status, wallet_balance_paise
        INTO v_merchant_id, v_merchant_status, v_merchant_balance
        FROM public.merchants
        WHERE id = v_merchant_id;
    END IF;
    
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
    -- FIX: Set merchant_selling_price_paise to satisfy check constraint
    UPDATE public.coupons
    SET 
        merchant_id = v_merchant_id,
        is_merchant_owned = TRUE,
        merchant_purchase_price_paise = v_purchase_price_paise,
        merchant_commission_paise = v_commission_paise,
        merchant_selling_price_paise = v_purchase_price_paise, -- Default to purchase price
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
$function$
