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
    UPDATE public.coupons
    SET 
        merchant_id = v_merchant_id,
        is_merchant_owned = TRUE,
        merchant_purchase_price_paise = v_purchase_price_paise,
        merchant_selling_price_paise = selling_price_paise,
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
        FORMAT('Purchased coupon at wholesale price: %s - %s', v_coupon.brand, v_coupon.title),
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
$function$;

-- Bulk Purchase RPC to handle checkout atomically
CREATE OR REPLACE FUNCTION public.merchant_bulk_purchase_coupons(
    p_coupon_ids uuid[],
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
    v_total_purchase_price_paise BIGINT := 0;
    v_total_commission_paise BIGINT := 0;
    v_total_cost_paise BIGINT := 0;
    v_new_balance BIGINT;
    v_transaction_id UUID;
    v_user_role TEXT;
    v_coupon RECORD;
    v_purchased_count INTEGER := 0;
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
    
    -- Validate and calculate totals for all requested coupons
    FOR v_coupon IN 
        SELECT id, brand, title, selling_price_paise, status, valid_until, is_merchant_owned, merchant_id
        FROM public.coupons
        WHERE id = ANY(p_coupon_ids)
        FOR UPDATE
    LOOP
        IF v_coupon.status != 'available' THEN
            RAISE EXCEPTION 'Coupon % is not available', v_coupon.id;
        END IF;
        
        IF v_coupon.valid_until <= NOW() THEN
            RAISE EXCEPTION 'Coupon % is expired', v_coupon.id;
        END IF;
        
        IF v_coupon.is_merchant_owned = TRUE OR v_coupon.merchant_id IS NOT NULL THEN
            RAISE EXCEPTION 'Coupon % is already merchant-owned or assigned', v_coupon.id;
        END IF;
        
        -- Calculate sum
        v_total_purchase_price_paise := v_total_purchase_price_paise + v_coupon.selling_price_paise;
        v_total_commission_paise := v_total_commission_paise + FLOOR(v_coupon.selling_price_paise * 0.03);
        
        v_purchased_count := v_purchased_count + 1;
    END LOOP;

    IF v_purchased_count = 0 THEN
        RAISE EXCEPTION 'No valid coupons found to purchase';
    END IF;
    
    IF v_purchased_count != array_length(p_coupon_ids, 1) THEN
         RAISE EXCEPTION 'Mismatch in requested coupons and available coupons';
    END IF;

    v_total_cost_paise := v_total_purchase_price_paise + v_total_commission_paise;
    
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
        total_commission_paid_paise = total_commission_paid_paise + v_total_commission_paise,
        updated_at = NOW()
    WHERE id = v_merchant_id;
    
    -- Track running balance for individual transaction records
    DECLARE
        v_running_balance BIGINT := v_merchant_balance;
        v_item_cost_paise BIGINT;
    BEGIN
        -- Update coupons to merchant-owned and record individual transactions
        FOR v_coupon IN 
            SELECT id, brand, title, selling_price_paise
            FROM public.coupons
            WHERE id = ANY(p_coupon_ids)
        LOOP
            v_item_cost_paise := v_coupon.selling_price_paise + FLOOR(v_coupon.selling_price_paise * 0.03);
            v_running_balance := v_running_balance - v_item_cost_paise;

            -- Update coupon
            UPDATE public.coupons
            SET 
                merchant_id = v_merchant_id,
                is_merchant_owned = TRUE,
                merchant_purchase_price_paise = v_coupon.selling_price_paise,
                merchant_selling_price_paise = v_coupon.selling_price_paise,
                merchant_commission_paise = FLOOR(v_coupon.selling_price_paise * 0.03),
                listed_on_marketplace = FALSE,
                purchased_by_merchant_at = NOW(),
                updated_at = NOW()
            WHERE id = v_coupon.id;

            -- Record individual transaction
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
                -v_item_cost_paise,
                FLOOR(v_coupon.selling_price_paise * 0.03),
                v_running_balance,
                v_coupon.id,
                FORMAT('Purchased coupon: %s - %s', v_coupon.brand, v_coupon.title),
                jsonb_build_object(
                    'purchase_price_paise', v_coupon.selling_price_paise,
                    'commission_paise', FLOOR(v_coupon.selling_price_paise * 0.03)
                )
            );
        END LOOP;
    END;
    
    -- Return success
    RETURN jsonb_build_object(
        'success', true,
        'purchased_count', v_purchased_count,
        'total_purchase_price_paise', v_total_purchase_price_paise,
        'total_commission_paise', v_total_commission_paise,
        'total_cost_paise', v_total_cost_paise,
        'new_balance_paise', v_new_balance
    );
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE;
END;
$function$;
