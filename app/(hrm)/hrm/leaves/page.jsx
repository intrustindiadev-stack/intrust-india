'use client';

import { useState, useEffect, useCallback } from 'react';
import { Search, Check, X, Clock, Calendar, RefreshCw, MessageSquare } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

const LEAVE_TYPE_COLOR = {
    sick: 'bg-rose-50 text-rose-700 border-rose-100',
    casual: 'bg-blue-50 text-blue-700 border-blue-100',
    earned: 'bg-violet-50 text-violet-700 border-violet-100',
    maternity: 'bg-pink-50 text-pink-700 border-pink-100',
    paternity: 'bg-sky-50 text-sky-700 border-sky-100',
    unpaid: 'bg-gray-50 text-gray-700 border-gray-100',
};

const STATUS_CONFIG = {
    pending: 'bg-amber-50 text-amber-700 border border-amber-100',
    approved: 'bg-emerald-50 text-emerald-700 border border-emerald-100',
    rejected: 'bg-rose-50 text-rose-700 border border-rose-100',
};

function ReviewModal({ request, onClose, onSave }) {
    const [note, setNote] = useState('');
    const [saving, setSaving] = useState(false);

    const handleAction = async (action) => {
        setSaving(true);
        try {
            const { error } = await supabase.from('leave_requests').update({
                status: action,
                review_note: note,
                reviewed_at: new Date().toISOString(),
            }).eq('id', request.id);
            if (error) throw error;
            toast.success(`Leave ${action} successfully`);
            onSave(request.id, action);
            onClose();
        } catch (err) { toast.error(err.message); }
        finally { setSaving(false); }
    };

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 50, opacity: 0 }}
                className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-1">Review Leave Request</h3>
                <p className="text-sm text-gray-500 mb-5">{request.user_profiles?.full_name} · {request.leave_type} · {request.from_date} to {request.to_date}</p>
                <div className="bg-gray-50 rounded-2xl p-4 mb-5 text-sm text-gray-600 italic">
                    "{request.reason || 'No reason provided'}"
                </div>
                <div className="mb-5">
                    <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">Review Note (optional)</label>
                    <textarea value={note} onChange={e => setNote(e.target.value)} rows={3} placeholder="Add a note to the employee..."
                        className="w-full px-4 py-3 rounded-2xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none" />
                </div>
                <div className="flex gap-3">
                    <button onClick={onClose} className="flex-1 py-3 rounded-2xl border-2 border-gray-200 text-gray-600 font-semibold text-sm hover:bg-gray-50">Cancel</button>
                    <button onClick={() => handleAction('rejected')} disabled={saving} className="flex-1 py-3 rounded-2xl bg-rose-50 text-rose-700 border border-rose-200 font-bold text-sm flex items-center justify-center gap-2 hover:bg-rose-100 disabled:opacity-60">
                        <X size={16} /> Reject
                    </button>
                    <button onClick={() => handleAction('approved')} disabled={saving} className="flex-1 py-3 rounded-2xl bg-emerald-600 text-white font-bold text-sm flex items-center justify-center gap-2 hover:bg-emerald-700 disabled:opacity-60">
                        {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><Check size={16} /> Approve</>}
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
}

