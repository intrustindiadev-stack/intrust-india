import { createServerSupabaseClient, createAdminClient } from '@/lib/supabaseServer';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import StatsCards from '@/components/merchant/StatsCards';
import TransactionsTable from '@/components/merchant/TransactionsTable';
import MerchantAdBannerCarousel from '@/components/merchant/MerchantAdBannerCarousel';
import LiveButton from '@/components/merchant/LiveButton';
import AutoModePromo from '@/components/merchant/AutoModePromo';
import StoreStatusToggle from '@/components/merchant/StoreStatusToggle';
import WelcomeCard from '@/components/merchant/WelcomeCard';

export const dynamic = 'force-dynamic';

export default async function MerchantDashboardPage() {
    const supabase = await createServerSupabaseClient();

    // 1. Get User
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect('/login');
    }

    // 2. Get Merchant Profile & Role
    const { data: profile } = await supabase
        .from('user_profiles')
        .select('role')
        .eq('id', user.id)
        .single();

    let merchant = null;

    const { data: merchantData } = await supabase
        .from('merchants')
        .select('id, user_id, business_name, status, wallet_balance_paise, total_commission_paid_paise, subscription_status, subscription_expires_at, auto_mode, is_open, auto_mode_status, auto_mode_valid_until')
        .eq('user_id', user.id)
        .single();

    merchant = merchantData;

    if (!merchant) {
        redirect('/merchant-apply');
    }

    if (merchant.status === 'pending') redirect('/merchant-status/pending');
    if (merchant.status === 'rejected') redirect('/merchant-status/rejected');
    if (merchant.status === 'suspended') redirect('/merchant-status/suspended');

    // Comment 3: Use admin client for data queries to bypass RLS on shopping_order_items.
    // Merchant identity has already been verified above via the authenticated client.
    const adminDb = createAdminClient();

    // 3. Fetch all data in a single parallel batch
    const [
        couponsRes,
        soldCouponsRes,
        activeCountRes,
        listedCountRes,
        soldCountRes,
        pendingUdhariRes,
        lockinRes,
        shoppingOrderItemsRes,
        wholesaleOrdersRes,
        pendingOrdersCountRes
    ] = await Promise.all([
        supabase
            .from('coupons')
            .select('*')
            .eq('merchant_id', merchant.id)
            .eq('is_merchant_owned', true)
            .order('created_at', { ascending: false })
            .limit(10),

        supabase
            .from('coupons')
            .select('merchant_selling_price_paise, merchant_purchase_price_paise, merchant_commission_paise')
            .eq('merchant_id', merchant.id)
            .eq('status', 'sold'),

        supabase.from('coupons').select('*', { count: 'exact', head: true }).eq('merchant_id', merchant.id).eq('status', 'available'),
        supabase.from('coupons').select('*', { count: 'exact', head: true }).eq('merchant_id', merchant.id).eq('listed_on_marketplace', true),
        supabase.from('coupons').select('*', { count: 'exact', head: true }).eq('merchant_id', merchant.id).eq('status', 'sold'),
        supabase.from('udhari_requests').select('*', { count: 'exact', head: true }).eq('merchant_id', merchant.id).eq('status', 'pending'),
        supabase.from('merchant_lockin_balances').select('amount_paise').eq('merchant_id', merchant.id).eq('status', 'active'),
        adminDb.from('shopping_order_items').select('unit_price_paise, quantity').eq('seller_id', merchant.id),
        adminDb.from('shopping_orders')
            .select('total_price_paise')
            .eq('buyer_id', merchant.id)
            .eq('buyer_type', 'merchant')
            .eq('order_type', 'wholesale'),
        adminDb.from('shopping_order_groups')
            .select('*', { count: 'exact', head: true })
            .eq('merchant_id', merchant.id)
            .eq('delivery_status', 'pending')
    ]);

    const coupons = couponsRes.data || [];
    const soldCouponsData = soldCouponsRes.data || [];
    const activeCount = activeCountRes.count || 0;
    const listedCount = listedCountRes.count || 0;
    const soldSoldCount = soldCountRes.count || 0;

    const pendingUdhariCount = pendingUdhariRes.count || 0;
    const lockinData = lockinRes.data || [];
    const totalLockinPaise = lockinData.reduce((sum, b) => sum + (b.amount_paise || 0), 0);

    const shoppingOrderItems = shoppingOrderItemsRes.data || [];
    const wholesaleOrders = wholesaleOrdersRes.data || [];
    const pendingOrdersCount = pendingOrdersCountRes.count || 0;

    const shoppingRevenue = shoppingOrderItems
        .reduce((sum, o) => sum + (Number(o.unit_price_paise * o.quantity) || 0), 0);
    const shoppingSpend = wholesaleOrders
        .reduce((sum, o) => sum + (Number(o.total_price_paise) || 0), 0);

    // Calculate Coupon Revenue (existing logic)
    const couponRevenue = soldCouponsData.reduce((sum, c) => {
        const sellingPrice = (c.merchant_selling_price_paise || 0) / 100;
        const purchasePrice = (c.merchant_purchase_price_paise || 0) / 100;
        const commission = (c.merchant_commission_paise || 0) / 100;
        return sum + (sellingPrice - purchasePrice - commission);
    }, 0);

    const stats = {
        totalSales: soldSoldCount + shoppingOrderItems.length,
        activeCoupons: activeCount,
        listedCoupons: listedCount,
        totalRevenue: couponRevenue + (shoppingRevenue / 100),
        shoppingSpend: shoppingSpend / 100,
        totalCommission: (merchant.total_commission_paid_paise || 0) / 100,
        pendingUdhari: pendingUdhariCount,
        lockinBalance: totalLockinPaise / 100,
    };

    // Transform coupons for display
    const transformedCoupons = coupons.map(c => ({
        id: c.id,
        brand: c.brand,
        faceValue: c.face_value_paise / 100,
        purchasePrice: (c.merchant_purchase_price_paise || 0) / 100,
        sellingPrice: (c.merchant_selling_price_paise || 0) / 100,
        commission: (c.merchant_commission_paise || 0) / 100,
        status: c.status,
        listed: c.listed_on_marketplace,
        imageUrl: c.image_url,
    }));

    return (
        <div className="relative isolate">
            {/* Background embellishments - Move to fixed background layer */}
            <div className="fixed top-0 left-0 w-full h-full pointer-events-none -z-10 overflow-hidden">
                <div className="absolute top-[-10%] left-[-5%] w-[40%] h-[40%] bg-[#D4AF37]/10 rounded-full blur-[120px]"></div>
                <div className="absolute bottom-[-10%] right-[-5%] w-[40%] h-[40%] bg-blue-500/10 rounded-full blur-[120px]"></div>
            </div>

            <section className="mb-8">
                <MerchantAdBannerCarousel />
            </section>

            <section className="mb-10">
                <AutoModePromo autoMode={merchant.auto_mode} />
            </section>

            {stats.totalSales === 0 && stats.activeCoupons === 0 && (
                <WelcomeCard />
            )}

            {/* Header & Quick Actions Section */}
            <div className="relative z-10 mb-12">
                <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-8">
                    <div className="flex-1">
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-500/10 border border-blue-500/20 rounded-full mb-4">
                            <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                            <span className="text-[10px] uppercase font-black tracking-[0.2em] text-blue-600 dark:text-blue-400">Merchant Center</span>
                        </div>
                        <h2 className="font-display text-4xl sm:text-5xl font-black mb-3 text-slate-900 dark:text-white tracking-tight leading-tight">
                            Dashboard
                        </h2>
                        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                            <p className="text-slate-500 dark:text-slate-400 font-medium max-w-md">
                                Real-time overview of your store's performance and inventory health.
                            </p>
                            <div className="flex items-center gap-3">
                                <LiveButton />
                                {merchant.subscription_expires_at && (
                                    <span className="bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border border-emerald-200/50 dark:border-emerald-800/30 px-3 py-1.5 rounded-xl text-xs font-bold tracking-wide inline-flex items-center gap-1.5 shadow-sm">
                                        <span className="material-icons-round text-sm">verified</span>
                                        Plan Ends: {new Date(merchant.subscription_expires_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col gap-4 w-full xl:w-auto shrink-0">
                        <div className="flex items-center justify-between xl:justify-end gap-4 mb-2">
                            <span className="text-xs font-black uppercase tracking-widest text-slate-400">Quick Operations</span>
                            <div className="h-px flex-1 xl:w-24 bg-slate-200 dark:bg-white/10" />
                        </div>
                        <div className="flex flex-wrap items-center gap-3">
                            <StoreStatusToggle initialStoreData={merchant} />
                            <div className="flex flex-wrap gap-2 sm:gap-3 items-center">
                                <Link href="/merchant/purchase" className="flex-1 sm:flex-none justify-center px-5 py-3 rounded-2xl merchant-glass hover:bg-black/5 dark:hover:bg-white/10 transition-all flex items-center space-x-2 border border-black/5 dark:border-white/10 group min-w-[140px]">
                                    <span className="material-icons-round text-[#D4AF37] text-lg group-hover:scale-110 transition-transform">add_shopping_cart</span>
                                    <span className="text-sm font-bold text-slate-800 dark:text-slate-100">Coupons</span>
                                </Link>
                                <Link href="/merchant/udhari" className="flex-1 sm:flex-none justify-center px-5 py-3 rounded-2xl merchant-glass hover:bg-black/5 dark:hover:bg-white/10 transition-all flex items-center space-x-2 border border-black/5 dark:border-white/10 relative group min-w-[140px]">
                                    <span className="material-icons-round text-amber-500 text-lg group-hover:rotate-12 transition-transform">account_balance_wallet</span>
                                    <span className="text-sm font-bold text-slate-800 dark:text-slate-100">Credits</span>
                                    {pendingUdhariCount > 0 && (
                                        <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full ring-4 ring-white dark:ring-[#020617] animate-bounce">
                                            {pendingUdhariCount}
                                        </span>
                                    )}
                                </Link>
                                <Link href="/merchant/inventory" className="flex-1 sm:flex-none justify-center px-6 py-3 rounded-2xl bg-gradient-to-r from-[#D4AF37] to-[#B8860B] text-[#020617] font-black hover:shadow-lg hover:shadow-[#D4AF37]/20 transition-all flex items-center space-x-2 min-w-[160px]">
                                    <span className="material-icons-round text-lg">inventory_2</span>
                                    <span>Inventory</span>
                                </Link>
                                <Link href="/merchant/shopping/orders" className="flex-1 sm:flex-none justify-center px-5 py-3 rounded-2xl merchant-glass hover:bg-black/5 dark:hover:bg-white/10 transition-all flex items-center space-x-2 border border-black/5 dark:border-white/10 relative group min-w-[160px]">
                                    <span className="material-icons-round text-emerald-500 text-lg group-hover:translate-x-1 transition-transform">local_shipping</span>
                                    <span className="text-sm font-bold text-slate-800 dark:text-slate-100">Orders</span>
                                    {pendingOrdersCount > 0 && (
                                        <span className="absolute -top-2 -right-2 bg-emerald-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full ring-4 ring-white dark:ring-[#020617]">
                                            {pendingOrdersCount}
                                        </span>
                                    )}
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <StatsCards stats={stats} />

            <TransactionsTable coupons={transformedCoupons} />
        </div>
    );
}
