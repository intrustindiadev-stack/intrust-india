import { createServerSupabaseClient, createAdminClient } from '@/lib/supabaseServer';
import { redirect } from 'next/navigation';
import StatsCards from '@/components/merchant/StatsCards';
import TransactionsTable from '@/components/merchant/TransactionsTable';
import MerchantAdBannerCarousel from '@/components/merchant/MerchantAdBannerCarousel';
import AutoModePromo from '@/components/merchant/AutoModePromo';
import WelcomeCard from '@/components/merchant/WelcomeCard';
import MerchantDisclaimerNote from '@/components/merchant/dashboard/MerchantDisclaimerNote';
import DashboardHeader from '@/components/merchant/dashboard/DashboardHeader';
import QuickAccessGrid from '@/components/merchant/dashboard/QuickAccessGrid';

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
        <div className="relative min-h-screen bg-slate-50 dark:bg-[#020617] -mx-4 sm:-mx-8 -mt-4 sm:-mt-8">
            {/* Header Layer (Normal Flow) */}
            <DashboardHeader merchant={merchant} stats={stats} profile={profile} />

            {/* Overlapping Content Layer */}
            <div className="relative z-10 -mt-16 px-4 sm:px-6 md:px-8 pb-32 max-w-7xl mx-auto">
                <div className="bg-white dark:bg-slate-900 rounded-[2rem] sm:rounded-[3rem] shadow-xl border border-slate-100 dark:border-slate-800 p-4 sm:p-6 md:p-8 min-h-[500px]">
                    
                    {/* Welcome Card if no sales */}
                    {stats.totalSales === 0 && stats.activeCoupons === 0 && (
                        <div className="mb-8">
                            <WelcomeCard />
                        </div>
                    )}

                    {/* Quick Access Grid */}
                    <QuickAccessGrid pendingUdhariCount={pendingUdhariCount} pendingOrdersCount={pendingOrdersCount} />

                    {/* Banners */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
                        <div className="rounded-3xl overflow-hidden shadow-sm border border-slate-100 dark:border-slate-800">
                            <MerchantAdBannerCarousel />
                        </div>
                        <div className="rounded-3xl overflow-hidden shadow-sm border border-slate-100 dark:border-slate-800">
                            <AutoModePromo autoMode={merchant.auto_mode} />
                        </div>
                    </div>

                    {/* Stats List (Great Deals) */}
                    <StatsCards stats={stats} />

                    {/* Recent Transactions */}
                    <TransactionsTable coupons={transformedCoupons} />
                    
                    <MerchantDisclaimerNote />
                </div>
            </div>
        </div>
    );
}
