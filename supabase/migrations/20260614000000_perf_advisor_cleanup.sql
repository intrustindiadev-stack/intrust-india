-- ==========================================================================
-- Migration: Performance Advisor Cleanup
-- Addresses: auth_rls_initplan, multiple_permissive_policies, duplicate indexes
-- Scope:     Customer-facing tables (cart, wishlist, profile, orders, etc.)
-- ==========================================================================
-- This migration:
--   1. Rewrites RLS policies that use bare auth.uid() to use (select auth.uid())
--      so the planner evaluates it once per query (InitPlan) instead of per-row.
--   2. Drops overlapping/duplicate PERMISSIVE SELECT policies so the planner
--      evaluates fewer policy quals per row.
--   3. Adds covering indexes for hot unindexed foreign keys.
--   4. Drops duplicate indexes that waste write overhead and storage.
-- ==========================================================================

-- =====================================================================
-- PART 1+2: RLS POLICY REWRITES + CONSOLIDATION (table by table)
-- =====================================================================

-- ---- shopping_cart ----
-- Fix auth_rls_initplan: wrap auth.uid()
DROP POLICY IF EXISTS "Users can manage own cart" ON public.shopping_cart;
CREATE POLICY "Users can manage own cart" ON public.shopping_cart
  FOR ALL
  USING  (customer_id = (select auth.uid()))
  WITH CHECK (customer_id = (select auth.uid()));

-- ---- user_wishlists ----
-- Fix auth_rls_initplan: wrap auth.uid()
DROP POLICY IF EXISTS "wishlist_owner_all" ON public.user_wishlists;
CREATE POLICY "wishlist_owner_all" ON public.user_wishlists
  FOR ALL
  USING  ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

-- ---- user_profiles ----
-- Fix auth_rls_initplan on all four policies that reference auth.uid()

DROP POLICY IF EXISTS "insert_own_profile" ON public.user_profiles;
CREATE POLICY "insert_own_profile" ON public.user_profiles
  FOR INSERT
  WITH CHECK ((select auth.uid()) = id);

DROP POLICY IF EXISTS "Users can view own profile" ON public.user_profiles;
CREATE POLICY "Users can view own profile" ON public.user_profiles
  FOR SELECT
  USING (((select auth.uid()) = id) OR is_admin());

DROP POLICY IF EXISTS "view_customer_profiles_for_merchants" ON public.user_profiles;
CREATE POLICY "view_customer_profiles_for_merchants" ON public.user_profiles
  FOR SELECT
  USING (
    (EXISTS (
      SELECT 1
      FROM merchant_ratings mr
        JOIN merchants m ON (mr.merchant_id = m.id)
      WHERE mr.customer_id = user_profiles.id
        AND m.user_id = (select auth.uid())
    ))
    OR
    (EXISTS (
      SELECT 1
      FROM shopping_order_groups sog
        JOIN merchants m ON (sog.merchant_id = m.id)
      WHERE sog.customer_id = user_profiles.id
        AND m.user_id = (select auth.uid())
    ))
  );

DROP POLICY IF EXISTS "Users can update own profile" ON public.user_profiles;
CREATE POLICY "Users can update own profile" ON public.user_profiles
  FOR UPDATE
  USING  (((select auth.uid()) = id) OR is_admin())
  WITH CHECK (((select auth.uid()) = id) OR is_admin());

-- ---- orders ----
-- Fix auth_rls_initplan: wrap auth.uid()
DROP POLICY IF EXISTS "users_insert_own_orders" ON public.orders;
CREATE POLICY "users_insert_own_orders" ON public.orders
  FOR INSERT
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "users_view_own_orders" ON public.orders;
CREATE POLICY "users_view_own_orders" ON public.orders
  FOR SELECT
  USING ((select auth.uid()) = user_id);

-- ---- merchants ----
-- Fix auth_rls_initplan on all four policies

DROP POLICY IF EXISTS "merchants_delete_policy" ON public.merchants;
CREATE POLICY "merchants_delete_policy" ON public.merchants
  FOR DELETE
  USING (
    (SELECT user_profiles.role
       FROM user_profiles
      WHERE user_profiles.id = (select auth.uid())) = 'admin'::user_role
  );

DROP POLICY IF EXISTS "merchants_insert_policy" ON public.merchants;
CREATE POLICY "merchants_insert_policy" ON public.merchants
  FOR INSERT
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "merchants_admin_select" ON public.merchants;
CREATE POLICY "merchants_admin_select" ON public.merchants
  FOR SELECT
  USING ((user_id = (select auth.uid())) OR is_admin());

