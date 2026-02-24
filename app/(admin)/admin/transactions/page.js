import { Download, Activity, TrendingUp, TrendingDown, IndianRupee, Search } from "lucide-react";
import TransactionCard from "@/components/admin/transactions/TransactionCard";
import { createServerSupabaseClient } from '@/lib/supabaseServer';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function TransactionsPage({ searchParams }) {
    const supabase = await createServerSupabaseClient();
    const params = await searchParams;

    // Pagination
    const page = Number(params?.page) || 1;
    const limit = 20;
    const offset = (page - 1) * limit;
    const search = params?.search || '';
    const statusFilter = params?.status || '';
    const sourceFilter = params?.source || '';

    // ──────────────── FETCH ALL 3 TABLES IN PARALLEL ────────────────

    // 1. Payment Gateway transactions (Sabpaisa top-ups, gold subscriptions)
    let txnQuery = supabase
        .from('transactions')
        .select('id, user_id, client_txn_id, amount, status, payer_name, payer_email, payer_mobile, udf1, udf2, created_at', { count: 'exact' })
        .order('created_at', { ascending: false });

    // 2. Orders (gift card purchases)
    let ordersQuery = supabase
        .from('orders')
        .select('id, user_id, amount, payment_status, created_at, giftcard_id', { count: 'exact' })
        .order('created_at', { ascending: false });

    // 3. Customer wallet transactions (wallet credits/debits)
    let walletQuery = supabase
        .from('customer_wallet_transactions')
        .select('id, user_id, amount_paise, type, description, reference_id, reference_type, created_at', { count: 'exact' })
        .order('created_at', { ascending: false });

    const [txnResult, ordersResult, walletResult] = await Promise.all([
        txnQuery,
        ordersQuery,
        walletQuery,
    ]);

    const rawTxns = txnResult.data || [];
    const rawOrders = ordersResult.data || [];
    const rawWallet = walletResult.data || [];

    // ──────────────── FETCH USER PROFILES ────────────────
    const allUserIds = [
        ...new Set([
            ...rawTxns.map(t => t.user_id),
            ...rawOrders.map(o => o.user_id),
            ...rawWallet.map(w => w.user_id),
        ].filter(Boolean))
    ];

    let profileMap = {};
    if (allUserIds.length > 0) {
        // Supabase IN supports up to ~300 IDs; chunk if needed
        const { data: profiles } = await supabase
            .from('user_profiles')
            .select('id, full_name, email, role')
            .in('id', allUserIds.slice(0, 300));
        profiles?.forEach(p => { profileMap[p.id] = p; });
    }

    // ──────────────── BUILD TXN ID MAP (for wallet reference lookups) ────────────────
    const txnIdMap = {};
    rawTxns.forEach(t => {
        txnIdMap[t.id] = t.client_txn_id || t.id;
    });

    // ──────────────── NORMALIZE INTO UNIFIED FORMAT ────────────────
    const unified = [];

    // Gateway transactions
    rawTxns.forEach(t => {
        const profile = profileMap[t.user_id] || {};
        const status = (t.status || '').toUpperCase();
        const isSuccess = status === 'SUCCESS' || status === 'COMPLETED';
        const isFail = status === 'FAILED' || status === 'FAILURE';

        unified.push({
            id: t.client_txn_id || t.id,
            rawId: t.id,
            user: profile.full_name || t.payer_name || 'Unknown',
            email: profile.email || t.payer_email || '',
            role: profile.role || 'user',
            amountRaw: t.amount || 0,
            amount: `₹${(t.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
            date: new Date(t.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
            dateRaw: t.created_at,
            status: isSuccess ? 'Success' : isFail ? 'Failed' : 'Processing',
            type: 'Credit',
            source: 'Payment Gateway',
            description: t.udf1 || 'Wallet Top-up',
        });
    });

    // Orders
    rawOrders.forEach(o => {
        const profile = profileMap[o.user_id] || {};
        const isSuccess = o.payment_status === 'paid';
        const isFail = o.payment_status === 'failed';

        unified.push({
            id: o.id.slice(0, 12),
            rawId: o.id,
            user: profile.full_name || profile.email || 'Unknown',
            email: profile.email || '',
            role: profile.role || 'user',
            amountRaw: (o.amount || 0) / 100,
            amount: `₹${((o.amount || 0) / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
            date: new Date(o.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
            dateRaw: o.created_at,
            status: isSuccess ? 'Success' : isFail ? 'Failed' : 'Processing',
            type: 'Credit',
            source: 'Gift Card Order',
            description: 'Gift Card Purchase',
        });
    });

    // Wallet transactions
    rawWallet.forEach(w => {
        const profile = profileMap[w.user_id] || {};
        const isCredit = w.type === 'credit';

        // Only show ID if it resolves to a real Sabpaisa TXN ID
        const mappedTxnId = w.reference_id ? txnIdMap[w.reference_id] : null;
        const resolvedId = mappedTxnId || null;

        unified.push({
            id: resolvedId,
            rawId: w.id,
            user: profile.full_name || profile.email || 'Unknown',
            email: profile.email || '',
            role: profile.role || 'user',
            amountRaw: (w.amount_paise || 0) / 100,
            amount: `₹${((w.amount_paise || 0) / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
            date: new Date(w.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
            dateRaw: w.created_at,
            status: 'Success',
            type: isCredit ? 'Credit' : 'Debit',
            source: 'Wallet',
            description: w.description || (isCredit ? 'Wallet Credit' : 'Wallet Debit'),
        });
    });

    // Sort all by date (newest first)
    unified.sort((a, b) => new Date(b.dateRaw) - new Date(a.dateRaw));

    // ──────────────── FILTERING ────────────────
    let filtered = unified;

    if (search) {
        const s = search.toLowerCase();
        filtered = filtered.filter(t =>
            t.user.toLowerCase().includes(s) ||
            t.email.toLowerCase().includes(s) ||
            t.id.toLowerCase().includes(s) ||
            t.description.toLowerCase().includes(s)
        );
    }
    if (statusFilter) {
        filtered = filtered.filter(t => t.status === statusFilter);
    }
    if (sourceFilter) {
        filtered = filtered.filter(t => t.source === sourceFilter);
    }

    // ──────────────── STATS (from full dataset before pagination) ────────────────
    const totalCredits = filtered.filter(t => t.type === 'Credit' && t.status === 'Success').reduce((s, t) => s + t.amountRaw, 0);
    const totalDebits = filtered.filter(t => t.type === 'Debit' && t.status === 'Success').reduce((s, t) => s + t.amountRaw, 0);
    const successCount = filtered.filter(t => t.status === 'Success').length;
    const failedCount = filtered.filter(t => t.status === 'Failed').length;

    // ──────────────── PAGINATE ────────────────
    const totalCount = filtered.length;
    const totalPages = Math.ceil(totalCount / limit);
    const paginated = filtered.slice(offset, offset + limit);

    // ──────────────── BUILD SEARCH PARAMS ────────────────
    const buildUrl = (overrides) => {
        const p = new URLSearchParams();
        const newPage = overrides.page ?? page;
        const newSearch = overrides.search ?? search;
        const newStatus = overrides.status ?? statusFilter;
        const newSource = overrides.source ?? sourceFilter;
        if (newPage > 1) p.set('page', newPage.toString());
        if (newSearch) p.set('search', newSearch);
        if (newStatus) p.set('status', newStatus);
        if (newSource) p.set('source', newSource);
        const qs = p.toString();
        return `/admin/transactions${qs ? '?' + qs : ''}`;
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
                        Monitor all platform payments, orders, and wallet activity.
                    </p>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm relative overflow-hidden group">
                    <div className="absolute -right-6 -top-6 w-24 h-24 bg-blue-50 rounded-full group-hover:scale-110 transition-transform duration-500" />
                    <div className="relative">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Total Transactions</p>
                        <p className="text-3xl font-extrabold text-slate-900">{totalCount.toLocaleString()}</p>
                    </div>
                </div>
                <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm relative overflow-hidden group">
                    <div className="absolute -right-6 -top-6 w-24 h-24 bg-emerald-50 rounded-full group-hover:scale-110 transition-transform duration-500" />
                    <div className="relative">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Total Credits</p>
                        <p className="text-2xl font-extrabold text-emerald-600">₹{totalCredits.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
                        <p className="text-xs font-bold text-emerald-500 mt-1">{successCount} successful</p>
                    </div>
                </div>
                <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm relative overflow-hidden group">
                    <div className="absolute -right-6 -top-6 w-24 h-24 bg-red-50 rounded-full group-hover:scale-110 transition-transform duration-500" />
                    <div className="relative">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Total Debits</p>
                        <p className="text-2xl font-extrabold text-red-600">₹{totalDebits.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
                        <p className="text-xs font-bold text-red-500 mt-1">{failedCount} failed</p>
                    </div>
                </div>
                <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm relative overflow-hidden group">
                    <div className="absolute -right-6 -top-6 w-24 h-24 bg-indigo-50 rounded-full group-hover:scale-110 transition-transform duration-500" />
                    <div className="relative">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Net Flow</p>
                        <p className={`text-2xl font-extrabold ${totalCredits - totalDebits >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                            ₹{(totalCredits - totalDebits).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </p>
                    </div>
                </div>
            </div>

            {/* Search & Filters */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <form className="relative flex-1 w-full sm:max-w-sm" action="/admin/transactions" method="GET">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                        type="text"
                        name="search"
                        placeholder="Search by name, email, or ID..."
                        defaultValue={search}
                        className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-2xl text-sm font-medium text-slate-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none shadow-sm"
                    />
                    {/* Preserve other filters */}
                    {statusFilter && <input type="hidden" name="status" value={statusFilter} />}
                    {sourceFilter && <input type="hidden" name="source" value={sourceFilter} />}
                </form>
                <div className="flex gap-2 flex-wrap">
                    {/* Status filter pills */}
                    {['', 'Success', 'Failed', 'Processing'].map(s => (
                        <Link
                            key={`status-${s}`}
                            href={buildUrl({ status: s, page: 1 })}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider border transition-all ${statusFilter === s
                                ? 'bg-blue-600 text-white border-blue-600 shadow-md'
                                : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300 hover:text-blue-600'
                                }`}
                        >
                            {s || 'All'}
                        </Link>
                    ))}
                    <span className="text-slate-300 self-center">|</span>
                    {/* Source filter pills */}
                    {['', 'Payment Gateway', 'Gift Card Order', 'Wallet'].map(s => (
                        <Link
                            key={`source-${s}`}
                            href={buildUrl({ source: s, page: 1 })}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider border transition-all ${sourceFilter === s
                                ? 'bg-slate-900 text-white border-slate-900 shadow-md'
                                : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400 hover:text-slate-800'
                                }`}
                        >
                            {s || 'All Sources'}
                        </Link>
                    ))}
                </div>
            </div>

            {/* Transactions Grid */}
            {paginated.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-slate-300 shadow-sm">
                    <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <Activity size={32} className="text-slate-400" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 mb-1">No transactions found</h3>
                    <p className="text-slate-500 font-medium">
                        {search || statusFilter || sourceFilter
                            ? 'Try adjusting your filters.'
                            : 'Activities will appear here once users start transacting.'}
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {paginated.map((txn, idx) => (
                        <TransactionCard key={`${txn.source}-${txn.rawId}-${idx}`} txn={txn} />
                    ))}
                </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 sm:px-6 rounded-2xl border border-slate-200 shadow-sm">
                    <div className="text-sm font-medium text-slate-500">
                        Showing <span className="font-bold text-slate-900">{paginated.length}</span> of <span className="font-bold text-slate-900">{totalCount}</span> transactions
                    </div>
                    <div className="flex gap-2 w-full sm:w-auto">
                        <Link
                            href={buildUrl({ page: Math.max(1, page - 1) })}
                            className={`flex-1 sm:flex-none text-center px-4 py-2 rounded-xl text-sm font-bold transition-all ${page <= 1
                                ? 'border border-slate-100 text-slate-400 pointer-events-none bg-slate-50'
                                : 'border border-slate-200 text-slate-700 hover:text-blue-600 hover:border-blue-200 hover:bg-blue-50 bg-white shadow-sm'
                                }`}
                            aria-disabled={page <= 1}
                        >
                            Previous
                        </Link>
                        <span className="flex items-center px-3 text-sm font-bold text-slate-500">
                            Page {page} of {totalPages}
                        </span>
                        <Link
                            href={buildUrl({ page: Math.min(totalPages, page + 1) })}
                            className={`flex-1 sm:flex-none text-center px-4 py-2 rounded-xl text-sm font-bold transition-all ${page >= totalPages
                                ? 'border border-slate-100 text-slate-400 pointer-events-none bg-slate-50'
                                : 'border border-slate-200 text-slate-700 hover:text-blue-600 hover:border-blue-200 hover:bg-blue-50 bg-white shadow-sm'
                                }`}
                            aria-disabled={page >= totalPages}
                        >
                            Next
                        </Link>
                    </div>
                </div>
            )}
        </div>
    );
}
