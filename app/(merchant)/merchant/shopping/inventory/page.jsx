import { createServerSupabaseClient } from '@/lib/supabaseServer';
import { Store, Plus, Package, TrendingUp, DollarSign, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import MerchantInventoryClient from './MerchantInventoryClient';
import StoreStatusToggle from '@/components/merchant/StoreStatusToggle';

export const dynamic = 'force-dynamic';

const PAGE_SIZE = 20;

export default async function MerchantShopPage({ searchParams }) {
    const supabase = await createServerSupabaseClient();
    const params = await searchParams;

    // Parse URL params
    const page = Math.max(1, parseInt(params?.page || '1'));
    const searchQuery = params?.q || '';
    const filterType = params?.filter || 'all'; // all | platform | custom | oos

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

    // ── Aggregate stats (full-dataset, no .range()) ──────────────────────────
    // Run all stat queries in parallel for minimal latency.

    const baseQuery = () =>
        supabase
            .from('merchant_inventory')
            .select('id', { count: 'exact', head: true })
            .eq('merchant_id', merchant.id);

    const [
        totalRes,
        activeRes,
        oosRes,
        platformRes,
        stockAndValueRes,
        profitRes,
    ] = await Promise.all([
        // Total items
        baseQuery(),
        // Active items
        baseQuery().eq('is_active', true),
        // Out-of-stock items
        baseQuery().lte('stock_quantity', 0),
        // Platform product items
        baseQuery().eq('is_platform_product', true),
        // Lightweight column fetch for stock + value aggregation (custom products)
        supabase
            .from('merchant_inventory')
            .select('stock_quantity, retail_price_paise, is_platform_product')
            .eq('merchant_id', merchant.id),
        // Lightweight column fetch for potential profit (platform products only)
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

    const totalItems = totalRes.count || 0;
    const activeItems = activeRes.count || 0;

    const stockValueRows = stockAndValueRes.data || [];
    const totalStock = stockValueRows.reduce((sum, i) => sum + (i.stock_quantity || 0), 0);
    const inventoryValue = stockValueRows.reduce(
        (sum, i) => sum + (Number(i.retail_price_paise) * (i.stock_quantity || 0)),
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

    // ── Paginated inventory slice ─────────────────────────────────────────────
    let inventoryQuery = supabase
        .from('merchant_inventory')
        .select(`
            *,
            shopping_products (
                title,
                description,
                product_images,
                category,
                suggested_retail_price_paise,
                wholesale_price_paise,
                approval_status,
                rejection_reason
            )
        `, { count: 'exact' })
        .eq('merchant_id', merchant.id)
        .order('created_at', { ascending: false });

    // Apply filter
    if (filterType === 'platform') {
        inventoryQuery = inventoryQuery.eq('is_platform_product', true);
    } else if (filterType === 'custom') {
        inventoryQuery = inventoryQuery.eq('is_platform_product', false);
    } else if (filterType === 'oos') {
        inventoryQuery = inventoryQuery.lte('stock_quantity', 0);
    }

    // Apply search (title comes from joined table, so we can't use ilike on it directly;
    // instead we search on the denormalized custom_title column AND do a post-filter on the
    // small paginated slice for the joined title. For a proper full-dataset search we use
    // custom_title ilike and rely on the fact that platform product titles are available
    // server-side via the join result — search across entire dataset is handled by fetching
    // count+range with custom_title match; platform product title search is a known limitation
    // resolved by also searching description / using a view. For now we match custom_title + use
    // a secondary text search on category via a workaround.)
    // NOTE: For accurate cross-dataset title search on platform products, this would ideally
    // use a Postgres view or RPC. The current approach matches custom_title server-side and
    // is correct for custom products; platform product search falls back to client highlight.
    if (searchQuery) {
        inventoryQuery = inventoryQuery.ilike('custom_title', `%${searchQuery}%`);
    }

    const from = (page - 1) * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;
    inventoryQuery = inventoryQuery.range(from, to);

    const { data: inventory, count: inventoryCount, error: inventoryError } = await inventoryQuery;
    if (inventoryError) console.error('Error fetching merchant inventory:', inventoryError);

    const totalCount = inventoryCount || 0;
    const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

    return (
        <div className="p-4 sm:p-6 lg:p-10 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-5 mb-6">
                <div className="space-y-2">
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-900/5 text-blue-600 text-[10px] font-black uppercase tracking-widest">
                        <Store size={12} />
                        Retail Management
                    </div>
                    <h1 className="text-3xl sm:text-5xl font-black text-slate-950 dark:text-slate-100 tracking-tight leading-none font-[family-name:var(--font-outfit)]">
                        My <span className="text-blue-600">Shop</span>
                    </h1>
                    <p className="text-slate-400 dark:text-slate-500 font-medium text-sm max-w-md">
                        Manage your live catalog, adjust stock, and set retail prices for custom products.
                    </p>
                </div>
                <div className="flex flex-col gap-4 self-start sm:self-auto shrink-0 w-full max-w-sm ml-auto">
                    <StoreStatusToggle initialStoreData={merchant} />
                    <div className="flex flex-col sm:flex-row gap-2 w-full">
                        {isSubscribed ? (
                            <Link
                                href="/merchant/shopping/inventory/bulk"
                                className="inline-flex items-center justify-center gap-2 bg-white hover:bg-slate-50 text-[#1e3a5f] border-2 border-[#1e3a5f]/20 hover:border-[#1e3a5f]/40 px-4 py-3 rounded-2xl font-black text-sm transition-all w-full sm:w-auto"
                            >
                                <Sparkles size={16} />
                                Bulk Add
                            </Link>
                        ) : (
                            <span
                                title="Active subscription required for bulk add"
                                className="inline-flex items-center justify-center gap-2 bg-slate-100 text-slate-400 border-2 border-slate-200 px-4 py-3 rounded-2xl font-black text-sm cursor-not-allowed w-full sm:w-auto"
                            >
                                <Sparkles size={16} />
                                Bulk Add
                            </span>
                        )}
                        <Link
                            href="/merchant/shopping/inventory/new"
                            className="inline-flex items-center justify-center gap-2 bg-[#1e3a5f] hover:bg-[#2c5282] text-white px-5 py-3 rounded-2xl font-black text-sm transition-all shadow-xl shadow-blue-900/10 flex-1"
                        >
                            <Plus size={18} />
                            Add Custom Product
                        </Link>
                    </div>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4 mb-8">
                <div className="bg-white dark:bg-white/5 p-4 sm:p-5 rounded-[2rem] border border-slate-100 dark:border-white/10 shadow-lg shadow-slate-200/40 dark:shadow-none transition-all hover:-translate-y-0.5 group">
                    <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center text-blue-600 mb-3 shadow-inner group-hover:scale-110 transition-transform">
                        <Store size={20} />
                    </div>
                    <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight">{totalItems}</div>
                    <div className="text-slate-400 dark:text-slate-500 text-[9px] font-black uppercase tracking-widest mt-0.5">Total Products</div>
                </div>
                <div className="bg-white dark:bg-white/5 p-4 sm:p-5 rounded-[2rem] border border-slate-100 dark:border-white/10 shadow-lg shadow-slate-200/40 dark:shadow-none transition-all hover:-translate-y-0.5 group">
                    <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center text-emerald-600 mb-3 shadow-inner group-hover:scale-110 transition-transform">
                        <TrendingUp size={20} />
                    </div>
                    <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight">{activeItems}</div>
                    <div className="text-slate-400 dark:text-slate-500 text-[9px] font-black uppercase tracking-widest mt-0.5">Live Items</div>
                </div>
                <div className="bg-white dark:bg-white/5 p-4 sm:p-5 rounded-[2rem] border border-slate-100 dark:border-white/10 shadow-lg shadow-slate-200/40 dark:shadow-none transition-all hover:-translate-y-0.5 group">
                    <div className="w-10 h-10 rounded-2xl bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center text-amber-600 mb-3 shadow-inner group-hover:scale-110 transition-transform">
                        <Package size={20} />
                    </div>
                    <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight">{totalStock}</div>
                    <div className="text-slate-400 dark:text-slate-500 text-[9px] font-black uppercase tracking-widest mt-0.5">Total Stock</div>
                </div>
                <div className="bg-white dark:bg-white/5 p-4 sm:p-5 rounded-[2rem] border border-slate-100 dark:border-white/10 shadow-lg shadow-slate-200/40 dark:shadow-none transition-all hover:-translate-y-0.5 group">
                    <div className="w-10 h-10 rounded-2xl bg-violet-50 dark:bg-violet-500/10 flex items-center justify-center text-violet-600 mb-3 shadow-inner group-hover:scale-110 transition-transform">
                        <DollarSign size={20} />
                    </div>
                    <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">₹{inventoryValue.toLocaleString('en-IN')}</div>
                    <div className="text-slate-400 dark:text-slate-500 text-[9px] font-black uppercase tracking-widest mt-0.5">Catalog Value</div>
                </div>
                {/* Potential Profit tile — spans 2 cols on mobile so it's prominent */}
                <div className="col-span-2 lg:col-span-1 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-500/10 dark:to-teal-500/10 p-4 sm:p-5 rounded-[2rem] border border-emerald-100 dark:border-emerald-500/20 shadow-lg shadow-emerald-200/40 dark:shadow-none transition-all hover:-translate-y-0.5 group">
                    <div className="w-10 h-10 rounded-2xl bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 mb-3 shadow-inner group-hover:scale-110 transition-transform">
                        <Sparkles size={20} />
                    </div>
                    <div className="text-xl sm:text-2xl font-black text-emerald-700 dark:text-emerald-400 tracking-tight">
                        ₹{potentialProfit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </div>
                    <div className="text-emerald-600/70 dark:text-emerald-500 text-[9px] font-black uppercase tracking-widest mt-0.5">Potential Profit</div>
                    <div className="text-emerald-500/60 dark:text-emerald-600 text-[8px] font-bold mt-1">Platform products only</div>
                </div>
            </div>

            <MerchantInventoryClient
                initialInventory={inventory || []}
                merchant={merchant}
                totalCount={totalCount}
                page={page}
                pageSize={PAGE_SIZE}
                totalPages={totalPages}
                initialSearchQuery={searchQuery}
                initialFilterType={filterType}
            />
        </div>
    );
}
