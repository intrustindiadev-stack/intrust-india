'use client';

import { useState, useEffect, useCallback } from 'react';
import { Search, Calendar, Clock, MapPin, RefreshCw, UserCheck, AlertCircle, Edit3, X, Check } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/lib/contexts/AuthContext';
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

const STATUS_STYLE = {
    present: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    absent: 'bg-rose-50 text-rose-700 border-rose-100',
    late: 'bg-amber-50 text-amber-700 border-amber-100',
    half_day: 'bg-blue-50 text-blue-700 border-blue-100',
    holiday: 'bg-violet-50 text-violet-700 border-violet-100',
    wfh: 'bg-teal-50 text-teal-700 border-teal-100',
};

function OverrideModal({ record, onClose, onSave }) {
    const [status, setStatus] = useState(record?.status || 'present');
    const [reason, setReason] = useState('');
    const [saving, setSaving] = useState(false);
    const { user } = useAuth();

    const handleSave = async () => {
        if (!reason.trim()) { toast.error('Override reason is required'); return; }
        setSaving(true);
        try {
            const { error } = await supabase.from('attendance').update({
                status,
                override_by: user?.id,
                override_reason: reason,
            }).eq('id', record.id);
            if (error) throw error;
            toast.success('Attendance overridden successfully');

            // Audit Log Insert
            supabase.auth.getUser().then(({ data: { user: authUser } }) => {
                const actor = authUser || user;
                if (actor) {
                    supabase.from('audit_logs_hrm').insert({
                        actor_id: actor.id,
                        actor_name: actor.user_metadata?.full_name || 'System',
                        action: 'Attendance overridden',
                        table_name: 'attendance',
                        record_id: record.id,
                        old_data: { status: record.status },
                        new_data: { status, override_reason: reason },
                        module: 'Attendance',
                        severity: 'medium'
                    }).then(({ error: auditError }) => {
                        if (auditError) console.warn('Audit log failed:', auditError);
                    });
                }
            });

            onSave(record.id, status, reason);
            onClose();
        } catch (err) { toast.error(err.message); }
        finally { setSaving(false); }
    };

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 50 }} className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6">
                <div className="flex items-center justify-between mb-5">
                    <div>
                        <h3 className="text-lg font-bold text-gray-900">Override Attendance</h3>
                        <p className="text-sm text-gray-500">{record?.user_profiles?.full_name} · {record?.date}</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl"><X size={18} className="text-gray-500" /></button>
                </div>
                <div className="mb-4">
                    <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">New Status</label>
                    <div className="grid grid-cols-3 gap-2">
                        {Object.keys(STATUS_STYLE).map(s => (
                            <button key={s} onClick={() => setStatus(s)}
                                className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all capitalize ${status === s ? STATUS_STYLE[s] + ' border-current scale-105' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}>
                                {s.replace('_', ' ')}
                            </button>
                        ))}
                    </div>
                </div>
                <div className="mb-5">
                    <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">Override Reason *</label>
                    <textarea value={reason} onChange={e => setReason(e.target.value)} rows={3} placeholder="Reason for override (required for audit log)..."
                        className="w-full px-4 py-3 rounded-2xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none" />
                </div>
                <div className="flex gap-3">
                    <button onClick={onClose} className="flex-1 py-3 rounded-2xl border-2 border-gray-200 text-gray-600 font-semibold text-sm">Cancel</button>
                    <button onClick={handleSave} disabled={saving} className="flex-1 py-3 rounded-2xl bg-emerald-600 text-white font-bold text-sm flex items-center justify-center gap-2 hover:bg-emerald-700 disabled:opacity-60">
                        {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><Check size={16} /> Save Override</>}
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
}

