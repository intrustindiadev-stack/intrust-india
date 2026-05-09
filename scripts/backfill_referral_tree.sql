-- ============================================================================
-- BACKFILL: Referral Tree Paths, Stats, and Signup Rewards
-- Date: 2026-05-09
-- Description:
--   One-off (idempotent, re-runnable) backfill that:
--     1. Detects and skips referred_by cycles to avoid CHECK-constraint violations.
--     2. Calls build_reward_tree_path for each user whose direct L1 tree-path row
--        is missing (covers the "post-hoc referred_by" breakage case).
--     3. Refreshes update_reward_tree_stats and recalculate_user_tier for all
--        ancestor nodes and the new user themselves.
--     4. Re-runs calculate_and_distribute_rewards('signup', …) — idempotent via
--        idx_reward_txn_idempotent (ON CONFLICT DO NOTHING inside the function).
--     5. Re-runs update_reward_tree_stats / recalculate_user_tier for ALL users
--        with a referred_by (including already-correct chains) to repair any
--        drifted tree_size / direct_referrals counters.
--
-- PREREQUISITES (must be applied BEFORE this script):
--   * 20260425_reward_point_system.sql
--   * 20260426_fix_reward_referral_system.sql
--   * 20260507_recalculate_user_tier.sql
--   * 20260508_reward_idempotency.sql
--
-- SAFETY / IDEMPOTENCY:
--   * build_reward_tree_path uses ON CONFLICT DO NOTHING internally, so a
--     re-run inserts 0 new rows for already-built paths.
--   * calculate_and_distribute_rewards is guarded by idx_reward_txn_idempotent;
--     a second run returns total_distributed = 0 without double-crediting.
--   * Cycle members are detected and skipped — their tree paths are never built,
--     avoiding the no_self_reference CHECK violation.
--
-- CYCLE RESOLUTION (optional):
--   Users f1a54ece…  and e252f93d… form a reciprocal cycle
--   (f1a54ece.referred_by = e252f93d, e252f93d.referred_by = f1a54ece).
--   To break the cycle for f1a54ece, uncomment the UPDATE below after obtaining
--   product approval, then re-run this script.
--
-- USAGE:
--   psql -h <host> -U <user> -d <db> -f scripts/backfill_referral_tree.sql
-- ============================================================================

DO $$
DECLARE
    -- Counters
    v_paths_inserted        INT := 0;
    v_stats_refreshed       INT := 0;
    v_signup_rewards_dist   INT := 0;
    v_cycle_skipped         INT := 0;
    v_errors                INT := 0;

    -- Loop records
    v_user          RECORD;
    v_ancestor      RECORD;
    v_result        JSONB;
    v_distributed   BIGINT;

    -- Cycle detection: set of user IDs that are part of a cycle
    v_cycle_members UUID[];

