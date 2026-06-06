import { createServerSupabaseClient, createAdminClient } from '@/lib/supabaseServer';
import { redirect } from 'next/navigation';
import AdminShoppingClient from './AdminShoppingClient';

export const dynamic = 'force-dynamic';

export default async function AdminShoppingPage() {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    // Use admin client so RLS doesn't block shopping_order_groups
    const adminSupabase = createAdminClient();

    // 1. Fetch Stats via cap-proof RPC
    const { data: statsData, error: statsError } = await adminSupabase.rpc('get_admin_shopping_stats');
    if (statsError) console.error('[AdminShopping] stats error:', statsError);
    const dbStats = statsData?.[0] || {};

    const stats = {
        totalProducts: Number(dbStats.total_products || 0),
        platformProducts: Number(dbStats.platform_products || 0),
        customProducts: Number(dbStats.custom_products || 0),
        activeProducts: Number(dbStats.active_products || 0),
        totalOrders: Number(dbStats.total_orders || 0),
        pendingOrders: Number(dbStats.pending_orders || 0),
        totalRevenue: Number(dbStats.total_revenue || 0),
    };

    const pendingApprovals = Number(dbStats.pending_approvals || 0);

    // 2. Fetch merchant custom product counts via RPC
    const { data: countsData, error: countsError } = await adminSupabase.rpc('get_admin_merchant_custom_counts');
    if (countsError) console.error('[AdminShopping] merchant counts error:', countsError);
    
    const merchantCounts = {};
    countsData?.forEach(row => {
        merchantCounts[row.merchant_id] = Number(row.custom_count || 0);
    });

    // 3. Fetch ONLY the first page of products (platform products initially, active tab)
    const { data: initialProducts, count: totalCount, error: productsError } = await adminSupabase
        .from('admin_shopping_products_v')
        .select(`
            *,
            shopping_categories (name),
            merchant_inventory (
                id,
                is_active,
                stock_quantity,
                is_platform_product,
                merchant_id,
                retail_price_paise,
                merchants (id, business_name)
            )
        `, { count: 'exact' })
        .is('deleted_at', null)
        .eq('is_custom', false)
        .order('created_at', { ascending: false })
        .order('id', { ascending: false })
        .range(0, 19);

    if (productsError) console.error('[AdminShopping] products error:', productsError.message);

    // Fetch approved merchants to allow admin to assign custom products
    const { data: merchants, error: merchantsError } = await adminSupabase
        .from('merchants')
        .select('id, business_name, user_id')
        .eq('status', 'approved')
        .order('business_name', { ascending: true });

    if (merchantsError) console.error('[AdminShopping] merchants error:', merchantsError.message);

    // Fetch active categories as objects (id + name) for the category filter dropdown
    const { data: dbCategories, error: categoriesError } = await adminSupabase
        .from('shopping_categories')
        .select('id, name')
        .eq('is_active', true)
        .order('display_order', { ascending: true })
        .order('name', { ascending: true });

    if (categoriesError) console.error('[AdminShopping] categories error:', categoriesError.message);
    const categories = dbCategories || [];

    return <AdminShoppingClient 
        initialProducts={initialProducts || []} 
        totalCount={totalCount || 0}
        stats={stats} 
        merchantCounts={merchantCounts}
        pendingApprovals={pendingApprovals} 
        merchants={merchants || []}
        categories={categories}
    />;
}

