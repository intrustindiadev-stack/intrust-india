import { createServerSupabaseClient, createAdminClient } from "@/lib/supabaseServer";
import { redirect } from "next/navigation";
import MerchantOrdersClient from "./MerchantOrdersClient";

export const dynamic = 'force-dynamic';

export default async function MerchantOrdersPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: merchant } = await supabase
    .from("merchants")
    .select("id, business_name, business_address, business_phone, gst_number, status, auto_mode_status")
    .eq("user_id", user.id)
    .single();

  if (!merchant) redirect("/merchant-apply");

  // Comment 8: Check merchant approval status before proceeding
  if (merchant.status !== 'approved') {
    if (merchant.status === 'pending') redirect('/merchant-status/pending');
    if (merchant.status === 'rejected') redirect('/merchant-status/rejected');
    if (merchant.status === 'suspended') redirect('/merchant-status/suspended');
  }

  // User is verified as the merchant. Use service role client for data queries
  // to bypass RLS (which requires auth.uid() to work in PostgREST, unreliable in SSR).
  const adminDb = createAdminClient();

  // Comment 1 & 4 & 5: Use merchant_get_my_orders RPC instead of direct table queries.
  // The RPC is SECURITY DEFINER and returns orders with items, customer info, image_url, and profit calculations.
  let orders = [];
  let fetchError = null;

  const { data: rpcResult, error: rpcErr } = await adminDb.rpc('merchant_get_my_orders', {
    p_merchant_id: merchant.id
  });

  if (rpcErr) {
    console.error("[ORDERS] RPC fetch error:", rpcErr);
    fetchError = rpcErr.message || "Failed to load orders";
  } else if (rpcResult?.success === false) {
    console.error("[ORDERS] RPC returned error:", rpcResult.error);
    fetchError = rpcResult.error || "Failed to load orders";
  } else {
    // Parse the returned JSON array
    const rawOrders = rpcResult?.orders || [];
    orders = rawOrders.map(order => ({
      ...order,
      // Ensure items array is always present and fields align with client expectations
      items: (order.items || []).map(item => ({
        id: item.id,
        product_title: item.product_title || "Unknown Product",
        product_image: item.product_image || null,
        quantity: item.quantity,
        unit_price_paise: item.unit_price_paise,
        total_price_paise: (item.unit_price_paise || 0) * (item.quantity || 1),
        gross_profit_paise: item.gross_profit_paise || 0,
        commission_amount_paise: item.commission_amount_paise || 0,
        net_profit_paise: item.net_profit_paise || 0,
        gst_percentage: item.gst_percentage || 0,
        hsn_code: item.hsn_code || '',
      })),
    }));
  }

  console.log("[ORDERS] Loaded", orders.length, "orders for merchant:", merchant.id, fetchError ? `(error: ${fetchError})` : "");

  // Stats
  const stats = {
    totalOrders: orders.length,
    pendingOrders: orders.filter(o => o.delivery_status === "pending").length,
    deliveredOrders: orders.filter(o => o.delivery_status === "delivered").length,
    totalRevenue: orders.reduce((sum, o) => sum + (o.total_amount_paise || 0), 0),
    totalGrossProfit: orders.reduce((sum, o) =>
      sum + (o.items || []).reduce((s, i) => s + (i.gross_profit_paise || 0), 0), 0),
    totalCommission: orders.reduce((sum, o) =>
      sum + (o.platform_cut_paise ?? (o.items || []).reduce((s, i) => s + (i.commission_amount_paise || 0), 0)), 0),
    totalNetProfit: orders.reduce((sum, o) =>
      sum + (o.merchant_profit_paise ?? (o.items || []).reduce((s, i) => s + (i.net_profit_paise || 0), 0)), 0),
  };

  return (
    <div className="relative">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Comment 7: Pass error prop to client component for user-friendly error display */}
        <MerchantOrdersClient orders={orders} stats={stats} merchantId={merchant.id} merchantInfo={merchant} error={fetchError} />
      </main>
    </div>
  );
}
