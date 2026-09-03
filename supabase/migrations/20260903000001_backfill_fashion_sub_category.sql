-- ─────────────────────────────────────────────────────────────────────────────
-- Backfill sub_category for existing Fashion products
--
-- Strategy (runs in order; each UPDATE only touches rows still NULL):
--   1. Men  — sportswear brands, track pants, t-shirts, shirts, jeans, boxers
--   2. Kids — baby, toddler, kids, children, boy, girl, infant keywords
--   3. Women — everything else in Fashion (suits, kurtas, anarkali, etc.)
--
-- Safe to run multiple times — WHERE sub_category IS NULL guard prevents
-- overwriting any value already set by admin or a previous run.
-- ─────────────────────────────────────────────────────────────────────────────

BEGIN;

-- 1. Men  ────────────────────────────────────────────────────────────────────
UPDATE public.shopping_products
SET sub_category = 'Men'
WHERE category = 'Fashion'
  AND deleted_at IS NULL
  AND sub_category IS NULL
  AND (
       lower(title) ~* '\mmen\M'          -- exact word "men"
    OR lower(title) ~* '\mmens\M'
    OR lower(title) LIKE '%track pant%'
    OR lower(title) LIKE '%gym%'
    OR lower(title) LIKE '%boxer%'
    OR lower(title) LIKE '%briefs%'
    OR lower(title) LIKE '%t-shirt%'
    OR lower(title) LIKE '%tshirt%'
    OR lower(title) LIKE '%polo%'
    OR lower(title) LIKE '%sweatshirt%'
    OR lower(title) LIKE '%hoodie%'
    OR lower(title) LIKE '%cargo pant%'
    OR lower(title) LIKE '%formal shirt%'
    OR lower(title) LIKE '%jeans%'
    OR lower(title) LIKE '%decathlon%'
    OR lower(description) ~* '\mmen\M'
    OR lower(description) LIKE '%track pant%'
    OR lower(description) LIKE '%gym%'
  );

-- 2. Kids ────────────────────────────────────────────────────────────────────
UPDATE public.shopping_products
SET sub_category = 'Kids'
WHERE category = 'Fashion'
  AND deleted_at IS NULL
  AND sub_category IS NULL
  AND (
       lower(title) ~* '\bkids?\b'
    OR lower(title) ~* '\bbaby\b'
    OR lower(title) ~* '\btoddler\b'
    OR lower(title) ~* '\bchildren\b'
    OR lower(title) ~* '\binfant\b'
    OR lower(title) ~* '\bboy\b'
    OR lower(title) ~* '\bgirl\b'
    OR lower(description) ~* '\bkids?\b'
    OR lower(description) ~* '\bbaby\b'
    OR lower(description) ~* '\btoddler\b'
    OR lower(description) ~* '\bchildren\b'
  );

-- 3. Women — default for everything remaining ────────────────────────────────
UPDATE public.shopping_products
SET sub_category = 'Women'
WHERE category = 'Fashion'
  AND deleted_at IS NULL
  AND sub_category IS NULL;

-- Summary (printed in migration output for verification)
DO $$
DECLARE
  v_men   integer;
  v_women integer;
  v_kids  integer;
BEGIN
  SELECT COUNT(*) INTO v_men   FROM public.shopping_products WHERE category = 'Fashion' AND sub_category = 'Men'   AND deleted_at IS NULL;
  SELECT COUNT(*) INTO v_women FROM public.shopping_products WHERE category = 'Fashion' AND sub_category = 'Women' AND deleted_at IS NULL;
  SELECT COUNT(*) INTO v_kids  FROM public.shopping_products WHERE category = 'Fashion' AND sub_category = 'Kids'  AND deleted_at IS NULL;
  RAISE NOTICE 'Backfill complete — Men: %, Women: %, Kids: %', v_men, v_women, v_kids;
END;
$$;

COMMIT;
