import { createServerSupabaseClient } from "@/lib/supabaseServer";
import { notFound } from "next/navigation";
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
                     ব্যবসা_address, 
                    business_phone, 
                    gstin
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
        // Platform products - Company details
        sellerDetails = {
            name: "InTrust Official",
            address: "123 Business Avenue, Tech Park, City, 400001",
            phone: "+91 9876543210",
            gstin: "22AAAAA0000A1Z5", // Example Company GSTIN
            pan: "AAAAA0000A"
        };
    } else {
        // Merchant Products
        const merchant = order.shopping_order_items?.[0]?.merchants;
        if (merchant) {
            sellerDetails = {
                name: merchant.business_name || "Merchant",
                address: merchant.business_address || "Address not provided",
                phone: merchant.business_phone || "",
                gstin: merchant.gstin || "Unregistered",
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
