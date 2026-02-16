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
    const isAdmin = profile?.role === 'admin';

    if (isAdmin) {
        // Admin: Fetch the most recent merchant (consistent with layout)
        const { data } = await supabase
            .from('merchants')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(1)
            .single();
        merchant = data;
    } else {
        // Merchant: Fetch own record
        const { data } = await supabase
            .from('merchants')
            .select('*')
            .eq('user_id', user.id)
            .single();
        merchant = data;
    }

    if (!isAdmin && !merchant) {
        redirect('/merchant-apply');
    }

    // 3. Build base query
    let baseFilter = supabase.from('coupons');

    if (!isAdmin && merchant) {
        // Apply merchant filter for non-admins
        baseFilter = baseFilter.eq('merchant_id', merchant.id);
    }

    // 4. Fetch stats in parallel (using COUNT)
    const [totalRes, listedRes, unlistedRes, totalValueRes] = await Promise.all([
<<<<<<< HEAD
        supabase.from('coupons').select('*', { count: 'exact', head: true }).eq('merchant_id', merchant.id),

        supabase.from('coupons').select('*', { count: 'exact', head: true }).eq('merchant_id', merchant.id).eq('listed_on_marketplace', true),

        supabase.from('coupons').select('*', { count: 'exact', head: true }).eq('merchant_id', merchant.id).eq('listed_on_marketplace', false),

        // For total value, we need to actually fetch the prices
        supabase.from('coupons').select('merchant_purchase_price_paise').eq('merchant_id', merchant.id)
=======
        isAdmin
            ? supabase.from('coupons').select('*', { count: 'exact', head: true })
            : supabase.from('coupons').select('*', { count: 'exact', head: true }).eq('merchant_id', merchant.id),

        isAdmin
            ? supabase.from('coupons').select('*', { count: 'exact', head: true }).eq('listed_on_marketplace', true)
            : supabase.from('coupons').select('*', { count: 'exact', head: true }).eq('merchant_id', merchant.id).eq('listed_on_marketplace', true),

        isAdmin
            ? supabase.from('coupons').select('*', { count: 'exact', head: true }).eq('listed_on_marketplace', false)
            : supabase.from('coupons').select('*', { count: 'exact', head: true }).eq('merchant_id', merchant.id).eq('listed_on_marketplace', false),

        // For total value, we need to actually fetch the prices
        isAdmin
            ? supabase.from('coupons').select('merchant_purchase_price_paise')
            : supabase.from('coupons').select('merchant_purchase_price_paise').eq('merchant_id', merchant.id)
>>>>>>> origin/yogesh
    ]);

    const stats = {
        total: totalRes.count || 0,
        listed: listedRes.count || 0,
        unlisted: unlistedRes.count || 0,
        totalValue: (totalValueRes.data || []).reduce((sum, c) => sum + (c.merchant_purchase_price_paise || 0), 0) / 100,
    };

    // 5. Fetch paginated inventory based on filter
    let inventoryQuery = supabase
        .from('coupons')
        .select('*')
        .order('created_at', { ascending: false })
        .range((page - 1) * limit, page * limit - 1);

<<<<<<< HEAD
    if (merchant) {
=======
    if (!isAdmin && merchant) {
>>>>>>> origin/yogesh
        inventoryQuery = inventoryQuery.eq('merchant_id', merchant.id);
    }

    // Apply filter
    if (filter === 'listed') {
        inventoryQuery = inventoryQuery.eq('listed_on_marketplace', true);
    } else if (filter === 'unlisted') {
        inventoryQuery = inventoryQuery.eq('listed_on_marketplace', false);
    }

<<<<<<< HEAD
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

        // Calculate values in Rupees
        const purchasePrice = purchaseTx
            ? purchaseTx.amount_paise / 100
            : (item.merchant_purchase_price_paise ? item.merchant_purchase_price_paise / 100 : null);

        const commission = purchaseTx
            ? purchaseTx.commission_paise / 100
            : (item.merchant_commission_paise ? item.merchant_commission_paise / 100 : null);

        return {
            ...item,
            purchase_price: purchasePrice, // Can be null
            commission: commission
        };
    });
=======
    const { data: inventory } = await inventoryQuery;
