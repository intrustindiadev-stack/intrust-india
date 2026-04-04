import { Users, CreditCard, TrendingUp, Activity, DollarSign, Store, ShoppingBag } from "lucide-react";
import AdminAnalyticsCharts from "./AdminAnalyticsCharts";
import AnalyticsPieCharts from "./AnalyticsPieCharts";
import AdminShoppingAnalytics from "./AdminShoppingAnalytics";
import AdminActivityFeed from "./AdminActivityFeed";
import { createAdminClient } from '@/lib/supabaseServer';


export const dynamic = 'force-dynamic';

export default async function AnalyticsPage() {

    const supabase = createAdminClient();

    // Parallel fetch all data sources
    const [
        transactionsRes,
        usersRes,
        merchantsRes,
        shoppingOrdersRes,
        shoppingProductsRes,
        shoppingItemsRes,
    ] = await Promise.all([
        supabase.from('transactions').select('id, amount, total_paid_paise, created_at, status, coupon_id, user_id').order('created_at', { ascending: false }),
        supabase.from('user_profiles').select('id, created_at, role, full_name, email').order('created_at', { ascending: false }),
        supabase.from('merchants').select('id, status'),
        supabase.from('shopping_order_groups').select('id, total_amount_paise, delivery_status, is_platform_order, created_at, customer_id'),
        supabase.from('shopping_products').select('id, title, category, admin_stock, is_active, created_at'),
        supabase.from('shopping_order_items').select('group_id, product_id, quantity, unit_price_paise, profit_paise'),
    ]);

    const transactions = transactionsRes.data || [];
    const users = usersRes.data || [];
    const merchants = merchantsRes.data || [];
    const shoppingOrders = shoppingOrdersRes.data || [];
    const shoppingProducts = shoppingProductsRes.data || [];
    const shoppingItems = shoppingItemsRes.data || [];

    // Log any errors so they show in the Next.js terminal
    if (transactionsRes.error) console.error('[Analytics] transactions error:', transactionsRes.error.message);
    if (shoppingOrdersRes.error) console.error('[Analytics] shopping_order_groups error:', shoppingOrdersRes.error.message);
    if (shoppingProductsRes.error) console.error('[Analytics] shopping_products error:', shoppingProductsRes.error.message);
    if (shoppingItemsRes.error) console.error('[Analytics] shopping_order_items error:', shoppingItemsRes.error.message);
    console.log('[Analytics] shoppingOrders count:', shoppingOrders.length, 'shoppingProducts count:', shoppingProducts.length);


    // Valid transactions (successful payments)
    const validTransactions = transactions.filter(t => t.status === 'completed' || t.status === 'SUCCESS');

    // Quick Stats Calculation
    // NOTE: `amount` is stored in rupees (e.g. 500.00), total_paid_paise is null for most rows
    const totalRevenue = validTransactions.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
    const totalUsers = (users || []).filter(u => !['admin', 'super_admin'].includes(u.role)).length;
    const activeMerchants = (merchants || []).filter(m => m.status === 'approved' || m.status === 'verified').length;
    const totalTransactions = validTransactions.length;


    // Formatting Helpers
    const formatCurrency = (amount) => {
        if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(2)}Cr`;
        if (amount >= 100000) return `₹${(amount / 100000).toFixed(2)}L`;
        if (amount >= 1000) return `₹${(amount / 1000).toFixed(2)}K`;
        return `₹${amount.toFixed(2)}`;
    };

    // ── Shopping Stats ────────────────────────────────────────────────────────
    const totalShoppingRevenue = shoppingOrders.reduce((acc, o) => acc + (Number(o.total_amount_paise) || 0), 0);
    const totalShoppingOrders = shoppingOrders.length;
    const pendingDispatch = shoppingOrders.filter(o => o.delivery_status === 'pending').length;
    const totalProducts = shoppingProducts.length;
    const activeProducts = shoppingProducts.filter(p => p.is_active).length;
    const platformRevenue = shoppingOrders.filter(o => o.is_platform_order).reduce((acc, o) => acc + (Number(o.total_amount_paise) || 0), 0);
    const merchantCommissionRevenue = shoppingItems.reduce((acc, item) => acc + (Number(item.profit_paise) || 0), 0);

    // Shopping Orders over last 14 days
    const last14Days = [...Array(14)].map((_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (13 - i));
        return {
            dateStr: d.toISOString().split('T')[0],
            display: d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
        };
    });

    const shoppingOrdersChartData = last14Days.map(day => {
        const count = shoppingOrders.filter(o => o.created_at?.startsWith(day.dateStr)).length;
        return { date: day.display, orders: count };
    });

    // Top 5 Products by Revenue from order items
    const productRevenueMap = {};
    for (const item of shoppingItems) {
        if (!item.product_id) continue;
        if (!productRevenueMap[item.product_id]) productRevenueMap[item.product_id] = 0;
        productRevenueMap[item.product_id] += (Number(item.unit_price_paise) || 0) * (Number(item.quantity) || 1);
    }
    const productMap = shoppingProducts.reduce((acc, p) => ({ ...acc, [p.id]: p }), {});
    const top5Products = Object.entries(productRevenueMap)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([pid, rev]) => ({
            name: productMap[pid]?.title || `Product ${pid.slice(0, 6)}`,
            revenue: Math.round(rev / 100),
        }));

    const stats = [
        { title: "Total Revenue", value: formatCurrency(totalRevenue), change: "Live", trend: "up", icon: DollarSign, color: "text-green-600", bg: "bg-green-100" },
        { title: "Total Users", value: totalUsers.toLocaleString('en-IN'), change: "Live", trend: "up", icon: Users, color: "text-blue-600", bg: "bg-blue-100" },
        { title: "Active Merchants", value: activeMerchants.toLocaleString('en-IN'), change: "Live", trend: "up", icon: Store, color: "text-purple-600", bg: "bg-purple-100" },
        { title: "Transactions", value: totalTransactions.toLocaleString('en-IN'), change: "Live", trend: "up", icon: Activity, color: "text-orange-600", bg: "bg-orange-100" },
        { title: "Shopping Revenue", value: formatCurrency(totalShoppingRevenue / 100), change: "Live", trend: "up", icon: ShoppingBag, color: "text-amber-600", bg: "bg-amber-100" },
    ];

    // User Growth Data (Last 14 days)
    const userGrowthData = last14Days.map(day => {
        const count = (users || []).filter(u => u.created_at?.startsWith(day.dateStr)).length;
        return { date: day.display, users: count + 1 };
    });

    // Revenue Streams — amount is in rupees; shopping revenue is in paise → convert
    const gcSales = validTransactions.filter(t => t.coupon_id).reduce((acc, t) => acc + (Number(t.amount) || 0), 0);
    const otherSales = validTransactions.filter(t => !t.coupon_id).reduce((acc, t) => acc + (Number(t.amount) || 0), 0);
    const shoppingRev = Math.round(totalShoppingRevenue / 100); // paise → rupees

    const revenueSourceData = [
        { name: 'Gift Card Sales', value: Math.round(gcSales) || 500 },
        { name: 'Other Sales', value: Math.round(otherSales) || 500 },
        { name: 'Shopping Revenue', value: shoppingRev || 500 },
    ];


    // ── PIE CHART DATA ──────────────────────────────
    // 1. User Role Distribution
    const allNonAdminUsers = (users || []).filter(u => !['admin', 'super_admin'].includes(u.role));
    const merchantUsers = allNonAdminUsers.filter(u => u.role === 'merchant').length;
    const customerUsers = allNonAdminUsers.filter(u => u.role !== 'merchant').length;
    const userRoleData = [
        { name: 'Customers', value: customerUsers || 1 },
        { name: 'Merchants', value: merchantUsers || 1 },
    ];

    // 2. Transaction Status Distribution (from transactions table)
    const successTx = transactions.filter(t => t.status === 'completed' || t.status === 'SUCCESS').length;
    const failedTx = transactions.filter(t => t.status === 'failed' || t.status === 'FAILED' || t.status === 'ABORTED').length;
    const pendingTx = transactions.filter(t => !['completed', 'SUCCESS', 'failed', 'FAILED', 'ABORTED'].includes(t.status)).length;
    const orderStatusData = [
        { name: 'Success', value: successTx || 1 },
        { name: 'Failed', value: failedTx || 1 },
        { name: 'Pending', value: pendingTx || 1 },
    ];

    // 3. Merchant Status Breakdown
    const approvedM = (merchants || []).filter(m => m.status === 'approved' || m.status === 'verified').length;
    const pendingM = (merchants || []).filter(m => m.status === 'pending').length;
    const rejectedM = (merchants || []).filter(m => m.status === 'rejected').length;
    const suspendedM = (merchants || []).filter(m => m.status === 'suspended').length;
    const merchantStatusData = [
        { name: 'Approved', value: approvedM || 1 },
        { name: 'Pending', value: pendingM || 1 },
        { name: 'Rejected', value: rejectedM || 1 },
        { name: 'Suspended', value: suspendedM || 1 },
    ];
    // ───────────────────────────────────────────────

    // Initial Activity Feed data (server-rendered seed for client component)
    const profileMap = (users || []).reduce((acc, u) => { acc[u.id] = u; return acc; }, {});
    let initialActivity = validTransactions.slice(0, 10).map(tx => {
        const user = profileMap[tx.user_id];
        return {
            id: tx.id,
            user: user?.full_name || user?.email || 'Unknown User',
            time: new Date(tx.created_at).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
            // amount is in rupees already (e.g. "500.00")
            amount: `₹${Number(tx.amount || 0).toLocaleString('en-IN')}`,
            status: (tx.status === 'completed' || tx.status === 'SUCCESS') ? 'success' : (tx.status === 'failed' || tx.status === 'FAILED') ? 'error' : 'info'
        };
    });

    if (initialActivity.length === 0) {
        initialActivity = [{ id: 'empty', user: 'System Agent', action: 'Waiting for transactions...', time: 'Just now', amount: '', status: 'info' }];
    }


    return (
        <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0B0F19] p-4 sm:p-6 lg:p-8 transition-colors duration-300">
            {/* Header */}
            <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight font-[family-name:var(--font-outfit)]">
                        Platform Analytics
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 font-medium mt-1">
                        Real-time overview of platform performance &amp; activity
                    </p>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 dark:bg-emerald-500/10 rounded-full border border-emerald-200 dark:border-emerald-500/20 w-fit">
                    <span className="flex h-2.5 w-2.5 relative">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                    </span>
                    <span className="text-sm font-bold text-emerald-700 dark:text-emerald-400">Live Production Sync</span>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 sm:gap-6 mb-8">
                {stats.map((stat, index) => (
                    <div
                        key={index}
                        className="bg-white dark:bg-slate-800/50 p-6 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700 transition-all hover:shadow-md hover:border-blue-200"
                    >
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-1">
                                    {stat.title}
                                </p>
                                <p className="text-3xl font-extrabold text-slate-900 dark:text-white">
                                    {stat.value}
                                </p>
                            </div>
                            <div className={`p-4 rounded-2xl ${stat.bg} shadow-inner`}>
                                <stat.icon className={`h-6 w-6 ${stat.color}`} strokeWidth={2.5} />
                            </div>
                        </div>
                        <div className="mt-4 flex items-center">
                            <span className="text-sm font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">
                                {stat.change}
                            </span>
                            <span className="text-xs text-slate-500 ml-2 font-medium">real-time sync</span>
                        </div>
                    </div>
                ))}
            </div>

            <AnalyticsPieCharts
                initialUserRoleData={userRoleData}
                initialOrderStatusData={orderStatusData}
                initialMerchantStatusData={merchantStatusData}
            />

            <AdminShoppingAnalytics
                initialShoppingStats={{
                    totalRevenue: totalShoppingRevenue,
                    totalOrders: totalShoppingOrders,
                    pendingDispatch,
                    totalProducts,
                    activeProducts,
                    platformRevenue,
                    merchantCommissionRevenue,
                }}
                initialTop5Products={top5Products}
                initialShoppingOrdersChartData={shoppingOrdersChartData}
            />

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 sm:gap-8">
                {/* Charts Section (Takes up 2 cols on large screens) */}
                <div className="xl:col-span-2">
                    <AdminAnalyticsCharts
                        userGrowthData={userGrowthData}
                        revenueSourceData={revenueSourceData}
                        userRoleData={userRoleData}
                        orderStatusData={orderStatusData}
                        merchantStatusData={merchantStatusData}
                    />
                </div>

                {/* Real-time Activity Feed */}
                <div className="xl:col-span-1">
                    <AdminActivityFeed initialActivity={initialActivity} />
                </div>
            </div>
        </div>
    );
}
