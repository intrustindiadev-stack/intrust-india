import { createServerSupabaseClient } from "@/lib/supabaseServer";
import { notFound } from "next/navigation";
import { isValidUUID } from "@/lib/utils";
import OrderDetailsClient from "./OrderDetailsClient";
import Navbar from "@/components/layout/Navbar";

export default async function OrderDetailsPage({ params }) {
    const { orderId } = await params;
    if (!isValidUUID(orderId)) return notFound();
    const supabase = await createServerSupabaseClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return notFound();

    let orderData = null;
    let orderType = null;

    // 1. Try Shopping
    const { data: shoppingOrder, error: shoppingError } = await supabase
        .from("shopping_order_groups")
        .select(`
            *,
            merchant_ratings (rating_value),
            shopping_order_items (
                *,
                shopping_products (title, product_images, mrp_paise, suggested_retail_price_paise, gst_percentage, hsn_code),
                merchants (business_name, business_address, business_phone, gst_number)
            )
        `)
        .eq("id", orderId)
        .eq("customer_id", user.id)
        .maybeSingle();

    if (shoppingOrder) {
        orderData = shoppingOrder;
        orderType = 'shopping';
    } else {
        // 2. Try NFC
        const { data: nfcOrder } = await supabase
            .from("nfc_orders")
            .select(`*`)
            .eq("id", orderId)
            .eq("user_id", user.id)
            .maybeSingle();

        if (nfcOrder) {
            orderData = nfcOrder;
            orderType = 'nfc';
        } else {
            // 3. Try Gift Card (from orders table which links to coupons)
            const { data: gcOrder } = await supabase
                .from("orders")
                .select(`
                    id, amount, created_at, payment_method, payment_status,
                    coupons:coupons!orders_giftcard_id_fkey(
                        id, brand, title, selling_price_paise, face_value_paise, status, purchased_at, valid_until, merchant_id,
                        merchant:merchants(business_name, business_address, business_phone, gst_number)
                    )
                `)
                .eq("id", orderId)
                .eq("user_id", user.id)
                .maybeSingle();
            
            if (gcOrder && gcOrder.coupons) {
                orderData = gcOrder;
                orderType = 'giftcard';
            } else {
                // Check udhari requests for giftcards
                const { data: udhariOrder } = await supabase
                    .from("udhari_requests")
                    .select(`
                        id, amount_paise, created_at, status, due_date,
                        coupons:coupons!udhari_requests_coupon_id_fkey(
                            id, brand, title, selling_price_paise, face_value_paise, status, valid_until, merchant_id,
                            merchant:merchants(business_name, business_address, business_phone, gst_number)
                        )
                    `)
                    .eq("id", orderId)
                    .eq("customer_id", user.id)
                    .maybeSingle();
                
                if (udhariOrder && udhariOrder.coupons) {
                    orderData = udhariOrder;
                    orderType = 'udhari_giftcard';
                } else {
                    // 4. Try Solar Leads
                    const { data: solarOrder } = await supabase
                        .from("solar_leads")
                        .select(`*`)
                        .eq("id", orderId)
                        .eq("user_id", user.id)
                        .maybeSingle();

                    if (solarOrder) {
                        orderData = solarOrder;
                        orderType = 'solar';
                    }
                }
            }
        }
    }

    // Fetch customer profile for Navbar
    const { data: customerProfile } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', user.id)
        .single();

    if (!orderData) {
        console.error("Order not found across all types.");
        return notFound();
    }

    return (
        <div className="min-h-screen bg-[#f7f8fa] dark:bg-[#080a10]">
            <Navbar customer={customerProfile} />
            <main>
                <OrderDetailsClient order={orderData} orderType={orderType} userId={user.id} customerProfile={customerProfile} />
            </main>
            
        </div>
    );
}