export default function HRMAttendancePage() {
    const [records, setRecords] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [overriding, setOverriding] = useState(null);

    const fetchAttendance = useCallback(async () => {
        setIsLoading(true);
        try {
            const { data, error } = await supabase.from('attendance')
                .select('*, user_profiles(full_name, department, employee_id)')
                .eq('date', selectedDate)
                .order('check_in', { ascending: true });
            if (error) throw error;
            setRecords(data || []);
        } catch (err) {
            console.error(err);
            toast.error('Could not load attendance');
        } finally { setIsLoading(false); }
    }, [selectedDate]);

    useEffect(() => { fetchAttendance(); }, [fetchAttendance]);

    const handleOverrideSave = (id, newStatus, reason) => {
        setRecords(prev => prev.map(r => r.id === id ? { ...r, status: newStatus, override_reason: reason } : r));
    };

    const filtered = records.filter(r =>
        !search || r.user_profiles?.full_name?.toLowerCase().includes(search.toLowerCase())
    );

    const counts = {
        present: filtered.filter(r => r.status === 'present').length,
        absent: filtered.filter(r => r.status === 'absent').length,
        late: filtered.filter(r => r.status === 'late').length,
    };

    const fmt = (dt) => dt ? new Date(dt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '—';

    return (
        <div className="p-4 sm:p-6 lg:p-8 space-y-6 min-h-screen">
            <AnimatePresence>
                {overriding && <OverrideModal record={overriding} onClose={() => setOverriding(null)} onSave={handleOverrideSave} />}
            </AnimatePresence>

            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">Attendance Log</h1>
                    <p className="text-sm text-gray-500 mt-1">Daily clock-in/out records with override capability.</p>
                </div>
                <div className="flex gap-2">
                    <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)}
                        className="px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                    <button onClick={fetchAttendance} className="p-2.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50">
                        <RefreshCw size={16} className="text-gray-500" />
                    </button>
                </div>
            </div>

            {/* Summary pills */}
            <div className="flex flex-wrap gap-3">
                {[
                    { label: 'Present', count: counts.present, color: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
                    { label: 'Absent', count: counts.absent, color: 'bg-rose-50 text-rose-700 border-rose-100' },
                    { label: 'Late', count: counts.late, color: 'bg-amber-50 text-amber-700 border-amber-100' },
                    { label: 'Total Records', count: filtered.length, color: 'bg-gray-50 text-gray-700 border-gray-100' },
                ].map(s => (
                    <div key={s.label} className={`px-4 py-2 rounded-xl border text-sm font-bold ${s.color}`}>
                        {s.count} {s.label}
                    </div>
                ))}
            </div>

            {/* Search */}
            <div className="relative">
                <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search employees..."
                    className="w-full pl-11 pr-4 py-3 bg-white border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-sm" />
            </div>

            {/* Table */}
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                {isLoading ? (
                    <div className="p-12 flex justify-center">
                        <div className="w-8 h-8 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="p-16 text-center">
                        <div className="w-16 h-16 bg-gray-100 rounded-3xl flex items-center justify-center mx-auto mb-4">
                            <UserCheck size={28} className="text-gray-400" />
                        </div>
                        <p className="font-semibold text-gray-700">No records for {selectedDate}</p>
                        <p className="text-sm text-gray-400 mt-1">Attendance records will appear here once employees clock in</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-50/50 border-b border-gray-100">
                                    {['Employee', 'Status', 'Clock In', 'Clock Out', 'Duration', 'Override', 'Action'].map(h => (
                                        <th key={h} className="px-5 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {filtered.map(r => {
                                    const duration = r.check_in && r.check_out
                                        ? `${Math.round((new Date(r.check_out) - new Date(r.check_in)) / 3600000)}h ${Math.round(((new Date(r.check_out) - new Date(r.check_in)) % 3600000) / 60000)}m`
                                        : '—';
                                    return (
                                        <tr key={r.id} className="hover:bg-gray-50/50 transition-colors">
                                            <td className="px-5 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-100 to-teal-100 flex items-center justify-center text-emerald-700 font-bold text-sm flex-shrink-0">
                                                        {(r.user_profiles?.full_name || '?').charAt(0).toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <p className="font-semibold text-gray-900 text-sm">{r.user_profiles?.full_name}</p>
                                                        <p className="text-xs text-gray-400">{r.user_profiles?.department || 'No dept'}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-5 py-4">
                                                <span className={`text-xs font-bold px-2.5 py-1 rounded-lg border capitalize ${STATUS_STYLE[r.status] || 'bg-gray-50 text-gray-600 border-gray-100'}`}>
                                                    {r.status?.replace('_', ' ')}
                                                </span>
                                            </td>
                                            <td className="px-5 py-4 text-sm text-gray-700 font-medium">{fmt(r.check_in)}</td>
                                            <td className="px-5 py-4 text-sm text-gray-700 font-medium">{fmt(r.check_out)}</td>
                                            <td className="px-5 py-4 text-sm text-gray-500">{duration}</td>
                                            <td className="px-5 py-4">
                                                {r.override_reason ? (
                                                    <span className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded-lg border border-amber-100 font-medium" title={r.override_reason}>Overridden</span>
                                                ) : <span className="text-xs text-gray-400">—</span>}
                                            </td>
                                            <td className="px-5 py-4">
                                                <button onClick={() => setOverriding(r)} className="flex items-center gap-1 text-xs font-semibold text-emerald-600 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-lg transition-colors border border-emerald-100">
                                                    <Edit3 size={12} /> Override
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
