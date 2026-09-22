import { createServerSupabaseClient, createAdminClient } from '@/lib/supabaseServer';
import { getAmountPaise, COMPLETED_STATUSES } from '@/lib/utils/transactionHelpers';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import AdminClock from './AdminClock';
import AdminStatsCards from '@/components/admin/AdminStatsCards';
import PageGuideWrapper from '@/components/admin/PageGuideWrapper';
import { QuickActionsDesktop, QuickActionsMobile } from '@/components/admin/QuickActions';
import { getTodayISTBoundaries } from '@/lib/utils/dateIst';
import { isPendingActionOrder } from '@/lib/merchant/orderMetrics';
import AdminRecentTransactions from '@/components/admin/AdminRecentTransactions';

// Helper to format category & display metadata
function getTransactionCategory(udf1) {
    const map = {
        'CART_CHECKOUT': { label: 'Cart Checkout', icon: '🛍️', source: 'Shop Order' },
        'MERCHANT_SUBSCRIPTION': { label: 'Merchant Subscription', icon: '🏪', source: 'Subscription' },
        'MERCHANT_TOPUP': { label: 'Merchant Top-up', icon: '💼', source: 'Merchant Wallet' },
        'WALLET_TOPUP': { label: 'Wallet Top-up', icon: '💳', source: 'Customer Wallet' },
        'GIFT_CARD': { label: 'Gift Card', icon: '🎁', source: 'Gift Card sale' },
        'WHOLESALE_PURCHASE': { label: 'Wholesale Purchase', icon: '📦', source: 'Wholesale Order' },
        'AI_ORDER': { label: 'AI Order', icon: '🤖', source: 'AI Platform' },
        'INVOICE_PAY': { label: 'Invoice Payment', icon: '📄', source: 'Invoice' },
        'GOLD_SUBSCRIPTION': { label: 'Gold Subscription', icon: '🏆', source: 'Gold Member' },
        'UDHARI_PAYMENT': { label: 'Udhari Settlement', icon: '🤝', source: 'Udhari' },
        'MERCHANT_LOCKIN': { label: 'Merchant Lock-in', icon: '🔒', source: 'Lock-in' }
    };
    if (udf1 && map[udf1]) return map[udf1];
    return { label: udf1 ? udf1.replace(/_/g, ' ') : 'Platform Payment', icon: '⚡', source: 'Platform Payment' };
}