DROP POLICY IF EXISTS "merchants_update_policy" ON public.merchants;
CREATE POLICY "merchants_update_policy" ON public.merchants
  FOR UPDATE
  USING  (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

-- ---- customer_wallets ----
-- Part 2 consolidation: drop legacy inline-subquery admin policy
-- (the "App admins can view all wallets" policy using is_admin() already covers this)
DROP POLICY IF EXISTS "Admins can view all wallets" ON public.customer_wallets;

-- Fix auth_rls_initplan on remaining user policies
DROP POLICY IF EXISTS "Users can insert their own wallet" ON public.customer_wallets;
CREATE POLICY "Users can insert their own wallet" ON public.customer_wallets
  FOR INSERT
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can view their own wallet" ON public.customer_wallets;
CREATE POLICY "Users can view their own wallet" ON public.customer_wallets
  FOR SELECT
  USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update their own wallet" ON public.customer_wallets;
CREATE POLICY "Users can update their own wallet" ON public.customer_wallets
  FOR UPDATE
  USING ((select auth.uid()) = user_id);

-- ---- customer_wallet_transactions ----
-- Part 2 consolidation: drop legacy inline-subquery admin policy
-- (the "App admins can view all wallet txs" policy using is_admin() already covers this)
DROP POLICY IF EXISTS "Admins can view all customer wallet transactions" ON public.customer_wallet_transactions;

-- Fix auth_rls_initplan on remaining user policy
DROP POLICY IF EXISTS "Users can view their own transactions" ON public.customer_wallet_transactions;
CREATE POLICY "Users can view their own transactions" ON public.customer_wallet_transactions
  FOR SELECT
  USING ((select auth.uid()) = user_id);

-- ---- merchant_ratings ----
-- Part 2 consolidation: drop overlapping SELECT policies
-- "Anyone can read ratings" (qual: true) already covers all SELECT access,
-- so "Public can read all ratings" (qual: true) and "Merchants can read own
-- ratings" (qual: merchant_id subselect) are redundant.
DROP POLICY IF EXISTS "Public can read all ratings"  ON public.merchant_ratings;
DROP POLICY IF EXISTS "Merchants can read own ratings" ON public.merchant_ratings;

-- Fix auth_rls_initplan on INSERT policy
DROP POLICY IF EXISTS "Customers can insert own ratings" ON public.merchant_ratings;
CREATE POLICY "Customers can insert own ratings" ON public.merchant_ratings
  FOR INSERT
  WITH CHECK ((select auth.uid()) = customer_id);

-- ---- shopping_categories ----
-- Part 2 consolidation: drop two redundant SELECT policies
-- "Everyone can view active categories" ((is_active=true) OR is_admin()) covers both
DROP POLICY IF EXISTS "Anyone can view categories"      ON public.shopping_categories;
DROP POLICY IF EXISTS "Public can view active categories" ON public.shopping_categories;

-- ---- shopping_order_groups ----
-- Fix auth_rls_initplan on three policies that reference auth.uid()

DROP POLICY IF EXISTS "Merchants view own order groups" ON public.shopping_order_groups;
CREATE POLICY "Merchants view own order groups" ON public.shopping_order_groups
  FOR SELECT
  USING (
    merchant_id IN (
      SELECT merchants.id FROM merchants
       WHERE merchants.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users view own order groups" ON public.shopping_order_groups;
CREATE POLICY "Users view own order groups" ON public.shopping_order_groups
  FOR SELECT
  USING (customer_id = (select auth.uid()));

DROP POLICY IF EXISTS "Merchants update own order group status" ON public.shopping_order_groups;
CREATE POLICY "Merchants update own order group status" ON public.shopping_order_groups
  FOR UPDATE
  USING (
    merchant_id IN (
      SELECT merchants.id FROM merchants
       WHERE merchants.user_id = (select auth.uid())
    )
  )
  WITH CHECK (
    merchant_id IN (
      SELECT merchants.id FROM merchants
       WHERE merchants.user_id = (select auth.uid())
    )
  );

-- ---- shopping_order_items ----
-- Fix auth_rls_initplan on two SELECT policies

DROP POLICY IF EXISTS "Merchants view sold items" ON public.shopping_order_items;
CREATE POLICY "Merchants view sold items" ON public.shopping_order_items
  FOR SELECT
  USING (
    seller_id IN (
      SELECT merchants.id FROM merchants
       WHERE merchants.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users view own items" ON public.shopping_order_items;
CREATE POLICY "Users view own items" ON public.shopping_order_items
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
        FROM shopping_order_groups
       WHERE shopping_order_groups.id = shopping_order_items.group_id
         AND shopping_order_groups.customer_id = (select auth.uid())
    )
  );

-- ---- shopping_orders ----
-- Part 2 consolidation: drop redundant wholesale-only policy
-- "Users can view own purchase history" already covers merchant wholesale orders
DROP POLICY IF EXISTS "merchant_own_wholesale_orders_select" ON public.shopping_orders;

-- Fix auth_rls_initplan on the comprehensive SELECT policy
DROP POLICY IF EXISTS "Users can view own purchase history" ON public.shopping_orders;
CREATE POLICY "Users can view own purchase history" ON public.shopping_orders
  FOR SELECT
  USING (
    ((buyer_type = 'customer'::text) AND (buyer_id = (select auth.uid())))
    OR
    ((buyer_type = 'merchant'::text) AND (buyer_id IN (
      SELECT merchants.id FROM merchants
       WHERE merchants.user_id = (select auth.uid())
    )))
    OR
    ((seller_type = 'merchant'::text) AND (seller_id IN (
      SELECT merchants.id FROM merchants
       WHERE merchants.user_id = (select auth.uid())
    )))
  );

-- ---- shopping_products ----
-- Part 2 consolidation only: drop redundant SELECT policy
-- "Merchants can view own products" already includes (is_active = true) OR merchant-owned
-- (and it already uses (SELECT auth.uid()), so no initplan fix needed)
DROP POLICY IF EXISTS "Anyone can view active products" ON public.shopping_products;

-- =====================================================================
-- PART 2B: UPDATE HELPER FUNCTIONS TO USE (select auth.uid())
-- =====================================================================

-- check_merchant_group_access: used in shopping_order_groups RLS
CREATE OR REPLACE FUNCTION public.check_merchant_group_access(grp_id uuid)
 RETURNS boolean
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM shopping_order_items
    WHERE group_id = grp_id
      AND seller_id IN (
        SELECT id FROM merchants WHERE user_id = (select auth.uid())
      )
  );
$function$;

-- has_hr_manager_access: used in user_profiles RLS
CREATE OR REPLACE FUNCTION public.has_hr_manager_access()
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE id = (select auth.uid())
      AND role IN ('hr_manager', 'admin', 'super_admin')
  );
END;
$function$;

-- =====================================================================
-- PART 3A: ADD COVERING INDEXES FOR HOT UNINDEXED FKs
-- =====================================================================
-- These tables are on the customer hot-path (cart, wishlist, order items,
-- ratings). Missing FK indexes cause seq-scans on cascading DELETE/UPDATE
-- and slow JOIN performance.

CREATE INDEX IF NOT EXISTS idx_cart_inventory_id
  ON public.shopping_cart (inventory_id);

CREATE INDEX IF NOT EXISTS idx_cart_product_id
  ON public.shopping_cart (product_id);

-- user_wishlists has UNIQUE(user_id, product_id) which covers user_id as
-- leading col, but product_id alone needs an index for FK reverse lookups
CREATE INDEX IF NOT EXISTS idx_wishlists_product_id
  ON public.user_wishlists (product_id);

CREATE INDEX IF NOT EXISTS idx_order_items_group_id
  ON public.shopping_order_items (group_id);

CREATE INDEX IF NOT EXISTS idx_order_items_inventory_id
  ON public.shopping_order_items (inventory_id);

CREATE INDEX IF NOT EXISTS idx_order_items_product_id
  ON public.shopping_order_items (product_id);

CREATE INDEX IF NOT EXISTS idx_ratings_merchant_id
  ON public.merchant_ratings (merchant_id);

CREATE INDEX IF NOT EXISTS idx_ratings_customer_id
  ON public.merchant_ratings (customer_id);

-- =====================================================================
-- PART 3B: DROP DUPLICATE INDEXES
-- =====================================================================

-- kyc_records: idx_kyc_records_status is identical to idx_kyc_records_verification_status
DROP INDEX IF EXISTS public.idx_kyc_records_status;

-- kyc_records: idx_kyc_user_id is identical to idx_kyc_records_user_id
DROP INDEX IF EXISTS public.idx_kyc_user_id;

-- kyc_records: one_kyc_per_user is identical UNIQUE constraint to kyc_records_user_id_unique
ALTER TABLE public.kyc_records DROP CONSTRAINT IF EXISTS one_kyc_per_user;

-- transactions: idx_transactions_status_enum is identical to idx_transactions_status
DROP INDEX IF EXISTS public.idx_transactions_status_enum;

-- transactions: idx_transactions_client_txn_id is redundant with UNIQUE transactions_client_txn_id_key
DROP INDEX IF EXISTS public.idx_transactions_client_txn_id;

-- coupons: idx_coupons_status_valid is identical to idx_coupons_status_valid_until
DROP INDEX IF EXISTS public.idx_coupons_status_valid;

-- user_channel_bindings: idx_user_channel_bindings_phone is identical to idx_channel_bindings_phone
DROP INDEX IF EXISTS public.idx_user_channel_bindings_phone;

-- whatsapp_message_logs: idx_whatsapp_message_logs_wamid is identical to idx_whatsapp_logs_wamid
DROP INDEX IF EXISTS public.idx_whatsapp_message_logs_wamid;
