'use client';

import { useState, useEffect, useCallback } from 'react';
import { Calendar, Plus, Clock, CheckCircle, XCircle, X } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/lib/contexts/AuthContext';
import { toast } from 'react-hot-toast';

const LEAVE_TYPES = ['Casual Leave', 'Sick Leave', 'Earned Leave', 'Maternity/Paternity', 'Other'];

const STATUS_STYLE = {
    pending: { label: 'Pending', cls: 'bg-gray-100 text-gray-700 border-gray-200', icon: Clock },
    approved: { label: 'Approved', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: CheckCircle },
    rejected: { label: 'Rejected', cls: 'bg-red-50 text-red-700 border-red-200', icon: XCircle },
};

export default function EmployeeLeavesPage() {
    const { user } = useAuth();
    const [showModal, setShowModal] = useState(false);
    const [leaves, setLeaves] = useState([]);
    const [balances, setBalances] = useState({ casual_leaves: 12, sick_leaves: 8, earned_leaves: 21 });
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [usedMap, setUsedMap] = useState({});
    const [form, setForm] = useState({ leave_type: 'Casual Leave', from_date: '', to_date: '', reason: '' });

    const fetchLeaves = useCallback(async () => {
        if (!user) return;
        const currentYear = new Date().getFullYear();

        const [reqs, bal] = await Promise.all([
            supabase.from('leave_requests').select('*').eq('employee_id', user.id).order('created_at', { ascending: false }),
            supabase.from('leave_balances').select('*').eq('employee_id', user.id).eq('year', currentYear).maybeSingle()
        ]);

        const rows = reqs.data || [];
        setLeaves(rows);

        if (bal.data) {
            setBalances(bal.data);
        }

        // Compute used days per type (approved only, current year)
        const map = {};
        rows.filter(r => r.status === 'approved' && new Date(r.from_date).getFullYear() === currentYear)
            .forEach(r => {
                const days = Math.max(1, Math.ceil((new Date(r.to_date) - new Date(r.from_date)) / 86400000) + 1);
                map[r.leave_type] = (map[r.leave_type] || 0) + days;
            });
        setUsedMap(map);
        setLoading(false);
    }, [user]);

    useEffect(() => { fetchLeaves(); }, [fetchLeaves]);

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
            toast.success('Leave request submitted successfully');
            setShowModal(false);
            setForm({ leave_type: 'Casual Leave', from_date: '', to_date: '', reason: '' });
            fetchLeaves();
        } catch (err) {
            if (err.message?.includes('does not exist')) {
                toast.error('Leave system is being set up.');
            } else {
                toast.error(err.message || 'Failed to submit request');
            }
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="p-6 lg:p-8 space-y-8 min-h-screen bg-gray-50/30">
            {showModal && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl border border-gray-200">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-lg font-semibold text-gray-900">Request Time Off</h2>
                            <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="space-y-5">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">Leave Type</label>
                                <select value={form.leave_type} onChange={e => setForm(p => ({ ...p, leave_type: e.target.value }))}
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-gray-900 focus:border-gray-900 outline-none transition-all">
                                    {LEAVE_TYPES.map(t => <option key={t}>{t}</option>)}
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Start Date</label>
                                    <input type="date" value={form.from_date} onChange={e => setForm(p => ({ ...p, from_date: e.target.value }))}
                                        min={new Date().toISOString().split('T')[0]}
                                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-gray-900 focus:border-gray-900 outline-none transition-all" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">End Date</label>
                                    <input type="date" value={form.to_date} onChange={e => setForm(p => ({ ...p, to_date: e.target.value }))}
                                        min={form.from_date || new Date().toISOString().split('T')[0]}
                                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-gray-900 focus:border-gray-900 outline-none transition-all" />
                                </div>
                            </div>
                            {form.from_date && form.to_date && (
                                <div className="text-sm text-gray-600 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
                                    Requesting <span className="font-semibold text-gray-900">{diffDays(form.from_date, form.to_date)} day(s)</span>
                                </div>
                            )}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">Reason <span className="text-gray-400 font-normal">(optional)</span></label>
                                <textarea rows={3} value={form.reason} onChange={e => setForm(p => ({ ...p, reason: e.target.value }))}
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-gray-900 focus:border-gray-900 outline-none resize-none transition-all" />
                            </div>
                            <div className="flex gap-3 pt-4 border-t border-gray-100">
                                <button onClick={() => setShowModal(false)} className="flex-1 py-2 rounded-lg border border-gray-300 text-gray-700 font-medium text-sm hover:bg-gray-50 transition-colors">Cancel</button>
                                <button onClick={handleSubmit} disabled={submitting}
                                    className="flex-1 py-2 rounded-lg bg-gray-900 hover:bg-gray-800 text-white font-medium text-sm disabled:opacity-50 transition-colors flex items-center justify-center gap-2">
                                    {submitting ? 'Submitting...' : 'Submit Request'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-gray-200 pb-6">
                <div>
                    <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">Time Off</h1>
                    <p className="text-sm text-gray-500 mt-1">Manage your leaves and view your balance</p>
                </div>
                <button onClick={() => setShowModal(true)}
                    className="inline-flex items-center gap-2 bg-gray-900 hover:bg-gray-800 text-white px-4 py-2 rounded-lg font-medium transition-colors text-sm">
                    <Plus size={16} /> Request Time Off
                </button>
            </div>

            {/* Leave Balance Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                    { type: 'Casual Leave', key: 'Casual Leave', total: Number(balances.casual_leaves) || 12, color: 'bg-blue-600' },
                    { type: 'Sick Leave', key: 'Sick Leave', total: Number(balances.sick_leaves) || 8, color: 'bg-red-500' },
                    { type: 'Earned Leave', key: 'Earned Leave', total: Number(balances.earned_leaves) || 21, color: 'bg-emerald-600' },
                ].map((lb) => {
                    const used = usedMap[lb.key] || 0;
                    const remaining = Math.max(0, lb.total - used);
                    const pct = Math.round((remaining / lb.total) * 100);
                    return (
                        <div key={lb.type} className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">{lb.type}</p>
                            <div className="flex items-baseline gap-2 mb-4">
                                <span className="text-3xl font-semibold text-gray-900">{remaining}</span>
                                <span className="text-sm text-gray-500 font-medium">/ {lb.total} remaining</span>
                            </div>
                            <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                <div className={`h-full rounded-full ${lb.color} transition-all duration-500`} style={{ width: `${pct}%` }} />
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Leave History */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden mt-8">
                <div className="px-6 py-4 border-b border-gray-200 bg-gray-50/50">
                    <h3 className="text-sm font-semibold text-gray-900">Leave History</h3>
                </div>
                {loading ? (
                    <div className="divide-y divide-gray-100 animate-pulse">
                        {[...Array(3)].map((_, i) => (
                            <div key={i} className="flex items-center justify-between px-6 py-4">
                                <div className="space-y-2">
                                    <div className="h-4 bg-gray-200 rounded w-24" />
                                    <div className="h-3 bg-gray-100 rounded w-32" />
                                </div>
                                <div className="h-6 w-20 bg-gray-100 rounded-md" />
                            </div>
                        ))}
                    </div>
                ) : leaves.length === 0 ? (
                    <div className="p-12 text-center">
                        <Calendar size={24} className="mx-auto text-gray-300 mb-3" />
                        <p className="text-sm font-medium text-gray-900">No time off requests</p>
                        <p className="text-sm text-gray-500 mt-1">Your history will appear here once you submit a request.</p>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-100">
                        {leaves.map(leave => {
                            const st = STATUS_STYLE[leave.status] || STATUS_STYLE.pending;
                            const Icon = st.icon;
                            const days = diffDays(leave.from_date, leave.to_date);
                            return (
                                <div key={leave.id} className="flex items-center justify-between px-6 py-4 hover:bg-gray-50/50 transition-colors">
                                    <div>
                                        <p className="font-medium text-gray-900 text-sm mb-1">{leave.leave_type}</p>
                                        <p className="text-xs text-gray-500 flex items-center gap-1.5">
                                            {new Date(leave.from_date).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
                                            {leave.from_date !== leave.to_date && ` → ${new Date(leave.to_date).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}`}
                                            <span className="text-gray-300">•</span>
                                            <span>{days} day{days !== 1 ? 's' : ''}</span>
                                        </p>
                                    </div>
                                    <div className="flex items-center">
                                        <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-md border ${st.cls}`}>
                                            <Icon size={12} /> {st.label}
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