BEGIN

    -- -------------------------------------------------------------------------
    -- OPTIONAL: Break cycle for user f1a54ece-… before re-running.
    -- UNCOMMENT AFTER PRODUCT APPROVAL:
    -- UPDATE public.user_profiles
    --     SET referred_by = NULL, reward_parent_id = NULL
    -- WHERE id = 'f1a54ece-XXXX-XXXX-XXXX-XXXXXXXXXXXX';  -- replace with full UUID
    -- -------------------------------------------------------------------------

    -- =========================================================================
    -- Pass 0: Detect referred_by cycles using a recursive CTE
    -- A cycle exists when following referred_by eventually returns to the
    -- starting user.  We collect all participant UUIDs into v_cycle_members.
    -- =========================================================================
    RAISE NOTICE 'BACKFILL: Detecting referred_by cycles...';

    WITH RECURSIVE chain AS (
        -- seed: every user who has a referred_by
        SELECT
            up.id          AS user_id,
            up.referred_by AS parent_id,
            ARRAY[up.id]   AS visited,
            FALSE          AS is_cycle
        FROM public.user_profiles up
        WHERE up.referred_by IS NOT NULL

        UNION ALL

        -- recurse: follow the parent's referred_by
        SELECT
            c.user_id,
            up2.referred_by,
            c.visited || up2.id,
            up2.id = ANY(c.visited)          -- cycle detected when we see a repeated ID
        FROM chain c
        JOIN public.user_profiles up2 ON up2.id = c.parent_id
        WHERE NOT c.is_cycle
          AND c.parent_id IS NOT NULL
    ),
    cycle_roots AS (
        SELECT DISTINCT unnest(visited) AS member_id
        FROM chain
        WHERE is_cycle
    )
    SELECT COALESCE(array_agg(member_id), '{}')
    INTO v_cycle_members
    FROM cycle_roots;

    IF array_length(v_cycle_members, 1) > 0 THEN
        RAISE NOTICE 'BACKFILL: Detected cycle members (will be skipped): %', v_cycle_members;
        v_cycle_skipped := array_length(v_cycle_members, 1);
    ELSE
        RAISE NOTICE 'BACKFILL: No cycles detected.';
    END IF;

    -- =========================================================================
    -- Pass 1: Build missing L1 tree paths for users not in a cycle
    -- =========================================================================
    RAISE NOTICE 'BACKFILL: Starting tree-path insertion pass...';

    FOR v_user IN
        SELECT up.id, up.referred_by
        FROM public.user_profiles up
        WHERE up.referred_by IS NOT NULL
          -- Skip cycle members
          AND NOT (up.id = ANY(v_cycle_members))
          -- Only process users whose direct L1 row is missing
          AND NOT EXISTS (
              SELECT 1
              FROM public.reward_tree_paths rtp
              WHERE rtp.descendant_id = up.id
                AND rtp.level = 1
          )
        ORDER BY up.created_at
    LOOP
        BEGIN
            -- 1A. Build tree path
            PERFORM public.build_reward_tree_path(v_user.id, v_user.referred_by);

            -- 1B. Update stats + tier for all ancestors
            FOR v_ancestor IN
                SELECT ancestor_id
                FROM public.reward_tree_paths
                WHERE descendant_id = v_user.id
            LOOP
                BEGIN
                    PERFORM public.update_reward_tree_stats(v_ancestor.ancestor_id);
                    PERFORM public.recalculate_user_tier(v_ancestor.ancestor_id);
                EXCEPTION WHEN OTHERS THEN
                    RAISE WARNING 'BACKFILL: stats/tier update failed for ancestor % of user %: %',
                        v_ancestor.ancestor_id, v_user.id, SQLERRM;
                END;
            END LOOP;

            -- 1C. Update stats + tier for the new user themselves
            PERFORM public.update_reward_tree_stats(v_user.id);
            PERFORM public.recalculate_user_tier(v_user.id);

            -- 1D. Emit signup reward (idempotent)
            v_result := public.calculate_and_distribute_rewards(
                'signup',
                v_user.id,
                v_user.id,
                'user_profile'
            );

            v_distributed := COALESCE((v_result->>'total_distributed')::BIGINT, 0);
            IF v_distributed > 0 THEN
                v_signup_rewards_dist := v_signup_rewards_dist + 1;
            END IF;

            v_paths_inserted := v_paths_inserted + 1;

        EXCEPTION WHEN OTHERS THEN
            v_errors := v_errors + 1;
            RAISE WARNING 'BACKFILL ERROR (user_id=%): %', v_user.id, SQLERRM;
        END;
    END LOOP;

    RAISE NOTICE 'BACKFILL: Tree-path pass complete. new_paths=%, signup_rewards_distributed=%, errors=%',
        v_paths_inserted, v_signup_rewards_dist, v_errors;

    -- =========================================================================
    -- Pass 2: Drift repair — refresh stats for ALL users with referred_by
    -- (including those whose L1 paths already existed) to fix counters like
    -- tree_size / direct_referrals that may have drifted (e.g. e252f93d shows
    -- 0/0 direct_referrals despite having 1 real direct referral).
    -- =========================================================================
    RAISE NOTICE 'BACKFILL: Starting stats-drift repair pass (all users with referred_by)...';

    FOR v_user IN
        SELECT DISTINCT referred_by AS uid
        FROM public.user_profiles
        WHERE referred_by IS NOT NULL
          AND NOT (referred_by = ANY(v_cycle_members))
        ORDER BY uid
    LOOP
        BEGIN
            PERFORM public.update_reward_tree_stats(v_user.uid);
            PERFORM public.recalculate_user_tier(v_user.uid);
            v_stats_refreshed := v_stats_refreshed + 1;
        EXCEPTION WHEN OTHERS THEN
            v_errors := v_errors + 1;
            RAISE WARNING 'BACKFILL: drift-repair stats failed for user %: %', v_user.uid, SQLERRM;
        END;
    END LOOP;

    RAISE NOTICE 'BACKFILL: Drift-repair pass complete. users_refreshed=%', v_stats_refreshed;

    -- =========================================================================
    -- Summary
    -- =========================================================================
    RAISE NOTICE 'BACKFILL COMPLETE: paths_inserted=%, stats_refreshed=%, signup_rewards_distributed=%, cycle_members_skipped=%, errors=%',
        v_paths_inserted,
        v_stats_refreshed,
        v_signup_rewards_dist,
        v_cycle_skipped,
        v_errors;

    IF v_errors > 0 THEN
        RAISE NOTICE 'BACKFILL: % error(s) encountered — check WARNING messages above for details.', v_errors;
    END IF;

    IF v_cycle_skipped > 0 THEN
        RAISE NOTICE 'BACKFILL: % cycle member(s) skipped. Resolve the cycle by uncommenting the UPDATE at the top of this script (after product approval) and re-running.', v_cycle_skipped;
    END IF;

END;
$$;
