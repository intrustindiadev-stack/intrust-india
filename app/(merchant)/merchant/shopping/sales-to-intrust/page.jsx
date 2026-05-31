import { createServerSupabaseClient } from "@/lib/supabaseServer";
import { redirect } from "next/navigation";
import SalesToIntrustClient from "./SalesToIntrustClient";

export const dynamic = "force-dynamic";

export default async function SalesToIntrustPage() {
    const supabase = await createServerSupabaseClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) redirect('/login');

    const { data: merchant } = await supabase
        .from('merchants')
        .select('*')
        .eq('user_id', user.id)
        .single();

    if (!merchant) redirect('/dashboard');

    const { data: orders, error } = await supabase
        .from('platform_procurement_orders')
        .select(`
            *,
            platform_procurement_items (
                *,
                shopping_products:product_id ( title, hsn_code, gst_percentage )
            )
        `)
        .eq('merchant_id', merchant.id)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching sales to intrust:', error);
    }

    return <SalesToIntrustClient initialOrders={orders || []} merchant={merchant} />;
}
