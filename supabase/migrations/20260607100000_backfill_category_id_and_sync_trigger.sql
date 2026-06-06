-- ============================================================
-- Migration: Backfill category_id and make category filter
--            rename-safe via a DB trigger
-- Created: 2026-06-07
-- Safe to re-run (idempotent guards throughout)
-- ============================================================

-- ──────────────────────────────────────────────────────────
-- PART 1: Backfill category_id where it is NULL
--   Matches trimmed / case-insensitive category text to the
--   canonical shopping_categories.name.
--   Non-destructive: only touches rows where category_id IS NULL.
-- ──────────────────────────────────────────────────────────
UPDATE public.shopping_products sp
SET    category_id = sc.id
FROM   public.shopping_categories sc
WHERE  sp.category_id IS NULL
  AND  sp.deleted_at  IS NULL
  AND  lower(trim(sp.category)) = lower(trim(sc.name));

-- ──────────────────────────────────────────────────────────
-- PART 2: Remap products whose category text is a known
--         legacy / stale name that no longer matches any
--         active category row.
--
--   Live drift confirmed in the epic:
--     • "Health"  → "Health & Wellness"  (canonical)
--     • "Toys"    → no canonical match → will be deactivated
--                   in Part 3 if left with 0 products.
--
--   Strategy:
--     - "Health"  products get remapped to the canonical row.
--     - "Toys"    products get remapped to the canonical row
--       if one exists; otherwise category_id stays NULL and
--       Part 3 will deactivate the stale shell.
--
--   Edit this block before running on a new environment if
--   the stale-name list differs.
-- ──────────────────────────────────────────────────────────

-- 2a. Remap "Health" → "Health & Wellness"
DO $$
DECLARE
  v_target_id uuid;
BEGIN
  SELECT id INTO v_target_id
  FROM   public.shopping_categories
  WHERE  lower(trim(name)) = lower(trim('Health & Wellness'))
  LIMIT  1;

  IF v_target_id IS NOT NULL THEN
    UPDATE public.shopping_products
    SET    category_id = v_target_id,
           category    = 'Health & Wellness'
    WHERE  category_id IS NULL
      AND  deleted_at  IS NULL
      AND  lower(trim(category)) = 'health';

    RAISE NOTICE '✅  Remapped "Health" products → "Health & Wellness" (id: %)', v_target_id;
  ELSE
    RAISE NOTICE 'ℹ️  No "Health & Wellness" category found — skipping Health remap';
  END IF;
END $$;

-- 2b. Remap "Toys" → canonical category if one exists
DO $$
DECLARE
  v_target_id uuid;
BEGIN
  -- Try exact match first, then a ILIKE fallback
  SELECT id INTO v_target_id
  FROM   public.shopping_categories
  WHERE  lower(trim(name)) IN ('toys', 'toys & games', 'toys and games')
    AND  lower(trim(name)) != 'toys'   -- prefer a non-stale row
  LIMIT  1;

  IF v_target_id IS NULL THEN
    -- No canonical row: just try any row named 'toys'
    SELECT id INTO v_target_id
    FROM   public.shopping_categories
    WHERE  lower(trim(name)) = 'toys'
    LIMIT  1;
  END IF;

  IF v_target_id IS NOT NULL THEN
    UPDATE public.shopping_products
    SET    category_id = v_target_id
    WHERE  category_id IS NULL
      AND  deleted_at  IS NULL
      AND  lower(trim(category)) = 'toys';

    RAISE NOTICE '✅  Remapped "Toys" products → category id: %', v_target_id;
  ELSE
    RAISE NOTICE 'ℹ️  No canonical "Toys" category found — those products remain uncategorised';
  END IF;
END $$;

-- ──────────────────────────────────────────────────────────
-- PART 3: Deactivate categories that have zero active
--         products so they stop appearing in the dropdown.
--
--   A category is deactivated only when:
--     • is_active = true  (so we don't flip already-inactive rows)
--     • no non-deleted product references it via category_id
-- ──────────────────────────────────────────────────────────
UPDATE public.shopping_categories sc
SET    is_active = false
WHERE  sc.is_active = true
  AND  NOT EXISTS (
         SELECT 1
         FROM   public.shopping_products sp
         WHERE  sp.category_id = sc.id
           AND  sp.deleted_at  IS NULL
       );

DO $$
DECLARE v_count integer;
BEGIN
  SELECT count(*) INTO v_count
  FROM   public.shopping_categories
  WHERE  is_active = false;
  RAISE NOTICE 'ℹ️  Total inactive categories after cleanup: %', v_count;
END $$;

-- ──────────────────────────────────────────────────────────
-- PART 4: Trigger — keep shopping_products.category (text)
--         in sync whenever shopping_categories.name is
--         renamed.  This protects the storefront RPC
--         (get_storefront_page) which still filters by the
--         text column, without requiring changes to that RPC.
-- ──────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.sync_product_category_name()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.name IS DISTINCT FROM OLD.name THEN
    UPDATE public.shopping_products
    SET    category = NEW.name
    WHERE  category_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

-- Idempotent trigger creation
DROP TRIGGER IF EXISTS trg_sync_product_category_name ON public.shopping_categories;
CREATE TRIGGER trg_sync_product_category_name
  AFTER UPDATE OF name ON public.shopping_categories
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_product_category_name();

-- Grant execute on the helper function
REVOKE ALL ON FUNCTION public.sync_product_category_name() FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.sync_product_category_name() TO service_role;

-- ──────────────────────────────────────────────────────────
-- PART 5: Add a composite index to speed up the admin filter
--         query now that it runs on category_id (UUID).
-- ──────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_shopping_products_category_id
  ON public.shopping_products(category_id)
  WHERE deleted_at IS NULL;

-- ──────────────────────────────────────────────────────────
-- PART 6: Verification — warn if any active products still
--         have NULL category_id after the backfill.
-- ──────────────────────────────────────────────────────────
DO $$
DECLARE
  v_orphans  bigint;
  v_total    bigint;
BEGIN
  SELECT count(*) INTO v_total
  FROM   public.shopping_products
  WHERE  deleted_at IS NULL;

  SELECT count(*) INTO v_orphans
  FROM   public.shopping_products
  WHERE  category_id IS NULL
    AND  deleted_at  IS NULL;

  IF v_orphans > 0 THEN
    RAISE WARNING
      '⚠️  % / % active products still have NULL category_id after backfill. '
      'Run: SELECT DISTINCT lower(trim(category)), count(*) FROM shopping_products '
      'WHERE category_id IS NULL AND deleted_at IS NULL GROUP BY 1 ORDER BY 2 DESC;',
      v_orphans, v_total;
  ELSE
    RAISE NOTICE '✅  All % active products have category_id set.', v_total;
  END IF;
END $$;
