'use client';

import { useState, useEffect, useCallback } from 'react';
import { Search, MapPin, RefreshCw, UserCheck, Edit3, X, Check, AlertTriangle, Plus, Camera } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/lib/contexts/AuthContext';
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

import StatusBadge from '@/components/hrm/StatusBadge';
import { formatDateIST, formatTimeIST, calculateDuration } from '@/lib/hrm/date';
import { getLocationStatusBadge } from '@/lib/hrm/attendance';

function OverrideModal({ record, onClose, onSave }) {
  const [status, setStatus] = useState(record?.status || 'present');
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!reason.trim()) {
      toast.error('Override reason is required for audit trail');
      return;
    }
    setSaving(true);
    try {
      // Call atomic RPC hr_override_attendance
      const { data, error } = await supabase.rpc('hr_override_attendance', {
        p_attendance_id: record.id,
        p_status: status,
        p_reason: reason.trim()
      });

      if (error) throw error;
      toast.success('Attendance overridden successfully');
      onSave(record.id, status, reason);
      onClose();
    } catch (err) {
      toast.error(err.message || 'Override failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
      <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 20 }} className="bg-white dark:bg-slate-900 rounded-xl shadow-xl w-full max-w-md p-6 border border-slate-200 dark:border-slate-800">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Override Attendance Record</h3>
            <p className="text-xs text-slate-500">{record?.user_profiles?.full_name} · {formatDateIST(record?.work_date || record?.date)}</p>
          </div>
          <button onClick={onClose} aria-label="Close dialog" className="p-1 hover:bg-slate-100 rounded-lg"><X size={18} className="text-slate-500" /></button>
        </div>

        <div className="mb-4">
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">New Status</label>
          <div className="grid grid-cols-3 gap-2">
            {['present', 'absent', 'late', 'half_day', 'holiday', 'wfh'].map(s => (
              <button
                key={s}
                onClick={() => setStatus(s)}
                className={`py-2 px-3 rounded-lg text-xs font-semibold border capitalize transition-all ${status === s ? 'bg-indigo-50 border-indigo-500 text-indigo-700 font-bold scale-105' : 'border-slate-200 text-slate-600 hover:border-slate-300'}`}
              >
                {s.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-5">
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">Override Reason *</label>
          <textarea
            value={reason}
            onChange={e => setReason(e.target.value)}
            rows={3}
            placeholder="Reason for audit log..."
            className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs focus:ring-1 focus:ring-indigo-500 outline-none resize-none"
          />
        </div>

        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2 rounded-lg border border-slate-300 text-slate-700 font-semibold text-xs hover:bg-slate-50">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="flex-1 py-2 rounded-lg bg-indigo-600 text-white font-semibold text-xs flex items-center justify-center gap-2 hover:bg-indigo-700 disabled:opacity-60">
            {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><Check size={14} /> Save Override</>}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function MarkAttendanceModal({ date, employees, onClose, onSave }) {
  const [empId, setEmpId] = useState('');
  const [status, setStatus] = useState('present');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!empId) {
      toast.error('Please select an employee');
      return;
    }
    setSaving(true);
    try {
      const { data, error } = await supabase.from('attendance').insert({
        employee_id: empId,
        date: date,
        work_date: date,
        status: status,
        check_in: status === 'present' || status === 'late' ? new Date().toISOString() : null,
      }).select('*, user_profiles(full_name, department, employee_id)').single();

      if (error) throw error;
      toast.success('Attendance marked successfully');
      onSave(data);
      onClose();
    } catch (err) {
      if (err.code === '23505') toast.error('Attendance already exists for this date');
      else toast.error(err.message || 'Failed to mark attendance');
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
      <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 20 }} className="bg-white dark:bg-slate-900 rounded-xl shadow-xl w-full max-w-md p-6 border border-slate-200 dark:border-slate-800">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Mark Attendance</h3>
            <p className="text-xs text-slate-500">Date: {formatDateIST(date)}</p>
          </div>
          <button onClick={onClose} aria-label="Close dialog" className="p-1 hover:bg-slate-100 rounded-lg"><X size={18} className="text-slate-500" /></button>
        </div>

        <div className="mb-4">
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">Employee *</label>
          <select value={empId} onChange={e => setEmpId(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm focus:ring-1 focus:ring-indigo-500 outline-none">
            <option value="">Select an employee...</option>
            {employees.map(e => <option key={e.id} value={e.id}>{e.full_name} ({e.employee_id})</option>)}
          </select>
        </div>

        <div className="mb-5">
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">Status *</label>
          <div className="grid grid-cols-3 gap-2">
            {['present', 'absent', 'late', 'half_day', 'holiday', 'wfh'].map(s => (
              <button
                key={s}
                onClick={() => setStatus(s)}
                className={`py-2 px-3 rounded-lg text-xs font-semibold border capitalize transition-all ${status === s ? 'bg-indigo-50 border-indigo-500 text-indigo-700 font-bold scale-105' : 'border-slate-200 text-slate-600 hover:border-slate-300'}`}
              >
                {s.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2 rounded-lg border border-slate-300 text-slate-700 font-semibold text-xs hover:bg-slate-50">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="flex-1 py-2 rounded-lg bg-indigo-600 text-white font-semibold text-xs flex items-center justify-center gap-2 hover:bg-indigo-700 disabled:opacity-60">
            {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><Check size={14} /> Save</>}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function HRMAttendancePage() {
  const [records, setRecords] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [overriding, setOverriding] = useState(null);
  const [marking, setMarking] = useState(false);

  const fetchAttendance = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.from('attendance')
        .select('*, user_profiles(full_name, department, employee_id)')
        .eq('work_date', selectedDate)
        .order('check_in', { ascending: true });

      if (error) throw error;
      setRecords(data || []);
    } catch (err) {
      console.error(err);
      toast.error('Could not load attendance records');
    } finally {
      setIsLoading(false);
    }
  }, [selectedDate]);

  const fetchEmployees = useCallback(async () => {
    const { data } = await supabase.from('user_profiles').select('id, full_name, employee_id').in('role', ['employee', 'relationship_manager', 'relationship_exec']);
    if (data) setEmployees(data);
  }, []);

  useEffect(() => { 
    fetchAttendance(); 
    fetchEmployees();
  }, [fetchAttendance, fetchEmployees]);

  const handleOverrideSave = (id, newStatus, reason) => {
    setRecords(prev => prev.map(r => r.id === id ? { ...r, status: newStatus, override_reason: reason, needs_review: false } : r));
  };

  const filtered = records.filter(r =>
    !search || r.user_profiles?.full_name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 min-h-screen bg-slate-50/50 dark:bg-slate-950">
      <AnimatePresence>
        {overriding && <OverrideModal record={overriding} onClose={() => setOverriding(null)} onSave={handleOverrideSave} />}
        {marking && <MarkAttendanceModal date={selectedDate} employees={employees} onClose={() => setMarking(false)} onSave={(newRecord) => setRecords(prev => [...prev, newRecord])} />}
      </AnimatePresence>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">HR Attendance Oversight</h1>
          <p className="text-xs text-slate-500 mt-1">Review employee clock-in logs and execute audited status overrides.</p>
        </div>
        <div className="flex gap-2 items-center">
          <input
            type="date"
            value={selectedDate}
            onChange={e => setSelectedDate(e.target.value)}
            className="px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-300 focus:outline-none"
          />
          <button onClick={() => setMarking(true)} className="px-3 py-2 rounded-lg bg-indigo-600 text-white font-semibold text-xs flex items-center gap-1.5 hover:bg-indigo-700 transition-colors shadow-xs">
            <Plus size={14} /> Mark Attendance
          </button>
          <button onClick={fetchAttendance} aria-label="Refresh attendance records" className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50">
            <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search employees..."
          className="w-full pl-9 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs focus:ring-1 focus:ring-indigo-500 outline-none"
        />
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
        {isLoading ? (
          <div className="p-12 text-center text-xs text-slate-500">Loading attendance logs...</div>
        ) : filtered.length === 0 ? (
          <div className="p-16 text-center">
            <UserCheck size={28} className="mx-auto text-slate-300 mb-3" />
            <p className="font-semibold text-sm text-slate-700">No records for {formatDateIST(selectedDate)}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 font-semibold text-slate-500">
                  <th className="px-4 py-3">Employee</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Location</th>
                  <th className="px-4 py-3">Clock In</th>
                  <th className="px-4 py-3">Clock Out</th>
                  <th className="px-4 py-3">Duration</th>
                  <th className="px-4 py-3">Flags</th>
                  <th className="px-4 py-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filtered.map(r => {
                  const loc = getLocationStatusBadge(r);
                  return (
                    <tr key={r.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-4 py-3 font-semibold text-slate-900 dark:text-slate-100">
                        {r.user_profiles?.full_name}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={r.status} type="attendance" />
                      </td>
                      <td className="px-4 py-3">
                        {r.check_in_lat != null && r.check_in_lng != null ? (
                          <a href={`https://maps.google.com/?q=${r.check_in_lat},${r.check_in_lng}`} target="_blank" rel="noreferrer" className="hover:opacity-80 transition-opacity" title="View Location">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[10px] font-bold ${loc.cls}`}>
                              <MapPin size={10} /> {loc.label}
                            </span>
                          </a>
                        ) : (
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[10px] font-bold ${loc.cls}`}>
                            <MapPin size={10} /> {loc.label}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 font-mono">{formatTimeIST(r.check_in)}</td>
                      <td className="px-4 py-3 font-mono">{formatTimeIST(r.check_out)}</td>
                      <td className="px-4 py-3 font-mono">{calculateDuration(r.check_in, r.check_out)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                            {r.selfie_url && (
                                <a href={r.selfie_url} target="_blank" rel="noreferrer" title="View Selfie" className="text-indigo-500 hover:text-indigo-700 bg-indigo-50 p-1 rounded">
                                    <Camera size={14} />
                                </a>
                            )}
                            {r.needs_review ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200">
                                <AlertTriangle size={10} /> Needs Review
                              </span>
                            ) : r.override_reason ? (
                              <span className="text-[10px] text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md font-semibold">Overridden</span>
                            ) : '—'}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => setOverriding(r)}
                          className="flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1 rounded-md transition-colors border border-indigo-100"
                        >
                          <Edit3 size={11} /> Override
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
