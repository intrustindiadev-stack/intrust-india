'use client';

import { useState, useEffect, useCallback } from 'react';
import { Search, Check, X, Calendar, RefreshCw } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

import StatusBadge from '@/components/hrm/StatusBadge';
import { LEAVE_TYPE_LABELS } from '@/lib/hrm/validation';
import { formatDateIST } from '@/lib/hrm/date';

function ReviewModal({ request, onClose, onSave }) {
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  const handleAction = async (action) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/hrm/leaves/${request.id}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, note: note.trim() || null })
      });
      const json = await res.json();

      if (!res.ok) {
        if (res.status === 409) {
          throw new Error('Conflict: Leave request was already reviewed by another manager.');
        }
        throw new Error(json.error || 'Review failed');
      }

      toast.success(`Leave request ${action} successfully`);
      onSave(request.id, action);
      onClose();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
      <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 20 }} className="bg-white dark:bg-slate-900 rounded-xl shadow-xl w-full max-w-md p-6 border border-slate-200 dark:border-slate-800">
        <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-1">Review Leave Request</h3>
        <p className="text-xs text-slate-500 mb-4">
          {request.user_profiles?.full_name} · {LEAVE_TYPE_LABELS[request.leave_type] || request.leave_type} · {request.from_date} to {request.to_date} ({request.chargeable_days ?? '?'} days)
        </p>

        {request.reason && (
          <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-3 mb-4 text-xs text-slate-600 dark:text-slate-300 italic border border-slate-200 dark:border-slate-800">
            "{request.reason}"
          </div>
        )}

        <div className="mb-5">
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">Review Note (optional)</label>
          <textarea
            value={note}
            onChange={e => setNote(e.target.value)}
            rows={3}
            placeholder="Add note to employee..."
            className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs focus:ring-1 focus:ring-indigo-500 outline-none resize-none"
          />
        </div>

        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2 rounded-lg border border-slate-300 text-slate-700 font-semibold text-xs hover:bg-slate-50">Cancel</button>
          <button onClick={() => handleAction('rejected')} disabled={saving} className="flex-1 py-2 rounded-lg bg-rose-50 text-rose-700 border border-rose-200 font-semibold text-xs flex items-center justify-center gap-1.5 hover:bg-rose-100 disabled:opacity-60">
            <X size={14} /> Reject
          </button>
          <button onClick={() => handleAction('approved')} disabled={saving} className="flex-1 py-2 rounded-lg bg-emerald-600 text-white font-semibold text-xs flex items-center justify-center gap-1.5 hover:bg-emerald-700 disabled:opacity-60">
            {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><Check size={14} /> Approve</>}
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
        .select('*, user_profiles(full_name, department)')
        .order('created_at', { ascending: false });

      if (statusFilter !== 'all') q = q.eq('status', statusFilter);
      const { data, error } = await q;
      if (error) throw error;
      setRequests(data || []);
    } catch (err) {
      console.error(err);
      toast.error('Could not load leave requests');
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => { fetchLeaves(); }, [fetchLeaves]);

  const handleSave = (id, newStatus) => {
    setRequests(prev => prev.map(r => r.id === id ? { ...r, status: newStatus } : r));
  };

  const filtered = requests.filter(r =>
    !search || r.user_profiles?.full_name?.toLowerCase().includes(search.toLowerCase())
  );

  const pendingCount = requests.filter(r => r.status === 'pending').length;

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 min-h-screen bg-slate-50/50 dark:bg-slate-950">
      <AnimatePresence>
        {reviewing && <ReviewModal request={reviewing} onClose={() => setReviewing(null)} onSave={handleSave} />}
      </AnimatePresence>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">HR Leave Queue & Approvals</h1>
          <p className="text-xs text-slate-500 mt-1">{pendingCount > 0 ? `${pendingCount} requests pending review` : 'All leave requests reviewed'}</p>
        </div>
        <button onClick={fetchLeaves} aria-label="Refresh leave requests" className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50">
          <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Status tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {['pending', 'approved', 'rejected', 'all'].map(tab => (
          <button
            key={tab}
            onClick={() => setStatusFilter(tab)}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap capitalize transition-all ${statusFilter === tab ? 'bg-indigo-600 text-white shadow-xs' : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 hover:bg-slate-50'}`}
          >
            {tab} {tab === 'pending' && pendingCount > 0 ? `(${pendingCount})` : ''}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search employee name..."
          className="w-full pl-9 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs focus:ring-1 focus:ring-indigo-500 outline-none"
        />
      </div>

      {/* List */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="p-12 text-center text-xs text-slate-500">Loading leave requests...</div>
        ) : filtered.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-12 text-center">
            <Calendar size={28} className="mx-auto text-slate-300 mb-3" />
            <p className="font-semibold text-sm text-slate-700">No leave requests found</p>
          </div>
        ) : filtered.map((req) => (
          <div key={req.id} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-slate-900 dark:text-slate-100">{req.user_profiles?.full_name || 'Employee'}</span>
                <StatusBadge status={req.status} type="leave" />
                <span className="text-xs font-semibold text-slate-500">({LEAVE_TYPE_LABELS[req.leave_type] || req.leave_type})</span>
              </div>
              <p className="text-xs font-mono text-slate-600 dark:text-slate-400">
                Range: {req.from_date} → {req.to_date} · Chargeable Days: <strong>{req.chargeable_days ?? '?'}</strong>
              </p>
              {req.reason && <p className="text-xs italic text-slate-500">"{req.reason}"</p>}
            </div>

            {req.status === 'pending' && (
              <button
                onClick={() => setReviewing(req)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold text-xs transition-colors self-start md:self-auto"
              >
                Review Request
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