export default function LeaveQueuePage() {
    const [requests, setRequests] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('pending');
    const [reviewing, setReviewing] = useState(null);

    const fetchLeaves = useCallback(async () => {
        setIsLoading(true);
        try {
            let q = supabase.from('leave_requests')
                .select('*, user_profiles(full_name, department, avatar_url)')
                .order('created_at', { ascending: false });
            if (statusFilter !== 'all') q = q.eq('status', statusFilter);
            const { data, error } = await q;
            if (error) throw error;
            setRequests(data || []);
        } catch (err) {
            console.error(err);
            toast.error('Could not load leave requests');
        } finally { setIsLoading(false); }
    }, [statusFilter]);

    useEffect(() => { fetchLeaves(); }, [fetchLeaves]);

    const handleSave = (id, newStatus) => {
        setRequests(prev => prev.map(r => r.id === id ? { ...r, status: newStatus } : r));
    };

    const filtered = requests.filter(r =>
        !search || r.user_profiles?.full_name?.toLowerCase().includes(search.toLowerCase())
    );

    const counts = { all: requests.length, pending: requests.filter(r => r.status === 'pending').length };

    return (
        <div className="p-4 sm:p-6 lg:p-8 space-y-6 min-h-screen">
            <AnimatePresence>
                {reviewing && <ReviewModal request={reviewing} onClose={() => setReviewing(null)} onSave={handleSave} />}
            </AnimatePresence>

            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">Leave Approvals</h1>
                    <p className="text-sm text-gray-500 mt-1">{counts.pending > 0 ? `${counts.pending} pending review` : 'All caught up'}</p>
                </div>
                <button onClick={fetchLeaves} className="p-2.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 transition-colors">
                    <RefreshCw size={16} className="text-gray-500" />
                </button>
            </div>

            {/* Status tabs */}
            <div className="flex gap-2 overflow-x-auto pb-1">
                {[
                    { key: 'pending', label: `Pending${counts.pending > 0 ? ` (${counts.pending})` : ''}` },
                    { key: 'approved', label: 'Approved' },
                    { key: 'rejected', label: 'Rejected' },
                    { key: 'all', label: 'All' },
                ].map(tab => (
                    <button key={tab.key} onClick={() => setStatusFilter(tab.key)}
                        className={`px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-all ${statusFilter === tab.key ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/30' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Search */}
            <div className="relative">
                <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search employees..."
                    className="w-full pl-11 pr-4 py-3 bg-white border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-sm" />
            </div>

            {/* Requests */}
            <div className="space-y-3">
                {isLoading ? (
                    [...Array(4)].map((_, i) => <div key={i} className="h-28 bg-white border border-gray-100 rounded-3xl animate-pulse" />)
                ) : filtered.length === 0 ? (
                    <div className="bg-white rounded-3xl border border-gray-100 p-16 text-center">
                        <div className="w-16 h-16 bg-gray-100 rounded-3xl flex items-center justify-center mx-auto mb-4"><Calendar size={28} className="text-gray-400" /></div>
                        <p className="font-semibold text-gray-700">No leave requests</p>
                        <p className="text-sm text-gray-400 mt-1">{search ? 'No results for your search' : `No ${statusFilter === 'all' ? '' : statusFilter} requests found`}</p>
                    </div>
                ) : filtered.map((req, i) => {
                    const days = req.to_date && req.from_date ? Math.ceil((new Date(req.to_date) - new Date(req.from_date)) / 86400000) + 1 : '?';
                    return (
                        <motion.div key={req.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                            className="bg-white rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-all p-5">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <div className="flex items-start gap-4 flex-1 min-w-0">
                                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-100 to-teal-100 flex items-center justify-center text-emerald-700 font-bold text-lg flex-shrink-0">
                                        {(req.user_profiles?.full_name || '?').charAt(0).toUpperCase()}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="flex flex-wrap items-center gap-2 mb-1">
                                            <h3 className="font-bold text-gray-900">{req.user_profiles?.full_name || 'Employee'}</h3>
                                            <span className={`text-xs font-bold px-2.5 py-0.5 rounded-lg border capitalize ${STATUS_CONFIG[req.status]}`}>{req.status}</span>
                                        </div>
                                        <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500 mb-2">
                                            <span className={`text-xs font-semibold px-2.5 py-1 rounded-lg border capitalize ${LEAVE_TYPE_COLOR[req.leave_type] || 'bg-gray-50 text-gray-600 border-gray-100'}`}>{req.leave_type}</span>
                                            <span className="flex items-center gap-1"><Calendar size={13} /> {req.from_date} → {req.to_date}</span>
                                            <span className="flex items-center gap-1"><Clock size={13} /> {days} day{days !== 1 ? 's' : ''}</span>
                                        </div>
                                        {req.reason && <p className="text-sm text-gray-500 italic truncate">"{req.reason}"</p>}
                                        {req.review_note && <p className="text-xs text-gray-400 mt-1 flex items-center gap-1"><MessageSquare size={11} /> {req.review_note}</p>}
                                    </div>
                                </div>
                                {req.status === 'pending' && (
                                    <div className="flex gap-2 shrink-0 border-t md:border-t-0 pt-3 md:pt-0 border-gray-100">
                                        <button onClick={() => setReviewing(req)}
                                            className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold text-sm transition-all shadow-md shadow-emerald-500/20">
                                            Review
                                        </button>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    );
                })}
            </div>
        </div>
    );
}
