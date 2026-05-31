-- ============================================================
-- 20260531_procurement_schema.sql
-- ============================================================
-- Purpose:
--   Introduces the wholesale procurement feature for InTrust
--   Official. Covers five changes in one atomic, idempotent
--   script:
--
--   A. Extend ledger_entry_type enum with 'wholesale_procurement'
--   B. Add platform_listed / platform_price_paise to shopping_products
--   C. Create platform_procurement_orders table
--   D. Create platform_procurement_items table
--   E. Create supporting indexes (× 4)
--   F. Enable RLS + create policies on both new tables (× 4)
--   G. Backfill platform_listed = true for pre-existing genuine
--      platform products (admin-owned, active, admin_stock > 0)
--
--   Safe to re-run — every DDL statement uses IF NOT EXISTS or
--   an equivalent idempotent guard.
-- ============================================================

BEGIN;

-- ============================================================
-- Section A — Extend ledger_entry_type enum
-- ============================================================
-- ADD VALUE IF NOT EXISTS is safe inside a transaction on
-- Postgres 15+ (which Supabase runs). It is a no-op if the
-- value already exists.
ALTER TYPE public.ledger_entry_type
    ADD VALUE IF NOT EXISTS 'wholesale_procurement';


-- ============================================================
-- Section B — Add columns to shopping_products
-- ============================================================
ALTER TABLE public.shopping_products
    ADD COLUMN IF NOT EXISTS platform_listed      boolean  NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS platform_price_paise bigint;


-- ============================================================
-- Section C — Create platform_procurement_orders
-- ============================================================
CREATE TABLE IF NOT EXISTS public.platform_procurement_orders (
    id                 uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
    merchant_id        uuid        NOT NULL REFERENCES public.merchants(id),
    created_by_admin   uuid        NOT NULL REFERENCES public.user_profiles(id),
    status             text        NOT NULL DEFAULT 'completed',
    fulfillment_mode   text        NOT NULL DEFAULT 'intrust'
                                   CHECK (fulfillment_mode IN ('intrust', 'merchant_dropship')),
    total_cost_paise   bigint      NOT NULL,
    total_gst_paise    bigint      NOT NULL,
    total_amount_paise bigint      NOT NULL,
    invoice_number     text,
    idempotency_key    uuid        NOT NULL UNIQUE,
    created_at         timestamptz NOT NULL DEFAULT now()
);


-- ============================================================
-- Section D — Create platform_procurement_items
-- ============================================================
CREATE TABLE IF NOT EXISTS public.platform_procurement_items (
    id                      uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
    procurement_id          uuid        NOT NULL
                                        REFERENCES public.platform_procurement_orders(id)
                                        ON DELETE CASCADE,
    product_id              uuid        NOT NULL REFERENCES public.shopping_products(id),
    merchant_inventory_id   uuid        REFERENCES public.merchant_inventory(id),
    quantity                integer     NOT NULL CHECK (quantity > 0),
    unit_wholesale_paise    bigint      NOT NULL,
    gst_percentage          numeric     NOT NULL DEFAULT 0,
    gst_amount_paise        bigint      NOT NULL,
    line_total_paise        bigint      NOT NULL,
    platform_price_paise    bigint,
    created_at              timestamptz NOT NULL DEFAULT now()
);


-- ============================================================
-- Section E — Indexes
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_procurement_items_product_id
    ON public.platform_procurement_items (product_id);

CREATE INDEX IF NOT EXISTS idx_procurement_items_merchant_inventory_id
    ON public.platform_procurement_items (merchant_inventory_id);

CREATE INDEX IF NOT EXISTS idx_procurement_orders_merchant_created
    ON public.platform_procurement_orders (merchant_id, created_at);

-- Partial index — only indexes rows where platform_listed is true,
-- keeping the index small and benefiting storefront filter queries.
CREATE INDEX IF NOT EXISTS idx_shopping_products_platform_listed
    ON public.shopping_products (platform_listed)
    WHERE platform_listed = true;


-- ============================================================
-- Section F — RLS policies
-- ============================================================
ALTER TABLE public.platform_procurement_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_procurement_items  ENABLE ROW LEVEL SECURITY;

