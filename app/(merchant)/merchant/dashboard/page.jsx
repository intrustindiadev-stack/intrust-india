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
import TodayStatsCards from '@/components/merchant/dashboard/TodayStatsCards';
import { getTodayISTBoundaries } from '@/lib/utils/dateIst';
import { isPendingActionOrder } from '@/lib/merchant/orderMetrics';

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
        .select('role, avatar_url')
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

    // Start and end of current India business day (IST) for Today's Stats
    const { start: todayStartIST, end: todayEndIST } = getTodayISTBoundaries();

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
        pendingOrdersRes,
        todayCouponsRes,
        todayShoppingGroupsRes,
        todaySettledTxnsRes,
        aiOrdersRes,
        aiVaultRes
    ] = await Promise.all([
        supabase.from('coupons').select('id, brand, face_value_paise, merchant_purchase_price_paise, merchant_selling_price_paise, merchant_commission_paise, status, listed_on_marketplace, image_url').eq('merchant_id', merchant.id).order('created_at', { ascending: false }),

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
            .select('id, delivery_status, status, payment_status, payment_method')
            .eq('merchant_id', merchant.id)
            .eq('delivery_status', 'pending'),
        supabase
            .from('coupons')
            .select('merchant_selling_price_paise, merchant_purchase_price_paise, merchant_commission_paise, purchased_at')
            .eq('merchant_id', merchant.id)
            .eq('status', 'sold')
            .gte('purchased_at', todayStartIST),
        adminDb
            .from('shopping_order_groups')
            .select('id, total_amount_paise, merchant_profit_paise, created_at, updated_at, delivery_status, packed_at')
            .eq('merchant_id', merchant.id)
            .in('delivery_status', ['packed', 'shipped', 'delivered'])
            .gte('packed_at', todayStartIST)
            .lte('packed_at', todayEndIST),
        adminDb
            .from('merchant_transactions')
            .select('transaction_type, amount_paise, metadata, created_at')
            .eq('merchant_id', merchant.id)
            .in('transaction_type', ['sale', 'store_credit_payment'])
            .gte('created_at', todayStartIST)
            .lte('created_at', todayEndIST),
        adminDb
            .from('ai_orders')
            .select('id, status, wholesale_price_paise, profit_margin_paise, created_at')
            .or(`merchant_id.eq.${user.id},and(merchant_id.is.null,status.eq.PENDING)`),
        adminDb
            .from('ai_orders_vault')
            .select('balance_paise, total_profit_paise')
            .eq('merchant_id', user.id)
            .maybeSingle()
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
    const pendingOrders = (pendingOrdersRes.data || []).filter(isPendingActionOrder);
    const pendingOrdersCount = pendingOrders.length;

    // Process AI Orders data
    const allAIOrders = aiOrdersRes.data || [];
    const pendingAIOrders = allAIOrders.filter(o => o.status === 'PENDING');
    const inProgressAIOrders = allAIOrders.filter(o => o.status === 'ACCEPTED');
    const completedAIOrders = allAIOrders.filter(o => o.status === 'COMPLETED');
    const pendingAIOrdersCount = pendingAIOrders.length;

    const aiVaultData = aiVaultRes.data || null;
    const aiVaultBalance = (aiVaultData?.balance_paise || 0) / 100;
    const aiTotalProfit = (aiVaultData?.total_profit_paise || 0) / 100;

    const aiStats = {
        totalOrders: allAIOrders.length,
        pendingCount: pendingAIOrdersCount,
        inProgressCount: inProgressAIOrders.length,
        completedCount: completedAIOrders.length,
        vaultBalance: aiVaultBalance,
        totalProfit: aiTotalProfit,
    };

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
        pendingOrders: pendingOrdersCount,
        activeCoupons: activeCount,
        listedCoupons: listedCount,
        totalRevenue: couponRevenue + (shoppingRevenue / 100),
        shoppingSpend: shoppingSpend / 100,
        totalCommission: (merchant.total_commission_paid_paise || 0) / 100,
        pendingUdhari: pendingUdhariCount,
        lockinBalance: totalLockinPaise / 100,
    };

    // Calculate Today's Stats (including completed AI Orders)
    const todayCoupons = todayCouponsRes.data || [];
    const todayShoppingGroups = todayShoppingGroupsRes.data || [];
    const todayAIOrders = completedAIOrders.filter(o => o.created_at >= todayStartIST);

    const todayCouponSales = todayCoupons.reduce((sum, c) => sum + ((c.merchant_selling_price_paise || 0) / 100), 0);
    const todayCouponProfit = todayCoupons.reduce((sum, c) => {
        const sp = (c.merchant_selling_price_paise || 0) / 100;
        const pp = (c.merchant_purchase_price_paise || 0) / 100;
        const comm = (c.merchant_commission_paise || 0) / 100;
        return sum + (sp - pp - comm);
    }, 0);

    const packedShoppingGroups = todayShoppingGroups.filter(g => ['packed', 'shipped', 'delivered'].includes(g.delivery_status));
    const todayShoppingSales = packedShoppingGroups.reduce((sum, g) => sum + ((g.total_amount_paise || 0) / 100), 0);
    
    // Authoritative settled shopping profit from merchant ledger
    const settledTxns = todaySettledTxnsRes.data || [];
    const todayShoppingProfit = settledTxns.reduce((sum, tx) => {
        if (tx.transaction_type === 'sale') {
            return sum + ((tx.amount_paise || 0) / 100);
        }
        if (tx.transaction_type === 'store_credit_payment' && tx.metadata?.merchant_profit_paise) {
            return sum + ((Number(tx.metadata.merchant_profit_paise) || 0) / 100);
        }
        return sum;
    }, 0);

    const todayAISales = todayAIOrders.reduce((sum, o) => sum + ((o.wholesale_price_paise || 0) / 100), 0);
    const todayAIProfit = todayAIOrders.reduce((sum, o) => sum + ((o.profit_margin_paise || 0) / 100), 0);

    const todaySales = todayCouponSales + todayShoppingSales + todayAISales;
    const todayProfit = todayCouponProfit + todayShoppingProfit + todayAIProfit;
    const todayOrdersCount = todayCoupons.length + packedShoppingGroups.length + todayAIOrders.length;
    const todayMargin = todaySales > 0 ? Number(((todayProfit / todaySales) * 100).toFixed(1)) : 0;
    const avgOrderValue = todayOrdersCount > 0 ? Math.round(todaySales / todayOrdersCount) : 0;

    const todayStats = {
        todaySales,
        todayProfit,
        todayRevenue: todayProfit,
        todayOrdersCount,
        todayMargin,
        avgOrderValue,
        pendingOrdersCount,
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
        <div className="space-y-6 max-w-7xl mx-auto pb-24">
            {/* SECTION 1: Financial & Status Header with Dynamic AI Orders badge */}
            <DashboardHeader 
                merchant={merchant} 
                profile={profile} 
                walletBalancePaise={merchant.wallet_balance_paise || 0} 
                pendingAIOrdersCount={pendingAIOrdersCount}
            />
            
            {/* SECTION 1.5: Today's Real-time Sales, Profit & Orders Performance */}
            <TodayStatsCards todayStats={todayStats} />

            {/* Welcome Card if no sales */}
            {stats.totalSales === 0 && stats.activeCoupons === 0 && aiStats.totalOrders === 0 && (
                <WelcomeCard />
            )}

            {/* SECTION 2: Quick Access Grid */}
            <QuickAccessGrid 
                pendingUdhariCount={pendingUdhariCount} 
                pendingOrdersCount={pendingOrdersCount} 
                pendingAIOrdersCount={pendingAIOrdersCount}
            />

            {/* Performance Metrics / Stats Cards with Direct Redirection & AI Orders */}
            <StatsCards stats={stats} aiStats={aiStats} />

            {/* Recent Transactions */}
            <TransactionsTable coupons={transformedCoupons} />
            
            {/* SECTION 3: Promotional Banners (relocated, not deleted) */}
            <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <MerchantAdBannerCarousel />
                <AutoModePromo autoMode={merchant.auto_mode} merchant={merchant} />
            </section>

            <MerchantDisclaimerNote />
        </div>
    );
}
