import { createServerSupabaseClient } from "@/lib/supabaseServer";
import { notFound } from "next/navigation";
import { PLATFORM_CONFIG } from "@/lib/config/platform";
import { getPlatformConfig } from "@/lib/config/platform-server";
import InvoiceClient from "./InvoiceClient";

export default async function InvoicePage({ params }) {
    const { orderId } = await params;
    const supabase = await createServerSupabaseClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return notFound();

    // Fetch the order
    const { data: order, error } = await supabase
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
        .eq("customer_id", user.id)
        .single();

    if (error || !order) {
        console.error("Order not found for invoice:", error);
        return notFound();
    }

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
}
