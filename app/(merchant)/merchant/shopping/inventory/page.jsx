import { createServerSupabaseClient } from '@/lib/supabaseServer';
import { redirect } from 'next/navigation';
import MerchantInventoryClient from './MerchantInventoryClient';

export const dynamic = 'force-dynamic';

const PAGE_SIZE = 10;

export default async function MerchantShopPage({ searchParams }) {
    const supabase = await createServerSupabaseClient();
    const params = await searchParams;

    // Parse URL params
    const page = Math.max(1, parseInt(params?.page || '1'));
    const searchQuery = params?.q || '';
    const filterType = params?.filter || 'all'; // all | live | draft | oos | low_stock | platform | custom
    const categoryFilter = params?.category || 'all';
    const sortBy = params?.sort || 'newest';

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    // Get Merchant record
    const { data: merchant, error: merchantError } = await supabase
        .from('merchants')
        .select('*')
        .eq('user_id', user.id)
        .single();

    if (merchantError || !merchant) {
        redirect('/merchant-status');
    }

    // Compute subscription state for gating paid features (e.g. Bulk Add)
    const now = new Date();
    const isSubscribed =
        merchant.subscription_status === 'active' &&
        merchant.subscription_expires_at &&
        new Date(merchant.subscription_expires_at) > now;

    // ── 1. Fetch lightweight aggregation data & categories in parallel ─────────
    const [statsRes, categoriesRes, profitRes] = await Promise.all([
        supabase
            .from('merchant_inventory')
            .select('id, stock_quantity, retail_price_paise, is_active, is_platform_product')
            .eq('merchant_id', merchant.id),
        supabase
            .from('shopping_categories')
            .select('name')
            .eq('is_active', true)
            .order('display_order', { ascending: true }),
        supabase
            .from('merchant_inventory')
            .select(`
                stock_quantity,
                is_platform_product,
                shopping_products (
                    wholesale_price_paise,
                    suggested_retail_price_paise
                )
            `)
            .eq('merchant_id', merchant.id)
            .eq('is_platform_product', true),
    ]);

    const inventoryRows = statsRes.data || [];
    const categories = (categoriesRes.data || []).map(c => c.name);

    // Compute authoritative metrics
    const totalItems = inventoryRows.length;
    const activeItems = inventoryRows.filter(i => i.is_active).length;
    const draftItems = inventoryRows.filter(i => !i.is_active).length;
    const oosItems = inventoryRows.filter(i => (i.stock_quantity || 0) <= 0).length;
    const lowStockItems = inventoryRows.filter(i => (i.stock_quantity || 0) > 0 && (i.stock_quantity || 0) <= 5).length;
    const platformItems = inventoryRows.filter(i => i.is_platform_product).length;
    const customItems = inventoryRows.filter(i => !i.is_platform_product).length;

    const totalStock = inventoryRows.reduce((sum, i) => sum + (i.stock_quantity || 0), 0);
    const catalogValue = inventoryRows.reduce(
        (sum, i) => sum + (Number(i.retail_price_paise || 0) * (i.stock_quantity || 0)),
        0
    ) / 100;

    const profitRows = profitRes.data || [];
    const potentialProfit = profitRows.reduce((sum, i) => {
        if (i.shopping_products) {
            const profitPerUnit =
                (i.shopping_products.suggested_retail_price_paise || 0) -
                (i.shopping_products.wholesale_price_paise || 0);
            return sum + profitPerUnit * (i.stock_quantity || 0);
        }
        return sum;
    }, 0) / 100;

    const tabCounts = {
        all: totalItems,
        live: activeItems,
        draft: draftItems,
        oos: oosItems,
        low_stock: lowStockItems,
        platform: platformItems,
        custom: customItems,
    };

    const initialKpiStats = {
        totalProducts: totalItems,
        liveItems: activeItems,
        outOfStock: oosItems,
        totalStock: totalStock,
        catalogValue: catalogValue,
        potentialProfit: potentialProfit,
    };

    // ── 2. Paginated inventory slice query with filters & sorting ──────────────
    const needsInnerJoin = categoryFilter && categoryFilter !== 'all';
    const embedClause = needsInnerJoin
        ? `
            *,
            shopping_products!inner (
                id,
                title,
                description,
                product_images,
                category,
                suggested_retail_price_paise,
                wholesale_price_paise,
                approval_status,
                rejection_reason,
                hsn_code
            )
        `
        : `
            *,
            shopping_products (
                id,
                title,
                description,
                product_images,
                category,
                suggested_retail_price_paise,
                wholesale_price_paise,
                approval_status,
                rejection_reason,
                hsn_code
            )
        `;

    let inventoryQuery = supabase
        .from('merchant_inventory')
        .select(embedClause, { count: 'exact' })
        .eq('merchant_id', merchant.id);

    // Apply status / type filter
    if (filterType === 'live') {
        inventoryQuery = inventoryQuery.eq('is_active', true);
    } else if (filterType === 'draft') {
        inventoryQuery = inventoryQuery.eq('is_active', false);
    } else if (filterType === 'oos') {
        inventoryQuery = inventoryQuery.lte('stock_quantity', 0);
    } else if (filterType === 'low_stock') {
        inventoryQuery = inventoryQuery.gt('stock_quantity', 0).lte('stock_quantity', 5);
    } else if (filterType === 'platform') {
        inventoryQuery = inventoryQuery.eq('is_platform_product', true);
    } else if (filterType === 'custom') {
        inventoryQuery = inventoryQuery.eq('is_platform_product', false);
    }

    // Apply category filter if selected
    if (categoryFilter && categoryFilter !== 'all') {
        inventoryQuery = inventoryQuery.eq('shopping_products.category', categoryFilter);
    }

    // Apply search query
    if (searchQuery) {
        inventoryQuery = inventoryQuery.ilike('custom_title', `%${searchQuery}%`);
    }

    // Apply sorting
    if (sortBy === 'oldest') {
        inventoryQuery = inventoryQuery.order('created_at', { ascending: true });
    } else if (sortBy === 'price_asc') {
        inventoryQuery = inventoryQuery.order('retail_price_paise', { ascending: true });
    } else if (sortBy === 'price_desc') {
        inventoryQuery = inventoryQuery.order('retail_price_paise', { ascending: false });
    } else if (sortBy === 'stock_asc') {
        inventoryQuery = inventoryQuery.order('stock_quantity', { ascending: true });
    } else if (sortBy === 'stock_desc') {
        inventoryQuery = inventoryQuery.order('stock_quantity', { ascending: false });
    } else {
        // default: newest first
        inventoryQuery = inventoryQuery.order('created_at', { ascending: false });
    }

    // Paginate slice
    const from = (page - 1) * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;
    inventoryQuery = inventoryQuery.range(from, to);

    const { data: inventory, count: inventoryCount, error: inventoryError } = await inventoryQuery;
    if (inventoryError) {
        console.error('Error fetching merchant inventory:', inventoryError);
    }

    const totalCount = inventoryCount || 0;
    const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

    return (
        <div className="p-4 sm:p-6 lg:p-10 max-w-7xl mx-auto">
            <MerchantInventoryClient
                initialInventory={inventory || []}
                merchant={merchant}
                isSubscribed={isSubscribed}
                totalCount={totalCount}
                page={page}
                pageSize={PAGE_SIZE}
                totalPages={totalPages}
                initialSearchQuery={searchQuery}
                initialFilterType={filterType}
                initialCategory={categoryFilter}
                initialSortBy={sortBy}
                categories={categories}
                initialKpiStats={initialKpiStats}
                tabCounts={tabCounts}
            />
        </div>
    );
}