// Helper to format price
function formatPrice(paise) {
    if (paise === null || paise === undefined) return '₹0.00';
    return `₹${(paise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default async function AdminDashboard() {
    // Use session-aware client to identify the user (reads cookies)
    const authSupabase = await createServerSupabaseClient();
    const { data: { user } } = await authSupabase.auth.getUser();

    if (!user) {
        redirect('/login');
    }

    // Use admin client to bypass RLS for all data queries
    const supabase = createAdminClient();

    const { data: profile } = await supabase
        .from('user_profiles')
        .select('role')
        .eq('id', user.id)
        .single();

    if (!['admin', 'super_admin'].includes(profile?.role)) {
        redirect('/dashboard');
    }

    const { start: todayStartIST, end: todayEndIST } = getTodayISTBoundaries();

    // 2. Fetch Data in Parallel
    const [
        revenueData,
        activeMerchantsCount,
        totalCouponsCount,
        todaySalesData,
        recentTransactions,
        pendingApprovals,
        shoppingStats,
        totalLeadsCount,
        totalEmployeesCount,
        pendingAccessRequests
    ] = await Promise.all([
        // 1. Total Revenue (from transactions table + shopping_order_groups confirmed sales)
        Promise.all([
            supabase.from('transactions')
                .select('total_paid_paise, amount')
                .in('status', COMPLETED_STATUSES),
            supabase.from('shopping_order_groups')
                .select('total_amount_paise')
                .in('delivery_status', ['packed', 'shipped', 'delivered'])
        ]).then(([txns, groups]) => {
            const txnRev = (txns.data || []).reduce((sum, tx) => sum + getAmountPaise(tx), 0);
            const groupRev = (groups.data || []).reduce((sum, g) => sum + (Number(g.total_amount_paise) || 0), 0);
            return txnRev + groupRev;
        }),

        // 2. Active Merchants (User Profiles with role 'merchant')
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

        // 4. Today Sales (from transactions table + shopping_order_groups packed today)
        Promise.all([
            supabase.from('transactions')
                .select('id, total_paid_paise, amount')
                .in('status', COMPLETED_STATUSES)
                .gte('created_at', todayStartIST)
                .lte('created_at', todayEndIST),
            supabase.from('shopping_order_groups')
                .select('id, total_amount_paise')
                .in('delivery_status', ['packed', 'shipped', 'delivered'])
                .gte('packed_at', todayStartIST)
                .lte('packed_at', todayEndIST)
        ]).then(([txns, groups]) => {
            const count = (txns.data?.length || 0) + (groups.data?.length || 0);
            const txnRev = (txns.data || []).reduce((sum, tx) => sum + getAmountPaise(tx), 0);
            const groupRev = (groups.data || []).reduce((sum, g) => sum + (Number(g.total_amount_paise) || 0), 0);
            return { count, revenue: txnRev + groupRev };
        }),

        // 5. Recent Transactions - Merged from transactions and non-gateway shopping orders
        Promise.all([
            // Gateway & Platform Transactions
            supabase.from('transactions')
                .select('id, user_id, udf1, udf2, total_paid_paise, amount, paid_amount, paid_amount_paise, payment_mode, created_at, status, user:user_profiles(id, full_name, email, avatar_url, role)')
                .in('status', ['gateway_success', 'completed'])
                .order('created_at', { ascending: false })
                .limit(10),
            // Standalone Wallet & Store-Credit Shop Orders (distinct from gateway transactions)
            supabase.from('shopping_order_groups')
                .select('id, customer_id, total_amount_paise, payment_method, created_at, status')
                .eq('status', 'completed')
                .neq('payment_method', 'gateway')
                .order('created_at', { ascending: false })
                .limit(10)
        ]).then(async ([txnRes, shopRes]) => {
            const txns = txnRes.data || [];
            const shops = shopRes.data || [];

            // Fetch profiles for shop orders
            const shopCustomerIds = [...new Set(shops.map(s => s.customer_id).filter(Boolean))];
            let customerMap = {};
            if (shopCustomerIds.length > 0) {
                const { data: profiles } = await supabase
                    .from('user_profiles')
                    .select('id, full_name, email, avatar_url')
                    .in('id', shopCustomerIds);
                (profiles || []).forEach(p => { customerMap[p.id] = p; });
            }

            const formattedTxns = txns.map(t => {
                const cat = getTransactionCategory(t.udf1);
                return {
                    id: t.id,
                    user_id: t.user_id,
                    amount: getAmountPaise(t),
                    created_at: t.created_at,
                    buyer_name: t.user?.full_name?.trim() || t.user?.email || 'User',
                    avatar_url: t.user?.avatar_url || null,
                    brand: cat.label,
                    icon: cat.icon,
                    merchant_name: t.payment_mode || 'Direct Gateway',
                    source: cat.source,
                    type: t.udf1 || 'TRANSACTION'
                };
            });

            const formattedShops = shops.map(s => {
                const profile = customerMap[s.customer_id];
                return {
                    id: s.id,
                    user_id: s.customer_id,
                    amount: Number(s.total_amount_paise) || 0,
                    created_at: s.created_at,
                    buyer_name: profile?.full_name?.trim() || profile?.email || 'Customer',
                    avatar_url: profile?.avatar_url || null,
                    brand: 'Shop Order',
                    icon: '🛍️',
                    merchant_name: s.payment_method === 'wallet' ? 'Wallet Payment' : 'Store Credit',
                    source: 'Customer Shop Order',
                    type: 'SHOP_ORDER'
                };
            });

            return [...formattedTxns, ...formattedShops]
                .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
                .slice(0, 10);
        }),

        // 6. Pending Approvals
        supabase.from('merchants')
            .select('*')
            .eq('status', 'pending')
            .order('created_at', { ascending: false })
            .limit(5)
            .then(({ data }) => data || []),

        // 7. Shopping Stats (Detailed Dashboard Metrics)
        supabase.from('shopping_order_groups')
            .select('total_amount_paise, delivery_status, is_platform_order, status, payment_status, payment_method')
            .then(({ data, error }) => {
                if (error) {
                    return { revenue: 0, sales: 0, pendingOrders: 0, platformRevenue: 0, commissionRevenue: 0 };
                }
                return (data || []).reduce((acc, order) => {
                    const isPacked = ['packed', 'shipped', 'delivered'].includes((order.delivery_status || '').toLowerCase());
                    if (isPacked) {
                        acc.revenue += Number(order.total_amount_paise) || 0;
                        acc.sales += 1;
                        if (order.is_platform_order) acc.platformRevenue += Number(order.total_amount_paise) || 0;
                        else acc.commissionRevenue += Math.round((Number(order.total_amount_paise) || 0) * 0.05);
                    }
                    if (isPendingActionOrder(order)) acc.pendingOrders += 1;
                    return acc;
                }, { revenue: 0, sales: 0, pendingOrders: 0, platformRevenue: 0, commissionRevenue: 0 });
            }),

        // 8. CRM Leads Total
        supabase.from('crm_leads')
            .select('*', { count: 'exact', head: true })
            .neq('source', 'Users')
            .neq('source', 'App User')
            .then(({ count, error }) => {
                if (error) console.error('Error fetching leads count:', error);
                return count || 0;
            }),

        // 9. Total Employees (Including HR, support, etc. basically anyone not admin, user, merchant)
        supabase.from('user_profiles')
            .select('*', { count: 'exact', head: true })
            .in('role', [
                'employee', 'hr_manager', 'relationship_exec', 'relationship_manager',
                'freelancer', 'video_editor', 'social_media_manager',
                'seo_specialist', 'advertiser', 'support_agent'
            ])
            .then(({ count, error }) => {
                if (error) console.error('Error fetching employees count:', error.message || error);
                return count || 0;
            }),

        // 10. Pending Panel Access Requests — count only
        supabase.from('panel_access_requests')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'pending')
            .then(({ count }) => count || 0)
    ]);

    return (
        <div className="min-h-screen bg-[#F8FAFC] font-[family-name:var(--font-outfit)]">
            <div className="max-w-7xl mx-auto p-4 md:p-6 lg:p-8 space-y-4 md:space-y-8">
                {/* Header Section */}
                <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-2">
                    <div className="space-y-1">
                        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-900 tracking-tight">
                            Platform Overview
                        </h1>
                        <p className="text-slate-500 font-medium">
                            Monitor metrics, manage merchants, and track revenue.
                        </p>
                    </div>
                    <div className="flex flex-col items-start sm:items-end gap-3">
                        <div className="flex items-center gap-2">
                            <PageGuideWrapper pageKey="/admin" />
                            <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 rounded-full border border-emerald-100 shadow-sm transition-all hover:scale-105">
                                <span className="relative flex h-2.5 w-2.5">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                                </span>
                                <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">
                                    Live
                                </span>
                            </div>
                        </div>
                        <AdminClock />
                    </div>
                </div>

                {/* KPI Glass Cards - Real-time Client Component */}
                <AdminStatsCards
                    initialData={{
                        grossRevenue: revenueData,
                        todayRevenue: todaySalesData.revenue,
                        todayOrders: todaySalesData.count,
                        activeMerchantsCount,
                        totalCouponsCount,
                        shoppingStats,
                        totalLeadsCount,
                        totalEmployeesCount,
                    }}
                />

                <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 md:gap-8">
                    {/* Left Column: Transactions & Approvals */}
                    <div className="xl:col-span-2 space-y-8">
                        {/* Pending Panel Access — summary card linking to Career Applications */}
                        {pendingAccessRequests > 0 && (
                            <Link
                                href="/admin/careers?filter=pending_access"
                                className="flex items-center justify-between p-5 bg-indigo-600 rounded-3xl shadow-lg hover:bg-indigo-700 transition-colors group"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                                    </div>
                                    <div>
                                        <p className="text-white/70 text-xs font-bold uppercase tracking-widest">Action Required</p>
                                        <p className="text-white text-xl font-extrabold mt-0.5">{pendingAccessRequests} Pending Access Request{pendingAccessRequests !== 1 ? 's' : ''}</p>
                                        <p className="text-white/60 text-xs mt-0.5">Review in Career Applications →</p>
                                    </div>
                                </div>
                                <div className="w-10 h-10 rounded-xl bg-white/10 group-hover:bg-white/20 flex items-center justify-center transition-colors">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                                </div>
                            </Link>
                        )}

                        {/* Pending Approvals Section */}
                        {pendingApprovals.length > 0 ? (
                            <div className="bg-white backdrop-blur-xl rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                        <div className="p-4 md:p-6 border-b border-gray-100 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-500">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                                        </div>
                                        <div>
                                            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Action Required</h2>
                                            <p className="text-sm font-medium text-gray-500">Pending Merchant Approvals</p>
                                        </div>
                                    </div>
                                    <Link href="/admin/merchants" className="inline-flex items-center justify-center min-h-[44px] min-w-[44px] px-4 py-2 bg-slate-50 hover:bg-slate-100 rounded-xl text-sm font-semibold text-slate-700 transition-colors">
                                        View All
                                    </Link>
                                </div>
                                <div className="divide-y divide-gray-50">
                                    {pendingApprovals.map((merchant) => (
                                        <div key={merchant.id} className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-gradient-to-r hover:from-slate-50 hover:to-transparent dark:hover:from-white/[0.02] dark:hover:to-transparent transition-all">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center text-gray-500 text-lg font-bold shadow-inner">
                                                    {merchant.business_name?.charAt(0) || 'M'}
                                                </div>
                                                <div>
                                                    <h3 className="text-base font-bold text-slate-900">{merchant.business_name}</h3>
                                                    <p className="text-sm text-slate-500">Applied {new Date(merchant.created_at).toLocaleDateString()}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <span className="px-3 py-1 bg-amber-50 text-amber-600 text-xs font-bold rounded-lg border border-amber-100">
                                                    Review Pending
                                                </span>
                                                <Link
                                                    href={`/admin/merchants?id=${merchant.id}`}
                                                    aria-label={`Review ${merchant.business_name}`}
                                                    className="flex items-center justify-center min-h-[44px] min-w-[44px] p-2.5 text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors"
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
                        <div className="bg-white backdrop-blur-xl rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                            <div className="p-4 md:p-6 border-b border-gray-100 flex justify-between items-center">
                                <div>
                                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Transactions</h2>
                                    <p className="text-sm font-medium text-gray-500">Latest platform orders</p>
                                </div>
                                <Link href="/admin/transactions" className="inline-flex items-center justify-center min-h-[44px] min-w-[44px] px-4 py-2 bg-slate-50 hover:bg-slate-100 rounded-xl text-sm font-semibold text-slate-700 transition-colors">
                                    View All
                                </Link>
                            </div>
                            {/* Recent Transactions List & Table */}
                            <AdminRecentTransactions transactions={recentTransactions} />
                        </div>
                    </div>

                    {/* Right Column: Desktop Quick Actions Grid (Hidden on Mobile) */}
                    <QuickActionsDesktop
                        shoppingStats={shoppingStats}
                        className="xl:col-span-1"
                    />
                </div>

                {/* Mobile Floating Action Button (FAB) & Bottom Sheet Drawer */}
                <QuickActionsMobile shoppingStats={shoppingStats} />
            </div>
        </div>
    );
}
