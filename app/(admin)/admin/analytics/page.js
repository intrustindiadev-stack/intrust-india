import { Users, CreditCard, TrendingUp, Activity, DollarSign, Store } from "lucide-react";
import AdminAnalyticsCharts from "./AdminAnalyticsCharts";
import AnalyticsPieCharts from "./AnalyticsPieCharts";
import { createServerSupabaseClient } from '@/lib/supabaseServer';

export default async function AnalyticsPage() {
    const supabase = await createServerSupabaseClient();

    const { data: orders } = await supabase.from('orders').select('id, amount, created_at, payment_status, giftcard_id, user_id').order('created_at', { ascending: false });
    const { data: users } = await supabase.from('user_profiles').select('id, created_at, role, full_name, email').order('created_at', { ascending: false });
    const { data: merchants } = await supabase.from('merchants').select('id, status');

    const validOrders = (orders || []).filter(o => o.payment_status === 'paid');

    // Quick Stats Calculation
    const totalRevenue = validOrders.reduce((acc, curr) => acc + ((curr.amount || 0) / 100), 0);
    const totalUsers = (users || []).filter(u => u.role !== 'admin').length;
    const activeMerchants = (merchants || []).filter(m => m.status === 'approved' || m.status === 'verified').length;
    const totalTransactions = validOrders.length;

    // Formatting Helpers
    const formatCurrency = (amount) => {
        if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(2)}Cr`;
        if (amount >= 100000) return `₹${(amount / 100000).toFixed(2)}L`;
        if (amount >= 1000) return `₹${(amount / 1000).toFixed(2)}K`;
        return `₹${amount.toFixed(2)}`;
    };

    const stats = [
        { title: "Total Revenue", value: formatCurrency(totalRevenue), change: "Live", trend: "up", icon: DollarSign, color: "text-green-600", bg: "bg-green-100" },
        { title: "Total Users", value: totalUsers.toLocaleString('en-IN'), change: "Live", trend: "up", icon: Users, color: "text-blue-600", bg: "bg-blue-100" },
        { title: "Active Merchants", value: activeMerchants.toLocaleString('en-IN'), change: "Live", trend: "up", icon: Store, color: "text-purple-600", bg: "bg-purple-100" },
        { title: "Transactions", value: totalTransactions.toLocaleString('en-IN'), change: "Live", trend: "up", icon: Activity, color: "text-orange-600", bg: "bg-orange-100" },
    ];

    // User Growth Data (Last 14 days)
    const last14Days = [...Array(14)].map((_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (13 - i));
        return {
            dateStr: d.toISOString().split('T')[0],
            display: d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
        };
    });

    const userGrowthData = last14Days.map(day => {
        const count = (users || []).filter(u => u.created_at?.startsWith(day.dateStr)).length;
        // Adding visual +1 to ensure the chart renders a baseline if empty
        return { date: day.display, users: count + 1 };
    });

    // Revenue Stream
    const gcSales = validOrders.filter(o => o.giftcard_id).reduce((acc, curr) => acc + ((curr.amount || 0) / 100), 0);
    const voucherSales = validOrders.filter(o => !o.giftcard_id).reduce((acc, curr) => acc + ((curr.amount || 0) / 100), 0);

    // Fallbacks if zero
    const revenueSourceData = [
        { name: 'Gift Card Sales', value: gcSales || 500 },
        { name: 'Merchant Vouchers', value: voucherSales || 500 },
    ];

    // ── PIE CHART DATA ──────────────────────────────

    // 1. User Role Distribution
    const allNonAdminUsers = (users || []).filter(u => u.role !== 'admin');
    const merchantUsers = allNonAdminUsers.filter(u => u.role === 'merchant').length;
    const customerUsers = allNonAdminUsers.filter(u => u.role !== 'merchant').length;
    const userRoleData = [
        { name: 'Customers', value: customerUsers || 1 },
        { name: 'Merchants', value: merchantUsers || 1 },
    ];

    // 2. Order Payment Status
    const paidOrders = (orders || []).filter(o => o.payment_status === 'paid').length;
    const failedOrders = (orders || []).filter(o => o.payment_status === 'failed').length;
    const pendingOrders = (orders || []).filter(o => o.payment_status !== 'paid' && o.payment_status !== 'failed').length;
    const orderStatusData = [
        { name: 'Paid', value: paidOrders || 1 },
        { name: 'Failed', value: failedOrders || 1 },
        { name: 'Pending', value: pendingOrders || 1 },
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

    // Real-time Activity Feed
    const profileMap = (users || []).reduce((acc, u) => { acc[u.id] = u; return acc; }, {});
    let recentActivity = (orders || []).slice(0, 10).map(order => {
        const user = profileMap[order.user_id];
        return {
            id: order.id,
            user: user?.full_name || user?.email || 'Unknown User',
            time: new Date(order.created_at).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
            amount: `₹${((order.amount || 0) / 100).toLocaleString('en-IN')}`,
            status: order.payment_status === 'paid' ? 'success' : order.payment_status === 'failed' ? 'error' : 'info'
        };
    });

    if (recentActivity.length === 0) {
        recentActivity = [{ id: 'empty', user: 'System Agent', action: 'Waiting for orders...', time: 'Just now', amount: '', status: 'info' }];
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
                        Real-time overview of platform performance & activity
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8">
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
                    <div className="bg-white dark:bg-slate-800/50 p-6 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700 sticky top-24">
                        <h2 className="text-xl font-extrabold text-slate-900 dark:text-white mb-6 font-[family-name:var(--font-outfit)] flex items-center gap-2">
                            <Activity className="text-blue-500" size={20} />
                            Live Activity Feed
                        </h2>
                        <div className="space-y-5 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                            {recentActivity.map((activity) => (
                                <div key={activity.id} className="flex items-start gap-4 pb-5 border-b border-slate-100 dark:border-slate-700/50 last:border-0 last:pb-0 group">
                                    <div className={`w-12 h-12 rounded-full flex items-center justify-center font-extrabold text-lg shrink-0 shadow-sm transition-transform group-hover:scale-105
                                        ${activity.status === 'error' ? 'bg-red-50 text-red-600 border-2 border-red-100' :
                                            activity.status === 'success' ? 'bg-emerald-50 text-emerald-600 border-2 border-emerald-100' : 'bg-blue-50 text-blue-600 border-2 border-blue-100'}`
                                    }>
                                        {activity.user.charAt(0).toUpperCase()}
                                    </div>
                                    <div className="flex-1 min-w-0 pt-0.5">
                                        <div className="flex items-center justify-between gap-2">
                                            <p className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                                                {activity.user}
                                            </p>
                                            <span className="text-[10px] text-slate-400 font-bold whitespace-nowrap bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full uppercase tracking-wider">{activity.time}</span>
                                        </div>
                                        <p className="text-sm text-slate-500 dark:text-slate-400 font-medium mt-0.5 truncate">
                                            {activity.action}
                                        </p>
                                        {activity.amount && (
                                            <p className={`text-sm font-extrabold mt-1.5 ${activity.amount.startsWith('-') ? 'text-emerald-500' :
                                                activity.status === 'error' ? 'text-red-500' : 'text-slate-700 dark:text-slate-300'
                                                }`}>
                                                {activity.amount}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
