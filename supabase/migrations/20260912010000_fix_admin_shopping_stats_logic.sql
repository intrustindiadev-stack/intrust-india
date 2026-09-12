-- Migration: Fix admin shopping stats logic to count only confirmed paid orders and accurate revenue
-- 1. Updates get_admin_shopping_stats() to filter on payment_status = 'paid' for order counts & revenue
-- 2. Synchronizes historical delivery_status to 'cancelled' for cancelled/failed checkout sessions

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
  -- Query order stats: ONLY genuine confirmed paid orders
  -- Exclude cancelled checkout drafts, failed gateway attempts, and abandoned unpaid carts
  SELECT
    count(*) FILTER (WHERE payment_status = 'paid')::bigint,
    count(*) FILTER (WHERE payment_status = 'paid' AND delivery_status = 'pending')::bigint,
    coalesce(sum(total_amount_paise) FILTER (WHERE payment_status = 'paid'), 0)::bigint
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
      (p.submitted_by_merchant_id IS NOT NULL OR EXISTS (
        SELECT 1 FROM public.merchant_inventory mi
        WHERE mi.product_id = p.id AND mi.is_platform_product = false
      )) as is_custom
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

-- Clean up historical delivery_status for cancelled and failed sessions
UPDATE public.shopping_order_groups
SET delivery_status = 'cancelled'
WHERE status IN ('cancelled', 'failed') AND delivery_status != 'cancelled';
