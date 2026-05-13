-- ============================================================================
-- Flash Sale Items — Admin-Controlled Flash Sale Feature
-- Created: 2026-05-12
-- Description: Introduces flash_sale_items table with RLS, business-rule
--              triggers, partial unique indexes, and realtime publication.
--              Idempotent: safe to re-run.
-- ============================================================================

-- 1. Create the flash_sale_items table
CREATE TABLE IF NOT EXISTS public.flash_sale_items (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id uuid NOT NULL REFERENCES public.shopping_products(id) ON DELETE CASCADE,
    discount_percent integer NOT NULL CHECK (discount_percent BETWEEN 1 AND 99),
    sale_price_paise bigint NOT NULL CHECK (sale_price_paise >= 0),
    position integer NOT NULL CHECK (position BETWEEN 1 AND 5),
    is_active boolean NOT NULL DEFAULT true,
    starts_at timestamptz NOT NULL DEFAULT now(),
    ends_at timestamptz NULL,
    created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CHECK (ends_at IS NULL OR ends_at > starts_at)
);

-- 2. Partial unique indexes
CREATE UNIQUE INDEX IF NOT EXISTS flash_sale_items_unique_active_position ON public.flash_sale_items(position) WHERE is_active = true;
CREATE UNIQUE INDEX IF NOT EXISTS flash_sale_items_unique_active_product ON public.flash_sale_items(product_id) WHERE is_active = true;

-- 3. Performance indexes
CREATE INDEX IF NOT EXISTS flash_sale_items_active_pos_idx ON public.flash_sale_items(is_active, position);
CREATE INDEX IF NOT EXISTS flash_sale_items_ends_at_idx ON public.flash_sale_items(ends_at);

-- 4. Trigger functions

-- A. updated_at trigger
DROP TRIGGER IF EXISTS set_flash_sale_items_updated_at ON public.flash_sale_items;
CREATE TRIGGER set_flash_sale_items_updated_at
  BEFORE UPDATE ON public.flash_sale_items
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- B. Max-5-active enforcement trigger
CREATE OR REPLACE FUNCTION public.enforce_flash_sale_max_active()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  v_active_count integer;
BEGIN
  -- Only enforce when the resulting row will be active
  IF NEW.is_active = true THEN
    SELECT COUNT(*) INTO v_active_count
    FROM public.flash_sale_items
    WHERE is_active = true
      AND id IS DISTINCT FROM NEW.id;  -- exclude self on UPDATE
    IF v_active_count >= 5 THEN
      RAISE EXCEPTION 'Flash sale already has 5 active items (max allowed)';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_flash_sale_max_active_trg ON public.flash_sale_items;
CREATE TRIGGER enforce_flash_sale_max_active_trg
  BEFORE INSERT OR UPDATE ON public.flash_sale_items
  FOR EACH ROW EXECUTE FUNCTION public.enforce_flash_sale_max_active();

-- 5. Enable RLS
ALTER TABLE public.flash_sale_items ENABLE ROW LEVEL SECURITY;

-- Public read policy
DROP POLICY IF EXISTS "Public can view live flash sale" ON public.flash_sale_items;
CREATE POLICY "Public can view live flash sale"
  ON public.flash_sale_items FOR SELECT
  USING (
    is_active = true
    AND (ends_at IS NULL OR ends_at > now())
    AND starts_at <= now()
  );

-- Admin full-access policy
DROP POLICY IF EXISTS "Admins manage flash sale" ON public.flash_sale_items;
CREATE POLICY "Admins manage flash sale"
  ON public.flash_sale_items FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = auth.uid()
        AND up.role IN ('admin'::public.user_role, 'super_admin'::public.user_role)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = auth.uid()
        AND up.role IN ('admin'::public.user_role, 'super_admin'::public.user_role)
    )
  );

-- 6. Grants
GRANT SELECT ON public.flash_sale_items TO anon, authenticated;
GRANT ALL ON public.flash_sale_items TO service_role;

-- 7. Realtime publication
ALTER TABLE public.flash_sale_items REPLICA IDENTITY FULL;

DO $BEGIN$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.flash_sale_items;
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $BEGIN$;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
