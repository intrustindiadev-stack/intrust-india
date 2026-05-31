import { createServerSupabaseClient, createAdminClient } from "@/lib/supabaseServer";
import { redirect } from "next/navigation";
import ProcurementHistoryClient from "./ProcurementHistoryClient";

export const dynamic = "force-dynamic";

export default async function ProcurementHistoryPage() {
    const supabase = await createServerSupabaseClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) redirect('/login');

    const { data: profile } = await supabase
        .from('user_profiles')
        .select('role')
        .eq('id', user.id)
        .single();

    if (!['admin', 'super_admin'].includes(profile?.role)) {
        redirect('/dashboard');
    }

    const adminSupabase = createAdminClient();

    // Query platform_procurement_orders, join with items, products and merchants
    const { data: orders, error } = await adminSupabase
        .from('platform_procurement_orders')
        .select(`
            *,
            merchants:merchant_id ( id, business_name, business_address, gst_number ),
            platform_procurement_items (
                *,
                shopping_products:product_id ( title, hsn_code, gst_percentage )
            )
        `)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching procurement history:', error);
    }

    return <ProcurementHistoryClient initialOrders={orders || []} />;
}
