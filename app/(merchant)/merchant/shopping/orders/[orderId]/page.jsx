import { createServerSupabaseClient, createAdminClient } from "@/lib/supabaseServer";
import { redirect } from "next/navigation";
import MerchantOrderDetailClient from "./MerchantOrderDetailClient";

export const dynamic = 'force-dynamic';

export default async function MerchantOrderDetailPage({ params }) {
    const { orderId } = await params;

    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect("/login");

    const { data: merchant } = await supabase
        .from("merchants")
        .select("id, business_name, business_address, business_phone, gst_number, status")
        .eq("user_id", user.id)
        .single();

    if (!merchant) redirect("/merchant-apply");
    if (merchant.status !== 'approved') redirect('/merchant/dashboard');

    const adminDb = createAdminClient();

    // Fetch single order with items via RPC. The actual RPC payload returns fields like product_image
    // instead of image_url. Fallback added for backward compatibility.
    const { data: rpcResult } = await adminDb.rpc('merchant_get_my_orders', {
        p_merchant_id: merchant.id
    });

    const rawOrders = rpcResult?.orders || [];
    const rawOrder = rawOrders.find(o => o.id === orderId);
    if (!rawOrder) redirect("/merchant/shopping/orders");

    const order = {
        ...rawOrder,
        items: (rawOrder.items || []).map(item => ({
            id: item.id,
            product_title: item.product_title || "Unknown Product",
            product_image: item.product_image || item.image_url || null,
            quantity: item.quantity,
            unit_price_paise: item.unit_price_paise,
            total_price_paise: (item.unit_price_paise || 0) * (item.quantity || 1),
            gross_profit_paise: item.gross_profit_paise || 0,
            commission_amount_paise: item.commission_amount_paise || 0,
            net_profit_paise: item.net_profit_paise || 0,
            gst_percentage: item.gst_percentage || 0,
            hsn_code: item.hsn_code || '',
        })),
    };

    return (
        <div className="relative">
            <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
                <MerchantOrderDetailClient order={order} merchantInfo={merchant} />
            </main>
        </div>
    );
}
