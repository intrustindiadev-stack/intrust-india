-- ============================================================================
-- INTRUST FIX 1: Database — Backfill, Trigger & RLS Policies
-- Created: 2026-04-26
-- Ticket: 9e36608b-0445-4ea0-a2ce-c47780bfe4a2
-- Description:
--   1A. Backfill referral codes for users where referral_code IS NULL
--   1B. Update handle_new_user trigger to also insert reward_points_balance
--   1C. Add explicit service_role INSERT/UPDATE policies on reward tables
--   1D. Rebuild reward_tree_paths for existing users with referred_by set
-- ============================================================================


-- ============================================================================
-- 1A. BACKFILL referral_code FOR EXISTING USERS WHERE NULL
-- ============================================================================

DO $$
DECLARE
  r RECORD;
  new_code TEXT;
  code_exists BOOLEAN;
BEGIN
  FOR r IN SELECT id FROM public.user_profiles WHERE referral_code IS NULL LOOP
    LOOP
      -- Generate a unique 6-char uppercase alphanumeric referral code
      new_code := upper(substring(md5(random()::text || clock_timestamp()::text) from 1 for 6));
      SELECT EXISTS (
        SELECT 1 FROM public.user_profiles WHERE referral_code = new_code
      ) INTO code_exists;
      EXIT WHEN NOT code_exists;
    END LOOP;
    UPDATE public.user_profiles SET referral_code = new_code WHERE id = r.id;
  END LOOP;
  RAISE NOTICE 'Referral code backfill complete.';
END;
$$;


-- ============================================================================
-- 1B. UPDATE handle_new_user TRIGGER
--     Ensures every new signup gets a reward_points_balance row.
--     NOTE: The live function already has this insert as of the latest
--     migration, but we apply CREATE OR REPLACE here to keep this script
--     idempotent and to serve as the canonical source of truth.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  name_val  TEXT;
  avatar_val TEXT;
  new_code  TEXT;
  code_exists BOOLEAN;
BEGIN
  -- Extract name and avatar from metadata
  name_val   := COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', 'New User');
  avatar_val := NEW.raw_user_meta_data->>'avatar_url';

  -- Generate a unique 6-char uppercase alphanumeric referral code
  LOOP
    new_code := upper(substring(md5(random()::text || clock_timestamp()::text) from 1 for 6));
    SELECT EXISTS (
      SELECT 1 FROM public.user_profiles WHERE referral_code = new_code
    ) INTO code_exists;
    EXIT WHEN NOT code_exists;
  END LOOP;

  -- Insert the user profile with the generated referral code
  INSERT INTO public.user_profiles (id, phone, full_name, avatar_url, role, referral_code)
  VALUES (
    NEW.id,
    NEW.phone,
    name_val,
    avatar_val,
    'user',
    new_code
  );

  -- Initialize the reward points balance for the new user (balance = 0, tier = bronze)
  INSERT INTO public.reward_points_balance (user_id, current_balance, total_earned, total_redeemed, tier, tree_size, direct_referrals, active_downline)
  VALUES (NEW.id, 0, 0, 0, 'bronze', 0, 0, 0)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure the trigger is still registered (idempotent: DROP + CREATE)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();


-- ============================================================================
-- 1C. ADD SERVICE_ROLE INSERT/UPDATE RLS POLICIES ON REWARD TABLES
--
--  SECURITY DEFINER RPC functions run as the function owner (usually postgres /
--  service_role). Even though SECURITY DEFINER bypasses RLS within the function
--  body, explicit service_role policies ensure direct service-role API calls
--  (e.g. from Edge Functions using the service key) can also write to these
--  tables without permission errors.
-- ============================================================================

-- ---- reward_tree_paths: service_role INSERT ----
DROP POLICY IF EXISTS "Service role can insert tree paths" ON public.reward_tree_paths;
CREATE POLICY "Service role can insert tree paths"
  ON public.reward_tree_paths FOR INSERT
  TO service_role
  WITH CHECK (true);

-- ---- reward_transactions: service_role INSERT ----
DROP POLICY IF EXISTS "Service role can insert transactions" ON public.reward_transactions;
CREATE POLICY "Service role can insert transactions"
  ON public.reward_transactions FOR INSERT
  TO service_role
  WITH CHECK (true);

