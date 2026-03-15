import { createAdminClient } from '@/lib/supabaseServer';
import { FileText, ArrowUpCircle, ArrowDownCircle, Clock, CheckCircle, XCircle, Search, Download, Filter } from 'lucide-react';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function WalletAdjustmentsPage({ searchParams }) {
    const supabase = createAdminClient();
    const params = await searchParams;

    // Parse filters from search params
    const statusFilter = params?.status || '';
    const walletTypeFilter = params?.walletType || '';
    const page = parseInt(params?.page || '1', 10);
    const limit = 25;
    const offset = (page - 1) * limit;

    // Build query
    let query = supabase
        .from('wallet_adjustment_logs')
        .select(`
            *,
            admin:fk_admin_user_profile(full_name, email),
            target:fk_target_user_profile(full_name, email)
        `, { count: 'exact' });

    if (statusFilter) query = query.eq('status', statusFilter);
    if (walletTypeFilter) query = query.eq('wallet_type', walletTypeFilter);

    const { data: logs, count, error } = await query
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

    if (error) {
        console.error('Error fetching adjustment logs:', error);
    }

    const adjustments = logs || [];
    const totalCount = count || 0;
    const totalPages = Math.ceil(totalCount / limit);

    // Summary stats
    let stats = { total: 0, credits: 0, debits: 0, failed: 0, totalCreditPaise: 0, totalDebitPaise: 0 };
    try {
        const { data: allLogs } = await supabase
            .from('wallet_adjustment_logs')
            .select('operation, amount_paise, status');

        if (allLogs) {
            stats.total = allLogs.length;
            stats.credits = allLogs.filter(l => l.operation === 'credit').length;
            stats.debits = allLogs.filter(l => l.operation === 'debit').length;
            stats.failed = allLogs.filter(l => l.status === 'failed').length;
            stats.totalCreditPaise = allLogs
                .filter(l => l.operation === 'credit' && l.status === 'completed')
                .reduce((sum, l) => sum + (l.amount_paise || 0), 0);
            stats.totalDebitPaise = allLogs
                .filter(l => l.operation === 'debit' && l.status === 'completed')
                .reduce((sum, l) => sum + (l.amount_paise || 0), 0);
        }
    } catch (e) {
        console.log('Stats error:', e);
    }

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString('en-IN', {
            year: 'numeric', month: 'short', day: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });
    };

    const formatCurrency = (paise) => {
        return `₹${(paise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
    };

    return (
        <div className="p-4 sm:p-6 max-w-7xl mx-auto font-[family-name:var(--font-outfit)] space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                        Wallet Adjustments
                    </h1>
                    <p className="text-sm text-slate-500 font-medium mt-1">
                        Complete audit trail of all admin wallet adjustments
                    </p>
                </div>
                <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-2xl border border-slate-200 shadow-sm">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                        Compliance Dashboard
                    </span>
                </div>
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Total Adjustments</p>
                    <p className="text-3xl font-black text-slate-900">{stats.total}</p>
                </div>
                <div className="bg-white rounded-2xl p-5 border border-emerald-100 shadow-sm">
                    <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-2">Total Credited</p>
                    <p className="text-2xl font-black text-emerald-700">{formatCurrency(stats.totalCreditPaise)}</p>
                    <p className="text-xs text-slate-400 font-medium">{stats.credits} operations</p>
                </div>
                <div className="bg-white rounded-2xl p-5 border border-orange-100 shadow-sm">
                    <p className="text-[10px] font-black text-orange-500 uppercase tracking-widest mb-2">Total Debited</p>
                    <p className="text-2xl font-black text-orange-700">{formatCurrency(stats.totalDebitPaise)}</p>
                    <p className="text-xs text-slate-400 font-medium">{stats.debits} operations</p>
                </div>
                <div className="bg-white rounded-2xl p-5 border border-red-100 shadow-sm">
                    <p className="text-[10px] font-black text-red-500 uppercase tracking-widest mb-2">Failed</p>
                    <p className="text-3xl font-black text-red-700">{stats.failed}</p>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex flex-wrap items-center gap-3">
                <Filter size={16} className="text-slate-400" />
                <Link
                    href="/admin/wallet-adjustments"
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${!statusFilter && !walletTypeFilter ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                >
                    All
                </Link>
                <Link
                    href="/admin/wallet-adjustments?status=completed"
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${statusFilter === 'completed' ? 'bg-emerald-600 text-white' : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'}`}
                >
                    Completed
                </Link>
                <Link
                    href="/admin/wallet-adjustments?status=failed"
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${statusFilter === 'failed' ? 'bg-red-600 text-white' : 'bg-red-50 text-red-600 hover:bg-red-100'}`}
                >
                    Failed
                </Link>
                <div className="w-px h-6 bg-slate-200" />
                <Link
                    href="/admin/wallet-adjustments?walletType=customer"
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${walletTypeFilter === 'customer' ? 'bg-blue-600 text-white' : 'bg-blue-50 text-blue-600 hover:bg-blue-100'}`}
                >
                    Customer
                </Link>
                <Link
                    href="/admin/wallet-adjustments?walletType=merchant"
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${walletTypeFilter === 'merchant' ? 'bg-indigo-600 text-white' : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'}`}
                >
                    Merchant
                </Link>
            </div>

            {/* Table */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                {adjustments.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="min-w-full">
                            <thead>
                                <tr className="border-b-2 border-slate-50 text-left">
                                    <th className="px-4 py-4 font-black text-slate-400 text-[9px] uppercase tracking-[0.2em]">Admin</th>
                                    <th className="px-4 py-4 font-black text-slate-400 text-[9px] uppercase tracking-[0.2em]">Target User</th>
                                    <th className="px-4 py-4 font-black text-slate-400 text-[9px] uppercase tracking-[0.2em]">Type</th>
                                    <th className="px-4 py-4 font-black text-slate-400 text-[9px] uppercase tracking-[0.2em]">Operation</th>
                                    <th className="px-4 py-4 font-black text-slate-400 text-[9px] uppercase tracking-[0.2em] text-right">Amount</th>
                                    <th className="px-4 py-4 font-black text-slate-400 text-[9px] uppercase tracking-[0.2em]">Reason</th>
                                    <th className="px-4 py-4 font-black text-slate-400 text-[9px] uppercase tracking-[0.2em]">Status</th>
                                    <th className="px-4 py-4 font-black text-slate-400 text-[9px] uppercase tracking-[0.2em]">Timestamp</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {adjustments.map(log => (
                                    <tr key={log.id} className="hover:bg-slate-50/50 transition-colors group">
                                        <td className="px-4 py-4">
                                            <p className="font-bold text-slate-900 text-sm">{log.admin?.full_name || 'Unknown'}</p>
                                            <p className="text-[10px] text-slate-400 font-medium">{log.admin?.email || ''}</p>
                                        </td>
                                        <td className="px-4 py-4">
                                            <p className="font-bold text-slate-900 text-sm">{log.target?.full_name || 'Unknown'}</p>
                                            <p className="text-[10px] text-slate-400 font-medium">{log.target?.email || ''}</p>
                                        </td>
                                        <td className="px-4 py-4">
                                            <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest border ${
                                                log.wallet_type === 'customer'
                                                    ? 'bg-blue-50 text-blue-700 border-blue-100'
                                                    : 'bg-indigo-50 text-indigo-700 border-indigo-100'
                                            }`}>
                                                {log.wallet_type}
                                            </span>
                                        </td>
                                        <td className="px-4 py-4">
                                            <span className="flex items-center gap-1">
                                                {log.operation === 'credit' ? (
                                                    <ArrowUpCircle size={14} className="text-emerald-500" />
                                                ) : (
                                                    <ArrowDownCircle size={14} className="text-red-500" />
                                                )}
                                                <span className={`text-xs font-bold uppercase ${
                                                    log.operation === 'credit' ? 'text-emerald-700' : 'text-red-700'
                                                }`}>
                                                    {log.operation}
                                                </span>
                                            </span>
                                        </td>
                                        <td className="px-4 py-4 text-right">
                                            <span className={`font-black text-sm ${
                                                log.operation === 'credit' ? 'text-emerald-700' : 'text-red-700'
                                            }`}>
                                                {log.operation === 'credit' ? '+' : '-'}{formatCurrency(log.amount_paise)}
                                            </span>
                                        </td>
                                        <td className="px-4 py-4 max-w-[200px]">
                                            <p className="text-xs text-slate-600 font-medium truncate" title={log.reason}>
                                                {log.reason}
                                            </p>
                                        </td>
                                        <td className="px-4 py-4">
                                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest border ${
                                                log.status === 'completed'
                                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                                                    : log.status === 'failed'
                                                        ? 'bg-red-50 text-red-700 border-red-100'
                                                        : 'bg-amber-50 text-amber-700 border-amber-100'
                                            }`}>
                                                {log.status === 'completed' && <CheckCircle size={10} />}
                                                {log.status === 'failed' && <XCircle size={10} />}
                                                {log.status === 'pending' && <Clock size={10} />}
                                                {log.status}
                                            </span>
                                        </td>
                                        <td className="px-4 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-tighter whitespace-nowrap">
                                            {formatDate(log.created_at)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="text-center py-20">
                        <FileText className="w-12 h-12 text-slate-200 mx-auto mb-4 opacity-50" />
                        <p className="text-slate-400 font-black uppercase tracking-widest text-xs">
                            No adjustment records found
                        </p>
                        <p className="text-slate-400 text-xs mt-2">
                            Adjustment logs will appear here once admins make wallet adjustments
                        </p>
                    </div>
                )}

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="px-4 py-4 border-t border-slate-50 flex items-center justify-between">
                        <p className="text-xs text-slate-400 font-medium">
                            Showing {offset + 1}–{Math.min(offset + limit, totalCount)} of {totalCount}
                        </p>
                        <div className="flex gap-2">
                            {page > 1 && (
                                <Link
                                    href={`/admin/wallet-adjustments?page=${page - 1}${statusFilter ? `&status=${statusFilter}` : ''}${walletTypeFilter ? `&walletType=${walletTypeFilter}` : ''}`}
                                    className="px-4 py-2 rounded-xl text-xs font-bold border border-slate-200 hover:bg-slate-50 transition-colors"
                                >
                                    ← Previous
                                </Link>
                            )}
                            {page < totalPages && (
                                <Link
                                    href={`/admin/wallet-adjustments?page=${page + 1}${statusFilter ? `&status=${statusFilter}` : ''}${walletTypeFilter ? `&walletType=${walletTypeFilter}` : ''}`}
                                    className="px-4 py-2 rounded-xl text-xs font-bold border border-slate-200 hover:bg-slate-50 transition-colors"
                                >
                                    Next →
                                </Link>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
