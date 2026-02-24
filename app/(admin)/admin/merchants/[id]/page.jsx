import { createServerSupabaseClient } from '@/lib/supabaseServer';
import { notFound, redirect } from 'next/navigation';
import { Building2, Phone, Mail, FileText, CheckCircle, XCircle, Clock, MapPin, CreditCard, User, AlertCircle } from 'lucide-react';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function AdminMerchantDetailPage({ params }) {
    const supabase = await createServerSupabaseClient();
    const { id } = await params;

    // Fetch the merchant and associated user profile
    const { data: merchant, error } = await supabase
        .from('merchants')
        .select(`
            *,
            user_profiles (
                full_name,
                email,
                phone
            )
        `)
        .eq('id', id)
        .single();

    if (error || !merchant) {
        notFound();
    }

    // Try to grab payouts/withdrawals
    let payouts = [];
    try {
        const { data: p } = await supabase.from('payout_requests').select('*').eq('merchant_id', id).order('created_at', { ascending: false }).limit(5);
        if (p) payouts = p;
    } catch {
        // Ignored
    }

    // Fetch merchant transactions
    let transactions = [];
    try {
        const { data: t } = await supabase
            .from('merchant_transactions')
            .select('*')
            .eq('merchant_id', id)
            .order('created_at', { ascending: false })
            .limit(10);
        if (t) transactions = t;
    } catch (e) {
        console.log('Error fetching merchant transactions:', e);
    }

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString('en-IN', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    const isPending = merchant.status === 'pending';
    const isApproved = merchant.status === 'approved';

    return (
        <div className="p-4 sm:p-6 max-w-7xl mx-auto font-[family-name:var(--font-outfit)] space-y-6 sm:space-y-8">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <Link href="/admin/merchants" className="group text-sm font-bold text-slate-500 hover:text-blue-600 flex items-center gap-2 transition-all">
                    <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center group-hover:border-blue-200 group-hover:bg-blue-50 transition-all shadow-sm">
                        <span className="text-lg transition-transform group-hover:-translate-x-0.5">←</span>
                    </div>
                    Back to Dashboard
                </Link>
                <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-2xl border border-slate-200 shadow-sm">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Live Merchant Data</span>
                </div>
            </div>

            {/* Top Overview Tile */}
            <div className={`bg-white rounded-[2rem] sm:rounded-[2.5rem] p-6 sm:p-10 border shadow-sm relative overflow-hidden transition-all ${isPending ? 'border-amber-200 shadow-amber-200/5' : isApproved ? 'border-emerald-200 shadow-emerald-200/5' : 'border-red-200'}`}>
                {/* Decorative Background Gradient */}
                <div className={`absolute top-0 right-0 w-64 h-64 blur-3xl opacity-10 rounded-full translate-x-1/2 -translate-y-1/2 ${isPending ? 'bg-amber-500' : isApproved ? 'bg-emerald-500' : 'bg-red-500'}`} />
                <div className={`absolute top-0 left-0 w-full h-2 ${isPending ? 'bg-amber-500' : isApproved ? 'bg-emerald-500' : 'bg-red-500'}`} />

                <div className="relative z-10 flex flex-col lg:flex-row items-center lg:items-start justify-between gap-8">
                    <div className="flex flex-col sm:flex-row items-center gap-6 sm:gap-8 text-center sm:text-left">
                        <div className={`w-24 h-24 sm:w-32 sm:h-32 rounded-[1.5rem] sm:rounded-[2rem] flex items-center justify-center font-extrabold text-4xl sm:text-5xl shadow-xl transform transition-transform hover:scale-105 ${isPending ? 'bg-gradient-to-br from-amber-50 to-amber-100 text-amber-600 border border-amber-200' : 'bg-gradient-to-br from-blue-50 to-indigo-50 text-blue-600 border border-blue-100'}`}>
                            {merchant.business_name ? merchant.business_name.charAt(0).toUpperCase() : 'M'}
                        </div>
                        <div className="space-y-3">
                            <div>
                                <h1 className="text-2xl sm:text-4xl font-black text-slate-900 tracking-tight leading-tight">
                                    {merchant.business_name || 'N/A'}
                                </h1>
                                <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 mt-2">
                                    <p className="text-base sm:text-lg font-semibold text-slate-600">
                                        {merchant.user_profiles?.full_name || 'Unknown Owner'}
                                    </p>
                                    <div className="hidden sm:block w-1.5 h-1.5 rounded-full bg-slate-300" />
                                    <span className="text-xs sm:text-sm font-bold text-slate-400">
                                        Joined {formatDate(merchant.created_at)}
                                    </span>
                                </div>
                            </div>

                            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 sm:gap-3 pt-2">
                                <span className={`inline-flex items-center px-3 sm:px-4 py-1.5 rounded-xl text-[9px] sm:text-[10px] font-black uppercase tracking-widest border shadow-sm ${isPending
                                    ? 'bg-amber-50 text-amber-700 border-amber-200'
                                    : isApproved
                                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                        : 'bg-red-50 text-red-700 border-red-200'
                                    }`}>
                                    {merchant.status}
                                </span>
                                <Link
                                    href={`/admin/users/${merchant.user_id}`}
                                    className="group inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 rounded-xl text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-blue-600 bg-blue-50 border border-blue-100 hover:bg-blue-600 hover:text-white transition-all shadow-sm"
                                >
                                    <User size={12} className="transition-transform group-hover:scale-110" /> View Owner
                                </Link>
                            </div>
                        </div>
                    </div>

                    {/* Quick Access Actions / Stats */}
                    {isPending && (
                        <div className="flex flex-row gap-3 w-full lg:w-auto mt-4 lg:mt-0">
                            <button className="flex-1 lg:flex-none px-4 sm:px-6 py-3.5 bg-white text-red-600 text-sm font-bold rounded-2xl border border-red-100 hover:bg-red-50 transition-all flex items-center justify-center gap-2 shadow-sm group">
                                <XCircle size={18} strokeWidth={2.5} className="group-hover:rotate-90 transition-transform" /> Reject
                            </button>
                            <button className="flex-1 lg:flex-none px-6 sm:px-8 py-3.5 bg-blue-600 text-white text-sm font-black rounded-2xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2 hover:-translate-y-0.5 active:translate-y-0">
                                <CheckCircle size={18} strokeWidth={2.5} /> Approve
                            </button>
                        </div>
                    )}

                    {isApproved && (
                        <div className="hidden lg:flex items-center gap-6 bg-slate-50/50 p-4 rounded-3xl border border-slate-100">
                            <div className="text-center px-4">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Withdrawals</p>
                                <p className="text-2xl font-black text-slate-900">{payouts.length}</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
                {/* Left Col: Details & Bank */}
                <div className="space-y-6 sm:space-y-8 lg:col-span-2">
                    <div className="bg-white rounded-[1.5rem] sm:rounded-[2rem] p-6 sm:p-8 border border-slate-200 shadow-sm transition-all hover:shadow-md">
                        <h2 className="text-lg sm:text-xl font-black text-slate-900 flex items-center gap-3 tracking-tight mb-6 sm:mb-8">
                            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                                <Building2 className="text-blue-600" size={18} />
                            </div>
                            Business Profile
                        </h2>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 sm:gap-x-8 gap-y-4 sm:gap-y-6">
                            <div className="group space-y-1">
                                <label className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] block">Business Phone</label>
                                <div className="flex items-center gap-3 p-3 sm:p-4 bg-slate-50 rounded-2xl border border-slate-100 group-hover:border-blue-100 group-hover:bg-white transition-all">
                                    <Phone size={14} className="text-slate-400" />
                                    <p className="font-bold text-slate-900 text-sm sm:text-base">{merchant.user_profiles?.phone || merchant.phone || 'N/A'}</p>
                                </div>
                            </div>
                            <div className="group space-y-1">
                                <label className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] block">Business Email</label>
                                <div className="flex items-center gap-3 p-3 sm:p-4 bg-slate-50 rounded-2xl border border-slate-100 group-hover:border-blue-100 group-hover:bg-white transition-all">
                                    <Mail size={14} className="text-slate-400" />
                                    <p className="font-bold text-slate-900 truncate text-sm sm:text-base">{merchant.user_profiles?.email || 'N/A'}</p>
                                </div>
                            </div>
                            <div className="group space-y-1">
                                <label className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] block">GST Identification</label>
                                <div className="flex items-center gap-3 p-3 sm:p-4 bg-slate-50 rounded-2xl border border-slate-100 group-hover:border-blue-100 group-hover:bg-white transition-all">
                                    <FileText size={14} className="text-slate-400" />
                                    <p className="font-mono font-black text-slate-900 tracking-wider text-sm sm:text-base uppercase">{merchant.gst_number || 'Not Provided'}</p>
                                </div>
                            </div>
                            <div className="group space-y-1">
                                <label className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] block">Registered Address</label>
                                <div className="flex items-center gap-3 p-3 sm:p-4 bg-slate-50 rounded-2xl border border-slate-100 group-hover:border-blue-100 group-hover:bg-white transition-all">
                                    <MapPin size={14} className="text-slate-400 shrink-0" />
                                    <p className="font-bold text-slate-900 leading-snug text-sm sm:text-base">{merchant.business_address || 'Not Provided'}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Bank Info */}
                    <div className="bg-white rounded-[1.5rem] sm:rounded-[2rem] p-6 sm:p-8 border border-slate-200 shadow-sm transition-all hover:shadow-md">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 sm:mb-8">
                            <h2 className="text-lg sm:text-xl font-black text-slate-900 flex items-center gap-3 tracking-tight">
                                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-indigo-50 flex items-center justify-center">
                                    <CreditCard className="text-indigo-600" size={18} />
                                </div>
                                Banking Registry
                            </h2>
                            {merchant.bank_verified ? (
                                <span className="w-fit flex items-center gap-2 px-4 py-1.5 bg-emerald-50 text-emerald-600 text-[10px] font-black uppercase tracking-widest rounded-full border border-emerald-100">
                                    <CheckCircle size={14} strokeWidth={3} /> Verified
                                </span>
                            ) : (
                                <span className="w-fit flex items-center gap-2 px-4 py-1.5 bg-amber-50 text-amber-600 text-[10px] font-black uppercase tracking-widest rounded-full border border-amber-100 animate-pulse">
                                    <AlertCircle size={14} strokeWidth={3} /> Pending Check
                                </span>
                            )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-8">
                            <div className="space-y-1">
                                <label className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] block">Account Holder</label>
                                <div className="font-bold text-slate-900 p-4 bg-slate-50/50 border border-slate-100 rounded-[1.25rem] shadow-inner text-base sm:text-lg">
                                    {merchant.bank_account_name || 'N/A'}
                                </div>
                            </div>
                            <div className="space-y-1">
                                <label className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] block">Financial Institution</label>
                                <div className="font-bold text-slate-900 p-4 bg-slate-50/50 border border-slate-100 rounded-[1.25rem] shadow-inner text-base sm:text-lg">
                                    {merchant.bank_name || 'N/A'}
                                </div>
                            </div>
                            <div className="space-y-1">
                                <label className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] block">Account Number</label>
                                <div className="font-mono font-black text-slate-400 p-4 bg-slate-50/50 border border-slate-100 rounded-[1.25rem] shadow-inner text-base sm:text-lg tracking-[0.15em]">
                                    {merchant.bank_account_number ? `•••• •••• ${merchant.bank_account_number.slice(-4)}` : 'N/A'}
                                </div>
                            </div>
                            <div className="space-y-1">
                                <label className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] block">IFSC Code Identifier</label>
                                <div className="font-mono font-black text-slate-900 p-4 bg-slate-50/50 border border-slate-100 rounded-[1.25rem] shadow-inner text-base sm:text-lg tracking-widest uppercase">
                                    {merchant.ifsc_code || 'N/A'}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Col: Wallet Access & Payouts */}
                <div className="space-y-6 sm:space-y-8">
                    {/* Financial Overview Card */}
                    <div className="bg-slate-900 rounded-[2rem] p-6 sm:p-8 border border-slate-800 shadow-2xl text-white relative overflow-hidden group">
                        {/* Interactive Background Gradient */}
                        <div className="absolute top-0 right-0 w-full h-full bg-[radial-gradient(circle_at_top_right,rgba(37,99,235,0.15),transparent)] pointer-events-none" />

                        <h2 className="text-[10px] font-black text-slate-400 mb-6 sm:mb-8 tracking-[0.2em] uppercase flex items-center gap-2">
                            Wallet Access
                        </h2>

                        <div className="space-y-6 sm:space-y-8 relative z-10">
                            <div>
                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">Available for settlement</span>
                                <div className="flex items-baseline gap-2">
                                    <span className="text-3xl sm:text-4xl font-black text-white tracking-tighter">
                                        ₹{((merchant.wallet_balance_paise || 0) / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                    </span>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 gap-3 sm:gap-4">
                                <div className="bg-white/5 p-3 sm:p-4 rounded-2xl border border-white/10 hover:bg-white/10 transition-colors">
                                    <p className="text-[9px] sm:text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Total Payouts</p>
                                    <p className="text-xl sm:text-2xl font-black text-blue-400">{payouts.length}</p>
                                </div>
                            </div>

                            <button className="w-full py-4 bg-blue-600 text-white text-[10px] font-black rounded-2xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20 active:scale-[0.98] uppercase tracking-widest">
                                Manage Settlements
                            </button>
                        </div>
                    </div>

                    {/* Recent Payouts */}
                    <div className="bg-white rounded-[1.5rem] sm:rounded-[2rem] p-6 border border-slate-200 shadow-sm">
                        <h2 className="text-sm sm:text-base font-black text-slate-900 tracking-tight flex items-center gap-2 mb-4">
                            <Clock size={18} className="text-amber-500" />
                            Recent Payouts
                        </h2>
                        {payouts.length > 0 ? (
                            <div className="space-y-4">
                                {payouts.map(p => (
                                    <div key={p.id} className="flex justify-between items-center py-3 border-b border-slate-50 last:border-0 hover:bg-slate-50/50 transition-colors px-2 -mx-2 rounded-xl">
                                        <div>
                                            <p className="text-slate-900 font-black text-sm">₹{(p.amount / 100).toLocaleString('en-IN')}</p>
                                            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">{formatDate(p.created_at)}</p>
                                        </div>
                                        <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest border ${p.status === 'completed' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : p.status === 'pending' ? 'bg-amber-50 text-amber-600 border-amber-100' : 'bg-red-50 text-red-600 border-red-100'}`}>
                                            {p.status}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-8 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                                <Clock size={20} className="text-slate-300 mx-auto mb-2 opacity-50" />
                                <p className="text-slate-400 font-bold text-[9px] uppercase tracking-widest">No payout requests</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Transaction History Section (Full Width Below) */}
            <div className="bg-white rounded-[1.5rem] sm:rounded-[2rem] p-6 sm:p-8 border border-slate-200 shadow-sm overflow-hidden transition-all hover:shadow-md">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                    <h2 className="text-lg sm:text-xl font-black text-slate-900 flex items-center gap-3 tracking-tight">
                        <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-amber-50 flex items-center justify-center">
                            <FileText className="text-amber-500" size={18} />
                        </div>
                        Ledger & Ledger Statements
                    </h2>
                    <button className="text-xs font-black text-blue-600 uppercase tracking-widest hover:text-blue-800 transition-colors">View All History</button>
                </div>

                {transactions.length > 0 ? (
                    <div className="overflow-x-auto -mx-6 sm:mx-0">
                        <div className="inline-block min-w-full align-middle px-6 sm:px-0">
                            <table className="min-w-full">
                                <thead>
                                    <tr className="border-b-2 border-slate-50 text-left">
                                        <th className="pb-4 font-black text-slate-400 text-[9px] sm:text-[10px] uppercase tracking-[0.2em]">Transaction Type</th>
                                        <th className="pb-4 font-black text-slate-400 text-[9px] sm:text-[10px] uppercase tracking-[0.2em]">Details</th>
                                        <th className="pb-4 font-black text-slate-400 text-[9px] sm:text-[10px] uppercase tracking-[0.2em] hidden sm:table-cell">Timestamp</th>
                                        <th className="pb-4 font-black text-slate-400 text-[9px] sm:text-[10px] uppercase tracking-[0.2em] text-right">Value</th>
                                        <th className="pb-4 font-black text-slate-400 text-[9px] sm:text-[10px] uppercase tracking-[0.2em] text-right">Running Balance</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {transactions.map(tx => (
                                        <tr key={tx.id} className="hover:bg-slate-50/50 transition-colors group">
                                            <td className="py-4">
                                                <span className={`px-2 py-0.5 rounded text-[8px] sm:text-[9px] font-black uppercase tracking-widest border ${(tx.amount_paise || 0) > 0
                                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                                                    : 'bg-slate-50 text-slate-600 border-slate-100'
                                                    }`}>
                                                    {tx.transaction_type || 'CREDIT'}
                                                </span>
                                            </td>
                                            <td className="py-4">
                                                <p className="font-bold text-slate-900 text-xs sm:text-sm">{tx.description || 'Merchant earnings'}</p>
                                                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-0.5 sm:hidden">{formatDate(tx.created_at)}</p>
                                            </td>
                                            <td className="py-4 text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-tighter hidden sm:table-cell">
                                                {formatDate(tx.created_at)}
                                            </td>
                                            <td className={`py-4 text-xs sm:text-sm font-black text-right tracking-tight ${(tx.amount_paise || 0) > 0 ? 'text-emerald-600' : 'text-slate-900'}`}>
                                                {(tx.amount_paise > 0 ? '+' : '')}₹{(tx.amount_paise / 100).toLocaleString('en-IN')}
                                            </td>
                                            <td className="py-4 text-xs sm:text-sm font-black text-slate-900 text-right tracking-tight">
                                                ₹{(tx.balance_after_paise / 100).toLocaleString('en-IN')}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                ) : (
                    <div className="text-center py-20 bg-slate-50 rounded-[2rem] border border-dashed border-slate-200">
                        <Clock className="w-12 h-12 text-slate-200 mx-auto mb-4 opacity-50" />
                        <p className="text-slate-400 font-black uppercase tracking-widest text-xs">No transaction records found</p>
                    </div>
                )}
            </div>
        </div>
    );
}
