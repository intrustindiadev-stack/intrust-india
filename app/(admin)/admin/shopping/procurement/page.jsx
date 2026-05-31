import { redirect } from 'next/navigation';
import { createServerSupabaseClient, createAdminClient } from '@/lib/supabaseServer';
import ProcurementClient from './ProcurementClient';

export const dynamic = 'force-dynamic';

export const metadata = {
    title: 'Wholesale Procurement | InTrust Admin',
};

export default async function AdminProcurementPage() {
    // Auth check
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
        redirect('/login');
    }

    // Role check — mirrors history/page.jsx; guards against layout bypass
    const { data: profile } = await supabase
        .from('user_profiles')
        .select('role')
        .eq('id', user.id)
        .single();

    if (!['admin', 'super_admin'].includes(profile?.role)) {
        redirect('/dashboard');
    }

    const adminSupabase = createAdminClient();

    // Fetch live merchant-submitted products with their inventory and merchant details
    const { data: products, error } = await adminSupabase
        .from('shopping_products')
        .select(`
            id,
            title,
            hsn_code,
            gst_percentage,
            wholesale_price_paise,
            suggested_retail_price_paise,
            platform_listed,
            platform_price_paise,
            admin_stock,
            product_images,
            submitted_by_merchant_id,
            merchant_inventory (
                id,
                stock_quantity,
                retail_price_paise,
                is_platform_product,
                merchants (
                    id,
                    business_name,
                    status
                )
            ),
            shopping_categories (
                name
            )
        `)
        .not('submitted_by_merchant_id', 'is', null)
        .eq('approval_status', 'live')
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('[ProcurementPage] Error fetching products:', error);
    }

    return <ProcurementClient initialProducts={products || []} />;
}