-- ---- reward_points_balance: service_role INSERT + UPDATE ----
DROP POLICY IF EXISTS "Service role can insert balance" ON public.reward_points_balance;
CREATE POLICY "Service role can insert balance"
  ON public.reward_points_balance FOR INSERT
  TO service_role
  WITH CHECK (true);

DROP POLICY IF EXISTS "Service role can update balance" ON public.reward_points_balance;
CREATE POLICY "Service role can update balance"
  ON public.reward_points_balance FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ---- reward_daily_caps: service_role INSERT + UPDATE ----
DROP POLICY IF EXISTS "Service role can insert daily caps" ON public.reward_daily_caps;
CREATE POLICY "Service role can insert daily caps"
  ON public.reward_daily_caps FOR INSERT
  TO service_role
  WITH CHECK (true);

DROP POLICY IF EXISTS "Service role can update daily caps" ON public.reward_daily_caps;
CREATE POLICY "Service role can update daily caps"
  ON public.reward_daily_caps FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Also grant service_role SELECT on these tables so it can read within policies
DROP POLICY IF EXISTS "Service role can select tree paths" ON public.reward_tree_paths;
CREATE POLICY "Service role can select tree paths"
  ON public.reward_tree_paths FOR SELECT
  TO service_role
  USING (true);

DROP POLICY IF EXISTS "Service role can select transactions" ON public.reward_transactions;
CREATE POLICY "Service role can select transactions"
  ON public.reward_transactions FOR SELECT
  TO service_role
  USING (true);

DROP POLICY IF EXISTS "Service role can select balance" ON public.reward_points_balance;
CREATE POLICY "Service role can select balance"
  ON public.reward_points_balance FOR SELECT
  TO service_role
  USING (true);

DROP POLICY IF EXISTS "Service role can select daily caps" ON public.reward_daily_caps;
CREATE POLICY "Service role can select daily caps"
  ON public.reward_daily_caps FOR SELECT
  TO service_role
  USING (true);


-- ============================================================================
-- 1D. REBUILD reward_tree_paths FOR EXISTING USERS WITH referred_by SET
--
--  Currently no users have referred_by set, but this is idempotent and will
--  handle any future users who do. We first clear the table to avoid stale
--  data, then rebuild the closure table from scratch using the referred_by
--  chain.
-- ============================================================================

-- Step 1: Clear existing tree paths (idempotent rebuild)
DELETE FROM public.reward_tree_paths;

-- Step 2: Insert direct (L1) referral paths
INSERT INTO public.reward_tree_paths (ancestor_id, descendant_id, level)
SELECT referred_by, id, 1
FROM public.user_profiles
WHERE referred_by IS NOT NULL AND referred_by != id
ON CONFLICT (ancestor_id, descendant_id) DO NOTHING;

-- Step 3: Build higher-level paths (L2, L3, ...) using iterative closure
DO $$
DECLARE
  v_max_depth     INTEGER := 10;
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
  RAISE NOTICE 'Tree path rebuild complete. Processed % levels.', v_current_depth - 1;
END;
$$;

-- Step 4: Update reward_parent_id to mirror referred_by for any existing users
UPDATE public.user_profiles
SET reward_parent_id = referred_by
WHERE reward_parent_id IS NULL AND referred_by IS NOT NULL;

-- Step 5: Recalculate tree stats for all users
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT id FROM public.user_profiles LOOP
    PERFORM public.update_reward_tree_stats(r.id);
  END LOOP;
  RAISE NOTICE 'Tree stats recalculation complete.';
END;
$$;


-- ============================================================================
-- VERIFICATION QUERIES
-- Run these after applying to confirm successful execution
-- ============================================================================

-- 1. Confirm all users now have referral_code
SELECT
  COUNT(*) FILTER (WHERE referral_code IS NULL)     AS still_null_codes,
  COUNT(*) FILTER (WHERE referral_code IS NOT NULL) AS has_codes,
  COUNT(*)                                           AS total_users
FROM public.user_profiles;

-- 2. Confirm all users have reward_points_balance
SELECT
  (SELECT COUNT(*) FROM public.user_profiles)        AS total_users,
  (SELECT COUNT(*) FROM public.reward_points_balance) AS users_with_balance;

-- 3. Confirm service_role RLS policies exist
SELECT tablename, policyname, roles, cmd
FROM pg_policies
WHERE tablename IN ('reward_tree_paths', 'reward_transactions', 'reward_points_balance', 'reward_daily_caps')
  AND 'service_role' = ANY(roles)
ORDER BY tablename, cmd;
