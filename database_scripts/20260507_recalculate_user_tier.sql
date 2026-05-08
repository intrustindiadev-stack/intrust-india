-- ============================================================================
-- INTRUST REWARD POINT SYSTEM — `recalculate_user_tier` RPC
-- Created: 2026-05-07
-- Description: Determines the highest qualifying tier for a user based on
--              their tree_size and active_downline, then updates both
--              reward_points_balance and user_profiles tables. Includes a
--              no-downgrade guard and idempotent notification insertion.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.recalculate_user_tier(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_tree_size INTEGER;
    v_active_downline INTEGER;
    v_current_tier TEXT;
    v_new_tier TEXT;
    v_tier_config RECORD;
    v_bonus_multiplier NUMERIC;
    v_tier_order TEXT[] := ARRAY['bronze', 'silver', 'gold', 'platinum'];
    v_current_tier_index INTEGER;
    v_qualifying_tier TEXT := 'bronze';
    v_qualifying_index INTEGER := 0;
    v_highest_qualifying_index INTEGER := 0;
    v_notification_body TEXT;
BEGIN
    -- 1. Read current stats from reward_points_balance
    SELECT tree_size, active_downline, tier
    INTO v_tree_size, v_active_downline, v_current_tier
    FROM public.reward_points_balance
    WHERE user_id = p_user_id;

    -- If no balance row exists, return early
    IF NOT FOUND THEN
        RETURN jsonb_build_object('upgraded', false, 'old_tier', NULL, 'new_tier', NULL);
    END IF;

    -- 2. Evaluate tiers in descending order (platinum → gold → silver → bronze)
    FOR v_tier_config IN
        SELECT config_key, config_value
        FROM public.reward_configuration
        WHERE config_key IN ('tier_platinum', 'tier_gold', 'tier_silver', 'tier_bronze')
          AND is_active = true
        ORDER BY
            CASE config_key
                WHEN 'tier_platinum' THEN 4
                WHEN 'tier_gold' THEN 3
                WHEN 'tier_silver' THEN 2
                WHEN 'tier_bronze' THEN 1
            END DESC
    LOOP
        DECLARE
            v_min_tree_size INTEGER := COALESCE((v_tier_config.config_value->>'min_tree_size')::INTEGER, 0);
            v_min_active_referrals INTEGER := COALESCE((v_tier_config.config_value->>'min_active_referrals')::INTEGER, 0);
            v_tier_name TEXT := REPLACE(v_tier_config.config_key, 'tier_', '');
            v_tier_idx INTEGER;
        BEGIN
            -- Check if user qualifies
            IF v_tree_size >= v_min_tree_size AND v_active_downline >= v_min_active_referrals THEN
                -- Find index in tier_order array
                v_tier_idx := array_position(v_tier_order, v_tier_name);
                IF v_tier_idx IS NOT NULL AND v_tier_idx - 1 > v_highest_qualifying_index THEN
                    v_highest_qualifying_index := v_tier_idx - 1;
                    v_qualifying_tier := v_tier_name;
                END IF;
            END IF;
        END;
    END LOOP;

    -- 3. No-downgrade guard: new tier = max(current, qualifying)
    v_current_tier_index := COALESCE(array_position(v_tier_order, v_current_tier), 1) - 1;
    v_qualifying_index := array_position(v_tier_order, v_qualifying_tier);
    IF v_qualifying_index IS NULL THEN
        v_qualifying_index := 1; -- default to bronze (index 0)
    ELSE
        v_qualifying_index := v_qualifying_index - 1;
    END IF;

    v_new_tier := v_tier_order[GREATEST(v_current_tier_index, v_qualifying_index) + 1];

    -- 4. If no change, return early
    IF v_new_tier = v_current_tier THEN
        RETURN jsonb_build_object('upgraded', false, 'old_tier', v_current_tier, 'new_tier', v_new_tier);
    END IF;

    -- 5. Fetch bonus_multiplier from the new tier's config
    SELECT (config_value->>'bonus_multiplier')::NUMERIC
    INTO v_bonus_multiplier
    FROM public.reward_configuration
    WHERE config_key = 'tier_' || v_new_tier AND is_active = true;

    -- 6. Update reward_points_balance
    UPDATE public.reward_points_balance
    SET tier = v_new_tier,
        updated_at = now()
    WHERE user_id = p_user_id;

    -- 7. Update user_profiles
    UPDATE public.user_profiles
    SET reward_tier = v_new_tier,
        updated_at = now()
    WHERE id = p_user_id;

    -- 8. Build notification body with multiplier
    v_notification_body := CASE v_new_tier
        WHEN 'silver' THEN '🎉 You''ve been promoted to Silver tier! Enjoy a ' || COALESCE(v_bonus_multiplier, 1.2)::TEXT || '× bonus multiplier on all future rewards.'
        WHEN 'gold' THEN '🎉 You''ve been promoted to Gold tier! Enjoy a ' || COALESCE(v_bonus_multiplier, 1.5)::TEXT || '× bonus multiplier on all future rewards.'
        WHEN 'platinum' THEN '🎉 You''ve been promoted to Platinum tier! Enjoy a ' || COALESCE(v_bonus_multiplier, 2.0)::TEXT || '× bonus multiplier on all future rewards.'
        ELSE 'You''ve been promoted to ' || INITCAP(v_new_tier) || ' tier!'
    END;

    -- 9. Idempotent notification insert (guard with NOT EXISTS)
    INSERT INTO public.notifications (user_id, title, body, type, reference_type, reference_id)
    SELECT
        p_user_id,
        '🎉 Tier Upgrade!',
        v_notification_body,
        'success',
        'tier_upgrade',
        gen_random_uuid()
    WHERE NOT EXISTS (
        SELECT 1
        FROM public.notifications
        WHERE user_id = p_user_id
          AND reference_type = 'tier_upgrade'
          AND body ILIKE '%' || v_new_tier || '%'
    );

    -- 10. Return result
    RETURN jsonb_build_object('upgraded', true, 'old_tier', v_current_tier, 'new_tier', v_new_tier);
END;
$$;

-- Grant execute to authenticated users (the RPC is SECURITY DEFINER so it runs with owner privileges)
GRANT EXECUTE ON FUNCTION public.recalculate_user_tier TO authenticated;
GRANT EXECUTE ON FUNCTION public.recalculate_user_tier TO service_role;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================