import { createServerSupabaseClient } from '@/lib/supabaseServer';
import { redirect } from 'next/navigation';
import AnalyticsCharts from './AnalyticsCharts';
import { DollarSign, ShoppingBag, Package, TrendingUp } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function AnalyticsPage() {
    const supabase = await createServerSupabaseClient();

    // 1. Get User & Auth
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect('/login');
    }

    // 2. Get Merchant
    const { data: profile } = await supabase
        .from('user_profiles')
        .select('role')
        .eq('id', user.id)
        .single();

    let merchant = null;

    if (profile?.role === 'admin') {
        // 1. Try to fetch own merchant first
        const { data: ownMerchant } = await supabase
            .from('merchants')
            .select('*')
            .eq('user_id', user.id)
            .single();

        if (ownMerchant) {
            merchant = ownMerchant;
        } else {
            // 2. Fallback: Fetch the most recent merchant
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

    // 3. Fetch Data
    // We need:
    // - Sold coupons (for revenue & trends)
    // - Available coupons (for inventory)
    // - Listed coupons (for inventory)

    const [soldCouponsRes, availableCountRes, listedCountRes] = await Promise.all([
        supabase
            .from('coupons')
            .select('*')
            .eq('merchant_id', merchant.id)
            .eq('status', 'sold')
            .order('purchased_at', { ascending: true }), // Oldest first for trend

        supabase.from('coupons').select('*', { count: 'exact', head: true }).eq('merchant_id', merchant.id).eq('status', 'available'),
        supabase.from('coupons').select('*', { count: 'exact', head: true }).eq('merchant_id', merchant.id).eq('listed_on_marketplace', true)
    ]);

    const soldCoupons = soldCouponsRes.data || [];
    const availableCount = availableCountRes.count || 0;
    const listedCount = listedCountRes.count || 0;
    const soldCount = soldCoupons.length;

    // 4. Calculate Metrics
    const totalRevenue = soldCoupons.reduce((sum, c) => {
        const sellingPrice = (c.merchant_selling_price_paise || 0) / 100;
        const purchasePrice = (c.merchant_purchase_price_paise || 0) / 100;
        const commission = (c.merchant_commission_paise || 0) / 100;
        return sum + (sellingPrice - purchasePrice - commission);
    }, 0);

    const totalSalesValue = soldCoupons.reduce((sum, c) => sum + ((c.merchant_selling_price_paise || 0) / 100), 0);
    const totalCommission = (merchant.total_commission_paid_paise || 0) / 100;

    // 5. Prepare Chart Data

    // A. Revenue Trend (Daily)
    // Group sold coupons by date (using purchased_at)
    // Since we might not have a lot of data, we'll just group by day for the existing data
    // For a real app, fill in missing dates with 0

    // Helper to format date
    const formatDate = (dateStr) => {
        if (!dateStr) return 'Unknown';
        const d = new Date(dateStr);
        return `${d.getDate()}/${d.getMonth() + 1}`;
    };

    const revenueMap = new Map();
    soldCoupons.forEach(c => {
        if (c.purchased_at) {
            const dateKey = formatDate(c.purchased_at);
            const profit = ((c.merchant_selling_price_paise || 0) / 100) - ((c.merchant_purchase_price_paise || 0) / 100) - ((c.merchant_commission_paise || 0) / 100);

            const existing = revenueMap.get(dateKey) || { revenue: 0, salesCount: 0 };
            revenueMap.set(dateKey, {
                revenue: existing.revenue + profit,
                salesCount: existing.salesCount + 1
            });
        }
    });

    const revenueData = Array.from(revenueMap.entries()).map(([date, data]) => ({
        date,
        revenue: data.revenue,
        salesCount: data.salesCount
    }));

    // B. Inventory Distribution
    const inventoryData = [
        { name: 'Available', value: availableCount },
        { name: 'Listed', value: listedCount },
        { name: 'Sold', value: soldCount },
    ].filter(d => d.value > 0);

    // C. Top Brands
    const brandMap = new Map();
    soldCoupons.forEach(c => {
        const brand = c.brand || 'Unknown';
        const revenue = ((c.merchant_selling_price_paise || 0) / 100); // Using sales value for brand popularity
        brandMap.set(brand, (brandMap.get(brand) || 0) + revenue);
    });

    const brandData = Array.from(brandMap.entries())
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 5); // Top 5

    // Stats Cards Data
    const statsCards = [
        {
            label: 'Total Revenue',
            value: `₹${totalRevenue.toFixed(2)}`,
            icon: DollarSign,
            color: 'text-green-600',
            bg: 'bg-green-50'
        },
        {
            label: 'Total Sales Volume',
            value: `₹${totalSalesValue.toFixed(2)}`,
            icon: TrendingUp,
            color: 'text-blue-600',
            bg: 'bg-blue-50'
        },
        {
            label: 'Coupons Sold',
            value: soldCount.toString(),
            icon: ShoppingBag,
            color: 'text-purple-600',
            bg: 'bg-purple-50'
        },
        {
            label: 'Active Inventory',
            value: availableCount.toString(),
            icon: Package,
            color: 'text-orange-600',
            bg: 'bg-orange-50'
        },
    ];

    return (
        <div className="min-h-screen bg-gray-50 pt-24 pb-12">
            <div className="max-w-7xl mx-auto px-4 sm:px-6">
                <div className="mb-8">
                    <h1 className="text-4xl font-bold text-gray-900 mb-2 font-[family-name:var(--font-outfit)]">
                        Analytics
                    </h1>
                    <p className="text-gray-600">Overview of your business performance</p>
                </div>

                {/* KPI Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    {statsCards.map((stat, index) => {
                        const Icon = stat.icon;
                        return (
                            <div key={index} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
                                <div className="flex items-center gap-4 mb-4">
                                    <div className={`p-3 rounded-xl ${stat.bg} ${stat.color}`}>
                                        <Icon size={24} />
                                    </div>
                                    <span className="text-gray-600 font-medium">{stat.label}</span>
                                </div>
                                <h3 className="text-2xl font-bold text-gray-900">{stat.value}</h3>
                            </div>
                        );
                    })}
                </div>

                {/* Charts Section */}
                <AnalyticsCharts
                    revenueData={revenueData}
                    inventoryData={inventoryData}
                    brandData={brandData}
                />
            </div>
        </div>
    );
}
