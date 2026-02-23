import { createServerSupabaseClient } from '@/lib/supabaseServer';
import { Package, TrendingUp, DollarSign } from 'lucide-react';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import InventoryTable from './InventoryTable';

export const dynamic = 'force-dynamic';

export default async function InventoryPage({ searchParams }) {
    const supabase = await createServerSupabaseClient();
    const params = await searchParams;

    // Get filter from URL
    const filter = params?.filter || 'all'; // all, listed, unlisted
    const page = parseInt(params?.page || '1');
    const limit = 20;

    // 1. Get User & Auth
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect('/login');
    }

    // 2. Get User Role & Merchant
    const { data: profile } = await supabase
        .from('user_profiles')
        .select('role')
        .eq('id', user.id)
        .single();

    let merchant = null;
    const isAdmin = false;

    // Merchant: Fetch own record
    const { data } = await supabase
        .from('merchants')
        .select('*')
        .eq('user_id', user.id)
        .single();
    merchant = data;

    if (!merchant) {
        redirect('/merchant-apply');
    }

    // 4. Fetch stats in parallel (using COUNT)
    const [totalRes, listedRes, unlistedRes, totalValueRes] = await Promise.all([
        supabase.from('coupons').select('*', { count: 'exact', head: true }).eq('merchant_id', merchant.id),

        supabase.from('coupons').select('*', { count: 'exact', head: true }).eq('merchant_id', merchant.id).eq('listed_on_marketplace', true),

        supabase.from('coupons').select('*', { count: 'exact', head: true }).eq('merchant_id', merchant.id).eq('listed_on_marketplace', false),

        // For total value, we need to actually fetch the prices
        supabase.from('coupons').select('merchant_purchase_price_paise').eq('merchant_id', merchant.id)
    ]);

    const stats = {
        total: totalRes.count || 0,
        listed: listedRes.count || 0,
        unlisted: unlistedRes.count || 0,
        totalValue: (totalValueRes.data || []).reduce((sum, c) => sum + Math.abs(c.merchant_purchase_price_paise || 0), 0) / 100,
    };

    // 5. Fetch paginated inventory based on filter
    let inventoryQuery = supabase
        .from('coupons')
        .select('*')
        .order('created_at', { ascending: false })
        .range((page - 1) * limit, page * limit - 1);

    if (merchant) {
        inventoryQuery = inventoryQuery.eq('merchant_id', merchant.id);
    }

    // Apply filter
    if (filter === 'listed') {
        inventoryQuery = inventoryQuery.eq('listed_on_marketplace', true);
    } else if (filter === 'unlisted') {
        inventoryQuery = inventoryQuery.eq('listed_on_marketplace', false);
    }

    const { data: rawInventory, error: inventoryError } = await inventoryQuery;

    if (inventoryError) {
        console.error('Inventory Fetch Error:', inventoryError);
    }

    console.log('Raw Inventory Count:', rawInventory?.length);
    console.log('First Item:', rawInventory?.[0]);

    // 6. Fetch stats for these coupons (Purchase Price) separately to avoid Join issues
    let transactions = [];
    if (rawInventory && rawInventory.length > 0) {
        const couponIds = rawInventory.map(c => c.id);
        const { data: txData } = await supabase
            .from('merchant_transactions')
            .select('amount_paise, commission_paise, coupon_id')
            .eq('transaction_type', 'purchase')
            .eq('merchant_id', merchant.id)
            .in('coupon_id', couponIds);

        if (txData) transactions = txData;
    }

    // Transform inventory to include purchase price from transactions
    const inventory = rawInventory?.map(item => {
        // Find the purchase transaction
        const purchaseTx = transactions.find(t => t.coupon_id === item.id);

        // Calculate values in Rupees and ensure they are positive
        const purchasePrice = purchaseTx
            ? Math.abs(purchaseTx.amount_paise / 100)
            : (item.merchant_purchase_price_paise ? Math.abs(item.merchant_purchase_price_paise / 100) : null);

        const commission = purchaseTx
            ? Math.abs(purchaseTx.commission_paise / 100)
            : (item.merchant_commission_paise ? Math.abs(item.merchant_commission_paise / 100) : null);

        return {
            ...item,
            purchase_price: purchasePrice, // Can be null
            commission: commission
        };
    });

    return (
        <div className="relative">
            {/* Background embellishments */}
            <div className="fixed top-[10%] left-[-10%] w-[50%] h-[50%] bg-blue-500/10 rounded-full blur-[120px] pointer-events-none -z-10"></div>
            <div className="fixed bottom-[-10%] right-[-5%] w-[40%] h-[40%] bg-[#D4AF37]/10 rounded-full blur-[120px] pointer-events-none -z-10"></div>

            <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 mt-6 gap-4">
                <div>
                    <h1 className="font-display text-4xl font-bold text-slate-800 dark:text-slate-100 mb-2">My Inventory</h1>
                    <p className="text-slate-500 dark:text-slate-400 font-medium">Manage your purchased coupons and marketplace listings</p>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8">
                <div className="merchant-glass rounded-3xl p-6 border border-black/5 dark:border-white/5 hover:border-[#D4AF37]/30 transition-all group overflow-hidden relative shadow-sm">
                    <div className="absolute -right-4 -bottom-4 w-20 h-20 bg-blue-500/10 rounded-full blur-xl group-hover:bg-blue-500/20 transition-all"></div>
                    <div className="flex items-start mb-4">
                        <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                            <span className="material-icons-round text-blue-500 dark:text-blue-400">inventory_2</span>
                        </div>
                    </div>
                    <div className="text-3xl font-bold font-display text-slate-800 dark:text-slate-100 mb-1">{stats.total}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">Total Coupons</div>
                </div>

                <div className="merchant-glass rounded-3xl p-6 border border-black/5 dark:border-white/5 hover:border-[#D4AF37]/30 transition-all group overflow-hidden relative shadow-sm">
                    <div className="absolute -right-4 -bottom-4 w-20 h-20 bg-emerald-500/10 rounded-full blur-xl group-hover:bg-emerald-500/20 transition-all"></div>
                    <div className="flex items-start mb-4">
                        <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                            <span className="material-icons-round text-emerald-500 dark:text-emerald-400">storefront</span>
                        </div>
                    </div>
                    <div className="text-3xl font-bold font-display text-slate-800 dark:text-slate-100 mb-1">{stats.listed}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">Listed on Market</div>
                </div>

                <div className="merchant-glass rounded-3xl p-6 border border-black/5 dark:border-white/5 hover:border-[#D4AF37]/30 transition-all group overflow-hidden relative shadow-sm">
                    <div className="absolute -right-4 -bottom-4 w-20 h-20 bg-slate-500/10 rounded-full blur-xl group-hover:bg-slate-500/20 transition-all"></div>
                    <div className="flex items-start mb-4">
                        <div className="w-10 h-10 rounded-xl bg-slate-500/10 border border-slate-500/20 flex items-center justify-center">
                            <span className="material-icons-round text-slate-500 dark:text-slate-400">inventory</span>
                        </div>
                    </div>
                    <div className="text-3xl font-bold font-display text-slate-800 dark:text-slate-100 mb-1">{stats.unlisted}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">Unlisted</div>
                </div>

                <div className="merchant-glass rounded-3xl p-6 border border-[#D4AF37]/20 hover:border-[#D4AF37]/50 transition-all group overflow-hidden relative bg-gradient-to-br from-[#D4AF37]/5 to-transparent dark:from-[#D4AF37]/10 dark:to-transparent shadow-sm">
                    <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-[#D4AF37]/10 rounded-full blur-2xl group-hover:bg-[#D4AF37]/20 transition-all"></div>
                    <div className="flex items-start mb-4">
                        <div className="w-10 h-10 rounded-xl bg-[#D4AF37]/10 border border-[#D4AF37]/30 flex items-center justify-center">
                            <span className="material-icons-round text-[#D4AF37]">payments</span>
                        </div>
                    </div>
                    <div className="text-3xl font-bold font-display text-[#D4AF37] mb-1">₹{stats.totalValue.toLocaleString('en-IN')}</div>
                    <div className="text-xs text-[#D4AF37]/70 font-bold uppercase tracking-wider">Total Investment</div>
                </div>
            </div>

            {/* Filter Tabs */}
            <div className="flex gap-3 mb-6 bg-black/5 dark:bg-white/5 p-1 rounded-2xl w-fit border border-black/5 dark:border-white/5 shadow-sm">
                <Link
                    href="/merchant/inventory?filter=all"
                    className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all focus:outline-none flex items-center space-x-2 ${filter === 'all'
                        ? 'bg-[#D4AF37] text-[#020617] shadow-lg shadow-[#D4AF37]/20 gold-glow'
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5'
                        }`}
                >
                    <span className="material-icons-round text-sm">dashboard</span>
                    <span>All ({stats.total})</span>
                </Link>
                <Link
                    href="/merchant/inventory?filter=listed"
                    className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all focus:outline-none flex items-center space-x-2 ${filter === 'listed'
                        ? 'bg-[#D4AF37] text-[#020617] shadow-lg shadow-[#D4AF37]/20 gold-glow'
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5'
                        }`}
                >
                    <span className="material-icons-round text-sm">storefront</span>
                    <span>Listed ({stats.listed})</span>
                </Link>
                <Link
                    href="/merchant/inventory?filter=unlisted"
                    className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all focus:outline-none flex items-center space-x-2 ${filter === 'unlisted'
                        ? 'bg-[#D4AF37] text-[#020617] shadow-lg shadow-[#D4AF37]/20 gold-glow'
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5'
                        }`}
                >
                    <span className="material-icons-round text-sm">visibility_off</span>
                    <span>Unlisted ({stats.unlisted})</span>
                </Link>
            </div>

            {/* Inventory Table Container */}
            <div className="merchant-glass rounded-3xl border border-black/5 dark:border-white/5 overflow-hidden shadow-sm">
                <InventoryTable initialCoupons={inventory || []} isAdmin={isAdmin} />

                {/* Empty State */}
                {(!inventory || inventory.length === 0) && (
                    <div className="text-center py-20 px-4">
                        <div className="w-20 h-20 bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10 rounded-full flex items-center justify-center mx-auto mb-6">
                            <span className="material-icons-round text-4xl text-slate-400 dark:text-slate-500">inventory_2</span>
                        </div>
                        <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-2">
                            {filter === 'all' ? 'Inventory is empty' : `No ${filter} coupons found`}
                        </h3>
                        <p className="text-slate-500 dark:text-slate-400 mb-8 max-w-sm mx-auto">
                            It looks like you don't have any coupons matching this criteria. Purchase new coupons from the wholesale market or browse other filters.
                        </p>
                        {filter === 'all' && (
                            <Link
                                href="/merchant/purchase"
                                className="inline-flex items-center space-x-2 px-8 py-4 bg-[#D4AF37] text-[#020617] font-bold rounded-xl hover:bg-opacity-90 transition-all gold-glow"
                            >
                                <span className="material-icons-round text-sm">add_shopping_cart</span>
                                <span>Purchase Coupons</span>
                            </Link>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
