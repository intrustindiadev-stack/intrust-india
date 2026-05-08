-- ============================================================================
-- INTRUST REWARD POINT SYSTEM — Add is_scratched Column for Scratch Card Feature
-- Created: 2026-05-07
-- Description: Adds is_scratched column to reward_transactions for the
--              scratch card feature, with index and RLS policy.
-- Reference: Ticket 15e5e3a8-9b89-472a-96f4-2c3b70dbeec3
-- ============================================================================

-- ============================================================================
-- 1. ADD is_scratched COLUMN TO reward_transactions
-- ============================================================================

ALTER TABLE public.reward_transactions
ADD COLUMN IF NOT EXISTS is_scratched BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.reward_transactions.is_scratched IS 'Whether the user has "scratched" (revealed) this reward transaction. Used by the scratch card UI.';

-- ============================================================================
-- 2. CREATE INDEX ON (user_id, is_scratched)
-- ============================================================================
-- Purpose: Efficiently query unscratched transactions per user for the
--          scratch card rewards page (SELECT WHERE user_id = ? AND is_scratched = false)

CREATE INDEX IF NOT EXISTS idx_reward_txn_user_scratched
ON public.reward_transactions(user_id, is_scratched);

-- ============================================================================
-- 3. ADD RLS POLICY FOR USER SELF-UPDATE OF is_scratched
-- ============================================================================
-- The scratch API (PATCH /api/rewards/scratch) uses the cookie-based client,
-- so the user's RLS context applies. Users must only be able to update their
-- own is_scratched field.

DROP POLICY IF EXISTS "Users can update own is_scratched" ON public.reward_transactions;
CREATE POLICY "Users can update own is_scratched"
    ON public.reward_transactions
    FOR UPDATE
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================