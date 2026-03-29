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

    // 3. Fetch Data Correctly
    const [
        soldCouponsRes, 
        availableCountRes, 
        listedCountRes, 
        udhariRevenueRes, 
        wholesaleOrdersRes,
        retailItemsRes,
        merchantInventoryRes
    ] = await Promise.all([
        supabase
            .from('coupons')
            .select('*')
            .eq('merchant_id', merchant.id)
            .eq('status', 'sold')
            .order('purchased_at', { ascending: true }),

        // Gift Card Inventory
        supabase.from('coupons').select('*', { count: 'exact', head: true }).eq('merchant_id', merchant.id).eq('status', 'available'),
        supabase.from('coupons').select('*', { count: 'exact', head: true }).eq('merchant_id', merchant.id).eq('listed_on_marketplace', true),
        
        // Store Credit Revenue (Gift Cards + Shop Orders)
        supabase.from('merchant_transactions')
            .select('amount_paise')
            .eq('merchant_id', merchant.id)
            .in('transaction_type', ['udhari_payment', 'store_credit_payment']),
            
        // Wholesale Spend (Merchant buying from Platform)
        supabase.from('shopping_orders')
            .select('*, shopping_products(title)')
            .eq('buyer_id', merchant.id)
            .eq('order_type', 'wholesale'),

        // Retail Earnings (Customer buying from Merchant via cart)
        supabase.from('shopping_order_items')
            .select(`
                id, seller_id, quantity, unit_price_paise,
                shopping_products(title),
                shopping_order_groups!inner(created_at, payment_method, delivery_status, customer_id)
            `)
            .eq('seller_id', merchant.id)
            .neq('shopping_order_groups.delivery_status', 'cancelled')
            .not('shopping_order_groups.payment_method', 'is', null),

        // Physical Product Inventory    
        supabase.from('merchant_inventory')
            .select('*', { count: 'exact', head: true })
            .eq('merchant_id', merchant.id)
    ]);

    const soldCoupons = soldCouponsRes.data || [];
    const availableCouponsCount = availableCountRes.count || 0;
    const listedCouponsCount = listedCountRes.count || 0;
    const physicalInventoryCount = merchantInventoryRes.count || 0;
    
    // Unified Inventory
    const activeInventoryCount = availableCouponsCount + physicalInventoryCount;
    const soldCouponsCount = soldCoupons.length;
    const udhariRevenue = (udhariRevenueRes.data || []).reduce((sum, tx) => sum + (tx.amount_paise || 0), 0) / 100;
    
    // Merge Wholesale and Retail Orders
    const wholesaleOrders = wholesaleOrdersRes.data || [];
    const retailItems = retailItemsRes.data || [];

    const retailOrdersFormatted = retailItems.map(item => ({
        id: item.id,
        seller_id: item.seller_id,
        buyer_id: item.shopping_order_groups?.customer_id,
        created_at: item.shopping_order_groups?.created_at,
        order_type: 'retail',
        quantity: item.quantity,
        unit_price_paise: item.unit_price_paise,
        total_price_paise: item.unit_price_paise * item.quantity,
        shopping_products: item.shopping_products,
        payment_method: item.shopping_order_groups?.payment_method
    }));

    const shoppingOrders = [...wholesaleOrders, ...retailOrdersFormatted].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    
    // Revenue calculations
    const shoppingRevenue = shoppingOrders
        .filter(o => o.seller_id === merchant.id)
        .reduce((sum, o) => sum + (Number(o.total_price_paise) || 0), 0) / 100;
        
    const shoppingSpend = shoppingOrders
        .filter(o => o.buyer_id === merchant.id)
        .reduce((sum, o) => sum + (Number(o.total_price_paise) || 0), 0) / 100;

    // 4. Calculate Unified KPIs
    const totalCouponProfit = soldCoupons.reduce((sum, c) => {
        const sellingPrice = (c.merchant_selling_price_paise || 0) / 100;
        const purchasePrice = (c.merchant_purchase_price_paise || 0) / 100;
        const commission = (c.merchant_commission_paise || 0) / 100;
        return sum + (sellingPrice - purchasePrice - commission);
    }, 0);

    const totalRevenue = totalCouponProfit + shoppingRevenue;
    
    const totalSalesValue = soldCoupons.reduce((sum, c) => sum + ((c.merchant_selling_price_paise || 0) / 100), 0) + shoppingRevenue;

    // 5. Prepare Chart Data (Unified)

    const formatDate = (dateStr) => {
        if (!dateStr) return 'Unknown';
        const d = new Date(dateStr);
        return `${d.getDate()}/${d.getMonth() + 1}`;
    };

    const revenueMap = new Map();
    
    // Add Gift Card Revenue to Trend Chart
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

    // Add Shopping Order Revenue to Trend Chart
    shoppingOrders.forEach(o => {
        if (o.created_at && o.seller_id === merchant.id) {
            const dateKey = formatDate(o.created_at);
            const profit = (o.total_price_paise || 0) / 100; // Assuming strict retail prices for merchants here

            const existing = revenueMap.get(dateKey) || { revenue: 0, salesCount: 0 };
            revenueMap.set(dateKey, {
                revenue: existing.revenue + profit,
                salesCount: existing.salesCount + 1
            });
        }
    });

    const revenueData = Array.from(revenueMap.entries())
        // Sorting by date chronologically (basic string parsing workaround, robust enough for month bounds)
        .sort((a, b) => new Date(a.date + "/2026") - new Date(b.date + "/2026"))
        .map(([date, data]) => ({
            date,
            revenue: data.revenue,
            salesCount: data.salesCount
        }));

    // Unified Inventory Distribution
    const inventoryData = [
        { name: 'Gift Cards (Available)', value: availableCouponsCount },
        { name: 'Products (Listed)', value: physicalInventoryCount },
    ].filter(d => d.value > 0);

    // Unified Top Brands & Products
    const brandMap = new Map();
    
    soldCoupons.forEach(c => {
        const brand = c.brand || 'Unknown Gift Card';
        const revenue = ((c.merchant_selling_price_paise || 0) / 100);
        brandMap.set(brand, (brandMap.get(brand) || 0) + revenue);
    });

    shoppingOrders.forEach(o => {
        if (o.seller_id === merchant.id) {
            const productTitle = o.shopping_products?.title || 'Unknown Product';
            const revenue = (o.total_price_paise || 0) / 100;
            brandMap.set(productTitle, (brandMap.get(productTitle) || 0) + revenue);
        }
    });

    const brandData = Array.from(brandMap.entries())
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 5); // Top 5

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
                            <span className="font-bold uppercase tracking-widest text-[10px]">Gift Cards Sold</span>
                        </div>
                        <h3 className="text-3xl font-display font-bold text-slate-800 dark:text-slate-100">
                            {soldCouponsCount.toLocaleString('en-IN')}
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
                            {activeInventoryCount.toLocaleString('en-IN')}
                        </h3>
                    </div>
                </div>

                <div className="merchant-glass rounded-3xl p-6 border border-black/5 dark:border-white/5 hover:border-[#D4AF37]/30 transition-all group overflow-hidden relative shadow-lg">
                    <div className="absolute -right-4 -bottom-4 w-20 h-20 bg-orange-500/10 rounded-full blur-xl group-hover:bg-orange-500/20 transition-all"></div>
                    <div className="flex flex-col mb-2 relative z-10">
                        <div className="flex items-center space-x-2 text-orange-600 dark:text-orange-400 mb-2">
                            <span className="material-icons-round text-lg">account_balance</span>
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
                        <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 font-display">Shopping Insights</h2>
                        <p className="text-slate-500 text-sm mt-1">Overview of retail sales and wholesale platform purchases</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                    <div className="p-6 rounded-2xl bg-blue-50/50 dark:bg-blue-500/5 border border-blue-100 dark:border-blue-500/20 shadow-sm relative overflow-hidden group">
                        <div className="absolute -right-10 -top-10 text-blue-500/5 group-hover:text-blue-500/10 transition-colors">
                            <Package size={120} />
                        </div>
                        <div className="relative z-10">
                            <h3 className="text-sm font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest mb-4">Retail Earnings</h3>
                            <p className="text-4xl font-bold text-slate-900 dark:text-slate-100">₹{shoppingRevenue.toLocaleString('en-IN')}</p>
                            <p className="text-xs font-semibold text-slate-500 mt-2">Revenue from products sold directly to customers</p>
                        </div>
                    </div>
                    
                    <div className="p-6 rounded-2xl bg-rose-50/50 dark:bg-rose-500/5 border border-rose-100 dark:border-rose-500/20 shadow-sm relative overflow-hidden group">
                        <div className="absolute -right-10 -top-10 text-rose-500/5 group-hover:text-rose-500/10 transition-colors">
                            <ShoppingBag size={120} />
                        </div>
                        <div className="relative z-10">
                            <h3 className="text-sm font-bold text-rose-600 dark:text-rose-400 uppercase tracking-widest mb-4">Wholesale Spend</h3>
                            <p className="text-4xl font-bold text-slate-900 dark:text-slate-100">₹{shoppingSpend.toLocaleString('en-IN')}</p>
                            <p className="text-xs font-semibold text-slate-500 mt-2">Total amount spent on supplying products</p>
                        </div>
                    </div>
                </div>

                <div className="overflow-x-auto rounded-xl border border-black/5 dark:border-white/5 bg-white/50 dark:bg-slate-900/50">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="text-slate-500 text-xs uppercase tracking-wider font-bold bg-slate-50 dark:bg-slate-800/50">
                                <th className="py-4 px-4">Item Details</th>
                                <th className="py-4 px-4">Role</th>
                                <th className="py-4 px-4">Format</th>
                                <th className="py-4 px-4">Qty</th>
                                <th className="py-4 px-4 text-right">Unit Price</th>
                                <th className="py-4 px-4 text-right">Net Total</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-black/5 dark:divide-white/5">
                            {shoppingOrders.length > 0 ? (
                                shoppingOrders
                                    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
                                    .slice(0, 10).map((order) => {
                                    
                                    const isRetailer = order.seller_id === merchant.id;
                                    
                                    return (
                                        <tr key={order.id} className="group hover:bg-white dark:hover:bg-slate-800 transition-colors">
                                            <td className="py-4 px-4">
                                                <div className="font-bold text-slate-700 dark:text-slate-200">
                                                    {order.shopping_products?.title || 'Unknown Product'}
                                                </div>
                                                <div className="text-[10px] text-slate-400 font-medium">
                                                    {new Date(order.created_at).toLocaleDateString(undefined, {
                                                        day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
                                                    })}
                                                </div>
                                            </td>
                                            <td className="py-4 px-4">
                                                <div className="flex items-center gap-2">
                                                    <div className={`w-7 h-7 rounded-xl ${isRetailer ? 'bg-blue-500/10 text-blue-600' : 'bg-rose-500/10 text-rose-600'} flex items-center justify-center shrink-0`}>
                                                        <DollarSign size={14} />
                                                    </div>
                                                    <span className="text-xs font-black uppercase tracking-widest text-slate-800 dark:text-slate-200">
                                                        {isRetailer ? 'Seller' : 'Buyer'}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="py-4 px-4">
                                                <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase shadow-sm ${
                                                    order.order_type === 'wholesale' 
                                                    ? 'bg-indigo-50 text-indigo-600 border border-indigo-100 dark:bg-indigo-500/20 dark:border-indigo-500/20' 
                                                    : 'bg-emerald-50 text-emerald-600 border border-emerald-100 dark:bg-emerald-500/20 dark:border-emerald-500/20'
                                                }`}>
                                                    {order.order_type}
                                                </span>
                                            </td>
                                            <td className="py-4 px-4 font-bold text-slate-600 dark:text-slate-400">
                                                x{order.quantity}
                                            </td>
                                            <td className="py-4 px-4 text-right text-slate-500 dark:text-slate-400 font-medium tracking-tight">
                                                ₹{(order.unit_price_paise / 100).toFixed(2)}
                                            </td>
                                            <td className="py-4 px-4 text-right">
                                                <div className={`font-bold tracking-tight ${isRetailer ? 'text-blue-600 dark:text-blue-400' : 'text-rose-600 dark:text-rose-400'}`}>
                                                    {isRetailer ? '+' : '-'} ₹{(order.total_price_paise / 100).toFixed(2)}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            ) : (
                                <tr>
                                    <td colSpan="6" className="py-16 text-center">
                                        <div className="flex flex-col items-center max-w-xs mx-auto text-slate-400">
                                            <Package size={48} className="mb-4 opacity-50" />
                                            <p className="font-semibold text-slate-600 dark:text-slate-300">No completed orders yet</p>
                                            <p className="text-sm mt-1">Pending and cancelled orders are filtered out to keep business metrics accurate.</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
