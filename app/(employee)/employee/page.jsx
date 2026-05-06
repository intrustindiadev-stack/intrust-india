'use client';

import { Clock, Calendar, FileText, CheckCircle2, ChevronRight, Star, Bell, ClipboardList, TrendingUp, Briefcase, User, MapPin, Zap, Building, Plus, DollarSign } from 'lucide-react';
import Link from 'next/link';
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/lib/contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import Skeleton from '@/components/ui/Skeleton';
import Breadcrumbs from '@/components/ui/Breadcrumbs';
import EmptyState from '@/components/ui/EmptyState';

export default function EmployeeDashboard() {
    const { user, profile } = useAuth();
    const [currentTime, setCurrentTime] = useState(new Date());
    const [greeting, setGreeting] = useState('');

    const [todayRecord, setTodayRecord] = useState(null);
    const [clockedIn, setClockedIn] = useState(false);
    const [clocking, setClocking] = useState(false);
    const [latestPayslip, setLatestPayslip] = useState(null);
    const [stats, setStats] = useState({ leavesRemaining: 12, pendingTasks: 4, workingDays: 22 });
    const [isLoading, setIsLoading] = useState(true);

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
                supabase.from('attendance').select('*').eq('employee_id', user.id).eq('date', today).maybeSingle(),
                supabase.from('salary_records').select('*').eq('employee_id', user.id).order('year', { ascending: false }).order('month', { ascending: false }).limit(1).maybeSingle(),
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
        } finally {
            setIsLoading(false);
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
            toast.success('Shift started! Have a great day 🌟');
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
            toast.success('Shift completed. Enjoy your evening! 👋');
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

    const quickLinks = [
        { label: 'Attendance', sub: 'Check In/Out', href: '/employee/attendance', icon: ClipboardList, color: 'emerald' },
        { label: 'My Leaves', sub: 'Apply Leave', href: '/employee/leaves', icon: Calendar, color: 'blue' },
        { label: 'Payslips', sub: 'View History', href: '/employee/payslips', icon: FileText, color: 'amber' },
        { label: 'Performance', sub: 'My Growth', href: '/employee/performance', icon: TrendingUp, color: 'violet' },
    ];

    const COLOR_MAP = {
        emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800',
        blue: 'bg-blue-50 text-blue-600 border-blue-100 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800',
        amber: 'bg-amber-50 text-amber-600 border-amber-100 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800',
        violet: 'bg-violet-50 text-violet-600 border-violet-100 dark:bg-violet-900/20 dark:text-violet-400 dark:border-violet-800',
    };

    return (
        <div className="p-4 sm:p-6 lg:p-8 space-y-8 min-h-screen font-[family-name:var(--font-outfit)] bg-gray-50/30 dark:bg-gray-900/30">
            {/* Top Bar / Breadcrumbs */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <Breadcrumbs />
                <div className="flex items-center gap-3">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{new Date().toLocaleDateString('en-IN', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
                </div>
            </div>
            
            {/* Dynamic Welcome Hub */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6">
                <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
                    <div className="flex items-center gap-3 mb-2">
                        <span className="bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5">
                            <Zap size={12} fill="currentColor" /> Live Portal
                        </span>
                    </div>
                    <h1 className="text-4xl sm:text-5xl font-black text-gray-900 dark:text-white tracking-tight leading-none">
                        {greeting}, <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-500 to-orange-600">{profile?.full_name?.split(' ')[0] || 'Member'}</span>
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-3 font-bold flex items-center gap-2">
                        <Calendar size={18} className="text-amber-500" />
                        {currentTime.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
                    </p>
                </motion.div>

                <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="hidden sm:flex items-center gap-4 bg-white dark:bg-gray-800 p-2 rounded-[2rem] border border-gray-100 dark:border-gray-700 shadow-sm">
                    <div className="pl-4 pr-2">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Office Location</p>
                        <p className="text-sm font-black text-gray-900 dark:text-white flex items-center gap-1.5"><MapPin size={14} className="text-rose-500" /> Gurugram HQ</p>
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-gray-50 dark:bg-gray-900 flex items-center justify-center text-gray-400">
                        <Building size={20} />
                    </div>
                </motion.div>
            </div>

            {/* Attendance & Shift Card */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <motion.div
                    initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                    className={`lg:col-span-2 relative overflow-hidden rounded-[3rem] p-8 sm:p-12 text-white shadow-2xl transition-all duration-700 group ${clockedIn ? 'bg-gradient-to-br from-emerald-600 via-teal-600 to-teal-700 shadow-emerald-500/30' : 'bg-gradient-to-br from-slate-900 via-gray-900 to-black shadow-gray-900/30'}`}
                >
                    <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none group-hover:scale-110 transition-transform duration-1000" />
                    <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-12">
                        <div className="text-center md:text-left space-y-6">
                            <div>
                                <p className="text-white/60 text-xs font-black uppercase tracking-[0.2em] mb-3">Operational Clock</p>
                                <div className="text-6xl sm:text-7xl font-black tracking-tighter font-mono drop-shadow-2xl">
                                    {currentTime.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}
                                </div>
                            </div>
                            
                            <div className="flex flex-wrap justify-center md:justify-start gap-4">
                                {clockedIn ? (
                                    <div className="bg-white/10 backdrop-blur-md px-6 py-3 rounded-2xl border border-white/20 flex flex-col">
                                        <span className="text-[10px] font-black uppercase tracking-widest opacity-60">Active Shift</span>
                                        <span className="text-xl font-black">{getElapsedTime()}</span>
                                    </div>
                                ) : (
                                    <div className="bg-white/5 backdrop-blur-md px-6 py-3 rounded-2xl border border-white/10 flex flex-col opacity-60">
                                        <span className="text-[10px] font-black uppercase tracking-widest">Shift Status</span>
                                        <span className="text-xl font-black italic">Idle</span>
                                    </div>
                                )}
                                
                                {todayRecord?.check_in && (
                                    <div className="bg-white/10 backdrop-blur-md px-6 py-3 rounded-2xl border border-white/20 flex flex-col">
                                        <span className="text-[10px] font-black uppercase tracking-widest opacity-60">Started At</span>
                                        <span className="text-xl font-black">{new Date(todayRecord.check_in).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="relative">
                            <div className={`absolute inset-0 blur-3xl opacity-40 rounded-full animate-pulse ${clockedIn ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                            <button
                                onClick={clockedIn ? handleClockOut : handleClockIn}
                                disabled={clocking || !!todayRecord?.check_out}
                                className={`w-44 h-44 sm:w-56 sm:h-56 rounded-full flex flex-col items-center justify-center gap-3 shadow-2xl relative z-10 transition-all hover:scale-105 active:scale-95 font-black text-xl tracking-tighter disabled:opacity-60 disabled:cursor-not-allowed ${clockedIn ? 'bg-white text-emerald-600 shadow-emerald-500/40' : 'bg-white text-gray-900 shadow-black/40'}`}
                            >
                                {clocking ? (
                                    <div className="w-10 h-10 border-4 border-current/30 border-t-current rounded-full animate-spin" />
                                ) : (
                                    <>
                                        <div className={`p-4 rounded-3xl ${clockedIn ? 'bg-emerald-50' : 'bg-amber-50'}`}>
                                            <Clock size={40} className={clockedIn ? 'text-emerald-500' : 'text-amber-500'} />
                                        </div>
                                        <span className="mt-2">{todayRecord?.check_out ? 'DONE' : clockedIn ? 'SHIFTOUT' : 'SHIFT IN'}</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </motion.div>

                {/* Quick Stats Sidebar */}
                <div className="space-y-6">
                    {isLoading ? (
                        <>
                            <Skeleton className="h-44 rounded-[2.5rem]" />
                            <Skeleton className="h-44 rounded-[2.5rem]" />
                        </>
                    ) : (
                        <>
                            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }} className="bg-white dark:bg-gray-800 rounded-[2.5rem] p-8 border border-gray-100 dark:border-gray-700 shadow-sm relative overflow-hidden group">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-2xl -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-700" />
                                <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-6">Leave Balance</h3>
                                <div className="flex items-end justify-between gap-4">
                                    <div>
                                        <p className="text-5xl font-black text-gray-900 dark:text-white tracking-tighter">{stats.leavesRemaining}</p>
                                        <p className="text-sm font-bold text-gray-500 mt-1">Days left this year</p>
                                    </div>
                                    <Link href="/employee/leaves" className="p-3 rounded-2xl bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white transition-all shadow-sm">
                                        <Plus size={20} />
                                    </Link>
                                </div>
                            </motion.div>

                            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }} className="bg-white dark:bg-gray-800 rounded-[2.5rem] p-8 border border-gray-100 dark:border-gray-700 shadow-sm relative overflow-hidden group">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-violet-500/5 rounded-full blur-2xl -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-700" />
                                <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-6">Team Tasks</h3>
                                <div className="flex items-end justify-between gap-4">
                                    <div>
                                        <p className="text-5xl font-black text-gray-900 dark:text-white tracking-tighter">{stats.pendingTasks}</p>
                                        <p className="text-sm font-bold text-gray-500 mt-1">Pending actions</p>
                                    </div>
                                    <div className="p-3 rounded-2xl bg-violet-50 text-violet-600">
                                        <CheckCircle2 size={20} />
                                    </div>
                                </div>
                            </motion.div>
                        </>
                    )}
                </div>
            </div>

            {/* Quick Actions Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {quickLinks.map((item, i) => (
                    <motion.div key={item.href} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 + i * 0.05 }}>
                        <Link href={item.href} className="group block h-full">
                            <div className="bg-white dark:bg-gray-800 p-6 rounded-[2rem] border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-xl hover:shadow-gray-200/50 dark:hover:shadow-none hover:-translate-y-2 transition-all h-full flex flex-col items-center text-center">
                                <div className={`w-16 h-16 rounded-[1.5rem] ${COLOR_MAP[item.color]} flex items-center justify-center mb-6 group-hover:rotate-6 transition-transform shadow-inner`}>
                                    <item.icon size={28} />
                                </div>
                                <h4 className="text-lg font-black text-gray-900 dark:text-white tracking-tight">{item.label}</h4>
                                <p className="text-sm font-bold text-gray-400 mt-2">{item.sub}</p>
                                <div className="mt-auto pt-6 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <div className="w-10 h-10 rounded-full bg-gray-50 dark:bg-gray-900 flex items-center justify-center text-gray-400">
                                        <ChevronRight size={20} />
                                    </div>
                                </div>
                            </div>
                        </Link>
                    </motion.div>
                ))}
            </div>

            {/* Latest Updates & Notifications */}
            <AnimatePresence>
                {latestPayslip && (
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.95 }} 
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/10 dark:to-orange-900/10 border border-amber-200 dark:border-amber-900/30 rounded-[2rem] p-6 flex flex-col sm:flex-row items-center gap-6 shadow-sm shadow-amber-500/10"
                    >
                        <div className="w-14 h-14 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-lg shadow-amber-500/30 shrink-0">
                            <DollarSign size={24} />
                        </div>
                        <div className="flex-1 text-center sm:text-left">
                            <h4 className="text-lg font-black text-amber-900 dark:text-amber-200">New Payslip Released</h4>
                            <p className="text-sm font-bold text-amber-700 dark:text-amber-400 opacity-80 mt-1">
                                Your salary record for {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][latestPayslip.month - 1]} {latestPayslip.year} is now available in the vault.
                            </p>
                        </div>
                        <Link href="/employee/payslips" className="px-8 py-3 bg-amber-600 hover:bg-amber-700 text-white rounded-2xl font-black text-sm transition-all shadow-lg shadow-amber-600/20 active:scale-95 whitespace-nowrap">
                            Review Vault
                        </Link>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
