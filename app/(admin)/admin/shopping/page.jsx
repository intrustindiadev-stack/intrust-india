import { createServerSupabaseClient } from '@/lib/supabaseServer';
import { redirect } from 'next/navigation';
import AdminShoppingClient from './AdminShoppingClient';

export const dynamic = 'force-dynamic';

export default async function AdminShoppingPage() {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    // Fetch ALL products (platform + custom/merchant)
    const { data: products, error } = await supabase
        .from('shopping_products')
        .select(`
            *,
            shopping_categories (name),
            merchant_inventory (
                merchant_id,
                is_platform_product,
                merchants (id, business_name)
            )
        `)
        .order('created_at', { ascending: false });

    if (error) console.error('Error fetching products:', error);

    // Fetch all orders for quick stats
    const { data: orderStats } = await supabase
        .from('shopping_order_groups')
        .select('id, delivery_status, total_amount_paise, is_platform_order', { count: 'exact' });

    const stats = {
        totalProducts: products?.length || 0,
        platformProducts: products?.filter(p => !p.merchant_inventory?.some(inv => inv.is_platform_product === false)).length || 0,
        customProducts: products?.filter(p => p.merchant_inventory?.some(inv => inv.is_platform_product === false)).length || 0,
        activeProducts: products?.filter(p => p.is_active).length || 0,
        totalOrders: orderStats?.length || 0,
        pendingOrders: orderStats?.filter(o => o.delivery_status === 'pending').length || 0,
        totalRevenue: orderStats?.reduce((sum, o) => sum + (o.total_amount_paise || 0), 0) || 0,
    };

    return <AdminShoppingClient products={products || []} stats={stats} initialOrders={orderStats || []} />;
}
