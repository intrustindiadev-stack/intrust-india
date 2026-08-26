-- ============================================================
-- Migration: 20260825000001_fix_shopping_products_customer_rls
--
-- Problem:
--   shopping_products has RLS enabled but no explicit SELECT policy
--   for customers (authenticated) or anonymous visitors.
--   Customers currently see products only because the
--   "Merchants can view own products" policy has an is_active=true
--   branch that accidentally covers all authenticated users.
--   This is semantically incorrect and leaves anonymous visitors
--   with no product visibility.
--
-- Business rules (derived from get_storefront_page RPC):
--   Products are visible to customers/visitors when:
--     - is_active = true
--     - deleted_at IS NULL
--     - approval_status = 'live'
--
--   Platform listing (platform_listed = true) is a separate display
--   concern enforced at the RPC/application layer, not at RLS.
--   Customers should be able to read any active, live product record
--   regardless of whether it is listed on the platform storefront —
--   this allows cart reads, product detail pages, and wishlist lookups.
--
-- Unauthenticated access:
--   Storefront pages are browseable without login (matches existing
--   storefront RPC behavior which is SECURITY DEFINER and returns the
--   same data). The new policy covers the anon role.
--
-- Existing policies unchanged:
--   "Admins can manage products" — unchanged
--   "Merchants can insert custom products" — unchanged
--   "Merchants can view own products" — unchanged (covers pending/inactive
--    products for the submitting merchant)
--   "Merchants update own products" — unchanged
--
-- Date: 2026-08-25
-- ============================================================

BEGIN;

-- Add explicit customer/visitor SELECT policy
-- Conditions mirror the visibility filter in get_storefront_page:
--   is_active = true AND deleted_at IS NULL AND approval_status = 'live'
CREATE POLICY "Customers and visitors can view active products"
    ON public.shopping_products
    FOR SELECT
    USING (
        is_active = true
        AND deleted_at IS NULL
        AND approval_status = 'live'
    );

DO $$
BEGIN
    RAISE NOTICE 'shopping_products: added SELECT policy for authenticated and anon roles.';
    RAISE NOTICE 'Condition: is_active=true AND deleted_at IS NULL AND approval_status=live';
END;
$$;

COMMIT;