-- platform_procurement_orders policies
DO $rls_orders$
BEGIN
    -- Admin: full access
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename  = 'platform_procurement_orders'
          AND policyname = 'procurement_orders_admin_all'
    ) THEN
        CREATE POLICY procurement_orders_admin_all
            ON public.platform_procurement_orders
            FOR ALL
            USING     (is_admin())
            WITH CHECK (is_admin());
    END IF;

    -- Merchant: read their own orders only
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename  = 'platform_procurement_orders'
          AND policyname = 'procurement_orders_merchant_select'
    ) THEN
        CREATE POLICY procurement_orders_merchant_select
            ON public.platform_procurement_orders
            FOR SELECT
            USING (
                merchant_id IN (
                    SELECT id FROM public.merchants
                    WHERE user_id = auth.uid()
                )
            );
    END IF;
END;
$rls_orders$;

-- platform_procurement_items policies
DO $rls_items$
BEGIN
    -- Admin: full access
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename  = 'platform_procurement_items'
          AND policyname = 'procurement_items_admin_all'
    ) THEN
        CREATE POLICY procurement_items_admin_all
            ON public.platform_procurement_items
            FOR ALL
            USING     (is_admin())
            WITH CHECK (is_admin());
    END IF;

    -- Merchant: read items belonging to their own orders only
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename  = 'platform_procurement_items'
          AND policyname = 'procurement_items_merchant_select'
    ) THEN
        CREATE POLICY procurement_items_merchant_select
            ON public.platform_procurement_items
            FOR SELECT
            USING (
                procurement_id IN (
                    SELECT id FROM public.platform_procurement_orders
                    WHERE merchant_id IN (
                        SELECT id FROM public.merchants
                        WHERE user_id = auth.uid()
                    )
                )
            );
    END IF;
END;
$rls_items$;


-- ============================================================
-- Section G — Backfill platform_listed = true
-- ============================================================
-- Marks pre-existing genuine platform products so they continue
-- to appear in InTrust Official after the storefront filter
-- changes to use the new column.
--
-- Criteria (all must be true):
--   submitted_by_merchant_id IS NULL  → admin-owned product
--   is_active = true                  → currently on sale
--   admin_stock > 0                   → stock available
--   platform_listed = false           → idempotent: skip already-set rows
DO $backfill$
DECLARE
    v_count INTEGER;
BEGIN
    UPDATE public.shopping_products
       SET platform_listed = true
     WHERE submitted_by_merchant_id IS NULL
       AND is_active                = true
       AND admin_stock              > 0
       AND platform_listed          = false;  -- idempotent guard

    GET DIAGNOSTICS v_count = ROW_COUNT;

    RAISE NOTICE
        'Procurement schema backfill complete: % shopping_products rows '
        'set to platform_listed = true.',
        v_count;
END;
$backfill$;

COMMIT;


-- ============================================================
-- Verification queries (run after deploy)
-- ============================================================
-- 1. Confirm new enum value:
--    SELECT enumlabel FROM pg_enum
--    JOIN pg_type ON pg_type.oid = pg_enum.enumtypid
--    WHERE typname = 'ledger_entry_type'
--    ORDER BY enumsortorder;
--
-- 2. Confirm new columns on shopping_products:
--    SELECT column_name, data_type, column_default, is_nullable
--    FROM information_schema.columns
--    WHERE table_schema = 'public'
--      AND table_name   = 'shopping_products'
--      AND column_name  IN ('platform_listed', 'platform_price_paise');
--
-- 3. Confirm both new tables exist:
--    SELECT table_name FROM information_schema.tables
--    WHERE table_schema = 'public'
--      AND table_name IN ('platform_procurement_orders', 'platform_procurement_items');
--
-- 4. Confirm all four indexes exist:
--    SELECT indexname, tablename FROM pg_indexes
--    WHERE schemaname = 'public'
--      AND indexname IN (
--          'idx_procurement_items_product_id',
--          'idx_procurement_items_merchant_inventory_id',
--          'idx_procurement_orders_merchant_created',
--          'idx_shopping_products_platform_listed'
--      );
--
-- 5. Confirm RLS policies exist:
--    SELECT policyname, tablename FROM pg_policies
--    WHERE schemaname = 'public'
--      AND tablename IN ('platform_procurement_orders', 'platform_procurement_items')
--    ORDER BY tablename, policyname;
--
-- 6. Backfill completeness — expect 0:
--    SELECT COUNT(*) FROM public.shopping_products
--    WHERE submitted_by_merchant_id IS NULL
--      AND is_active    = true
--      AND admin_stock  > 0
--      AND platform_listed = false;
--
-- 7. No custom products incorrectly listed — expect 0:
--    SELECT COUNT(*) FROM public.shopping_products
--    WHERE submitted_by_merchant_id IS NOT NULL
--      AND platform_listed = true;
