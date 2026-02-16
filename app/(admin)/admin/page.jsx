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
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-8">
            <div className="max-w-7xl mx-auto">
                <div className="mb-8">
                    <h1 className="text-4xl font-bold text-gray-900 mb-2">Admin Dashboard</h1>
                    <p className="text-gray-600">Platform overview and management</p>
                </div>

                {/* KPI Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    {/* Total Revenue */}
                    <div className="bg-white rounded-xl shadow-lg p-6">
                        <p className="text-sm text-gray-600 mb-2">Total Revenue</p>
                        <p className="text-3xl font-bold text-blue-600">{formatPrice(revenueData)}</p>
                    </div>

                    {/* Active Merchants */}
                    <div className="bg-white rounded-xl shadow-lg p-6">
                        <p className="text-sm text-gray-600 mb-2">Active Merchants</p>
                        <p className="text-3xl font-bold text-purple-600">{activeMerchantsCount}</p>
                    </div>

                    {/* Total Coupons */}
                    <div className="bg-white rounded-xl shadow-lg p-6">
                        <p className="text-sm text-gray-600 mb-2">Total Coupons</p>
                        <p className="text-3xl font-bold text-green-600">{totalCouponsCount}</p>
                    </div>

                    {/* Today Sales */}
                    <div className="bg-white rounded-xl shadow-lg p-6">
                        <p className="text-sm text-gray-600 mb-2">Today's Sales</p>
                        <p className="text-3xl font-bold text-orange-600">{todaySalesCount}</p>
                    </div>
                </div>

                {/* Pending Approvals */}
                {pendingApprovals.length > 0 && (
                    <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-2xl font-bold text-gray-900">Pending Merchant Approvals</h2>
                            <Link href="/admin/merchants" className="text-blue-600 hover:text-blue-800 text-sm font-semibold">
                                View All
                            </Link>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Business Name</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Applied Date</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {pendingApprovals.map((merchant) => (
                                        <tr key={merchant.id}>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                                {merchant.business_name}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {new Date(merchant.created_at).toLocaleDateString()}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                                                    Pending
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                <Link href={`/admin/merchants?id=${merchant.id}`} className="text-indigo-600 hover:text-indigo-900">
                                                    Review
                                                </Link>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* Recent Transactions */}
                <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-2xl font-bold text-gray-900">Recent Transactions</h2>
                        <Link href="/admin/transactions" className="text-blue-600 hover:text-blue-800 text-sm font-semibold">
                            View All
                        </Link>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Buyer</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Brand</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Merchant</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {recentTransactions.length > 0 ? (
                                    recentTransactions.map((tx) => (
                                        <tr key={tx.id}>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {new Date(tx.created_at).toLocaleDateString()}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                                {tx.buyer_name}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {tx.brand}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {tx.merchant_name}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-semibold">
                                                {formatPrice(tx.amount_paise)}
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="5" className="px-6 py-4 text-center text-gray-500">
                                            No recent transactions
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Quick Actions */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <Link href="/admin/giftcards" className="p-4 bg-purple-50 hover:bg-purple-100 rounded-lg text-left transition-colors">
                        <div className="text-2xl mb-2">🎁</div>
                        <p className="font-semibold text-gray-900">Gift Cards</p>
                        <p className="text-sm text-gray-600">Manage inventory</p>
                    </Link>

                    <Link href="/admin/coupons" className="p-4 bg-blue-50 hover:bg-blue-100 rounded-lg text-left transition-colors">
                        <div className="text-2xl mb-2">🎟️</div>
                        <p className="font-semibold text-gray-900">Manage Coupons</p>
                        <p className="text-sm text-gray-600">Create & edit</p>
                    </Link>

                    <Link href="/admin/users" className="p-4 bg-green-50 hover:bg-green-100 rounded-lg text-left transition-colors">
                        <div className="text-2xl mb-2">👥</div>
                        <p className="font-semibold text-gray-900">User Management</p>
                        <p className="text-sm text-gray-600">Roles & KYC</p>
                    </Link>

                    <Link href="/admin/merchants" className="p-4 bg-orange-50 hover:bg-orange-100 rounded-lg text-left transition-colors">
                        <div className="text-2xl mb-2">🏪</div>
                        <p className="font-semibold text-gray-900">Merchants</p>
                        <p className="text-sm text-gray-600">Approvals & list</p>
                    </Link>
                </div>
            </div>
        </div>
    );
}
