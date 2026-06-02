-- Migration: Admin cap-proof products view and stats RPCs

-- 1. Create View for Admin Shopping Products
CREATE OR REPLACE VIEW public.admin_shopping_products_v AS
SELECT
  p.*,
  EXISTS (
    SELECT 1 FROM public.merchant_inventory mi
    WHERE mi.product_id = p.id AND mi.is_platform_product = false
  ) AS is_custom,
  (
    SELECT mi.merchant_id FROM public.merchant_inventory mi
    WHERE mi.product_id = p.id AND mi.is_platform_product = false
    LIMIT 1
  ) AS custom_merchant_id,
  (
    SELECT m.business_name FROM public.merchant_inventory mi
    JOIN public.merchants m ON mi.merchant_id = m.id
    WHERE mi.product_id = p.id AND mi.is_platform_product = false
    LIMIT 1
  ) AS custom_merchant_name,
  CASE
    WHEN EXISTS (
      SELECT 1 FROM public.merchant_inventory mi
      WHERE mi.product_id = p.id AND mi.is_platform_product = false
    ) THEN NOT EXISTS (
      SELECT 1 FROM public.merchant_inventory mi
      WHERE mi.product_id = p.id
        AND mi.is_platform_product = false
        AND mi.is_active = true
        AND mi.stock_quantity > 0
    )
    ELSE (COALESCE(p.admin_stock, 0) <= 0)
  END AS is_oos
FROM public.shopping_products p;

REVOKE ALL ON public.admin_shopping_products_v FROM PUBLIC;
REVOKE ALL ON public.admin_shopping_products_v FROM anon;
REVOKE ALL ON public.admin_shopping_products_v FROM authenticated;
GRANT SELECT ON public.admin_shopping_products_v TO service_role;

-- 2. Create function get_admin_shopping_stats()
CREATE OR REPLACE FUNCTION public.get_admin_shopping_stats()
RETURNS TABLE (
  total_products bigint,
  platform_products bigint,
  custom_products bigint,
  active_products bigint,
  pending_approvals bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  RETURN QUERY
  WITH product_classification AS (
    SELECT
      p.id,
      p.is_active,
      p.approval_status,
      EXISTS (
        SELECT 1 FROM public.merchant_inventory mi
        WHERE mi.product_id = p.id AND mi.is_platform_product = false
      ) as is_custom
    FROM public.shopping_products p
    WHERE p.deleted_at IS NULL
  )
  SELECT
    count(*)::bigint as total_products,
    count(*) FILTER (WHERE is_custom = false)::bigint as platform_products,
    count(*) FILTER (WHERE is_custom = true)::bigint as custom_products,
    count(*) FILTER (WHERE is_active = true)::bigint as active_products,
    count(*) FILTER (WHERE approval_status = 'pending_approval')::bigint as pending_approvals
  FROM product_classification;
END;
$$;

REVOKE ALL ON FUNCTION public.get_admin_shopping_stats() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_admin_shopping_stats() TO authenticated, service_role;

-- 3. Create function get_admin_merchant_custom_counts()
CREATE OR REPLACE FUNCTION public.get_admin_merchant_custom_counts()
RETURNS TABLE (
  merchant_id uuid,
  custom_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT
    mi.merchant_id,
    count(DISTINCT mi.product_id)::bigint as custom_count
  FROM public.merchant_inventory mi
  JOIN public.shopping_products p ON mi.product_id = p.id
  WHERE p.deleted_at IS NULL
    AND mi.is_platform_product = false
  GROUP BY mi.merchant_id;
END;
$$;

REVOKE ALL ON FUNCTION public.get_admin_merchant_custom_counts() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_admin_merchant_custom_counts() TO authenticated, service_role;
