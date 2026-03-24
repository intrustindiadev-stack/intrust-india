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

    const { data } = await supabase
        .from('merchants')
        .select('*')
        .eq('user_id', user.id)
        .single();
    const merchant = data;

    if (!merchant) {
        redirect('/merchant-apply');
    }

    // 3. Fetch Data
    // We need:
    // - Sold coupons (for revenue & trends)
    // - Available coupons (for inventory)
    // - Listed coupons (for inventory)

    const [soldCouponsRes, availableCountRes, listedCountRes, udhariRevenueRes, shoppingOrdersRes] = await Promise.all([
        supabase
            .from('coupons')
            .select('*')
            .eq('merchant_id', merchant.id)
            .eq('status', 'sold')
            .order('purchased_at', { ascending: true }), // Oldest first for trend

        supabase.from('coupons').select('*', { count: 'exact', head: true }).eq('merchant_id', merchant.id).eq('status', 'available'),
        supabase.from('coupons').select('*', { count: 'exact', head: true }).eq('merchant_id', merchant.id).eq('listed_on_marketplace', true),
        
        supabase.from('merchant_transactions').select('amount_paise', { count: 'exact' }).eq('merchant_id', merchant.id).eq('transaction_type', 'udhari_payment'),
        supabase.from('shopping_orders').select('*, shopping_products(title)').or(`seller_id.eq.${merchant.id}, buyer_id.eq.${merchant.id}`)
    ]);

    const soldCoupons = soldCouponsRes.data || [];
    const availableCount = availableCountRes.count || 0;
    const listedCount = listedCountRes.count || 0;
    const soldCount = soldCoupons.length;
    const udhariRevenue = (udhariRevenueRes.data || []).reduce((sum, tx) => sum + (tx.amount_paise || 0), 0) / 100;
    
    const shoppingOrders = shoppingOrdersRes.data || [];
    const shoppingRevenue = shoppingOrders
        .filter(o => o.seller_id === merchant.id)
        .reduce((sum, o) => sum + (Number(o.total_price_paise) || 0), 0) / 100;
    const shoppingSpend = shoppingOrders
        .filter(o => o.buyer_id === merchant.id)
        .reduce((sum, o) => sum + (Number(o.total_price_paise) || 0), 0) / 100;

    // 4. Calculate Metrics
    const totalRevenue = soldCoupons.reduce((sum, c) => {
        const sellingPrice = (c.merchant_selling_price_paise || 0) / 100;
        const purchasePrice = (c.merchant_purchase_price_paise || 0) / 100;
        const commission = (c.merchant_commission_paise || 0) / 100;
        return sum + (sellingPrice - purchasePrice - commission);
    }, 0) + shoppingRevenue;

    const totalSalesValue = soldCoupons.reduce((sum, c) => sum + ((c.merchant_selling_price_paise || 0) / 100), 0) + shoppingRevenue;
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
        {
            label: 'Shopping Spend',
            value: `₹${shoppingSpend.toFixed(2)}`,
            icon: ShoppingBag,
            color: 'text-amber-600',
            bg: 'bg-amber-50'
        },
    ];

    return (
        <div className="relative">
            {/* Background embellishments */}
            <div className="fixed top-[10%] left-[-10%] w-[50%] h-[50%] bg-blue-500/5 rounded-full blur-[120px] pointer-events-none -z-10 dark:opacity-20"></div>
            <div className="fixed bottom-[-10%] right-[-5%] w-[40%] h-[40%] bg-[#D4AF37]/10 rounded-full blur-[120px] pointer-events-none -z-10"></div>

            <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 mt-6 gap-4">
                <div>
                    <h1 className="font-display text-4xl font-bold text-slate-800 dark:text-slate-100 mb-2">Analytics</h1>
                    <p className="text-slate-600 dark:text-slate-400 font-medium">Overview of your business performance and revenue trends</p>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 sm:gap-6 mb-8">
                <div className="merchant-glass rounded-3xl p-6 border border-[#D4AF37]/20 hover:border-[#D4AF37]/50 transition-all group overflow-hidden relative bg-gradient-to-br from-[#D4AF37]/5 to-transparent shadow-lg shadow-[#D4AF37]/5">
                    <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-[#D4AF37]/10 rounded-full blur-2xl group-hover:bg-[#D4AF37]/20 transition-all"></div>
                    <div className="flex flex-col mb-2 relative z-10">
                        <div className="flex items-center space-x-2 text-[#D4AF37] mb-2">
                            <span className="material-icons-round text-lg">account_balance_wallet</span>
                            <span className="font-bold uppercase tracking-widest text-[10px]">Total Revenue</span>
                        </div>
                        <h3 className="text-3xl font-display font-bold text-[#D4AF37]">
                            ₹{totalRevenue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </h3>
                    </div>
                </div>

                <div className="merchant-glass rounded-3xl p-6 border border-black/5 dark:border-white/5 hover:border-[#D4AF37]/30 transition-all group overflow-hidden relative shadow-lg">
                    <div className="absolute -right-4 -bottom-4 w-20 h-20 bg-blue-500/10 rounded-full blur-xl group-hover:bg-blue-500/20 transition-all"></div>
                    <div className="flex flex-col mb-2 relative z-10">
                        <div className="flex items-center space-x-2 text-blue-500 dark:text-blue-400 mb-2">
                            <span className="material-icons-round text-lg">trending_up</span>
                            <span className="font-bold uppercase tracking-widest text-[10px]">Total Sales Volume</span>
                        </div>
                        <h3 className="text-3xl font-display font-bold text-slate-800 dark:text-slate-100">
                            ₹{totalSalesValue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </h3>
                    </div>
                </div>

                <div className="merchant-glass rounded-3xl p-6 border border-black/5 dark:border-white/5 hover:border-[#D4AF37]/30 transition-all group overflow-hidden relative shadow-lg">
                    <div className="absolute -right-4 -bottom-4 w-20 h-20 bg-emerald-500/10 rounded-full blur-xl group-hover:bg-emerald-500/20 transition-all"></div>
                    <div className="flex flex-col mb-2 relative z-10">
                        <div className="flex items-center space-x-2 text-emerald-600 dark:text-emerald-400 mb-2">
                            <span className="material-icons-round text-lg">shopping_bag</span>
                            <span className="font-bold uppercase tracking-widest text-[10px]">Coupons Sold</span>
                        </div>
                        <h3 className="text-3xl font-display font-bold text-slate-800 dark:text-slate-100">
                            {soldCount.toLocaleString('en-IN')}
                        </h3>
                    </div>
                </div>

                <div className="merchant-glass rounded-3xl p-6 border border-black/5 dark:border-white/5 hover:border-[#D4AF37]/30 transition-all group overflow-hidden relative shadow-lg">
                    <div className="absolute -right-4 -bottom-4 w-20 h-20 bg-purple-500/10 rounded-full blur-xl group-hover:bg-purple-500/20 transition-all"></div>
                    <div className="flex flex-col mb-2 relative z-10">
                        <div className="flex items-center space-x-2 text-purple-600 dark:text-purple-400 mb-2">
                            <span className="material-icons-round text-lg">inventory_2</span>
                            <span className="font-bold uppercase tracking-widest text-[10px]">Active Inventory</span>
                        </div>
                        <h3 className="text-3xl font-display font-bold text-slate-800 dark:text-slate-100">
                            {availableCount.toLocaleString('en-IN')}
                        </h3>
                    </div>
                </div>

                <div className="merchant-glass rounded-3xl p-6 border border-black/5 dark:border-white/5 hover:border-[#D4AF37]/30 transition-all group overflow-hidden relative shadow-lg">
                    <div className="absolute -right-4 -bottom-4 w-20 h-20 bg-orange-500/10 rounded-full blur-xl group-hover:bg-orange-500/20 transition-all"></div>
                    <div className="flex flex-col mb-2 relative z-10">
                        <div className="flex items-center space-x-2 text-orange-600 dark:text-orange-400 mb-2">
                            <span className="material-icons-round text-lg">credit_score</span>
                            <span className="font-bold uppercase tracking-widest text-[10px]">Store Credit Revenue</span>
                        </div>
                        <h3 className="text-3xl font-display font-bold text-slate-800 dark:text-slate-100">
                            ₹{udhariRevenue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </h3>
                    </div>
                </div>
            </div>

            {/* Charts Section */}
            <div className="mb-12">
                <AnalyticsCharts
                    revenueData={revenueData}
                    inventoryData={inventoryData}
                    brandData={brandData}
                />
            </div>

            {/* Shopping Performance Section */}
            <div className="merchant-glass rounded-3xl p-8 border border-black/5 dark:border-white/5 mb-12 shadow-xl">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 font-display">Shopping Performance</h2>
                        <p className="text-slate-500 text-sm mt-1">Overview of wholesale purchases and retail sales</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                    <div className="p-6 rounded-2xl bg-blue-50/50 dark:bg-blue-500/5 border border-blue-100 dark:border-blue-500/20">
                        <h3 className="text-sm font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest mb-4">Retail Earnings</h3>
                        <p className="text-3xl font-bold text-slate-900 dark:text-slate-100">₹{shoppingRevenue.toLocaleString('en-IN')}</p>
                        <p className="text-xs text-slate-500 mt-2">Revenue from products sold to customers</p>
                    </div>
                    <div className="p-6 rounded-2xl bg-orange-50/50 dark:bg-orange-500/5 border border-orange-100 dark:border-orange-500/20">
                        <h3 className="text-sm font-bold text-orange-600 dark:text-orange-400 uppercase tracking-widest mb-4">Wholesale Spend</h3>
                        <p className="text-3xl font-bold text-slate-900 dark:text-slate-100">₹{shoppingSpend.toLocaleString('en-IN')}</p>
                        <p className="text-xs text-slate-500 mt-2">Total amount spent on buying platform products</p>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="text-slate-400 text-xs uppercase tracking-wider font-bold border-b border-black/5 dark:border-white/5">
                                <th className="pb-4 pt-2 px-2">Product</th>
                                <th className="pb-4 pt-2">Type</th>
                                <th className="pb-4 pt-2">Quantity</th>
                                <th className="pb-4 pt-2">Unit Price</th>
                                <th className="pb-4 pt-2">Total</th>
                                <th className="pb-4 pt-2">Date</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-black/5 dark:divide-white/5">
                            {shoppingOrders.length > 0 ? (
                                shoppingOrders.slice(0, 10).map((order) => (
                                    <tr key={order.id} className="group hover:bg-black/5 dark:hover:bg-white/5 transition-all">
                                        <td className="py-4 px-2 font-bold text-slate-700 dark:text-slate-200">
                                            {order.shopping_products?.title || 'Unknown Product'}
                                        </td>
                                        <td className="py-4">
                                            <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${
                                                order.order_type === 'wholesale' 
                                                ? 'bg-blue-100 text-blue-600 dark:bg-blue-500/20' 
                                                : 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20'
                                            }`}>
                                                {order.order_type}
                                            </span>
                                        </td>
                                        <td className="py-4 text-slate-600 dark:text-slate-400">{order.quantity}</td>
                                        <td className="py-4 text-slate-600 dark:text-slate-400">₹{(order.unit_price_paise / 100).toFixed(2)}</td>
                                        <td className="py-4 font-bold text-slate-800 dark:text-slate-200">₹{(order.total_price_paise / 100).toFixed(2)}</td>
                                        <td className="py-4 text-slate-400 text-xs">
                                            {new Date(order.created_at).toLocaleDateString()}
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="6" className="py-12 text-center text-slate-400 italic">No shopping orders found</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
