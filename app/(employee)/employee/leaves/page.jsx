'use client';

import { useState, useEffect } from 'react';
import { Calendar, Plus, Clock, CheckCircle, XCircle, AlertCircle, X } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/lib/contexts/AuthContext';
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

const LEAVE_TYPES = ['Casual Leave', 'Sick Leave', 'Earned Leave', 'Maternity/Paternity', 'Other'];

const STATUS_STYLE = {
    pending: { label: 'Pending', cls: 'bg-amber-50 text-amber-700 border-amber-200', icon: Clock },
    approved: { label: 'Approved', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: CheckCircle },
    rejected: { label: 'Rejected', cls: 'bg-rose-50 text-rose-700 border-rose-200', icon: XCircle },
};

const LEAVE_BALANCES = [
    { type: 'Casual Leave (CL)', key: 'Casual Leave', total: 12, color: 'from-blue-500 to-indigo-500' },
    { type: 'Sick Leave (SL)', key: 'Sick Leave', total: 8, color: 'from-amber-500 to-orange-500' },
    { type: 'Earned Leave (EL)', key: 'Earned Leave', total: 21, color: 'from-emerald-500 to-teal-500' },
];

export default function EmployeeLeavesPage() {
    const { user } = useAuth();
    const [showModal, setShowModal] = useState(false);
    const [leaves, setLeaves] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [usedMap, setUsedMap] = useState({});
    const [form, setForm] = useState({ leave_type: 'Casual Leave', from_date: '', to_date: '', reason: '' });

    const fetchLeaves = async () => {
        if (!user) return;
        const { data } = await supabase
            .from('leave_requests')
            .select('*')
            .eq('employee_id', user.id)
            .order('created_at', { ascending: false });
        const rows = data || [];
        setLeaves(rows);
        // Compute used days per type (approved only, current year)
        const currentYear = new Date().getFullYear();
        const map = {};
        rows.filter(r => r.status === 'approved' && new Date(r.from_date).getFullYear() === currentYear)
            .forEach(r => {
                const days = Math.max(1, Math.ceil((new Date(r.to_date) - new Date(r.from_date)) / 86400000) + 1);
                map[r.leave_type] = (map[r.leave_type] || 0) + days;
            });
        setUsedMap(map);
        setLoading(false);
    };

    useEffect(() => { fetchLeaves(); }, [user]);

    const diffDays = (from, to) => {
        if (!from || !to) return 0;
        return Math.max(1, Math.ceil((new Date(to) - new Date(from)) / 86400000) + 1);
    };

    const handleSubmit = async () => {
        if (!form.from_date || !form.to_date) { toast.error('Please select dates'); return; }
        if (new Date(form.from_date) > new Date(form.to_date)) { toast.error('End date must be after start date'); return; }
        setSubmitting(true);
        try {
            const { error } = await supabase.from('leave_requests').insert([{
                employee_id: user.id,
                leave_type: form.leave_type,
                from_date: form.from_date,
                to_date: form.to_date,
                reason: form.reason,
                status: 'pending',
            }]);
            if (error) throw error;
            toast.success('Leave request submitted!');
            setShowModal(false);
            setForm({ leave_type: 'Casual Leave', from_date: '', to_date: '', reason: '' });
            fetchLeaves();
        } catch (err) {
            // Table may not exist yet
            if (err.message?.includes('does not exist')) {
                toast.error('Leave system is being set up. Please try again shortly.');
            } else {
                toast.error(err.message || 'Failed to submit request');
            }
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="p-4 sm:p-6 lg:p-8 space-y-6 min-h-screen">
            <AnimatePresence>
                {showModal && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-4">
                        <motion.div
                            initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 60, opacity: 0 }}
                            transition={{ type: 'spring', damping: 25 }}
                            className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl"
                        >
                            <div className="flex items-center justify-between mb-5">
                                <h2 className="text-xl font-bold text-gray-900">Request Time Off</h2>
                                <button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
                                    <X size={18} className="text-gray-500" />
                                </button>
                            </div>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wider">Leave Type</label>
                                    <select value={form.leave_type} onChange={e => setForm(p => ({ ...p, leave_type: e.target.value }))}
                                        className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm bg-gray-50 focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none transition-all">
                                        {LEAVE_TYPES.map(t => <option key={t}>{t}</option>)}
                                    </select>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wider">From</label>
                                        <input type="date" value={form.from_date} onChange={e => setForm(p => ({ ...p, from_date: e.target.value }))}
                                            min={new Date().toISOString().split('T')[0]}
                                            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-gray-50 focus:ring-2 focus:ring-amber-500 outline-none transition-all" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wider">To</label>
                                        <input type="date" value={form.to_date} onChange={e => setForm(p => ({ ...p, to_date: e.target.value }))}
                                            min={form.from_date || new Date().toISOString().split('T')[0]}
                                            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-gray-50 focus:ring-2 focus:ring-amber-500 outline-none transition-all" />
                                    </div>
                                </div>
                                {form.from_date && form.to_date && (
                                    <p className="text-sm text-amber-700 bg-amber-50 rounded-xl px-4 py-2 font-medium">
                                        {diffDays(form.from_date, form.to_date)} day(s) requested
                                    </p>
                                )}
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wider">Reason <span className="text-gray-400 font-normal normal-case">(optional)</span></label>
                                    <textarea rows={3} value={form.reason} onChange={e => setForm(p => ({ ...p, reason: e.target.value }))}
                                        placeholder="Briefly explain the reason..."
                                        className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm bg-gray-50 focus:ring-2 focus:ring-amber-500 outline-none resize-none transition-all" />
                                </div>
                                <div className="flex gap-3 pt-2">
                                    <button onClick={() => setShowModal(false)} className="flex-1 py-3 rounded-2xl border-2 border-gray-200 text-gray-600 font-semibold text-sm hover:bg-gray-50 transition-all">Cancel</button>
                                    <button onClick={handleSubmit} disabled={submitting}
                                        className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold text-sm shadow-lg shadow-amber-500/30 disabled:opacity-60 flex items-center justify-center gap-2">
                                        {submitting ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Submitting…</> : 'Submit Request'}
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">My Leaves</h1>
                    <p className="text-sm text-gray-500 mt-0.5">Manage your time-off requests and view balance.</p>
                </div>
                <button onClick={() => setShowModal(true)}
                    className="inline-flex items-center gap-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white px-5 py-2.5 rounded-xl font-bold transition-all shadow-lg shadow-amber-500/25 text-sm">
                    <Plus size={16} /> Request Leave
                </button>
            </div>

            {/* Leave Balance Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {LEAVE_BALANCES.map((lb, i) => {
                    const used = usedMap[lb.key] || 0;
                    const remaining = Math.max(0, lb.total - used);
                    const pct = Math.round((remaining / lb.total) * 100);
                    return (
                        <motion.div key={lb.type} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                            className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">{lb.type}</p>
                            <div className="flex items-baseline gap-1 mb-3">
                                <span className="text-3xl font-black text-gray-900">{remaining}</span>
                                <span className="text-sm text-gray-400">/ {lb.total} remaining</span>
                            </div>
                            <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                <div className={`h-full rounded-full bg-gradient-to-r ${lb.color} transition-all`} style={{ width: `${pct}%` }} />
                            </div>
                        </motion.div>
                    );
                })}
            </div>

            {/* Leave History */}
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="p-5 border-b border-gray-100">
                    <h3 className="text-base font-bold text-gray-900">Leave History</h3>
                </div>
                {loading ? (
                    <div className="p-8 flex justify-center"><div className="w-6 h-6 border-2 border-amber-200 border-t-amber-500 rounded-full animate-spin" /></div>
                ) : leaves.length === 0 ? (
                    <div className="p-12 text-center">
                        <Calendar size={36} className="mx-auto text-gray-200 mb-3" />
                        <p className="text-gray-500 font-medium">No leave requests yet</p>
                        <p className="text-sm text-gray-400 mt-1">Your approved and pending requests will appear here.</p>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-50">
                        {leaves.map(leave => {
                            const st = STATUS_STYLE[leave.status] || STATUS_STYLE.pending;
                            const Icon = st.icon;
                            const days = diffDays(leave.from_date, leave.to_date);
                            return (
                                <div key={leave.id} className="flex items-center justify-between px-5 py-4 hover:bg-amber-50/20 transition-colors">
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center flex-shrink-0">
                                            <Calendar size={18} className="text-amber-600" />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="font-semibold text-gray-900 text-sm">{leave.leave_type}</p>
                                            <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                                                <Clock size={10} />
                                                {new Date(leave.from_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                                                {leave.from_date !== leave.to_date && ` → ${new Date(leave.to_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`}
                                                · {days} day{days !== 1 ? 's' : ''}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 flex-shrink-0">
                                        <span className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-lg border ${st.cls}`}>
                                            <Icon size={11} /> {st.label}
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
