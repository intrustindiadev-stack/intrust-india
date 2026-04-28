'use client';

import { Clock, Calendar, FileText, CheckCircle2, ChevronRight, Star, Bell, ClipboardList } from 'lucide-react';
import Link from 'next/link';
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/lib/contexts/AuthContext';
import { motion } from 'framer-motion';
import { toast } from 'react-hot-toast';

export default function EmployeeDashboard() {
    const { user, profile } = useAuth();
    const [currentTime, setCurrentTime] = useState(new Date());
    const [greeting, setGreeting] = useState('');

    // Real attendance state
    const [todayRecord, setTodayRecord] = useState(null);
    const [clockedIn, setClockedIn] = useState(false);
    const [clocking, setClocking] = useState(false);

    // Dynamic payslip notice
    const [latestPayslip, setLatestPayslip] = useState(null);

    const today = new Date().toISOString().split('T')[0];

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        const h = new Date().getHours();
        setGreeting(h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening');
        return () => clearInterval(timer);
    }, []);

    const fetchDashboardData = useCallback(async () => {
        if (!user) return;
        try {
            const [attRes, payRes] = await Promise.allSettled([
                supabase.from('attendance')
                    .select('*')
                    .eq('employee_id', user.id)
                    .eq('date', today)
                    .maybeSingle(),
                supabase.from('salary_records')
                    .select('*')
                    .eq('employee_id', user.id)
                    .order('year', { ascending: false })
                    .order('month', { ascending: false })
                    .limit(1)
                    .maybeSingle(),
            ]);

            if (attRes.status === 'fulfilled' && !attRes.value.error) {
                const rec = attRes.value.data;
                setTodayRecord(rec || null);
                setClockedIn(!!(rec?.check_in && !rec?.check_out));
            }

            if (payRes.status === 'fulfilled' && !payRes.value.error) {
                setLatestPayslip(payRes.value.data || null);
            }
        } catch (err) {
            console.error('Dashboard fetch error:', err);
        }
    }, [user, today]);

    useEffect(() => { fetchDashboardData(); }, [fetchDashboardData]);

    const handleClockIn = async () => {
        if (!user) return;
        setClocking(true);
        try {
            const { data, error } = await supabase.from('attendance').insert([{
                employee_id: user.id,
                date: today,
                check_in: new Date().toISOString(),
                status: 'present',
            }]).select().single();
            if (error) throw error;
            setTodayRecord(data);
            setClockedIn(true);
            toast.success('Clocked in! Have a great day 🌟');
        } catch (err) {
            toast.error(err.message || 'Failed to clock in');
        } finally {
            setClocking(false);
        }
    };

    const handleClockOut = async () => {
        if (!todayRecord) return;
        setClocking(true);
        try {
            const { error } = await supabase.from('attendance')
                .update({ check_out: new Date().toISOString() })
                .eq('id', todayRecord.id);
            if (error) throw error;
            setClockedIn(false);
            toast.success('Clocked out. See you tomorrow! 👋');
            fetchDashboardData();
        } catch (err) {
            toast.error(err.message || 'Failed to clock out');
        } finally {
            setClocking(false);
        }
    };

    const getElapsedTime = () => {
        if (!todayRecord?.check_in) return '';
        const diff = Math.floor((currentTime - new Date(todayRecord.check_in)) / 1000);
        const h = Math.floor(diff / 3600).toString().padStart(2, '0');
        const m = Math.floor((diff % 3600) / 60).toString().padStart(2, '0');
        const s = (diff % 60).toString().padStart(2, '0');
        return `${h}:${m}:${s}`;
    };

    const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    const quickLinks = [
        { label: 'Attendance', sub: 'Clock in & view log', href: '/employee/attendance', icon: ClipboardList, iconBg: 'bg-emerald-50', iconColor: 'text-emerald-600' },
        { label: 'My Leaves', sub: 'Apply & track time off', href: '/employee/leaves', icon: Calendar, iconBg: 'bg-blue-50', iconColor: 'text-blue-600' },
        { label: 'Payslips', sub: 'View salary slips', href: '/employee/payslips', icon: FileText, iconBg: 'bg-amber-50', iconColor: 'text-amber-600' },
        { label: 'Training', sub: 'Learning & development', href: '/employee/training', icon: Star, iconBg: 'bg-violet-50', iconColor: 'text-violet-600' },
    ];

    return (
        <div className="p-4 sm:p-6 lg:p-8 space-y-6 min-h-screen">
            {/* Greeting */}
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
                    {greeting}, {profile?.full_name?.split(' ')[0] || 'there'} 👋
                </h1>
                <p className="text-sm text-gray-500 mt-0.5">
                    {currentTime.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
            </motion.div>

            {/* Attendance Hero */}
            <motion.div
                initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.05 }}
                className={`relative overflow-hidden rounded-3xl p-6 sm:p-8 text-white shadow-xl transition-all duration-700 ${clockedIn ? 'bg-gradient-to-br from-emerald-500 to-teal-600 shadow-emerald-500/30' : 'bg-gradient-to-br from-slate-800 to-gray-900 shadow-gray-900/30'}`}
            >
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
                <div className="relative z-10 flex flex-col sm:flex-row items-center justify-between gap-6">
                    <div className="text-center sm:text-left">
                        <p className="text-white/60 text-sm font-medium uppercase tracking-widest mb-1">Current Time</p>
                        <div className="text-5xl sm:text-6xl font-black tracking-tight font-mono">
                            {currentTime.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}
                        </div>
                        <div className="mt-3 flex items-center gap-2 text-sm justify-center sm:justify-start">
                            {clockedIn ? (
                                <span className="flex items-center gap-2 bg-white/20 px-3 py-1.5 rounded-full font-medium">
                                    <CheckCircle2 size={14} />
                                    Clocked in · {getElapsedTime()}
                                </span>
                            ) : todayRecord?.check_out ? (
                                <span className="flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-full font-medium">
                                    <CheckCircle2 size={14} />
                                    Done for today ✓
                                </span>
                            ) : (
                                <span className="flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-full font-medium">
                                    <Clock size={14} />
                                    Not clocked in
                                </span>
                            )}
                        </div>
                    </div>

                    <button
                        onClick={clockedIn ? handleClockOut : handleClockIn}
                        disabled={clocking || !!todayRecord?.check_out}
                        className={`w-36 h-36 sm:w-44 sm:h-44 rounded-full flex flex-col items-center justify-center gap-2 shadow-2xl transition-all hover:scale-105 active:scale-95 font-black text-lg tracking-wide disabled:opacity-60 disabled:cursor-not-allowed ${clockedIn ? 'bg-white text-emerald-600 shadow-emerald-500/30' : 'bg-white text-gray-800 shadow-black/20'}`}
                    >
                        {clocking ? (
                            <div className="w-8 h-8 border-4 border-current/30 border-t-current rounded-full animate-spin" />
                        ) : (
                            <>
                                <Clock size={32} className={clockedIn ? 'text-emerald-500' : 'text-gray-700'} />
                                {todayRecord?.check_out ? 'DONE' : clockedIn ? 'CLOCK OUT' : 'CLOCK IN'}
                            </>
                        )}
                    </button>
                </div>

                {todayRecord?.check_out && (
                    <div className="mt-4 pt-4 border-t border-white/10 flex flex-wrap gap-6 text-sm">
                        <span>In: <strong>{new Date(todayRecord.check_in).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</strong></span>
                        <span>Out: <strong>{new Date(todayRecord.check_out).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</strong></span>
                        <span>Duration: <strong>
                            {Math.floor((new Date(todayRecord.check_out) - new Date(todayRecord.check_in)) / 3600000)}h{' '}
                            {Math.floor(((new Date(todayRecord.check_out) - new Date(todayRecord.check_in)) % 3600000) / 60000)}m
                        </strong></span>
                    </div>
                )}
            </motion.div>

            {/* Quick Links */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {quickLinks.map((item, i) => (
                    <motion.div key={item.href} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.05 }}>
                        <Link href={item.href} className="flex flex-col items-center gap-3 p-5 bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-violet-100 hover:-translate-y-0.5 transition-all group text-center">
                            <div className={`w-12 h-12 rounded-2xl ${item.iconBg} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                                <item.icon size={22} className={item.iconColor} />
                            </div>
                            <div>
                                <p className="font-bold text-gray-900 text-sm">{item.label}</p>
                                <p className="text-xs text-gray-400 mt-0.5 hidden sm:block">{item.sub}</p>
                            </div>
                        </Link>
                    </motion.div>
                ))}
            </div>

            {/* Dynamic Payslip Notice */}
            {latestPayslip && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
                    className="flex items-center gap-4 p-4 bg-amber-50 border border-amber-200 rounded-2xl">
                    <Bell size={20} className="text-amber-600 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                        <p className="font-semibold text-amber-800 text-sm">
                            {MONTHS[latestPayslip.month - 1]} {latestPayslip.year} Payslip Available
                        </p>
                        <p className="text-xs text-amber-600 mt-0.5">
                            Net pay ₹{latestPayslip.net_salary?.toLocaleString('en-IN')} · Status: {latestPayslip.status}
                        </p>
                    </div>
                    <Link href="/employee/payslips" className="flex-shrink-0 text-xs font-bold text-amber-700 hover:text-amber-900 underline underline-offset-2">
                        View →
                    </Link>
                </motion.div>
            )}
        </div>
    );
}
