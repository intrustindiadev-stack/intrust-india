-- Migration: Fix RLS Security Holes
-- Created: 2026-04-22
-- Description: Implements column-level restrictions via triggers and hardens RLS policies for merchants.

BEGIN;

--------------------------------------------------------------------------------
-- Section 1 — merchants table: restrict UPDATE to safe columns via trigger
--------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.merchants_block_sensitive_column_updates()
RETURNS TRIGGER AS $$
BEGIN
    -- Block financial columns
    IF NEW.wallet_balance_paise IS DISTINCT FROM OLD.wallet_balance_paise THEN
        RAISE EXCEPTION 'Column wallet_balance_paise is protected and cannot be updated directly.';
    END IF;
    IF NEW.total_commission_paid_paise IS DISTINCT FROM OLD.total_commission_paid_paise THEN
        RAISE EXCEPTION 'Column total_commission_paid_paise is protected and cannot be updated directly.';
    END IF;

    -- Block status and subscription columns
    IF NEW.status IS DISTINCT FROM OLD.status THEN
        RAISE EXCEPTION 'Column status is protected and can only be updated by admins.';
    END IF;
    IF NEW.subscription_status IS DISTINCT FROM OLD.subscription_status THEN
        RAISE EXCEPTION 'Column subscription_status is protected and cannot be updated directly.';
    END IF;
    IF NEW.subscription_expires_at IS DISTINCT FROM OLD.subscription_expires_at THEN
        RAISE EXCEPTION 'Column subscription_expires_at is protected and cannot be updated directly.';
    END IF;

    -- Block auto-mode columns
    IF NEW.auto_mode_status IS DISTINCT FROM OLD.auto_mode_status THEN
        RAISE EXCEPTION 'Column auto_mode_status is protected and controlled via RPC.';
    END IF;
    IF NEW.auto_mode_months_paid IS DISTINCT FROM OLD.auto_mode_months_paid THEN
        RAISE EXCEPTION 'Column auto_mode_months_paid is protected and cannot be updated directly.';
    END IF;
    IF NEW.auto_mode_valid_until IS DISTINCT FROM OLD.auto_mode_valid_until THEN
        RAISE EXCEPTION 'Column auto_mode_valid_until is protected and cannot be updated directly.';
    END IF;
    IF NEW.auto_mode IS DISTINCT FROM OLD.auto_mode THEN
        RAISE EXCEPTION 'Column auto_mode is protected and controlled via RPC.';
    END IF;

    -- Block failure tracking and admin columns
    IF NEW.fulfillment_failure_count IS DISTINCT FROM OLD.fulfillment_failure_count THEN
        RAISE EXCEPTION 'Column fulfillment_failure_count is protected and set by admin takeover only.';
    END IF;
    IF NEW.rejection_reason IS DISTINCT FROM OLD.rejection_reason THEN
        RAISE EXCEPTION 'Column rejection_reason is admin-only.';
    END IF;
    IF NEW.suspension_reason IS DISTINCT FROM OLD.suspension_reason THEN
        RAISE EXCEPTION 'Column suspension_reason is admin-only.';
    END IF;

    -- Block audit timestamps
    IF NEW.applied_at IS DISTINCT FROM OLD.applied_at THEN
        RAISE EXCEPTION 'Column applied_at is immutable.';
    END IF;
    IF NEW.approved_at IS DISTINCT FROM OLD.approved_at THEN
        RAISE EXCEPTION 'Column approved_at is immutable.';
    END IF;
    IF NEW.rejected_at IS DISTINCT FROM OLD.rejected_at THEN
        RAISE EXCEPTION 'Column rejected_at is immutable.';
    END IF;

    -- Block KYC columns
    IF NEW.pan_number IS DISTINCT FROM OLD.pan_number THEN
        RAISE EXCEPTION 'Column pan_number is protected and set during onboarding only.';
    END IF;
    IF NEW.pan_verified IS DISTINCT FROM OLD.pan_verified THEN
        RAISE EXCEPTION 'Column pan_verified is protected.';
    END IF;
    IF NEW.pan_data IS DISTINCT FROM OLD.pan_data THEN
        RAISE EXCEPTION 'Column pan_data is protected.';
    END IF;
    IF NEW.gstin_verified IS DISTINCT FROM OLD.gstin_verified THEN
        RAISE EXCEPTION 'Column gstin_verified is protected.';
    END IF;
    IF NEW.gstin_data IS DISTINCT FROM OLD.gstin_data THEN
        RAISE EXCEPTION 'Column gstin_data is protected.';
    END IF;
    IF NEW.bank_verified IS DISTINCT FROM OLD.bank_verified THEN
        RAISE EXCEPTION 'Column bank_verified is protected.';
    END IF;
    IF NEW.bank_data IS DISTINCT FROM OLD.bank_data THEN
        RAISE EXCEPTION 'Column bank_data is protected.';
    END IF;

    -- Block bank details
    IF NEW.bank_account_number IS DISTINCT FROM OLD.bank_account_number THEN
        RAISE EXCEPTION 'Column bank_account_number is protected and requires re-verification.';
    END IF;
    IF NEW.bank_ifsc_code IS DISTINCT FROM OLD.bank_ifsc_code THEN
        RAISE EXCEPTION 'Column bank_ifsc_code is protected and requires re-verification.';
    END IF;
    IF NEW.bank_name IS DISTINCT FROM OLD.bank_name THEN
        RAISE EXCEPTION 'Column bank_name is protected.';
    END IF;
    IF NEW.bank_account_name IS DISTINCT FROM OLD.bank_account_name THEN
        RAISE EXCEPTION 'Column bank_account_name is protected.';
    END IF;

    -- Block slug
    IF NEW.slug IS DISTINCT FROM OLD.slug THEN
        RAISE EXCEPTION 'Column slug is immutable after approval.';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS merchants_sensitive_column_guard ON public.merchants;
