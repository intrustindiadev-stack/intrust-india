'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';

/** @typedef {{ id: string; amount: number; status: 'pending' | 'approved' | 'rejected' | 'released'; bank_account_number: string; bank_ifsc: string; bank_account_holder: string; bank_name: string | null; admin_note: string | null; requested_at: string; updated_at: string; reviewed_at: string | null; merchants: { id: string; business_name: string; user_id: string } }} AdminPayoutRequest */

const STATUS_TABS = ['all', 'pending', 'approved', 'released', 'rejected'];

/** @param {{ status: string }} props */
function StatusBadge({ status }) {
    const cfg = {
        pending: { icon: 'schedule', text: 'Pending', cls: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20' },
        approved: { icon: 'verified', text: 'Approved', cls: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20' },
        released: { icon: 'payments', text: 'Released', cls: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20' },
        rejected: { icon: 'cancel', text: 'Rejected', cls: 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20' },
    };
    const c = cfg[status] || cfg.pending;
    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${c.cls}`}>
            <span className="material-icons-round text-xs">{c.icon}</span>
            {c.text}
        </span>
    );
}

/** @param {{ request: AdminPayoutRequest; onAction: (id: string, action: string, note: string) => Promise<void>; processing: boolean }} props */
function ActionRow({ request, onAction, processing }) {
    const [note, setNote] = useState(request.admin_note || '');
    const [expanded, setExpanded] = useState(false);

    const canApprove = request.status === 'pending';
    const canReject = request.status === 'pending';
    const canRelease = request.status === 'approved';
    const isDone = request.status === 'released' || request.status === 'rejected';

    return (
        <div className="border border-black/5 dark:border-white/10 rounded-2xl overflow-hidden bg-white/60 dark:bg-white/[0.02] shadow-sm hover:shadow-md transition-shadow">
            {/* Main row */}
            <button
                onClick={() => setExpanded(!expanded)}
                className="w-full text-left px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-4"
            >
                <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className="font-bold text-slate-800 dark:text-slate-100 text-base">
                            {request.merchants?.business_name || 'Unknown Merchant'}
                        </span>
                        <StatusBadge status={request.status} />
                    </div>
                    <div className="flex flex-wrap gap-3 text-xs text-slate-500 dark:text-slate-400">
                        <span className="flex items-center gap-1">
                            <span className="material-icons-round text-xs">schedule</span>
                            {new Date(request.requested_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <span className="flex items-center gap-1 font-mono">
                            <span className="material-icons-round text-xs">account_balance</span>
                            {request.bank_account_holder} · ••••{request.bank_account_number.slice(-4)} · {request.bank_ifsc}
                        </span>
                    </div>
                </div>
                <div className="flex items-center gap-4 flex-shrink-0">
                    <span className="text-2xl font-bold font-display text-slate-800 dark:text-slate-100">
                        ₹{Number(request.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                    <span className={`material-icons-round text-slate-400 transition-transform ${expanded ? 'rotate-180' : ''}`}>expand_more</span>
                </div>
            </button>

            {/* Expanded action panel */}
            {expanded && !isDone && (
                <div className="border-t border-black/5 dark:border-white/5 px-5 py-4 bg-black/[0.01] dark:bg-white/[0.01]">
                    <div className="mb-3">
                        <label className="block text-[10px] uppercase tracking-widest font-bold text-slate-500 mb-1.5">Admin Note (optional)</label>
                        <textarea
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            placeholder="Add a note for the merchant..."
                            rows={2}
                            className="w-full px-4 py-3 text-sm bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10 rounded-xl focus:outline-none focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37] text-slate-800 dark:text-slate-100 resize-none"
                        />
                    </div>
                    <div className="flex flex-wrap gap-3">
                        {canApprove && (
                            <button
                                onClick={() => onAction(request.id, 'approved', note)}
                                disabled={processing}
                                className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-all disabled:opacity-50 text-sm"
                            >
                                <span className="material-icons-round text-base">verified</span>
                                Approve
                            </button>
                        )}
                        {canRelease && (
                            <button
                                onClick={() => onAction(request.id, 'released', note)}
                                disabled={processing}
                                className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition-all disabled:opacity-50 text-sm"
                            >
                                <span className="material-icons-round text-base">payments</span>
                                Mark as Released
                            </button>
                        )}
                        {canReject && (
                            <button
                                onClick={() => onAction(request.id, 'rejected', note)}
                                disabled={processing}
                                className="flex items-center gap-2 px-5 py-2.5 border border-red-500/30 text-red-600 dark:text-red-400 font-bold rounded-xl hover:bg-red-500/10 transition-all disabled:opacity-50 text-sm"
                            >
                                <span className="material-icons-round text-base">cancel</span>
                                Reject
                            </button>
                        )}
                        {processing && <span className="material-icons-round animate-spin text-slate-400 self-center">autorenew</span>}
                    </div>
                </div>
            )}

            {/* Completed note */}
            {isDone && request.admin_note && (
                <div className="border-t border-black/5 dark:border-white/5 px-5 py-3 text-xs text-slate-500 dark:text-slate-400 italic">
                    Note: {request.admin_note}
                </div>
            )}
        </div>
    );
}

export default function AdminPayoutsPage() {
    /** @type {[AdminPayoutRequest[], React.Dispatch<React.SetStateAction<AdminPayoutRequest[]>>]} */
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [activeTab, setActiveTab] = useState('pending');
    const [processingId, setProcessingId] = useState(/** @type {string | null} */(null));
    const [toast, setToast] = useState(/** @type {{ msg: string; type: 'success' | 'error'} | null} */(null));

    const showToast = (/** @type {string} */ msg, /** @type {'success' | 'error'} */ type = 'success') => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 4000);
    };

    const fetchRequests = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) { setError('Not authenticated'); return; }

            const url = `/api/admin/payout-requests${activeTab !== 'all' ? `?status=${activeTab}` : ''}`;
            const res = await fetch(url, { headers: { Authorization: `Bearer ${session.access_token}` } });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to fetch');
            setRequests(data.requests || []);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Something went wrong');
        } finally {
            setLoading(false);
        }
    }, [activeTab]);

    useEffect(() => { fetchRequests(); }, [fetchRequests]);

    const handleAction = async (/** @type {string} */ id, /** @type {string} */ action, /** @type {string} */ note) => {
        setProcessingId(id);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error('Not authenticated');

            const res = await fetch(`/api/admin/payout-requests/${id}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${session.access_token}`,
                },
                body: JSON.stringify({ action, admin_note: note }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Action failed');
            showToast(`Request ${action} successfully!`, 'success');
            fetchRequests();
        } catch (err) {
            showToast(err instanceof Error ? err.message : 'Action failed', 'error');
        } finally {
            setProcessingId(null);
        }
    };

    const pendingCount = requests.filter(r => r.status === 'pending').length;

    return (
        <div className="relative p-6 lg:p-8">
            {/* Toast */}
            {toast && (
                <div className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-2xl font-bold text-sm ${toast.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'}`}>
                    <span className="material-icons-round text-lg">{toast.type === 'success' ? 'check_circle' : 'error'}</span>
                    {toast.msg}
                </div>
            )}

            <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100 mb-1 flex items-center gap-3">
                        <span className="material-icons-round text-[#D4AF37] text-3xl">payments</span>
                        Payout Requests
                        {pendingCount > 0 && (
                            <span className="text-base px-2.5 py-0.5 bg-amber-500/15 text-amber-700 dark:text-amber-400 rounded-full font-bold border border-amber-500/20">
                                {pendingCount} pending
                            </span>
                        )}
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Review and process merchant withdrawal requests</p>
                </div>
                <button
                    onClick={fetchRequests}
                    disabled={loading}
                    className="self-start sm:self-auto p-3 bg-white/60 dark:bg-white/5 border border-black/5 dark:border-white/10 rounded-xl hover:bg-black/5 transition-colors shadow-sm"
                >
                    <span className={`material-icons-round text-slate-500 ${loading ? 'animate-spin text-[#D4AF37]' : ''}`}>refresh</span>
                </button>
            </div>

            {/* Status tabs */}
            <div className="flex flex-wrap gap-2 mb-6">
                {STATUS_TABS.map(tab => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`px-4 py-2 rounded-xl text-sm font-bold capitalize transition-all border ${activeTab === tab
                                ? 'bg-[#D4AF37] text-[#020617] border-[#D4AF37]'
                                : 'bg-white/40 dark:bg-white/5 text-slate-600 dark:text-slate-300 border-black/5 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/10'
                            }`}
                    >
                        {tab}
                    </button>
                ))}
            </div>

            {error && (
                <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 rounded-xl text-sm flex items-center gap-2 font-bold">
                    <span className="material-icons-round">error_outline</span>
                    {error}
                </div>
            )}

            {/* Request list */}
            {loading ? (
                <div className="space-y-3">
                    {[...Array(3)].map((_, i) => (
                        <div key={i} className="h-24 bg-black/5 dark:bg-white/5 rounded-2xl animate-pulse" />
                    ))}
                </div>
            ) : requests.length === 0 ? (
                <div className="py-20 text-center">
                    <span className="material-icons-round text-slate-300 dark:text-slate-600 text-6xl block mb-4">inbox</span>
                    <p className="text-slate-700 dark:text-slate-300 font-bold text-lg mb-1">No requests found</p>
                    <p className="text-slate-500 text-sm">No {activeTab !== 'all' ? activeTab : ''} payout requests at the moment.</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {requests.map(req => (
                        <ActionRow
                            key={req.id}
                            request={req}
                            onAction={handleAction}
                            processing={processingId === req.id}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
