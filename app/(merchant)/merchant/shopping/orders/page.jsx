import { createServerSupabaseClient, createAdminClient } from "@/lib/supabaseServer";
import { redirect } from "next/navigation";
import MerchantOrdersClient from "./MerchantOrdersClient";
import { calculateMerchantOrderKPIs } from "@/lib/merchant/orderMetrics";

export const dynamic = 'force-dynamic';

export default async function MerchantOrdersPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: merchant } = await supabase
    .from("merchants")
    .select("id, business_name, business_address, business_phone, gst_number, status, auto_mode_status, auto_mode")
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
        product_image: item.product_image || item.image_url || null,
        quantity: item.quantity,
        unit_price_paise: item.unit_price_paise,
        cost_price_paise: item.cost_price_paise || 0,
        total_price_paise: (item.unit_price_paise || 0) * (item.quantity || 1),
        gross_profit_paise: item.gross_profit_paise || 0,
        commission_amount_paise: item.commission_amount_paise || 0,
        net_profit_paise: item.net_profit_paise || 0,
        profit_paise: item.net_profit_paise || 0,
        gst_percentage: item.gst_percentage || 0,
        hsn_code: item.hsn_code || '',
      })),
    }));
  }

  console.log("[ORDERS] Loaded", orders.length, "orders for merchant:", merchant.id, fetchError ? `(error: ${fetchError})` : "");

  // Authoritative initial KPIs calculated via tested orderMetrics utility
  const initialKPIs = calculateMerchantOrderKPIs(orders, 'all');

  // Retain legacy stats shape for backward compatibility
  const stats = {
    totalOrders: initialKPIs.validOrdersCount,
    pendingOrders: initialKPIs.pendingOrdersCount,
    deliveredOrders: orders.filter(o => o.delivery_status === "delivered").length,
    totalRevenue: initialKPIs.totalSalesPaise,
    totalCommission: orders.reduce((sum, o) =>
      sum + (o.platform_cut_paise || (o.items || []).reduce((s, i) => s + (i.commission_amount_paise || 0), 0)), 0),
    totalNetProfit: initialKPIs.settledEarningsPaise,
    get totalGrossProfit() { return this.totalNetProfit + this.totalCommission; },
  };

  return (
    <div className="relative">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {/* Pass authoritative initialKPIs and error prop to client component */}
        <MerchantOrdersClient 
          orders={orders} 
          initialKPIs={initialKPIs} 
          stats={stats} 
          merchantId={merchant.id} 
          merchantInfo={merchant} 
          error={fetchError} 
        />
      </main>
    </div>
  );
}
