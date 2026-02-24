import { createServerSupabaseClient } from '@/lib/supabaseServer';
import { redirect } from 'next/navigation';
import Link from 'next/link';

// Helper to format price
function formatPrice(paise) {
    if (paise === null || paise === undefined) return '₹0.00';
    return `₹${(paise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default async function AdminDashboard() {
    const supabase = await createServerSupabaseClient();

    // 1. Check Auth & Role
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect('/login');
    }

    const { data: profile } = await supabase
        .from('user_profiles')
        .select('role')
        .eq('id', user.id)
        .single();

    if (profile?.role !== 'admin') {
        redirect('/dashboard');
    }

    // 2. Fetch Data in Parallel
    const [
        revenueData,
        activeMerchantsCount,
        totalCouponsCount,
        todaySalesCount,
        recentTransactions,
        pendingApprovals
    ] = await Promise.all([
        // 1. Total Revenue (Paid Orders)
        supabase.from('orders')
            .select('amount_paise')
            .eq('payment_status', 'paid')
            .then(({ data, error }) => {
                if (error) {
                    console.error('Error fetching revenue:', error);
                    return 0;
                }
                return data.reduce((sum, order) => sum + (order.amount_paise || 0), 0);
            }),

        // 2. Active Merchants (User Profiles with role 'merchant')
        // Prompt requested source: user_profiles
        supabase.from('user_profiles')
            .select('*', { count: 'exact', head: true })
            .eq('role', 'merchant')
            .then(({ count, error }) => {
                if (error) console.error('Error fetching merchants count:', error);
                return count || 0;
            }),

        // 3. Total Coupons
        supabase.from('coupons')
            .select('*', { count: 'exact', head: true })
            .then(({ count, error }) => {
                if (error) console.error('Error fetching coupons count:', error);
                return count || 0;
            }),

        // 4. Today Sales
        supabase.from('orders')
            .select('*', { count: 'exact', head: true })
            .eq('payment_status', 'paid')
            .gte('created_at', new Date().toISOString().split('T')[0]) // YYYY-MM-DD
            .then(({ count, error }) => {
                if (error) console.error('Error fetching today sales:', error);
                return count || 0;
            }),

        // 5. Recent Transactions - Optimized single query
        supabase.from('orders')
            .select(`
                id,
                amount_paise,
                created_at,
                payment_status,
                user_id,
                giftcard_id,
                coupons (
                    id,
                    brand,
                    merchant_id,
                    merchants (
                        id,
                        business_name
                    )
                )
            `)
            .eq('payment_status', 'paid')
            .order('created_at', { ascending: false })
            .limit(10)
            .then(async ({ data: orders, error }) => {
                if (error) {
                    console.error('Error fetching transactions:', error);
                    return [];
                }

                if (!orders?.length) return [];

                // Fetch all user profiles in parallel with orders query
                const userIds = [...new Set(orders.map(o => o.user_id))];
                const profileQuery = supabase
                    .from('user_profiles')
                    .select('id, full_name, email')
                    .in('id', userIds);

                const { data: profiles } = await profileQuery;
                const profileMap = (profiles || []).reduce((acc, p) => ({ ...acc, [p.id]: p }), {});

                return orders.map(order => ({
                    ...order,
                    buyer_name: profileMap[order.user_id]?.full_name || profileMap[order.user_id]?.email || 'Unknown User',
                    brand: order.coupons?.brand || 'Unknown Brand',
                    merchant_name: order.coupons?.merchants?.business_name || 'Platform'
                }));
            }),

        // 6. Pending Approvals
        supabase.from('merchants')
            .select('*')
            .eq('status', 'pending')
            .order('created_at', { ascending: false })
            .limit(5)
            .then(({ data, error }) => {
                if (error) console.error('Error fetching pending approvals:', error);
                return data || [];
            })
    ]);

    return (
        <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0B0F19] font-[family-name:var(--font-outfit)]">
            <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
                {/* Header Section */}
                <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-2">
                    <div className="space-y-1">
                        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                            Platform Overview
                        </h1>
                        <p className="text-slate-500 dark:text-gray-400 font-medium">
                            Monitor metrics, manage merchants, and track revenue.
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="relative flex h-3 w-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                        </span>
                        <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">
                            System Live
                        </span>
                    </div>
                </div>

                {/* KPI Glass Cards - Mobile Horizontal Scroll */}
                <div className="flex overflow-x-auto pb-6 -mx-4 px-4 sm:mx-0 sm:px-0 sm:grid sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 hide-scrollbar snap-x snap-mandatory">
                    {/* Revenue Card */}
                    <div className="snap-center shrink-0 w-[85vw] sm:w-auto relative group overflow-hidden bg-white dark:bg-gray-800/50 backdrop-blur-xl rounded-3xl border border-gray-100 dark:border-gray-700/50 p-6 shadow-sm hover:shadow-xl transition-all duration-300">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 dark:bg-blue-500/20 rounded-bl-full -z-10 group-hover:scale-110 transition-transform duration-500" />
                        <div className="flex items-center justify-between mb-4">
                            <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center text-blue-600 dark:text-blue-400">
                                <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            </div>
                            <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full">Total</span>
                        </div>
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Gross Revenue</p>
                        <h3 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">{formatPrice(revenueData)}</h3>
                    </div>

                    {/* Active Merchants */}
                    <div className="snap-center shrink-0 w-[85vw] sm:w-auto relative group overflow-hidden bg-white dark:bg-gray-800/50 backdrop-blur-xl rounded-3xl border border-gray-100 dark:border-gray-700/50 p-6 shadow-sm hover:shadow-xl transition-all duration-300">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 dark:bg-purple-500/20 rounded-bl-full -z-10 group-hover:scale-110 transition-transform duration-500" />
                        <div className="flex items-center justify-between mb-4">
                            <div className="w-12 h-12 rounded-2xl bg-purple-50 dark:bg-purple-500/10 flex items-center justify-center text-purple-600 dark:text-purple-400">
                                <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                            </div>
                        </div>
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Active Merchants</p>
                        <h3 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">{activeMerchantsCount}</h3>
                    </div>

                    {/* Total Coupons */}
                    <div className="snap-center shrink-0 w-[85vw] sm:w-auto relative group overflow-hidden bg-white dark:bg-gray-800/50 backdrop-blur-xl rounded-3xl border border-gray-100 dark:border-gray-700/50 p-6 shadow-sm hover:shadow-xl transition-all duration-300">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 dark:bg-emerald-500/20 rounded-bl-full -z-10 group-hover:scale-110 transition-transform duration-500" />
                        <div className="flex items-center justify-between mb-4">
                            <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                                <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" /></svg>
                            </div>
                        </div>
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Total Coupons Listed</p>
                        <h3 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">{totalCouponsCount}</h3>
                    </div>

                    {/* Today's Sales */}
                    <div className="snap-center shrink-0 w-[85vw] sm:w-auto relative group overflow-hidden bg-white dark:bg-gray-800/50 backdrop-blur-xl rounded-3xl border border-gray-100 dark:border-gray-700/50 p-6 shadow-sm hover:shadow-xl transition-all duration-300">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/10 dark:bg-orange-500/20 rounded-bl-full -z-10 group-hover:scale-110 transition-transform duration-500" />
                        <div className="flex items-center justify-between mb-4">
                            <div className="w-12 h-12 rounded-2xl bg-orange-50 dark:bg-orange-500/10 flex items-center justify-center text-orange-600 dark:text-orange-400">
                                <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
                            </div>
                            <span className="text-xs font-bold text-orange-600 bg-orange-50 px-2.5 py-1 rounded-full">Today</span>
                        </div>
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Orders Today</p>
                        <h3 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">{todaySalesCount}</h3>
                    </div>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                    {/* Left Column: Transactions & Approvals */}
                    <div className="xl:col-span-2 space-y-8">
                        {/* Pending Approvals Section */}
                        {pendingApprovals.length > 0 ? (
                            <div className="bg-white dark:bg-gray-800/50 backdrop-blur-xl rounded-3xl border border-gray-100 dark:border-gray-700/50 shadow-sm overflow-hidden">
                                <div className="p-6 border-b border-gray-100 dark:border-gray-700/50 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center text-amber-500">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                                        </div>
                                        <div>
                                            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Action Required</h2>
                                            <p className="text-sm font-medium text-gray-500">Pending Merchant Approvals</p>
                                        </div>
                                    </div>
                                    <Link href="/admin/merchants" className="px-4 py-2 bg-slate-50 hover:bg-slate-100 dark:bg-gray-700 dark:hover:bg-gray-600 rounded-xl text-sm font-semibold text-slate-700 dark:text-gray-200 transition-colors">
                                        View All
                                    </Link>
                                </div>
                                <div className="divide-y divide-gray-50 dark:divide-gray-700/50">
                                    {pendingApprovals.map((merchant) => (
                                        <div key={merchant.id} className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/50 dark:hover:bg-gray-700/20 transition-colors">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600 flex items-center justify-center text-gray-500 text-lg font-bold shadow-inner">
                                                    {merchant.business_name?.charAt(0) || 'M'}
                                                </div>
                                                <div>
                                                    <h3 className="text-base font-bold text-slate-900 dark:text-white">{merchant.business_name}</h3>
                                                    <p className="text-sm text-slate-500 dark:text-gray-400">Applied {new Date(merchant.created_at).toLocaleDateString()}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <span className="px-3 py-1 bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs font-bold rounded-lg border border-amber-100 dark:border-amber-500/20">
                                                    Review Pending
                                                </span>
                                                <Link
                                                    href={`/admin/merchants?id=${merchant.id}`}
                                                    className="p-2 text-indigo-600 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-500/10 rounded-xl transition-colors"
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                                                </Link>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : null}

                        {/* Recent Transactions Section */}
                        <div className="bg-white dark:bg-gray-800/50 backdrop-blur-xl rounded-3xl border border-gray-100 dark:border-gray-700/50 shadow-sm overflow-hidden">
                            <div className="p-6 border-b border-gray-100 dark:border-gray-700/50 flex justify-between items-center">
                                <div>
                                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">Recent Transactions</h2>
                                    <p className="text-sm font-medium text-gray-500">Latest platform orders</p>
                                </div>
                                <Link href="/admin/transactions" className="px-4 py-2 bg-slate-50 hover:bg-slate-100 dark:bg-gray-700 dark:hover:bg-gray-600 rounded-xl text-sm font-semibold text-slate-700 dark:text-gray-200 transition-colors">
                                    View All
                                </Link>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-slate-50/50 dark:bg-gray-800/30 text-xs uppercase tracking-wider text-slate-500 dark:text-gray-400 font-semibold border-b border-gray-100 dark:border-gray-700/50">
                                            <th className="p-4 pl-6">Buyer</th>
                                            <th className="p-4">Gift Card</th>
                                            <th className="p-4">Sold By</th>
                                            <th className="p-4">Date</th>
                                            <th className="p-4 pr-6 text-right">Amount</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50 dark:divide-gray-700/50">
                                        {recentTransactions.length > 0 ? (
                                            recentTransactions.map((tx) => (
                                                <tr key={tx.id} className="hover:bg-slate-50/50 dark:hover:bg-gray-700/20 transition-colors group">
                                                    <td className="p-4 pl-6 font-medium text-slate-900 dark:text-white flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center text-xs font-bold">
                                                            {tx.buyer_name?.charAt(0)}
                                                        </div>
                                                        {tx.buyer_name}
                                                    </td>
                                                    <td className="p-4 text-slate-600 dark:text-gray-300">
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-6 h-6 rounded bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-[10px]">🎁</div>
                                                            {tx.brand}
                                                        </div>
                                                    </td>
                                                    <td className="p-4 text-sm font-medium text-slate-600 dark:text-gray-300">
                                                        {tx.merchant_name}
                                                    </td>
                                                    <td className="p-4 text-sm text-slate-500 dark:text-gray-400">
                                                        {new Date(tx.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                    </td>
                                                    <td className="p-4 pr-6 text-right font-bold text-slate-900 dark:text-white">
                                                        {formatPrice(tx.amount_paise)}
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan="5" className="p-12 text-center text-gray-500">
                                                    <div className="flex flex-col items-center justify-center space-y-3">
                                                        <div className="w-16 h-16 bg-gray-50 dark:bg-gray-800 rounded-full flex items-center justify-center">
                                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                                        </div>
                                                        <p>No recent transactions</p>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Quick Links Map */}
                    <div className="xl:col-span-1">
                        <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm sticky top-28">
                            <h2 className="text-xl font-bold text-gray-900 mb-6">Quick Actions</h2>
                            <div className="space-y-4">
                                <Link href="/admin/giftcards" className="group flex items-start gap-4 p-4 rounded-2xl hover:bg-slate-50 border border-transparent hover:border-blue-100 transition-all">
                                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-xl shadow-lg shadow-blue-500/20 group-hover:scale-110 group-hover:rotate-3 transition-transform">
                                        🎁
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors">Gift Cards Platform</h3>
                                        <p className="text-sm text-slate-500 mt-1 leading-snug">Manage global inventory and brand catalogs</p>
                                    </div>
                                </Link>

                                <Link href="/admin/users" className="group flex items-start gap-4 p-4 rounded-2xl hover:bg-slate-50 border border-transparent hover:border-emerald-100 transition-all">
                                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center text-white text-xl shadow-lg shadow-emerald-500/20 group-hover:scale-110 transition-transform">
                                        👥
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="font-bold text-slate-900 group-hover:text-emerald-600 transition-colors">User Management</h3>
                                        <p className="text-sm text-slate-500 mt-1 leading-snug">Handle role assignments and view KYC</p>
                                    </div>
                                </Link>

                                <Link href="/admin/merchants" className="group flex items-start gap-4 p-4 rounded-2xl hover:bg-slate-50 border border-transparent hover:border-sky-100 transition-all">
                                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-sky-500 to-sky-600 flex items-center justify-center text-white text-xl shadow-lg shadow-sky-500/20 group-hover:scale-110 transition-transform">
                                        🏪
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="font-bold text-slate-900 group-hover:text-sky-600 transition-colors">Merchant Directory</h3>
                                        <p className="text-sm text-slate-500 mt-1 leading-snug">Review applications and control access</p>
                                    </div>
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
