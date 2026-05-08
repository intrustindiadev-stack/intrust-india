-- ============================================================================
-- MIGRATION: Normalize reward_configuration keys
-- Date: 2026-05-08
-- Problem: Admin UI was saving short-form keys (e.g. 'signup', 'bronze') while
--          calculate_and_distribute_rewards() reads canonical long-form keys
--          (e.g. 'signup_reward', 'tier_bronze'). Any admin edits were silently
--          discarded by the reward engine.
-- Fix:     1. Merge any short-form orphan values into the canonical rows.
--          2. Delete the orphaned short-form rows.
-- ============================================================================

-- ── Step 1: Merge event orphans into canonical rows (upsert pattern) ─────────

-- For each short-form event key that has a corresponding canonical row,
-- update the canonical row's config_value with the orphan's value (only
-- if the orphan was modified after the canonical row, or canonical is at seed).

DO $$
DECLARE
    v_pairs TEXT[][] := ARRAY[
        ['signup',               'signup_reward'],
        ['purchase',             'purchase_reward'],
        ['kyc_complete',         'kyc_complete_reward'],
        ['merchant_onboard',     'merchant_onboard_reward'],
        ['subscription_renewal', 'subscription_renewal_reward'],
        ['daily_login',          'daily_login_reward']
    ];
    v_pair TEXT[];
    v_short_key TEXT;
    v_canonical_key TEXT;
    v_orphan_value JSONB;
    v_orphan_updated TIMESTAMPTZ;
    v_canonical_updated TIMESTAMPTZ;
BEGIN
    FOREACH v_pair SLICE 1 IN ARRAY v_pairs LOOP
        v_short_key     := v_pair[1];
        v_canonical_key := v_pair[2];

        -- Check if the orphan exists
        SELECT config_value, updated_at
        INTO v_orphan_value, v_orphan_updated
        FROM public.reward_configuration
        WHERE config_key = v_short_key;

        IF NOT FOUND THEN
            CONTINUE; -- No orphan, nothing to do
        END IF;

        -- Get canonical row's updated_at
        SELECT updated_at
        INTO v_canonical_updated
        FROM public.reward_configuration
        WHERE config_key = v_canonical_key;

        IF NOT FOUND THEN
            -- Canonical row missing: rename the orphan to the canonical key
            UPDATE public.reward_configuration
            SET config_key   = v_canonical_key,
                config_type  = 'event',
                description  = COALESCE(description, 'Points awarded on ' || v_short_key),
                updated_at   = now()
            WHERE config_key = v_short_key;

            RAISE NOTICE 'Renamed orphan "%" → "%"', v_short_key, v_canonical_key;
        ELSE
            -- Both exist: if orphan is newer, overwrite canonical's value
            IF v_orphan_updated > v_canonical_updated THEN
                UPDATE public.reward_configuration
                SET config_value = v_orphan_value,
                    updated_at   = now()
                WHERE config_key = v_canonical_key;

                RAISE NOTICE 'Merged newer orphan "%" into "%"', v_short_key, v_canonical_key;
            ELSE
                RAISE NOTICE 'Orphan "%" is stale; keeping canonical "%"', v_short_key, v_canonical_key;
            END IF;

            -- Delete the now-redundant orphan
            DELETE FROM public.reward_configuration WHERE config_key = v_short_key;
        END IF;
    END LOOP;
END
$$;

-- ── Step 2: Merge tier orphans (bronze → tier_bronze, etc.) ──────────────────

DO $$
DECLARE
    v_pairs TEXT[][] := ARRAY[
        ['bronze',   'tier_bronze'],
        ['silver',   'tier_silver'],
        ['gold',     'tier_gold'],
        ['platinum', 'tier_platinum']
    ];
    v_pair TEXT[];
    v_short_key TEXT;
    v_canonical_key TEXT;
    v_orphan_value JSONB;
    v_orphan_updated TIMESTAMPTZ;
    v_canonical_updated TIMESTAMPTZ;
BEGIN
    FOREACH v_pair SLICE 1 IN ARRAY v_pairs LOOP
        v_short_key     := v_pair[1];
        v_canonical_key := v_pair[2];

        SELECT config_value, updated_at
        INTO v_orphan_value, v_orphan_updated
        FROM public.reward_configuration
        WHERE config_key = v_short_key;

        IF NOT FOUND THEN
            CONTINUE;
        END IF;

        SELECT updated_at
        INTO v_canonical_updated
        FROM public.reward_configuration
        WHERE config_key = v_canonical_key;

        IF NOT FOUND THEN
            UPDATE public.reward_configuration
            SET config_key  = v_canonical_key,
                config_type = 'tier',
                description = COALESCE(description, v_short_key || ' tier requirements'),
                updated_at  = now()
            WHERE config_key = v_short_key;

            RAISE NOTICE 'Renamed orphan "%" → "%"', v_short_key, v_canonical_key;
        ELSE
            IF v_orphan_updated > v_canonical_updated THEN
                UPDATE public.reward_configuration
                SET config_value = v_orphan_value,
                    updated_at   = now()
                WHERE config_key = v_canonical_key;

                RAISE NOTICE 'Merged newer orphan "%" into "%"', v_short_key, v_canonical_key;
            ELSE
                RAISE NOTICE 'Orphan "%" is stale; keeping canonical "%"', v_short_key, v_canonical_key;
            END IF;

            DELETE FROM public.reward_configuration WHERE config_key = v_short_key;
        END IF;
    END LOOP;
END
$$;

-- ── Step 3: Verify final state ────────────────────────────────────────────────

DO $$
DECLARE
    v_missing TEXT[] := '{}';
    v_key TEXT;
    v_canonical_keys TEXT[] := ARRAY[
        'signup_reward', 'purchase_reward', 'kyc_complete_reward',
        'merchant_onboard_reward', 'subscription_renewal_reward', 'daily_login_reward',
        'tier_bronze', 'tier_silver', 'tier_gold', 'tier_platinum',
        'daily_cap', 'point_value', 'eligibility', 'level_settings'
    ];
BEGIN
    FOREACH v_key IN ARRAY v_canonical_keys LOOP
        IF NOT EXISTS (
            SELECT 1 FROM public.reward_configuration WHERE config_key = v_key
        ) THEN
            v_missing := array_append(v_missing, v_key);
        END IF;
    END LOOP;

    IF array_length(v_missing, 1) > 0 THEN
        RAISE WARNING 'Missing canonical reward_configuration keys after migration: %', v_missing;
    ELSE
        RAISE NOTICE 'Migration complete. All canonical reward_configuration keys present.';
    END IF;
END
$$;
