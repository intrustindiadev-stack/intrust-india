'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Clock, CheckCircle2, Banknote, XCircle, ChevronDown, RefreshCw, AlertCircle, CheckCircle, FileText } from 'lucide-react';

/** @typedef {{ id: string; amount: number; status: 'pending' | 'approved' | 'rejected' | 'released'; bank_account_number: string; bank_ifsc: string; bank_account_holder: string; bank_name: string | null; admin_note: string | null; requested_at: string; updated_at: string; reviewed_at: string | null; merchants: { id: string; business_name: string; user_id: string } }} AdminPayoutRequest */

const STATUS_TABS = ['all', 'pending', 'approved', 'released', 'rejected'];

/** @param {{ status: string }} props */
function StatusBadge({ status }) {
    const cfg = {
        pending: { icon: Clock, text: 'Pending', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
        approved: { icon: CheckCircle2, text: 'Approved', cls: 'bg-blue-50 text-blue-700 border-blue-200' },
        released: { icon: Banknote, text: 'Released', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
        rejected: { icon: XCircle, text: 'Rejected', cls: 'bg-red-50 text-red-700 border-red-200' },
    };
    const c = cfg[status] || cfg.pending;
    const Icon = c.icon;
    return (
        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold border ${c.cls} uppercase tracking-wider`}>
            <Icon size={14} strokeWidth={2.5} />
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
        <div className="bg-white rounded-3xl p-1 shadow-sm border border-slate-200 transition-all hover:shadow-md hover:border-slate-300">
            {/* Main row */}
            <button
                onClick={() => setExpanded(!expanded)}
                className="w-full text-left px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl hover:bg-slate-50 transition-colors"
            >
                <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-3 mb-2">
                        <span className="font-extrabold text-slate-900 text-lg tracking-tight">
                            {request.merchants?.business_name || 'Unknown Merchant'}
                        </span>
                        <StatusBadge status={request.status} />
                    </div>
                    <div className="flex flex-wrap gap-4 text-sm text-slate-500 font-medium">
                        <span className="flex items-center gap-1.5 bg-slate-100 px-3 py-1 rounded-lg">
                            <Clock size={16} className="text-slate-400" />
                            {new Date(request.requested_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <span className="flex items-center gap-1.5 bg-slate-100 px-3 py-1 rounded-lg font-mono">
                            <FileText size={16} className="text-slate-400" />
                            {request.bank_account_holder} · ••••{request.bank_account_number.slice(-4)} · {request.bank_ifsc}
                        </span>
                    </div>
                </div>
                <div className="flex items-center gap-6 flex-shrink-0">
                    <span className="text-2xl font-extrabold text-slate-900 tracking-tight">
                        ₹{Number(request.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                    <div className={`w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500 transition-transform duration-300 ${expanded ? 'rotate-180 bg-slate-200' : ''}`}>
                        <ChevronDown size={20} />
                    </div>
                </div>
            </button>

            {/* Expanded action panel */}
            {expanded && !isDone && (
                <div className="border-t border-slate-100 p-5 mt-1 bg-slate-50 rounded-b-2xl">
                    <div className="mb-4">
                        <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wide">Admin Note (optional)</label>
                        <textarea
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            placeholder="Add a note to be saved with this action..."
                            rows={2}
                            className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 text-slate-800 resize-none shadow-sm transition-all text-sm font-medium"
                        />
                    </div>
                    <div className="flex flex-wrap gap-3 items-center">
                        {canApprove && (
                            <button
                                onClick={() => onAction(request.id, 'approved', note)}
                                disabled={processing}
                                className="flex items-center justify-center gap-2 px-6 py-2.5 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-all disabled:opacity-50 text-sm shadow-md hover:shadow-lg hover:-translate-y-0.5"
                            >
                                {processing ? <RefreshCw size={18} className="animate-spin" /> : <CheckCircle2 size={18} />}
                                Approve
                            </button>
                        )}
                        {canRelease && (
                            <button
                                onClick={() => onAction(request.id, 'released', note)}
                                disabled={processing}
                                className="flex items-center justify-center gap-2 px-6 py-2.5 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition-all disabled:opacity-50 text-sm shadow-md hover:shadow-lg hover:-translate-y-0.5"
                            >
                                {processing ? <RefreshCw size={18} className="animate-spin" /> : <Banknote size={18} />}
                                Mark as Released
                            </button>
                        )}
                        {canReject && (
                            <button
                                onClick={() => onAction(request.id, 'rejected', note)}
                                disabled={processing}
                                className="flex items-center justify-center gap-2 px-6 py-2.5 bg-white border border-red-200 text-red-600 font-bold rounded-xl hover:bg-red-50 hover:border-red-300 transition-all disabled:opacity-50 text-sm"
                            >
                                {processing ? <RefreshCw size={18} className="animate-spin" /> : <XCircle size={18} />}
                                Reject
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* Completed note */}
            {isDone && request.admin_note && (
                <div className="border-t border-slate-100 p-4 mt-1 bg-slate-50/50 rounded-b-2xl flex gap-3 text-sm text-slate-600 font-medium">
                    <FileText size={18} className="text-slate-400 shrink-0" />
                    <p><span className="font-bold text-slate-800">Admin Note:</span> {request.admin_note}</p>
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
            fetchRequests();
        } catch (err) {
            console.error(err);
        } finally {
            setProcessingId(null);
        }
    };

    const pendingCount = requests.filter(r => r.status === 'pending').length;

    return (
        <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto font-[family-name:var(--font-outfit)]">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
                <div className="space-y-1">
                    <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
                        <Banknote className="text-emerald-500 w-10 h-10" />
                        Payout Requests
                        {pendingCount > 0 && (
                            <span className="text-sm px-3 py-1 bg-amber-100 text-amber-700 rounded-xl font-bold border border-amber-200 flex items-center gap-1.5 ml-2">
                                <Clock size={16} />
                                {pendingCount} Pending
                            </span>
                        )}
                    </h1>
                    <p className="text-slate-500 font-medium">
                        Review and process merchant withdrawal requests
                    </p>
                </div>
                <button
                    onClick={fetchRequests}
                    disabled={loading}
                    className="flex items-center justify-center gap-2 px-6 py-2.5 bg-white border border-slate-200 rounded-2xl text-slate-600 hover:bg-slate-50 hover:text-blue-600 transition-all font-bold text-sm shadow-sm"
                >
                    <RefreshCw size={18} strokeWidth={2.5} className={loading ? "animate-spin text-blue-500" : ""} />
                    Refresh List
                </button>
            </div>

            {/* Status tabs */}
            <div className="flex overflow-x-auto hide-scrollbar gap-3 mb-8 pb-2 -mx-4 px-4 sm:mx-0 sm:px-0">
                {STATUS_TABS.map(tab => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`shrink-0 px-5 py-2.5 rounded-2xl font-bold capitalize transition-all text-sm shadow-sm ${activeTab === tab
                            ? 'bg-slate-800 text-white'
                            : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200 hover:border-slate-300 hover:text-slate-900'
                            }`}
                    >
                        {tab}
                    </button>
                ))}
            </div>

            {error && (
                <div className="mb-8 p-4 bg-red-50 border border-red-200 text-red-600 rounded-2xl font-bold flex items-center gap-3 shadow-sm">
                    <AlertCircle size={20} />
                    {error}
                </div>
            )}

            {/* Request list */}
            {loading ? (
                <div className="space-y-4">
                    {[...Array(3)].map((_, i) => (
                        <div key={i} className="h-28 bg-white rounded-3xl border border-slate-200 shadow-sm animate-pulse p-6 flex justify-between items-center">
                            <div className="space-y-3 w-1/2">
                                <div className="h-6 bg-slate-100 rounded-lg w-3/4"></div>
                                <div className="flex gap-2">
                                    <div className="h-6 bg-slate-100 rounded-lg w-1/4"></div>
                                    <div className="h-6 bg-slate-100 rounded-lg w-1/3"></div>
                                </div>
                            </div>
                            <div className="h-8 w-24 bg-slate-100 rounded-lg"></div>
                        </div>
                    ))}
                </div>
            ) : requests.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-slate-300 shadow-sm">
                    <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <Banknote className="w-8 h-8 text-slate-400" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 mb-1">No requests found</h3>
                    <p className="text-slate-500 font-medium">No {activeTab !== 'all' ? activeTab : ''} payout requests at the moment.</p>
                </div>
            ) : (
                <div className="space-y-4">
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
