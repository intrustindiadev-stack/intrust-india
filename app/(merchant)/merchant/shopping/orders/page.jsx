import { createServerSupabaseClient } from "@/lib/supabaseServer";
import { redirect } from "next/navigation";
import MerchantOrdersClient from "./MerchantOrdersClient";
import { Package } from "lucide-react";

export const dynamic = 'force-dynamic';

export default async function MerchantOrdersPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: merchant } = await supabase
    .from("merchants")
    .select("id, business_name")
    .eq("user_id", user.id)
    .single();

  if (!merchant) redirect("/merchant-apply");

  // Fetch orders via RPC (includes commission calculations)
  const { data, error } = await supabase.rpc("merchant_get_my_orders", {
    p_merchant_id: merchant.id
  });

  if (error) console.error("Error fetching merchant orders:", error);
  const orders = data?.orders || [];

  // Stats
  const stats = {
    totalOrders: orders.length,
    pendingOrders: orders.filter(o => o.delivery_status === "pending").length,
    deliveredOrders: orders.filter(o => o.delivery_status === "delivered").length,
    totalRevenue: orders.reduce((sum, o) => sum + (o.total_amount_paise || 0), 0),
    totalGrossProfit: orders.reduce((sum, o) =>
      sum + (o.items || []).reduce((s, i) => s + (i.gross_profit_paise || 0), 0), 0),
    totalCommission: orders.reduce((sum, o) =>
      sum + (o.items || []).reduce((s, i) => s + (i.commission_amount_paise || 0), 0), 0),
    totalNetProfit: orders.reduce((sum, o) =>
      sum + (o.items || []).reduce((s, i) => s + (i.net_profit_paise || 0), 0), 0),
  };

  return (
    <div className="relative">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <MerchantOrdersClient orders={orders} stats={stats} merchantId={merchant.id} />
      </main>
    </div>
  );
}
