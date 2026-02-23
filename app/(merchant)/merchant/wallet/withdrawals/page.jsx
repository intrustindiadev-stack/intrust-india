'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';

/** @typedef {{ id: string; amount: number; status: 'pending' | 'approved' | 'rejected' | 'released'; bank_account_number: string; bank_ifsc: string; bank_account_holder: string; bank_name: string | null; admin_note: string | null; requested_at: string; updated_at: string }} PayoutRequest */

/** @param {{ status: string }} props */
function StatusBadge({ status }) {
    const cfg = {
        pending: { icon: 'schedule', text: 'Pending', cls: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20' },
        approved: { icon: 'check_circle', text: 'Approved', cls: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20' },
        released: { icon: 'payments', text: 'Released', cls: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' },
        rejected: { icon: 'cancel', text: 'Rejected', cls: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20' },
    };
    const c = cfg[status] || cfg.pending;
    return (
        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${c.cls}`}>
            <span className="material-icons-round text-sm">{c.icon}</span>
            {c.text}
        </span>
    );
}

export default function WithdrawalsPage() {
    /** @type {[PayoutRequest[], React.Dispatch<React.SetStateAction<PayoutRequest[]>>]} */
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const fetchRequests = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) { setError('Not authenticated'); return; }

            const res = await fetch('/api/merchant/payout-request', {
                headers: { Authorization: `Bearer ${session.access_token}` }
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to fetch');
            setRequests(data.requests || []);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Something went wrong');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchRequests(); }, [fetchRequests]);

    return (
        <div className="relative">
            <div className="fixed top-[-10%] left-[-5%] w-[40%] h-[40%] bg-[#D4AF37]/10 rounded-full blur-[120px] pointer-events-none -z-10" />
            <div className="fixed bottom-[-10%] right-[-5%] w-[40%] h-[40%] bg-blue-500/10 rounded-full blur-[120px] pointer-events-none -z-10" />

            <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 mt-6 gap-4">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <a href="/merchant/wallet" className="text-sm text-slate-500 hover:text-[#D4AF37] transition-colors flex items-center gap-1 font-medium">
                            <span className="material-icons-round text-base">arrow_back</span>
                            Wallet
                        </a>
                    </div>
                    <h1 className="font-display text-4xl font-bold text-slate-800 dark:text-slate-100 mb-2">Withdrawals</h1>
                    <p className="text-slate-600 dark:text-slate-400 font-medium">Track your payout requests and their statuses</p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={fetchRequests}
                        disabled={loading}
                        className="p-3 bg-white/40 dark:bg-white/5 merchant-glass hover:bg-black/5 dark:hover:bg-white/10 rounded-xl transition-colors border border-black/5 dark:border-white/10 text-slate-500 dark:text-slate-400 shadow-sm"
                        title="Refresh"
                    >
                        <span className={`material-icons-round text-lg ${loading ? 'animate-spin text-[#D4AF37]' : ''}`}>refresh</span>
                    </button>
                    <a
                        href="/merchant/wallet"
                        className="px-6 py-3 bg-[#D4AF37] text-[#020617] font-bold rounded-xl shadow-lg shadow-[#D4AF37]/20 hover:opacity-90 transition-all flex items-center gap-2 gold-glow"
                    >
                        <span className="material-icons-round text-base">add_circle</span>
                        New Withdrawal
                    </a>
                </div>
            </div>

            {error && (
                <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 rounded-xl text-sm flex items-center gap-2 font-bold shadow-sm">
                    <span className="material-icons-round">error_outline</span>
                    {error}
                </div>
            )}

            <div className="merchant-glass rounded-3xl border border-black/5 dark:border-white/5 overflow-hidden shadow-sm">
                <div className="p-6 border-b border-black/5 dark:border-white/5 flex items-center justify-between bg-black/[0.02] dark:bg-white/[0.02]">
                    <h3 className="font-display text-2xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-3">
                        <span className="material-icons-round text-[#D4AF37]">savings</span>
                        Payout Requests
                    </h3>
                    {loading && <span className="material-icons-round animate-spin text-slate-400">autorenew</span>}
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left min-w-[700px]">
                        <thead>
                            <tr className="text-[11px] uppercase tracking-widest text-slate-500 font-bold border-b border-black/5 dark:border-white/5">
                                <th className="px-6 py-4">Date</th>
                                <th className="px-6 py-4">Amount</th>
                                <th className="px-6 py-4">Bank Account</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4">Admin Note</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-black/5 dark:divide-white/5">
                            {requests.map((req) => (
                                <tr key={req.id} className="hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors">
                                    <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-300 font-medium">
                                        {new Date(req.requested_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                        <div className="text-[11px] text-slate-400 dark:text-slate-500">
                                            {new Date(req.requested_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="text-lg font-bold text-slate-800 dark:text-slate-100">
                                            ₹{Number(req.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-sm">
                                        <div className="font-semibold text-slate-700 dark:text-slate-200">{req.bank_account_holder}</div>
                                        <div className="text-slate-500 dark:text-slate-400 font-mono text-xs">
                                            ••••{req.bank_account_number.slice(-4)} · {req.bank_ifsc}
                                        </div>
                                        {req.bank_name && <div className="text-[11px] text-slate-400">{req.bank_name}</div>}
                                    </td>
                                    <td className="px-6 py-4">
                                        <StatusBadge status={req.status} />
                                    </td>
                                    <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400 max-w-[200px]">
                                        {req.admin_note || <span className="text-slate-300 dark:text-slate-600">—</span>}
                                    </td>
                                </tr>
                            ))}
                            {!loading && requests.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="px-6 py-20 text-center">
                                        <span className="material-icons-round text-slate-300 dark:text-slate-600 text-5xl block mb-4">savings</span>
                                        <p className="text-slate-700 dark:text-slate-300 font-bold mb-1">No withdrawal requests yet</p>
                                        <p className="text-sm text-slate-500">Request your first payout from the Wallet page</p>
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
