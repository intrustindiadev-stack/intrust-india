import { createAdminClient } from "@/lib/supabaseServer";
import { notFound } from "next/navigation";
import InvoiceClient from "@/app/(customer)/(protected)/orders/[orderId]/invoice/InvoiceClient";
import { getPlatformConfig } from "@/lib/config/platform-server";

export default async function AdminInvoicePage({ params }) {
    try {
        const { orderId } = await params;
        
        console.log(`[AdminInvoicePage] Fetching invoice for orderId: ${orderId}`);

        const adminSupabase = createAdminClient();

        // Fetch the order using admin client (bypasses RLS)
        const { data: order, error } = await adminSupabase
            .from("shopping_order_groups")
            .select(`
                *,
                shopping_order_items (
                    *,
                    shopping_products (
                        title, 
                        hsn_code, 
                        gst_percentage, 
                        mrp_paise, 
                        suggested_retail_price_paise
                    ),
                    merchants (
                        business_name, 
                        business_address, 
                        business_phone, 
                        gst_number
                    )
                )
            `)
            .eq("id", orderId)
            .single();

        if (error || !order) {
            console.error(`[AdminInvoicePage] Order not found for ID ${orderId}:`, error);
            return notFound();
        }

        console.log(`[AdminInvoicePage] Found order with ${order.shopping_order_items?.length} items. Processing seller details...`);

        // Determine the seller details
        let sellerDetails = null;
        if (order.is_platform_order) {
            // Platform products - Dynamic details from database
            const platformConfig = await getPlatformConfig();
            sellerDetails = platformConfig.business;
        } else {
            // Merchant Products
            const merchant = order.shopping_order_items?.[0]?.merchants;
            if (merchant) {
                sellerDetails = {
                    name: merchant.business_name || "Merchant",
                    address: merchant.business_address || "Address not provided",
                    phone: merchant.business_phone || "",
                    gstin: merchant.gst_number || "Unregistered",
                };
            }
        }

        return (
            <InvoiceClient 
                order={order} 
                items={order.shopping_order_items || []} 
                sellerDetails={sellerDetails} 
            />
        );
    } catch (err) {
        console.error("[AdminInvoicePage] CRASH:", err);
        return (
            <div className="p-10 text-center">
                <h1 className="text-2xl font-bold text-red-600 mb-4">Error Loading Invoice</h1>
                <p className="text-slate-600 mb-6">{err.message}</p>
                <div className="bg-slate-100 p-4 rounded text-left overflow-auto max-h-[400px]">
                    <pre className="text-xs">{err.stack}</pre>
                </div>
                <a 
                    href="/admin/shopping/orders" 
                    className="inline-block mt-8 px-6 py-2 bg-slate-800 text-white rounded font-bold"
                >
                    Back to Orders
                </a>
            </div>
        );
    }
}

