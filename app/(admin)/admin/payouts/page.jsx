'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Clock, CheckCircle2, Banknote, XCircle, ChevronDown, RefreshCw, AlertCircle, CheckCircle, FileText, Eye, Download, ExternalLink } from 'lucide-react';

/** @typedef {{ id: string; amount: number; status: 'pending' | 'approved' | 'rejected' | 'released'; payout_source: 'wallet' | 'growth_fund'; bank_account_last4: string; bank_ifsc: string; bank_account_holder: string; bank_name: string | null; admin_note: string | null; utr_reference: string | null; requested_at: string; updated_at: string; reviewed_at: string | null; merchants: { id: string; business_name: string; user_id: string } }} AdminPayoutRequest */

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

/** @param {{ request: AdminPayoutRequest; onAction: (id: string, action: string, note: string, utrRef: string) => Promise<void>; processing: boolean; siblingPending?: number }} props */
function ActionRow({ request, onAction, processing, siblingPending }) {
    const [note, setNote] = useState(request.admin_note || '');
    const [utrRef, setUtrRef] = useState('');
    const [expanded, setExpanded] = useState(false);
    const [inlineError, setInlineError] = useState('');
    const [revealedAccount, setRevealedAccount] = useState(/** @type {string | null} */(null));
    const [revealing, setRevealing] = useState(false);

    const canApprove = request.status === 'pending';
    const canReject = request.status === 'pending' || request.status === 'approved';
    const canRelease = request.status === 'approved';
    const isDone = request.status === 'released' || request.status === 'rejected';

    const isGrowthFund = request.payout_source === 'growth_fund';

    const handleRevealAccount = async () => {
        setRevealing(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error('Not authenticated');
            const res = await fetch(`/api/admin/payout-requests/${request.id}/bank-details`, {
                headers: { Authorization: `Bearer ${session.access_token}` },
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to reveal');
            setRevealedAccount(data.bank_account_number);
        } catch (err) {
            setInlineError(err instanceof Error ? err.message : 'Could not reveal account number');
        } finally {
            setRevealing(false);
        }
    };

    const handleAction = (action) => {
        setInlineError('');
        if (action === 'rejected' && !note.trim()) {
            setInlineError('Admin note is required when rejecting.');
            return;
        }
        if (action === 'released' && !utrRef.trim()) {
            setInlineError('UTR / Bank Reference is required to mark as released.');
            return;
        }
        onAction(request.id, action, note, utrRef);
    };

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
                        {siblingPending > 0 && (
                            <span className="text-[10px] font-black px-2 py-0.5 rounded-md uppercase tracking-widest border bg-amber-50 text-amber-700 border-amber-200">
                                +{siblingPending} more pending
                            </span>
                        )}
                        <StatusBadge status={request.status} />
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-md uppercase tracking-widest border ${isGrowthFund
                                ? 'bg-indigo-50 text-indigo-700 border-indigo-100'
                                : 'bg-slate-50 text-slate-600 border-slate-100'
                            }`}>
                            {isGrowthFund ? 'Growth Fund' : 'Wallet Withdrawal'}
                        </span>
                    </div>
                    <div className="flex flex-wrap gap-4 text-sm text-slate-500 font-medium">
                        <span className="flex items-center gap-1.5 bg-slate-100 px-3 py-1 rounded-lg">
                            <Clock size={16} className="text-slate-400" />
                            {new Date(request.requested_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <span className="flex items-center gap-1.5 bg-slate-100 px-3 py-1 rounded-lg font-mono">
                            <FileText size={16} className="text-slate-400" />
                            {request.bank_account_holder} · ••••{request.bank_account_last4} · {request.bank_ifsc}
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
                <div className="border-t border-slate-100 p-5 mt-1 bg-slate-50 rounded-b-2xl space-y-4">
                    {/* Reveal account number */}
                    <div className="flex items-center gap-3">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">Full Account Number:</span>
                        {revealedAccount ? (
                            <span className="font-mono text-sm font-semibold text-slate-800 bg-white px-3 py-1 rounded-lg border border-slate-200">{revealedAccount}</span>
                        ) : (
                            <button
                                onClick={handleRevealAccount}
                                disabled={revealing}
                                className="flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-800 transition-colors"
                            >
                                {revealing ? <RefreshCw size={14} className="animate-spin" /> : <Eye size={14} />}
                                {revealing ? 'Revealing...' : 'Reveal Account Number'}
                            </button>
                        )}
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wide">
                            Admin Note (required for rejection, optional otherwise)
                        </label>
                        <textarea
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            placeholder="Add a note to be saved with this action..."
                            rows={2}
                            className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 text-slate-800 resize-none shadow-sm transition-all text-sm font-medium"
                        />
                    </div>

                    {/* UTR input — only shown when canRelease */}
                    {canRelease && (
                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wide">
                                UTR / Bank Reference <span className="text-red-500">(required for release)</span>
                            </label>
                            <input
                                type="text"
                                value={utrRef}
                                onChange={(e) => setUtrRef(e.target.value)}
                                placeholder="e.g. NEFT/IMPS reference number"
                                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 text-slate-800 shadow-sm transition-all text-sm font-medium"
                            />
                        </div>
                    )}

                    {inlineError && (
                        <div className="p-3 bg-red-50 border border-red-200 text-red-600 rounded-xl text-sm flex items-center gap-2 font-semibold">
                            <AlertCircle size={16} />
                            {inlineError}
                        </div>
                    )}

                    <div className="flex flex-wrap gap-3 items-center">
                        {canApprove && (
                            <button
                                onClick={() => handleAction('approved')}
                                disabled={processing}
                                className="flex items-center justify-center gap-2 px-6 py-2.5 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-all disabled:opacity-50 text-sm shadow-md hover:shadow-lg hover:-translate-y-0.5"
                            >
                                {processing ? <RefreshCw size={18} className="animate-spin" /> : <CheckCircle2 size={18} />}
                                Approve
                            </button>
                        )}
                        {canRelease && (
                            <button
                                onClick={() => handleAction('released')}
                                disabled={processing}
                                className="flex items-center justify-center gap-2 px-6 py-2.5 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition-all disabled:opacity-50 text-sm shadow-md hover:shadow-lg hover:-translate-y-0.5"
                            >
                                {processing ? <RefreshCw size={18} className="animate-spin" /> : <Banknote size={18} />}
                                Mark as Released
                            </button>
                        )}
                        {canReject && (
                            <button
                                onClick={() => handleAction('rejected')}
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
            {isDone && (request.admin_note || request.utr_reference) && (
                <div className="border-t border-slate-100 p-4 mt-1 bg-slate-50/50 rounded-b-2xl flex gap-3 text-sm text-slate-600 font-medium">
                    <FileText size={18} className="text-slate-400 shrink-0" />
                    <div className="space-y-1">
                        {request.admin_note && (
                            <p><span className="font-bold text-slate-800">Admin Note:</span> {request.admin_note}</p>
                        )}
                        {request.utr_reference && (
                            <p><span className="font-bold text-slate-800">UTR:</span> <span className="font-mono">{request.utr_reference}</span></p>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

/** @param {{ payoutId: string; onClose: () => void }} props */
function ActivityTimeline({ payoutId, onClose }) {
    const [events, setEvents] = useState([]);
    const [loadingEvents, setLoadingEvents] = useState(true);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            setLoadingEvents(true);
            const { data } = await supabase
                .from('payout_request_events')
                .select('*')
                .eq('payout_id', payoutId)
                .order('created_at', { ascending: true });
            if (!cancelled) {
                setEvents(data || []);
                setLoadingEvents(false);
            }
        })();
        return () => { cancelled = true; };
    }, [payoutId]);

    const actionCfg = {
        requested: { icon: Clock, color: 'text-amber-500 bg-amber-50 border-amber-200' },
        approved:  { icon: CheckCircle2, color: 'text-blue-500 bg-blue-50 border-blue-200' },
        released:  { icon: Banknote, color: 'text-emerald-500 bg-emerald-50 border-emerald-200' },
        rejected:  { icon: XCircle, color: 'text-red-500 bg-red-50 border-red-200' },
        cancelled: { icon: XCircle, color: 'text-slate-500 bg-slate-50 border-slate-200' },
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden">
                <div className="flex items-center justify-between p-6 border-b border-slate-100">
                    <h2 className="font-bold text-slate-900 text-lg flex items-center gap-2">
                        <FileText size={20} className="text-slate-500" />
                        Payout Activity
                    </h2>
                    <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100 transition-colors text-slate-500">
                        <XCircle size={20} />
                    </button>
                </div>
                <div className="p-6 overflow-y-auto max-h-[70vh]">
                    {loadingEvents ? (
                        <div className="flex items-center justify-center py-10">
                            <RefreshCw size={24} className="animate-spin text-slate-400" />
                        </div>
                    ) : events.length === 0 ? (
                        <p className="text-center text-slate-500 py-8">No events found.</p>
                    ) : (
                        <ol className="relative border-l border-slate-200 ml-4 space-y-6">
                            {events.map(ev => {
                                const cfg = actionCfg[ev.action] || actionCfg.cancelled;
                                const Icon = cfg.icon;
                                return (
                                    <li key={ev.id} className="ml-6">
                                        <span className={`absolute -left-3 flex items-center justify-center w-6 h-6 rounded-full border ${cfg.color}`}>
                                            <Icon size={12} />
                                        </span>
                                        <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                                            <div className="flex items-center justify-between mb-1">
                                                <span className={`text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-lg border ${cfg.color}`}>
                                                    {ev.action}
                                                </span>
                                                <span className="text-xs text-slate-400">
                                                    {new Date(ev.created_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            </div>
                                            {ev.from_status && ev.to_status && (
                                                <p className="text-xs text-slate-500 mt-1">
                                                    <span className="font-semibold">{ev.from_status}</span>
                                                    {' → '}
                                                    <span className="font-semibold">{ev.to_status}</span>
                                                </p>
                                            )}
                                            {ev.payload && Object.keys(ev.payload).length > 0 && (
                                                <pre className="text-xs text-slate-400 mt-2 bg-white rounded-xl p-2 border border-slate-100 overflow-x-auto">
                                                    {JSON.stringify(ev.payload, null, 2)}
                                                </pre>
                                            )}
                                        </div>
                                    </li>
                                );
                            })}
                        </ol>
                    )}
                </div>
            </div>
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
    const [activityPayoutId, setActivityPayoutId] = useState(/** @type {string | null} */(null));
    const [exporting, setExporting] = useState(false);

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

    // Realtime: INSERT or UPDATE on payout_requests => refetch
    useEffect(() => {
        const channel = supabase
            .channel('admin-payout-requests-rt')
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'payout_requests',
            }, () => {
                fetchRequests();
            })
            .subscribe();
        return () => { supabase.removeChannel(channel); };
    }, [fetchRequests]);

    const handleExportCsv = async () => {
        setExporting(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;
            const url = `/api/admin/payout-requests/export${activeTab !== 'all' ? `?status=${activeTab}` : ''}`;
            const res = await fetch(url, { headers: { Authorization: `Bearer ${session.access_token}` } });
            if (!res.ok) throw new Error('Export failed');
            const blob = await res.blob();
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `payout-requests-${activeTab}-${new Date().toISOString().slice(0, 10)}.csv`;
            link.click();
            URL.revokeObjectURL(link.href);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Export failed');
        } finally {
            setExporting(false);
        }
    };

    /**
     * @param {string} id
     * @param {string} action
     * @param {string} note
     * @param {string} utrRef
     */
    const handleAction = async (id, action, note, utrRef) => {
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
                body: JSON.stringify({ action, admin_note: note, utr_reference: utrRef }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Action failed');
            setError('');
            fetchRequests();
        } catch (err) {
            console.error(err);
            setError(err instanceof Error ? err.message : 'Something went wrong');
            fetchRequests();
        } finally {
            setProcessingId(null);
        }
    };

    const pendingCount = requests.filter(r => r.status === 'pending').length;

    // Compute per-merchant pending count (all statuses, used for sibling badge)
    const merchantPendingCount = requests
        .filter(r => r.status === 'pending')
        .reduce((map, r) => {
            const mid = r.merchants?.id;
            if (mid) map.set(mid, (map.get(mid) || 0) + 1);
            return map;
        }, new Map());

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
                    Refresh
                </button>
                <button
                    onClick={handleExportCsv}
                    disabled={exporting}
                    className="flex items-center justify-center gap-2 px-5 py-2.5 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-700 hover:bg-emerald-100 transition-all font-bold text-sm shadow-sm"
                >
                    {exporting ? <RefreshCw size={18} className="animate-spin" /> : <Download size={18} strokeWidth={2.5} />}
                    Export CSV
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
                    {requests.map(req => {
                        const mid = req.merchants?.id;
                        const siblingPending = mid ? (merchantPendingCount.get(mid) || 1) - 1 : 0;
                        return (
                        <div key={req.id} className="relative group">
                            <ActionRow
                                request={req}
                                onAction={handleAction}
                                processing={processingId === req.id}
                                siblingPending={siblingPending > 0 ? siblingPending : 0}
                            />
                            <button
                                onClick={() => setActivityPayoutId(req.id)}
                                className="absolute top-4 right-14 hidden group-hover:flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-blue-600 bg-white border border-slate-200 px-2.5 py-1.5 rounded-xl shadow-sm transition-all"
                                title="View activity timeline"
                            >
                                <FileText size={14} />
                                Activity
                            </button>
                        </div>
                        );
                    })}
                </div>
            )}

            {activityPayoutId && (
                <ActivityTimeline
                    payoutId={activityPayoutId}
                    onClose={() => setActivityPayoutId(null)}
                />
            )}
        </div>
    );
}
