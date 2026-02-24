import { Download, Filter, Activity, TrendingUp, TrendingDown } from "lucide-react";
import TransactionCard from "@/components/admin/transactions/TransactionCard";
import { createServerSupabaseClient } from '@/lib/supabaseServer';

export default async function TransactionsPage() {
    const supabase = await createServerSupabaseClient();

    // Fetch orders
    let { data: orders, error } = await supabase
        .from('orders')
        .select(`
            id,
            amount,
            created_at,
            payment_status,
            user_id
        `)
        .order('created_at', { ascending: false });

    if (error) {
        console.error("Failed to fetch orders for transactions:", error);
        orders = [];
    }

    // Fetch user profiles for mapping roles
    let profileMap = {};
    if (orders && orders.length > 0) {
        const userIds = [...new Set(orders.map(o => o.user_id))];
        const { data: profiles } = await supabase
            .from('user_profiles')
            .select('id, full_name, email, role')
            .in('id', userIds);

        profiles?.forEach(p => {
            profileMap[p.id] = p;
        });
    }

    // Map into expected transaction format
    const transactions = (orders || []).map(order => {
        const profile = profileMap[order.user_id] || {};
        const isSuccess = order.payment_status === 'paid';
        const isFail = order.payment_status === 'failed';

        return {
            id: order.id,
            user: profile.full_name || profile.email || 'Unknown User',
            email: profile.email || order.user_id,
            role: profile.role || 'user',
            amount: `₹${((order.amount || 0) / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
            date: new Date(order.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
            status: isSuccess ? 'Success' : isFail ? 'Failed' : 'Processing',
            type: 'Credit', // Orders are considered inbound (Credit)
        };
    });

    const stats = {
        total: transactions.length,
        received: transactions.filter(t => t.type === 'Credit').length,
        sent: transactions.filter(t => t.type === 'Debit').length,
    };

    return (
        <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto font-[family-name:var(--font-outfit)] space-y-8">
            {/* Header Section */}
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                <div className="space-y-1">
                    <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
                        <Activity className="text-blue-500 w-10 h-10" />
                        Transactions
                    </h1>
                    <p className="text-slate-500 font-medium">
                        Monitor platform activity, analyze funds flow, and manage settlements.
                    </p>
                </div>
                <div className="flex gap-3">
                    <button className="flex items-center gap-2 px-5 py-2.5 bg-white text-slate-700 text-sm font-bold rounded-2xl border border-slate-200 hover:border-slate-300 hover:shadow-md transition-all">
                        <Download size={18} strokeWidth={2.5} />
                        Export
                    </button>
                    <button className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-sm font-bold rounded-2xl border border-slate-900 shadow-md hover:shadow-lg hover:shadow-slate-900/20 transition-all">
                        <Filter size={18} strokeWidth={2.5} />
                        Filter
                    </button>
                </div>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
                <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm relative overflow-hidden group">
                    <div className="absolute -right-6 -top-6 w-24 h-24 bg-blue-50 rounded-full group-hover:scale-110 transition-transform duration-500" />
                    <div className="relative flex items-center justify-between">
                        <div>
                            <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-1">Total Txns</p>
                            <p className="text-4xl font-extrabold text-slate-900">{stats.total}</p>
                        </div>
                        <div className="w-14 h-14 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center shadow-sm text-blue-600">
                            <Activity size={28} strokeWidth={2.5} />
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm relative overflow-hidden group">
                    <div className="absolute -right-6 -top-6 w-24 h-24 bg-emerald-50 rounded-full group-hover:scale-110 transition-transform duration-500" />
                    <div className="relative flex items-center justify-between">
                        <div>
                            <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-1">Received (Credit)</p>
                            <p className="text-4xl font-extrabold text-emerald-600">{stats.received}</p>
                        </div>
                        <div className="w-14 h-14 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center shadow-sm text-emerald-500">
                            <TrendingDown size={28} strokeWidth={2.5} />
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm relative overflow-hidden group">
                    <div className="absolute -right-6 -top-6 w-24 h-24 bg-sky-50 rounded-full group-hover:scale-110 transition-transform duration-500" />
                    <div className="relative flex items-center justify-between">
                        <div>
                            <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-1">Sent (Debit)</p>
                            <p className="text-4xl font-extrabold text-sky-500">{stats.sent}</p>
                        </div>
                        <div className="w-14 h-14 rounded-2xl bg-sky-50 border border-sky-100 flex items-center justify-center shadow-sm text-sky-500">
                            <TrendingUp size={28} strokeWidth={2.5} />
                        </div>
                    </div>
                </div>
            </div>

            {/* Transactions Grid */}
            {transactions.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-slate-300 shadow-sm">
                    <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <Activity size={32} className="text-slate-400" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 mb-1">No transactions found</h3>
                    <p className="text-slate-500 font-medium">Activities will appear here once users start sending or receiving funds.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {transactions.map((txn) => (
                        <TransactionCard key={txn.id} txn={txn} />
                    ))}
                </div>
            )}
        </div>
    );
}
