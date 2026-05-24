-- =============================================================================
-- Migration: 20260523_merchant_panel_db_drift_fix.sql
-- Purpose  : Consolidate all unapplied 20260517_* migrations that caused
--            the merchant panel "Store Credit" approval modal to fail with:
--              "Could not find the function public.merchant_approve_udhari_request..."
-- Idempotent: Uses CREATE OR REPLACE, IF NOT EXISTS, DROP IF EXISTS guards.
-- Supersedes: 20260517_merchant_approve_udhari_rpc.sql
--             20260517_pending_refunds_table.sql
--             20260517_wholesale_draft_failure_reason.sql
--             20260517_unify_kyc_status.sql
-- =============================================================================

-- ---------------------------------------------------------------------------
-- A-1.  merchant_approve_udhari_request  (re-create; was never applied)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.merchant_approve_udhari_request(
    p_request_id        uuid,
    p_duration_days     int,
    p_merchant_note     text,
    p_disclaimer_accepted boolean
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_request               record;
    v_group                 record;
    v_item                  record;
    v_merchant_inventory_stock int;
BEGIN
    -- 1. Lock udhari_request row
    SELECT * INTO v_request
    FROM udhari_requests
    WHERE id = p_request_id
    FOR UPDATE;

    IF v_request IS NULL THEN
        RAISE EXCEPTION 'Udhari request % not found', p_request_id;
    END IF;

    IF v_request.status != 'pending' THEN
        RAISE EXCEPTION 'Udhari request is not in pending status';
    END IF;

    -- 2. Process based on source_type
    IF v_request.source_type = 'shop_order' THEN
        -- Lock shopping_order_groups row
        SELECT * INTO v_group
        FROM shopping_order_groups
        WHERE id = v_request.shopping_order_group_id
        FOR UPDATE;

        IF v_group IS NULL THEN
            RAISE EXCEPTION 'Shopping order group % not found', v_request.shopping_order_group_id;
        END IF;

        -- Decrement stock for every item in the order
        FOR v_item IN
            SELECT * FROM shopping_order_items WHERE group_id = v_group.id
        LOOP
            SELECT stock_quantity INTO v_merchant_inventory_stock
            FROM merchant_inventory
            WHERE id = v_item.inventory_id
            FOR UPDATE;

            IF v_merchant_inventory_stock < v_item.quantity THEN
                RAISE EXCEPTION 'Insufficient stock for merchant_inventory_id %', v_item.inventory_id;
            END IF;

            UPDATE merchant_inventory
            SET stock_quantity = stock_quantity - v_item.quantity
            WHERE id = v_item.inventory_id;
        END LOOP;

        -- Confirm order group
        UPDATE shopping_order_groups
        SET delivery_status  = 'pending',
            payment_method   = 'store_credit'
        WHERE id = v_group.id;

    ELSIF v_request.source_type = 'gift_card' THEN
        -- Reserve the coupon atomically
        UPDATE coupons
        SET status = 'reserved'
        WHERE id = v_request.coupon_id AND status = 'available';

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Coupon % not found or not available', v_request.coupon_id;
        END IF;

    ELSE
        RAISE EXCEPTION 'Unknown source_type %', v_request.source_type;
    END IF;

    -- 3. Mark udhari request as approved
    UPDATE udhari_requests
    SET status               = 'approved',
        due_date             = CURRENT_DATE + p_duration_days,
        duration_days        = p_duration_days,
        disclaimer_accepted  = p_disclaimer_accepted,
        merchant_note        = p_merchant_note,
        responded_at         = NOW()
    WHERE id = p_request_id;

    RETURN jsonb_build_object('success', true);
END;
$$;

REVOKE ALL ON FUNCTION public.merchant_approve_udhari_request(uuid, int, text, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.merchant_approve_udhari_request(uuid, int, text, boolean) TO service_role;


-- ---------------------------------------------------------------------------
-- A-2.  merchant_reject_udhari_request  (new RPC; symmetric to approve)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.merchant_reject_udhari_request(
    p_request_id    uuid,
    p_merchant_note text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_request record;
    v_group   record;
BEGIN
    -- 1. Lock udhari_requests row
    SELECT * INTO v_request
    FROM udhari_requests
    WHERE id = p_request_id
    FOR UPDATE;

    IF v_request IS NULL THEN
        RAISE EXCEPTION 'Udhari request % not found', p_request_id;
    END IF;

    IF v_request.status != 'pending' THEN
        RAISE EXCEPTION 'Udhari request is not in pending status (current: %)', v_request.status;
    END IF;

    -- 2. Revert order-group state if this was a shop_order
    IF v_request.source_type = 'shop_order' AND v_request.shopping_order_group_id IS NOT NULL THEN
        SELECT * INTO v_group
        FROM shopping_order_groups
        WHERE id = v_request.shopping_order_group_id
        FOR UPDATE;

        IF v_group IS NOT NULL THEN
            UPDATE shopping_order_groups
            SET payment_method   = NULL,
                delivery_status  = 'pending'
            WHERE id = v_request.shopping_order_group_id;
        END IF;
    END IF;

    -- gift_card: coupon was never reserved on a pending request, so no revert needed.

    -- 3. Mark udhari request as denied
    UPDATE udhari_requests
    SET status        = 'denied',
        merchant_note = p_merchant_note,
        responded_at  = NOW()
    WHERE id = p_request_id;

    RETURN jsonb_build_object('success', true);
END;
$$;

REVOKE ALL ON FUNCTION public.merchant_reject_udhari_request(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.merchant_reject_udhari_request(uuid, text) TO service_role;


-- ---------------------------------------------------------------------------
-- B.  pending_refunds table  (from 20260517_pending_refunds_table.sql)
--     No application code references this table yet; folding in for
--     completeness so the repo and DB stay in sync.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.pending_refunds (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    draft_id    UUID        NOT NULL,
    amount_paise BIGINT     NOT NULL,
    merchant_id UUID        NOT NULL REFERENCES public.merchants(id),
    reason      TEXT,
    status      TEXT        DEFAULT 'pending',   -- pending | processed | failed
    created_at  TIMESTAMPTZ DEFAULT now(),
    updated_at  TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.pending_refunds ENABLE ROW LEVEL SECURITY;

DO $do$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename  = 'pending_refunds'
          AND policyname = 'Merchants can view their own pending refunds'
    ) THEN
        CREATE POLICY "Merchants can view their own pending refunds"
            ON public.pending_refunds
            FOR SELECT
            USING (
                EXISTS (
                    SELECT 1 FROM public.merchants m
                    WHERE m.id = pending_refunds.merchant_id
                      AND m.user_id = auth.uid()
                )
            );
    END IF;
END
$do$;


-- ---------------------------------------------------------------------------
-- C.  wholesale_order_drafts.failure_reason column
--     (from 20260517_wholesale_draft_failure_reason.sql)
--     No application code currently references this column; folding in
--     so the repo and live schema are consistent.
-- ---------------------------------------------------------------------------
ALTER TABLE public.wholesale_order_drafts
    ADD COLUMN IF NOT EXISTS failure_reason TEXT;


-- ---------------------------------------------------------------------------
-- D.  KYC status unification  (from 20260517_unify_kyc_status.sql)
--     Safe to re-run: UPDATE is a no-op when no 'approved' rows remain,
--     and DROP/ADD CONSTRAINT + DROP/CREATE TRIGGER are all guarded.
-- ---------------------------------------------------------------------------

-- Backfill any legacy 'approved' rows to 'verified'
UPDATE public.user_profiles SET kyc_status = 'verified' WHERE kyc_status = 'approved';

-- Re-apply CHECK constraint idempotently
ALTER TABLE public.user_profiles DROP CONSTRAINT IF EXISTS chk_kyc_status;
ALTER TABLE public.user_profiles ADD CONSTRAINT chk_kyc_status
    CHECK (kyc_status IN ('not_started', 'pending', 'verified', 'rejected'));

-- Normalizing trigger (CREATE OR REPLACE handles idempotency)
CREATE OR REPLACE FUNCTION public.normalize_kyc_status()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.kyc_status = 'approved' THEN
        NEW.kyc_status := 'verified';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_normalize_kyc_status ON public.user_profiles;
CREATE TRIGGER trg_normalize_kyc_status
    BEFORE INSERT OR UPDATE OF kyc_status ON public.user_profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.normalize_kyc_status();


-- ---------------------------------------------------------------------------
-- E.  PostgREST schema cache reload
-- ---------------------------------------------------------------------------
NOTIFY pgrst, 'reload schema';
