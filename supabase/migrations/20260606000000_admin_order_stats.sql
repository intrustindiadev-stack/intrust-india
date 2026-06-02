-- Migration: Add order stats to get_admin_shopping_stats()

DROP FUNCTION IF EXISTS public.get_admin_shopping_stats();

CREATE OR REPLACE FUNCTION public.get_admin_shopping_stats()
RETURNS TABLE (
  total_products bigint,
  platform_products bigint,
  custom_products bigint,
  active_products bigint,
  pending_approvals bigint,
  total_orders bigint,
  pending_orders bigint,
  total_revenue bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  v_total_orders bigint;
  v_pending_orders bigint;
  v_total_revenue bigint;
BEGIN
  -- Query order stats
  SELECT
    count(*)::bigint,
    count(*) FILTER (WHERE delivery_status = 'pending')::bigint,
    coalesce(sum(total_amount_paise), 0)::bigint
  INTO
    v_total_orders,
    v_pending_orders,
    v_total_revenue
  FROM public.shopping_order_groups;

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
    count(*) FILTER (WHERE approval_status = 'pending_approval')::bigint as pending_approvals,
    v_total_orders as total_orders,
    v_pending_orders as pending_orders,
    v_total_revenue as total_revenue
  FROM product_classification;
END;
$$;

REVOKE ALL ON FUNCTION public.get_admin_shopping_stats() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_admin_shopping_stats() TO authenticated, service_role;