>>>>>>> origin/yogesh

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
            <div className="pt-24 pb-12">
                <div className="max-w-7xl mx-auto px-4 sm:px-6">
                    {/* Header */}
                    <div className="mb-6 sm:mb-8">
                        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2 font-[family-name:var(--font-outfit)]">
                            My Inventory
                        </h1>
                        <p className="text-sm sm:text-base text-gray-600">Manage your purchased coupons and marketplace listings</p>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 mb-6 sm:mb-8">
                        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
                            <div className="flex items-start justify-between mb-4">
                                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                                    <Package className="text-white" size={24} />
                                </div>
                            </div>
                            <div className="text-3xl font-bold text-gray-900 mb-1">{stats.total}</div>
                            <div className="text-sm text-gray-600">Total Coupons</div>
                        </div>

                        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
                            <div className="flex items-start justify-between mb-4">
                                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center">
                                    <TrendingUp className="text-white" size={24} />
                                </div>
                            </div>
                            <div className="text-3xl font-bold text-gray-900 mb-1">{stats.listed}</div>
                            <div className="text-sm text-gray-600">Listed on Marketplace</div>
                        </div>

                        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
                            <div className="flex items-start justify-between mb-4">
                                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center">
                                    <Package className="text-white" size={24} />
                                </div>
                            </div>
                            <div className="text-3xl font-bold text-gray-900 mb-1">{stats.unlisted}</div>
                            <div className="text-sm text-gray-600">Unlisted</div>
                        </div>

                        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
                            <div className="flex items-start justify-between mb-4">
                                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                                    <DollarSign className="text-white" size={24} />
                                </div>
                            </div>
                            <div className="text-3xl font-bold text-gray-900 mb-1">₹{stats.totalValue.toLocaleString()}</div>
                            <div className="text-sm text-gray-600">Total Investment</div>
                        </div>
                    </div>

                    {/* Filter Tabs */}
                    <div className="flex gap-2 mb-6">
                        <Link
                            href="/merchant/inventory?filter=all"
<<<<<<< HEAD
                            className={`px-4 py - 2 rounded - lg font - semibold transition - all ${filter === 'all'
                                ? 'bg-[#92BCEA] text-white'
                                : 'bg-white text-gray-600 hover:bg-gray-50'
                                } `}
=======
                            className={`px-4 py-2 rounded-lg font-semibold transition-all ${filter === 'all'
                                ? 'bg-[#92BCEA] text-white'
                                : 'bg-white text-gray-600 hover:bg-gray-50'
                                }`}
>>>>>>> origin/yogesh
                        >
                            All ({stats.total})
                        </Link>
                        <Link
                            href="/merchant/inventory?filter=listed"
<<<<<<< HEAD
                            className={`px - 4 py - 2 rounded - lg font - semibold transition - all ${filter === 'listed'
                                ? 'bg-[#92BCEA] text-white'
                                : 'bg-white text-gray-600 hover:bg-gray-50'
                                } `}
=======
                            className={`px-4 py-2 rounded-lg font-semibold transition-all ${filter === 'listed'
                                ? 'bg-[#92BCEA] text-white'
                                : 'bg-white text-gray-600 hover:bg-gray-50'
                                }`}
>>>>>>> origin/yogesh
                        >
                            Listed ({stats.listed})
                        </Link>
                        <Link
                            href="/merchant/inventory?filter=unlisted"
<<<<<<< HEAD
                            className={`px - 4 py - 2 rounded - lg font - semibold transition - all ${filter === 'unlisted'
                                ? 'bg-[#92BCEA] text-white'
                                : 'bg-white text-gray-600 hover:bg-gray-50'
                                } `}
=======
                            className={`px-4 py-2 rounded-lg font-semibold transition-all ${filter === 'unlisted'
                                ? 'bg-[#92BCEA] text-white'
                                : 'bg-white text-gray-600 hover:bg-gray-50'
                                }`}
>>>>>>> origin/yogesh
                        >
                            Unlisted ({stats.unlisted})
                        </Link>
                    </div>

                    {/* Inventory Table */}
                    <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
                        <InventoryTable initialCoupons={inventory || []} isAdmin={isAdmin} />

                        {/* Empty State */}
                        {(!inventory || inventory.length === 0) && (
                            <div className="text-center py-16">
                                <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                                <p className="text-gray-600 mb-4">
                                    {filter === 'all' ? 'No coupons in inventory' : `No ${filter} coupons`}
                                </p>
                                {filter === 'all' && (
                                    <Link
                                        href="/merchant/purchase"
                                        className="inline-block px-6 py-3 bg-gradient-to-r from-[#92BCEA] to-[#AFB3F7] text-white font-bold rounded-xl hover:shadow-lg transition-all"
                                    >
                                        Purchase Coupons
                                    </Link>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
