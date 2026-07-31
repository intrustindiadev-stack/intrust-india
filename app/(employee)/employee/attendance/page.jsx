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
    late:     { label: 'Late',     cls: 'bg-blue-50 text-blue-700 border-blue-100', icon: Clock },
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
    const [pendingCheckoutRecord, setPendingCheckoutRecord] = useState(null);

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
            
            if (data && data.length > 0) {
                const latest = data[0];
                if (latest.check_in && !latest.check_out && latest.date !== today) {
                    setPendingCheckoutRecord(latest);
                    setClockedIn(false);
                } else {
                    setPendingCheckoutRecord(null);
                    setClockedIn(!!(todayRec?.check_in && !todayRec?.check_out));
                }
            } else {
                setPendingCheckoutRecord(null);
                setClockedIn(false);
            }
        } catch (err) {
            console.error(err);
        } finally { setIsLoading(false); }
    }, [user, today]);

    useEffect(() => { fetchAttendance(); }, [fetchAttendance]);

    const getCoordinates = () => {
        return new Promise((resolve) => {
            if (typeof window === 'undefined' || !navigator.geolocation) {
                toast.error('Geolocation is not supported by your browser');
                resolve(null);
                return;
            }
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude });
                },
                (err) => {
                    console.warn("Geolocation access denied or failed", err);
                    toast.error('Geolocation permission denied or timed out. Clocking in without coordinates.');
                    resolve(null);
                },
                { enableHighAccuracy: true, timeout: 8000 }
            );
        });
    };

    const getDistanceInMeters = (lat1, lon1, lat2, lon2) => {
        const R = 6371e3; // metres
        const φ1 = lat1 * Math.PI/180;
        const φ2 = lat2 * Math.PI/180;
        const Δφ = (lat2-lat1) * Math.PI/180;
        const Δλ = (lon2-lon1) * Math.PI/180;

        const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
                  Math.cos(φ1) * Math.cos(φ2) *
                  Math.sin(Δλ/2) * Math.sin(Δλ/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

        return R * c; // in metres
    };

    const handleClockIn = async () => {
        setClocking(true);
        try {
            const coords = await getCoordinates();
            let checkInLat = null;
            let checkInLng = null;
            let isOnsite = false;

            if (coords) {
                checkInLat = coords.lat;
                checkInLng = coords.lng;
                // Intrust office HQ (Mumbai reference coords)
                const dist = getDistanceInMeters(coords.lat, coords.lng, 19.0760, 72.8777);
                if (dist <= 300) {
                    isOnsite = true;
                }
            }

            const res = await fetch('/api/employee/attendance/clock-in', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ is_onsite: isOnsite, lat: checkInLat, lng: checkInLng })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to clock in');
            
            setTodayRecord(data.record);
            setClockedIn(true);
            toast.success(isOnsite ? 'Clocked in successfully (On-Site)!' : 'Clocked in successfully (WFH/Off-Site)!');
            fetchAttendance();
        } catch (err) { toast.error(err.message); }
        finally { setClocking(false); }
    };

    const handleClockOut = async () => {
        if (!todayRecord) return;
        setClocking(true);
        try {
            const coords = await getCoordinates();
            let checkOutLat = null;
            let checkOutLng = null;
            let isOnsite = todayRecord.is_onsite;

            if (coords) {
                checkOutLat = coords.lat;
                checkOutLng = coords.lng;
                const dist = getDistanceInMeters(coords.lat, coords.lng, 19.0760, 72.8777);
                if (dist <= 300) {
                    isOnsite = true;
                }
            }

            const res = await fetch('/api/employee/attendance/clock-out', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ record_id: todayRecord.id, is_onsite: isOnsite, lat: checkOutLat, lng: checkOutLng })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to clock out');
            
            setClockedIn(false);
            toast.success('Clocked out successfully!');
            fetchAttendance();
        } catch (err) { toast.error(err.message); }
        finally { setClocking(false); }
    };

    const handleForceCheckoutPrevious = async () => {
        if (!pendingCheckoutRecord) return;
        setClocking(true);
        try {
            const res = await fetch('/api/employee/attendance/force-close', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ record_id: pendingCheckoutRecord.id })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to close past shift');
            
            toast.success('Previous shift closed automatically.');
            fetchAttendance();
        } catch(err) {
            toast.error(err.message);
        } finally {
            setClocking(false);
        }
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
                className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
                <div className="flex justify-between items-start mb-6">
                    <div>
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Current Status</p>
                        {pendingCheckoutRecord ? (
                            <>
                                <p className="text-2xl font-mono text-amber-600 font-medium tracking-tight">Pending Checkout</p>
                                <p className="text-sm text-gray-500 mt-1">Please close your shift from {new Date(pendingCheckoutRecord.date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })} before clocking in today.</p>
                            </>
                        ) : todayRecord?.check_in ? (
                            <>
                                <p className="text-3xl font-mono text-gray-900 font-medium tracking-tight">{fmt(todayRecord.check_in)}</p>
                                <p className="text-sm text-gray-500 mt-1">{clockedIn ? 'Clocked in · currently working' : `Worked ${duration(todayRecord.check_in, todayRecord.check_out)}`}</p>
                            </>
                        ) : (
                            <>
                                <p className="text-3xl font-mono text-gray-900 font-medium tracking-tight">{new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</p>
                                <p className="text-sm text-gray-500 mt-1">Not clocked in yet</p>
                            </>
                        )}
                    </div>
                    {pendingCheckoutRecord ? (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest bg-amber-50 text-amber-700 border border-amber-100">
                            Action Required
                        </span>
                    ) : (
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border ${clockedIn ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-gray-50 text-gray-500 border-gray-200'}`}>
                            {clockedIn ? '● Active Shift' : 'Idle'}
                        </span>
                    )}
                </div>
                
                <div className="pt-5 border-t border-gray-100">
                    {pendingCheckoutRecord ? (
                        <button onClick={handleForceCheckoutPrevious} disabled={clocking}
                            className="w-full py-2.5 rounded-xl text-sm font-semibold transition-colors bg-amber-100 text-amber-800 hover:bg-amber-200 shadow-sm flex items-center justify-center">
                            {clocking ? <div className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin" /> : 'Force Close Previous Shift'}
                        </button>
                    ) : (
                        <button onClick={clockedIn ? handleClockOut : handleClockIn} disabled={clocking || (todayRecord?.check_out)}
                            className={`w-full py-2.5 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2 ${clockedIn ? 'bg-white border border-red-200 text-red-600 hover:bg-red-50' : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm'} disabled:opacity-50 disabled:cursor-not-allowed`}>
                            {clocking ? <div className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin" /> : clockedIn ? 'Clock Out' : 'Clock In'}
                        </button>
                    )}
                </div>
                
                {!pendingCheckoutRecord && todayRecord && (
                    <div className="mt-4 flex flex-wrap gap-4 text-xs font-medium text-gray-500">
                        <span>In: <strong className="text-gray-700">{fmt(todayRecord.check_in)}</strong></span>
                        {todayRecord.check_out && <span>Out: <strong className="text-gray-700">{fmt(todayRecord.check_out)}</strong></span>}
                        {todayRecord.check_out && <span>Duration: <strong className="text-gray-700">{duration(todayRecord.check_in, todayRecord.check_out)}</strong></span>}
                    </div>
                )}
            </motion.div>

            {/* Monthly Summary */}
            <div className="grid grid-cols-3 gap-4">
                {[
                    { label: 'Present', value: presentDays, text: 'text-emerald-600' },
                    { label: 'Absent', value: absentDays, text: 'text-rose-600' },
                    { label: 'Recorded', value: records.length, text: 'text-indigo-600' },
                ].map((s, i) => (
                    <motion.div key={s.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                        className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm text-center">
                        <p className={`text-3xl font-medium tracking-tight ${s.text}`}>{s.value}</p>
                        <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider mt-1">{s.label}</p>
                    </motion.div>
                ))}
            </div>

            {/* Attendance Log Table */}
            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
                <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
                    <h2 className="text-base font-semibold text-gray-900">Attendance Log (Last 30 days)</h2>
                </div>
                {isLoading ? (
                    <div className="p-12 flex justify-center"><div className="w-8 h-8 border-4 border-gray-200 border-t-indigo-600 rounded-full animate-spin" /></div>
                ) : records.length === 0 ? (
                    <div className="p-16 text-center">
                        <Clock size={32} className="mx-auto text-gray-300 mb-3" />
                        <p className="text-gray-500 font-medium text-sm">No attendance records found.</p>
                        <p className="text-xs text-gray-400 mt-1">Clock in to start generating your attendance log.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm whitespace-nowrap">
                            <thead className="bg-gray-50/50 text-gray-500 text-xs uppercase tracking-wider font-semibold border-b border-gray-100">
                                <tr>
                                    <th className="px-6 py-4">Date</th>
                                    <th className="px-6 py-4">First In</th>
                                    <th className="px-6 py-4">Last Out</th>
                                    <th className="px-6 py-4">Total Hours</th>
                                    <th className="px-6 py-4">Location</th>
                                    <th className="px-6 py-4 text-right">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50 text-gray-700">
                                {records.map(r => {
                                    const meta = STATUS_META[r.status] || STATUS_META.present;
                                    const Icon = meta.icon;
                                    return (
                                        <tr key={r.id} className="hover:bg-gray-50/50 transition-colors">
                                            <td className="px-6 py-4">
                                                <span className="font-medium text-gray-900">{new Date(r.date).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}</span>
                                            </td>
                                            <td className="px-6 py-4 font-mono text-gray-600">
                                                {r.check_in ? fmt(r.check_in) : '—'}
                                            </td>
                                            <td className="px-6 py-4 font-mono text-gray-600">
                                                {r.check_out ? fmt(r.check_out) : r.check_in ? <span className="text-amber-500 text-xs font-semibold">Ongoing</span> : '—'}
                                            </td>
                                            <td className="px-6 py-4 font-mono text-gray-600">
                                                {r.check_in && r.check_out ? duration(r.check_in, r.check_out) : '—'}
                                            </td>
                                            <td className="px-6 py-4">
                                                {r.check_in_lat ? (
                                                    <a 
                                                        href={`https://www.google.com/maps/search/?api=1&query=${r.check_in_lat},${r.check_in_lng}`} 
                                                        target="_blank" 
                                                        rel="noopener noreferrer" 
                                                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide border ${r.is_onsite ? 'bg-emerald-50 text-emerald-700 border-emerald-100 hover:bg-emerald-100' : 'bg-blue-50 text-blue-700 border-blue-100 hover:bg-blue-100'}`}
                                                    >
                                                        <MapPin size={10} /> {r.is_onsite ? 'On-Site' : 'Remote'}
                                                    </a>
                                                ) : (
                                                    <span className="text-gray-400 text-xs">—</span>
                                                )}
                                                {r.override_reason && (
                                                    <div className="text-[10px] text-gray-400 mt-1">Note: {r.override_reason}</div>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full border ${meta.cls}`}>
                                                    <Icon size={12} /> {meta.label}
                                                </span>
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
