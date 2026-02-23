import { createServerSupabaseClient } from '@/lib/supabaseServer';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import StatsCards from '@/components/merchant/StatsCards';
import TransactionsTable from '@/components/merchant/TransactionsTable';

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

    if (profile?.role === 'admin') {
        const { data: ownMerchant } = await supabase
            .from('merchants')
            .select('*')
            .eq('user_id', user.id)
            .single();

        if (ownMerchant) {
            merchant = ownMerchant;
        } else {
            const { data } = await supabase
                .from('merchants')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(1)
                .single();
            merchant = data;
        }
    } else {
        const { data } = await supabase
            .from('merchants')
            .select('*')
            .eq('user_id', user.id)
            .single();
        merchant = data;
    }

    if (!merchant) {
        redirect('/merchant-apply');
    }

    if (merchant.status === 'pending') redirect('/merchant-status/pending');
    if (merchant.status === 'rejected') redirect('/merchant-status/rejected');
    if (merchant.status === 'suspended') redirect('/merchant-status/suspended');

    // 3. Fetch Data in Parallel
    const [couponsRes, soldCouponsRes] = await Promise.all([
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
            .eq('status', 'sold')
    ]);

    if (couponsRes.error) console.error('[Dashboard] Coupons Fetch Error:', couponsRes.error);
    if (soldCouponsRes.error) console.error('[Dashboard] Sold Coupons Fetch Error:', soldCouponsRes.error);

    const [activeCountRes, listedCountRes, soldCountRes] = await Promise.all([
        supabase.from('coupons').select('*', { count: 'exact', head: true }).eq('merchant_id', merchant.id).eq('status', 'available'),
        supabase.from('coupons').select('*', { count: 'exact', head: true }).eq('merchant_id', merchant.id).eq('listed_on_marketplace', true),
        supabase.from('coupons').select('*', { count: 'exact', head: true }).eq('merchant_id', merchant.id).eq('status', 'sold')
    ]);

    const coupons = couponsRes.data || [];
    const soldCouponsData = soldCouponsRes.data || [];
    const activeCount = activeCountRes.count || 0;
    const listedCount = listedCountRes.count || 0;
    const soldCount = soldCountRes.count || 0;

    // Calculate Revenue
    const totalRevenue = soldCouponsData.reduce((sum, c) => {
        const sellingPrice = (c.merchant_selling_price_paise || 0) / 100;
        const purchasePrice = (c.merchant_purchase_price_paise || 0) / 100;
        const commission = (c.merchant_commission_paise || 0) / 100;
        return sum + (sellingPrice - purchasePrice - commission);
    }, 0);

    const stats = {
        totalSales: soldCount,
        activeCoupons: activeCount,
        listedCoupons: listedCount,
        totalRevenue: totalRevenue,
        totalCommission: (merchant.total_commission_paid_paise || 0) / 100,
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
    }));

    return (
        <div className="relative">
            {/* Background embellishments */}
            <div className="fixed top-[-10%] left-[-5%] w-[40%] h-[40%] bg-[#D4AF37]/10 rounded-full blur-[120px] pointer-events-none -z-10"></div>
            <div className="fixed bottom-[-10%] right-[-5%] w-[40%] h-[40%] bg-blue-500/10 rounded-full blur-[120px] pointer-events-none -z-10"></div>

            <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-10 gap-4 mt-6">
                <div>
                    <h2 className="font-display text-4xl font-bold mb-2 text-slate-800 dark:text-slate-100">Merchant Dashboard</h2>
                    <p className="text-slate-500 dark:text-slate-400 flex flex-wrap items-center">
                        Manage your inventory and track performance
                        <span className="hidden sm:inline mx-2 text-slate-300 dark:text-slate-700">•</span>
                        <span className="text-[#D4AF37] text-xs font-semibold tracking-wider uppercase mt-2 sm:mt-0">V.2.0 PREMIUM</span>
                    </p>
                </div>
                <div className="flex flex-wrap space-x-0 sm:space-x-4 gap-y-3">
                    <Link href="/merchant/purchase" className="w-full sm:w-auto px-6 py-3 rounded-xl merchant-glass hover:bg-black/5 dark:hover:bg-white/10 transition-all flex items-center justify-center space-x-2 border border-black/5 dark:border-white/10">
                        <span className="material-icons-round text-[#D4AF37] text-sm">add_shopping_cart</span>
                        <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">Purchase Coupons</span>
                    </Link>
                    <Link href="/merchant/inventory" className="w-full sm:w-auto px-6 py-3 rounded-xl bg-[#D4AF37] text-[#020617] font-bold hover:bg-opacity-90 transition-all flex items-center justify-center space-x-2 gold-glow">
                        <span className="material-icons-round text-sm">inventory_2</span>
                        <span>View Inventory</span>
                    </Link>
                </div>
            </div>

            <StatsCards stats={stats} />

            <TransactionsTable coupons={transformedCoupons} />
        </div>
    );
}
