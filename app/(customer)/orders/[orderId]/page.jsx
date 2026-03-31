import { createServerSupabaseClient } from "@/lib/supabaseServer";
import { notFound } from "next/navigation";
import OrderDetailsClient from "./OrderDetailsClient";
import Navbar from "@/components/layout/Navbar";
import CustomerBottomNav from "@/components/layout/customer/CustomerBottomNav";

export default async function OrderDetailsPage({ params }) {
    const { orderId } = await params;
    const supabase = await createServerSupabaseClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return notFound();

    const { data: order, error } = await supabase
        .from("shopping_order_groups")
        .select(`
            *,
            shopping_order_items (
                *,
                shopping_products (title, product_images, mrp_paise, suggested_retail_price_paise),
                merchants (business_name, business_address, business_phone, gst_number)
            )
        `)
        .eq("id", orderId)
        .eq("customer_id", user.id)
        .single();
    
    // Fetch customer profile for Navbar
    const { data: customerProfile } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', user.id)
        .single();

    if (error || !order) {
        console.error("Order not found:", error);
        return notFound();
    }

    return (
        <div className="min-h-screen bg-[#f7f8fa] dark:bg-[#080a10]">
            <Navbar customer={customerProfile} />
            <main>
                <OrderDetailsClient order={order} userId={user.id} customerProfile={customerProfile} />
            </main>
            <CustomerBottomNav />
        </div>
    );
}
