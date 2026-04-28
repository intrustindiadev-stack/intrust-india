'use client';

import { useState, useEffect, useCallback } from 'react';
import { Clock, CheckCircle, XCircle, MinusCircle, MapPin, RefreshCw } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/lib/contexts/AuthContext';
import { toast } from 'react-hot-toast';
import { motion } from 'framer-motion';

const STATUS_META = {
    present:  { label: 'Present',  cls: 'bg-emerald-50 text-emerald-700 border-emerald-100', icon: CheckCircle },
    absent:   { label: 'Absent',   cls: 'bg-rose-50 text-rose-700 border-rose-100', icon: XCircle },
    late:     { label: 'Late',     cls: 'bg-amber-50 text-amber-700 border-amber-100', icon: Clock },
    half_day: { label: 'Half Day', cls: 'bg-blue-50 text-blue-700 border-blue-100', icon: MinusCircle },
    holiday:  { label: 'Holiday',  cls: 'bg-violet-50 text-violet-700 border-violet-100', icon: CheckCircle },
    wfh:      { label: 'WFH',      cls: 'bg-teal-50 text-teal-700 border-teal-100', icon: MapPin },
};

export default function EmployeeAttendancePage() {
    const { user } = useAuth();
    const [records, setRecords] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [clockedIn, setClockedIn] = useState(false);
    const [todayRecord, setTodayRecord] = useState(null);
    const [clocking, setClocking] = useState(false);

    const today = new Date().toISOString().split('T')[0];

    const fetchAttendance = useCallback(async () => {
        if (!user) return;
        setIsLoading(true);
        try {
            // Get last 30 days
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            const { data, error } = await supabase.from('attendance')
                .select('*')
                .eq('employee_id', user.id)
                .gte('date', thirtyDaysAgo.toISOString().split('T')[0])
                .order('date', { ascending: false });
            if (error) throw error;
            setRecords(data || []);
            const todayRec = (data || []).find(r => r.date === today);
            setTodayRecord(todayRec || null);
            setClockedIn(!!(todayRec?.check_in && !todayRec?.check_out));
        } catch (err) {
            console.error(err);
        } finally { setIsLoading(false); }
    }, [user, today]);

    useEffect(() => { fetchAttendance(); }, [fetchAttendance]);

    const handleClockIn = async () => {
        setClocking(true);
        try {
            const now = new Date().toISOString();
            const { data, error } = await supabase.from('attendance').insert([{
                employee_id: user.id,
                date: today,
                check_in: now,
                status: 'present',
            }]).select().single();
            if (error) throw error;
            setTodayRecord(data);
            setClockedIn(true);
            toast.success('Clocked in successfully!');
            fetchAttendance();
        } catch (err) { toast.error(err.message); }
        finally { setClocking(false); }
    };

    const handleClockOut = async () => {
        if (!todayRecord) return;
        setClocking(true);
        try {
            const now = new Date().toISOString();
            const { error } = await supabase.from('attendance').update({ check_out: now }).eq('id', todayRecord.id);
            if (error) throw error;
            setClockedIn(false);
            toast.success('Clocked out successfully!');
            fetchAttendance();
        } catch (err) { toast.error(err.message); }
        finally { setClocking(false); }
    };

    const fmt = (dt) => dt ? new Date(dt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '—';
    const duration = (ci, co) => {
        if (!ci || !co) return '—';
        const diff = new Date(co) - new Date(ci);
        return `${Math.floor(diff / 3600000)}h ${Math.floor((diff % 3600000) / 60000)}m`;
    };

    const presentDays = records.filter(r => r.status === 'present' || r.status === 'late').length;
    const absentDays = records.filter(r => r.status === 'absent').length;

    return (
        <div className="p-4 sm:p-6 lg:p-8 space-y-6 min-h-screen">
            <div className="flex justify-between items-start">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">Attendance</h1>
                    <p className="text-sm text-gray-500 mt-0.5">Your clock-in/out log for this month.</p>
                </div>
                <button onClick={fetchAttendance} className="p-2.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50">
                    <RefreshCw size={16} className="text-gray-500" />
                </button>
            </div>

            {/* Today's Clock In/Out Card */}
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                className={`rounded-3xl p-6 text-white relative overflow-hidden shadow-xl ${clockedIn ? 'bg-gradient-to-br from-emerald-600 to-teal-700' : 'bg-gradient-to-br from-gray-800 to-gray-900'}`}>
                <div className="absolute -top-8 -right-8 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
                <p className="text-white/60 text-xs font-bold uppercase tracking-widest mb-2">Today — {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
                <div className="flex items-center justify-between gap-4 flex-wrap">
                    <div>
                        {todayRecord?.check_in ? (
                            <>
                                <p className="text-3xl font-black">{fmt(todayRecord.check_in)}</p>
                                <p className="text-white/60 text-sm mt-1">{clockedIn ? 'Clocked in · currently working' : `Worked ${duration(todayRecord.check_in, todayRecord.check_out)}`}</p>
                            </>
                        ) : (
                            <>
                                <p className="text-3xl font-black">{new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</p>
                                <p className="text-white/60 text-sm mt-1">Not clocked in yet</p>
                            </>
                        )}
                    </div>
                    <button onClick={clockedIn ? handleClockOut : handleClockIn} disabled={clocking || (todayRecord?.check_out)}
                        className={`px-6 py-3 rounded-2xl font-bold text-sm transition-all shadow-lg disabled:opacity-60 flex items-center gap-2 ${clockedIn ? 'bg-rose-500 hover:bg-rose-400 text-white shadow-rose-500/30' : 'bg-white text-gray-900 hover:bg-gray-100 shadow-black/10'}`}>
                        {clocking ? <div className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin" /> : clockedIn ? 'Clock Out' : 'Clock In'}
                    </button>
                </div>
                {todayRecord?.check_out && (
                    <div className="mt-4 pt-4 border-t border-white/10 flex gap-6 text-sm">
                        <span>In: <strong>{fmt(todayRecord.check_in)}</strong></span>
                        <span>Out: <strong>{fmt(todayRecord.check_out)}</strong></span>
                        <span>Duration: <strong>{duration(todayRecord.check_in, todayRecord.check_out)}</strong></span>
                    </div>
                )}
            </motion.div>

            {/* Monthly Summary */}
            <div className="grid grid-cols-3 gap-4">
                {[
                    { label: 'Present', value: presentDays, color: 'from-emerald-500 to-teal-500' },
                    { label: 'Absent', value: absentDays, color: 'from-rose-500 to-pink-500' },
                    { label: 'Recorded', value: records.length, color: 'from-indigo-500 to-violet-500' },
                ].map((s, i) => (
                    <motion.div key={s.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                        className={`rounded-2xl p-4 text-white bg-gradient-to-br ${s.color} shadow-lg text-center`}>
                        <p className="text-3xl font-black">{s.value}</p>
                        <p className="text-white/70 text-xs font-bold uppercase tracking-wider mt-1">{s.label}</p>
                    </motion.div>
                ))}
            </div>

            {/* Log */}
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="p-5 border-b border-gray-100">
                    <h2 className="font-bold text-gray-900 text-base">Attendance Log (Last 30 days)</h2>
                </div>
                {isLoading ? (
                    <div className="p-10 flex justify-center"><div className="w-6 h-6 border-2 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" /></div>
                ) : records.length === 0 ? (
                    <div className="p-12 text-center">
                        <Clock size={36} className="mx-auto text-gray-200 mb-3" />
                        <p className="text-gray-500 font-medium">No attendance records yet</p>
                        <p className="text-xs text-gray-400 mt-1">Use the Clock In button above to start tracking</p>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-50">
                        {records.map(r => {
                            const meta = STATUS_META[r.status] || STATUS_META.present;
                            const Icon = meta.icon;
                            return (
                                <div key={r.id} className="flex items-center justify-between px-5 py-4 hover:bg-gray-50/50 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <div className="w-9 h-9 rounded-xl bg-gray-50 flex items-center justify-center flex-shrink-0">
                                            <Clock size={16} className="text-gray-400" />
                                        </div>
                                        <div>
                                            <p className="font-semibold text-gray-900 text-sm">{new Date(r.date).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}</p>
                                            {r.check_in && <p className="text-xs text-gray-400 mt-0.5">{fmt(r.check_in)} → {fmt(r.check_out)} {r.check_out ? `· ${duration(r.check_in, r.check_out)}` : '(ongoing)'}</p>}
                                            {r.override_reason && <p className="text-xs text-amber-500 mt-0.5">Override: {r.override_reason}</p>}
                                        </div>
                                    </div>
                                    <span className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-lg border ${meta.cls}`}>
                                        <Icon size={11} /> {meta.label}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