CREATE TRIGGER merchants_sensitive_column_guard
BEFORE UPDATE ON public.merchants
FOR EACH ROW
EXECUTE FUNCTION public.merchants_block_sensitive_column_updates();

--------------------------------------------------------------------------------
-- Section 2 — merchant_inventory table: downgrade ALL → SELECT only
--------------------------------------------------------------------------------

DROP POLICY IF EXISTS "Merchants manage own inventory" ON public.merchant_inventory;

CREATE POLICY "Merchants view own inventory"
ON public.merchant_inventory
FOR SELECT
TO authenticated
USING (
  merchant_id IN (
    SELECT id FROM merchants WHERE user_id = auth.uid()
  )
);

--------------------------------------------------------------------------------
-- Section 3 — shopping_products: fix the overly permissive SELECT policy
--------------------------------------------------------------------------------

DROP POLICY IF EXISTS "Merchants can view own products" ON public.shopping_products;

CREATE POLICY "Merchants can view own products"
ON public.shopping_products
FOR SELECT
TO authenticated
USING (
  (is_active = true)
  OR
  (submitted_by_merchant_id IN (
    SELECT id FROM merchants WHERE user_id = auth.uid()
  ))
);

--------------------------------------------------------------------------------
-- Section 4 — merchant_udhari_settings: drop the public read policy
--------------------------------------------------------------------------------

DROP POLICY IF EXISTS "public_read_udhari_settings" ON public.merchant_udhari_settings;

--------------------------------------------------------------------------------
-- Section 5 — shopping_order_groups: restrict merchant UPDATE to status-only columns via trigger
--------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.order_groups_merchant_update_guard()
RETURNS TRIGGER AS $$
DECLARE
    user_role text;
BEGIN
    -- 1. Get the role of the authenticated user
    SELECT role INTO user_role 
    FROM public.user_profiles 
    WHERE id = auth.uid();

    -- 2. If admin or super_admin, allow all updates
    IF user_role IN ('admin', 'super_admin') THEN
        RETURN NEW;
    END IF;

    -- 3. If merchant, restrict to allowed columns only
    -- We check if any restricted column is being changed
    IF NEW.merchant_profit_paise IS DISTINCT FROM OLD.merchant_profit_paise OR
       NEW.platform_cut_paise IS DISTINCT FROM OLD.platform_cut_paise OR
       NEW.commission_rate IS DISTINCT FROM OLD.commission_rate OR
       NEW.settlement_status IS DISTINCT FROM OLD.settlement_status OR
       NEW.total_amount_paise IS DISTINCT FROM OLD.total_amount_paise OR
       NEW.customer_id IS DISTINCT FROM OLD.customer_id OR
       NEW.merchant_id IS DISTINCT FROM OLD.merchant_id OR
       NEW.payment_method IS DISTINCT FROM OLD.payment_method OR
       NEW.payment_status IS DISTINCT FROM OLD.payment_status OR
       NEW.assigned_to IS DISTINCT FROM OLD.assigned_to OR
       NEW.admin_takeover_at IS DISTINCT FROM OLD.admin_takeover_at OR
       NEW.delivery_fee_paise IS DISTINCT FROM OLD.delivery_fee_paise OR
       NEW.is_platform_order IS DISTINCT FROM OLD.is_platform_order OR
       NEW.client_txn_id IS DISTINCT FROM OLD.client_txn_id
    THEN
        RAISE EXCEPTION 'Restricted column update detected. Merchants can only update delivery status, tracking number, and notes.';
    END IF;

    -- Note: The following columns ARE allowed to change for merchants:
    -- delivery_status, tracking_number, estimated_delivery_at, status_notes, 
    -- packed_at, shipped_at, delivered_at, updated_at, status_updated_by

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS order_groups_merchant_column_guard ON public.shopping_order_groups;
CREATE TRIGGER order_groups_merchant_column_guard
BEFORE UPDATE ON public.shopping_order_groups
FOR EACH ROW
EXECUTE FUNCTION public.order_groups_merchant_update_guard();

COMMIT;

--------------------------------------------------------------------------------
-- Section 6 — Verification queries (commented out)
--------------------------------------------------------------------------------

/*
-- Verify trigger exists on merchants
SELECT trigger_name FROM information_schema.triggers
WHERE event_object_table = 'merchants' AND trigger_name = 'merchants_sensitive_column_guard';

-- Verify merchant_inventory has no ALL policy
SELECT policyname, cmd FROM pg_policies
WHERE tablename = 'merchant_inventory' AND cmd = 'ALL';

-- Verify shopping_products policy qual changed
SELECT policyname, qual FROM pg_policies
WHERE tablename = 'shopping_products' AND policyname = 'Merchants can view own products';

-- Verify public_read_udhari_settings is gone
SELECT policyname FROM pg_policies
WHERE tablename = 'merchant_udhari_settings' AND policyname = 'public_read_udhari_settings';

-- Verify trigger exists on shopping_order_groups
SELECT trigger_name FROM information_schema.triggers
WHERE event_object_table = 'shopping_order_groups' AND trigger_name = 'order_groups_merchant_column_guard';
*/
