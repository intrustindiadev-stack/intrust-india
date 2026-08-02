'use client';

import { Clock, Calendar, FileText, CheckCircle2, ChevronRight, Star, Bell, ClipboardList, TrendingUp, Briefcase, User, MapPin, Zap, Building, Plus, DollarSign, BookOpen, HelpCircle } from 'lucide-react';
import Link from 'next/link';

const QUICK_ACTIONS = [
    { label: 'Attendance', icon: ClipboardList, href: '/employee/attendance', color: 'bg-emerald-500', shadow: 'shadow-emerald-500/30', desc: 'Today record' },
    { label: 'My Leaves', icon: Calendar, href: '/employee/leaves', color: 'bg-violet-600', shadow: 'shadow-violet-600/30', desc: 'Apply leave' },
    { label: 'Payslips', icon: FileText, href: '/employee/payslips', color: 'bg-amber-500', shadow: 'shadow-amber-500/30', desc: 'Download slip' },
    { label: 'Training', icon: BookOpen, href: '/employee/training', color: 'bg-rose-500', shadow: 'shadow-rose-500/30', desc: 'My sessions' },
    { label: 'My Profile', icon: User, href: '/employee/profile', color: 'bg-blue-600', shadow: 'shadow-blue-600/30', desc: 'View & edit' },
    { label: 'Help', icon: HelpCircle, href: '/employee/help', color: 'bg-gray-700', shadow: 'shadow-gray-700/30', desc: 'Guides & FAQ' },
];
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/lib/contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import Skeleton from '@/components/ui/Skeleton';
import SkeletonCard from '@/components/shared/SkeletonCard';
import Breadcrumbs from '@/components/ui/Breadcrumbs';
import EmptyState from '@/components/ui/EmptyState';

import WelcomeRoleCelebrationModal from '@/components/shared/WelcomeRoleCelebrationModal';
import Image from 'next/image';

export default function EmployeeDashboard() {
    const { user, profile } = useAuth();
    const [currentTime, setCurrentTime] = useState(new Date());
    const [greeting, setGreeting] = useState('');

    const [todayRecord, setTodayRecord] = useState(null);
    const [clockedIn, setClockedIn] = useState(false);
    const [clocking, setClocking] = useState(false);
    const [pendingCheckoutRecord, setPendingCheckoutRecord] = useState(null);
    const [latestPayslip, setLatestPayslip] = useState(null);
    const [stats, setStats] = useState({ leavesRemaining: 41, pendingTasks: 0, workingDays: 22 });
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
            const [attRes, leaveRes, payRes, tasksRes] = await Promise.allSettled([
                fetch('/api/employee/attendance/summary', { headers: { 'Cache-Control': 'no-cache' } }).then(r => r.json()),
                fetch('/api/employee/leaves/summary', { headers: { 'Cache-Control': 'no-cache' } }).then(r => r.json()),
                supabase.from('salary_records').select('*').eq('employee_id', user.id).order('year', { ascending: false }).order('month', { ascending: false }).limit(1).maybeSingle(),
                supabase.from('crm_tasks').select('id', { count: 'exact', head: true }).eq('assigned_to', user.id).eq('status', 'pending')
            ]);

            if (attRes.status === 'fulfilled' && attRes.value?.success) {
                const openRec = attRes.value.open_shift;
                setTodayRecord(openRec || null);
                setClockedIn(!!openRec);
            }

            if (payRes.status === 'fulfilled' && !payRes.value.error) {
                setLatestPayslip(payRes.value.data || null);
            }

            let remainingTotal = 0;
            let upcomingHols = 0;

            if (leaveRes.status === 'fulfilled' && leaveRes.value?.success) {
                const balances = leaveRes.value.balances || {};
                Object.values(balances).forEach((b) => {
                    if (b?.available_days) {
                        remainingTotal += Number(b.available_days);
                    }
                });
                upcomingHols = leaveRes.value.holidays?.length || 0;
            }

            const tasksCount = tasksRes.status === 'fulfilled' ? (tasksRes.value.count || 0) : 0;

            setStats(prev => ({
                ...prev,
                leavesRemaining: remainingTotal,
                upcomingHolidays: upcomingHols,
                pendingTasks: tasksCount
            }));

        } catch (err) {
            console.error('Dashboard fetch error:', err);
        } finally {
            setIsLoading(false);
        }
    }, [user]);

    useEffect(() => { fetchDashboardData(); }, [fetchDashboardData]);

    const handleClockIn = async () => {
        if (!user) return;
        setClocking(true);
        try {
            const res = await fetch('/api/employee/attendance/clock-in', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ is_onsite: true }) // Defaulting to true for dashboard
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to clock in');
            
            setTodayRecord(data.record);
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
            const res = await fetch('/api/employee/attendance/clock-out', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ record_id: todayRecord.id, is_onsite: true })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to clock out');
            
            setClockedIn(false);
            setTodayRecord(prev => prev ? { ...prev, check_out: data.check_out } : prev);
            toast.success('Shift completed. Enjoy your evening! 👋');
            fetchDashboardData();
        } catch (err) {
            toast.error(err.message || 'Failed to clock out');
        } finally {
            setClocking(false);
        }
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
            if (!res.ok) throw new Error(data.error || 'Failed to force checkout');
            
            toast.success('Previous shift closed automatically.');
            fetchDashboardData();
        } catch(err) {
            toast.error(err.message || 'Failed to force checkout');
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
        { label: 'My Profile', sub: 'View Details', href: '/employee/profile', icon: User, color: 'violet' },
    ];

    const COLOR_MAP = {
        emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800',
        blue: 'bg-blue-50 text-blue-600 border-blue-100 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800',
        amber: 'bg-amber-50 text-amber-600 border-amber-100 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800',
        violet: 'bg-violet-50 text-violet-600 border-violet-100 dark:bg-violet-900/20 dark:text-violet-400 dark:border-violet-800',
    };

    return (
        <div className="p-4 sm:p-6 lg:p-8 space-y-8 min-h-screen font-[family-name:var(--font-outfit)] bg-[#F8FAFC] dark:bg-gray-900 relative">
            {/* Background elements */}
            <div className="absolute top-0 inset-x-0 h-[40vh] bg-gradient-to-b from-sky-50/80 dark:from-sky-900/20 to-transparent pointer-events-none" />
            <div className="absolute top-20 right-0 w-96 h-96 bg-blue-200/40 dark:bg-blue-900/20 rounded-full blur-[100px] pointer-events-none" />
            <div className="absolute top-40 left-0 w-96 h-96 bg-sky-200/40 dark:bg-sky-900/20 rounded-full blur-[100px] pointer-events-none" />

            <div className="relative z-10 space-y-8 max-w-7xl mx-auto">
                {/* First Time Welcome Celebration Modal */}
                <WelcomeRoleCelebrationModal />

                {/* Top Bar / Breadcrumbs */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl p-4 rounded-3xl border border-white/60 dark:border-gray-700 shadow-sm shadow-sky-500/5">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 flex items-center justify-center p-1.5">
                            <Image
                                src="/logo.png"
                                alt="InTrust Logo"
                                width={28}
                                height={28}
                                className="object-contain"
                            />
                        </div>
                        <Breadcrumbs />
                    </div>
                    <div className="flex items-center gap-3 bg-sky-50/50 dark:bg-sky-900/20 px-4 py-2 rounded-xl border border-sky-100/50 dark:border-sky-800/30">
                        <span className="text-[10px] font-black text-sky-700 dark:text-sky-400 uppercase tracking-widest">{new Date().toLocaleDateString('en-IN', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
                    </div>
                </div>
            
            {/* Dynamic Welcome Hub Graphic Banner */}
            <motion.div 
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} 
                className="relative w-full rounded-[2.5rem] bg-gradient-to-r from-sky-500 via-blue-600 to-indigo-700 p-8 sm:p-12 overflow-hidden shadow-2xl shadow-blue-600/30 text-white flex flex-col md:flex-row justify-between items-center gap-8"
            >
                <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
                <div className="absolute bottom-0 left-1/2 w-64 h-64 bg-cyan-400/30 rounded-full blur-3xl transform -translate-x-1/2 pointer-events-none" />
                
                {/* Employee Dashboard Illustration */}
                <div className="hidden lg:block absolute top-1/2 -translate-y-1/2 right-12 w-[320px] h-[320px] rounded-3xl overflow-hidden shadow-2xl border-4 border-white/20 transform hover:scale-[1.02] transition-transform duration-500">
                    <Image src="/images/employee_banner_illustration.png" alt="Employee Illustration" fill className="object-cover" priority />
                </div>

                <div className="relative z-10 flex flex-col gap-4 max-w-2xl">
                    <div className="flex items-center gap-3 mb-1">
                        <span className="bg-white/10 text-white px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest flex items-center gap-1.5 border border-white/20 backdrop-blur-md shadow-lg">
                            <Zap size={14} fill="currentColor" /> Employee Workspace
                        </span>
                        <span className="text-[10px] font-bold text-sky-50 uppercase tracking-widest bg-black/20 px-3 py-1.5 rounded-full backdrop-blur-sm hidden sm:block">
                            {currentTime.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
                        </span>
                    </div>
                    <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight drop-shadow-md">
                        {greeting}, <br className="hidden sm:block"/>
                        <span className="text-sky-100">{profile?.full_name?.split(' ')[0] || 'Team Member'}</span>!
                    </h1>
                    <p className="text-sm font-medium text-sky-50 mt-2 max-w-xl opacity-90 leading-relaxed">
                        Ready to make an impact today? Track your shifts, tasks, and achievements in your personal workspace.
                    </p>
                    
                    <div className="mt-4 flex flex-wrap items-center gap-3">
                        <div className="flex items-center gap-4 bg-white/10 backdrop-blur-md px-6 py-4 rounded-[1.25rem] border border-white/20 shadow-lg">
                            <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-blue-600 shadow-inner">
                                <Building size={18} />
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-sky-100 uppercase tracking-widest">Location</p>
                                <p className="text-sm font-black text-white flex items-center gap-1.5">{profile?.department ? `${profile.department} Dept` : 'Gurugram HQ'}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </motion.div>

            {/* ⚡ Quick Actions */}
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
                <h2 className="text-sm font-black text-gray-500 uppercase tracking-widest mb-3">Quick Actions</h2>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                    {QUICK_ACTIONS.map((action) => {
                        const Icon = action.icon;
                        return (
                            <Link key={action.href} href={action.href} className="group flex flex-col items-center gap-2.5 p-4 bg-white rounded-2xl border border-gray-100 hover:border-gray-200 shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 text-center">
                                <div className={`w-11 h-11 rounded-xl ${action.color} flex items-center justify-center shadow-lg ${action.shadow} group-hover:scale-110 transition-transform duration-200`}>
                                    <Icon size={20} className="text-white" />
                                </div>
                                <div>
                                    <p className="text-xs font-black text-gray-800">{action.label}</p>
                                    <p className="text-[10px] text-gray-400 font-medium mt-0.5">{action.desc}</p>
                                </div>
                            </Link>
                        );
                    })}
                </div>
            </motion.div>

            {/* Attendance & Shift Card */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <motion.div
                    initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                    className="lg:col-span-2 relative bg-white border border-gray-200 rounded-2xl p-8 shadow-sm flex flex-col justify-between"
                >
                    <div className="flex justify-between items-start mb-6">
                        <div>
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Time Clock</p>
                            {pendingCheckoutRecord ? (
                                <>
                                    <p className="text-2xl font-mono text-amber-600 font-medium tracking-tight">Pending Checkout</p>
                                    <p className="text-sm text-gray-500 mt-1">Please close your shift from {new Date(pendingCheckoutRecord.date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })} before clocking in today.</p>
                                </>
                            ) : todayRecord?.check_in ? (
                                <>
                                    <div className="text-4xl sm:text-5xl font-medium tracking-tight font-mono text-gray-900 mb-2">
                                        {currentTime.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}
                                    </div>
                                    <p className="text-sm text-gray-500 mt-1">{clockedIn ? `Clocked in at ${new Date(todayRecord.check_in).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}` : `Shift completed`}</p>
                                </>
                            ) : (
                                <>
                                    <div className="text-4xl sm:text-5xl font-medium tracking-tight font-mono text-gray-900 mb-2">
                                        {currentTime.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}
                                    </div>
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
                    
                    <div className="pt-6 mt-4 border-t border-gray-100 flex flex-wrap items-center gap-4">
                        {pendingCheckoutRecord ? (
                            <button onClick={handleForceCheckoutPrevious} disabled={clocking}
                                className="px-6 py-2.5 rounded-lg text-sm font-semibold transition-colors bg-amber-100 text-amber-800 hover:bg-amber-200 shadow-sm flex items-center justify-center">
                                {clocking ? <div className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin" /> : 'Force Close Previous Shift'}
                            </button>
                        ) : (
                            <button onClick={clockedIn ? handleClockOut : handleClockIn} disabled={clocking || (todayRecord?.check_out)}
                                className={`px-8 py-2.5 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-2 ${clockedIn ? 'bg-white border border-red-200 text-red-600 hover:bg-red-50' : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm'} disabled:opacity-50 disabled:cursor-not-allowed`}>
                                {clocking ? <div className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin" /> : clockedIn ? 'Clock Out' : 'Clock In'}
                            </button>
                        )}
                        {clockedIn && (
                            <div className="bg-gray-50 px-4 py-2 rounded-lg border border-gray-100">
                                <span className="text-xs text-gray-500 mr-2">Elapsed:</span>
                                <span className="text-sm font-mono font-medium text-gray-900">{getElapsedTime()}</span>
                            </div>
                        )}
                    </div>
                </motion.div>

                {/* Quick Stats Sidebar */}
                <div className="space-y-6">
                    {isLoading ? (
                        <>
                            <SkeletonCard type="stat" />
                            <SkeletonCard type="stat" />
                        </>
                    ) : (
                        <>
                            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }} className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 shadow-sm relative overflow-hidden group">
                                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">Leave Balance</h3>
                                <div className="flex items-center justify-between gap-4">
                                    <div>
                                        <p className="text-3xl font-medium text-gray-900 dark:text-white tracking-tight">{stats.leavesRemaining}</p>
                                        <p className="text-xs text-gray-500 mt-1">Days left this year</p>
                                    </div>
                                    <Link href="/employee/leaves" className="p-2 rounded-lg bg-gray-50 border border-gray-200 text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-all shadow-sm">
                                        <Plus size={16} />
                                    </Link>
                                </div>
                            </motion.div>

                            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }} className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 shadow-sm relative overflow-hidden group">
                                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">Holidays</h3>
                                <div className="flex items-center justify-between gap-4">
                                    <div>
                                        <p className="text-3xl font-medium text-gray-900 dark:text-white tracking-tight">{stats.upcomingHolidays}</p>
                                        <p className="text-xs text-gray-500 mt-1">Upcoming this year</p>
                                    </div>
                                    <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-100">
                                        <CheckCircle2 size={16} />
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
                            <div className="bg-white dark:bg-gray-800 p-6 rounded-[2.5rem] border-none shadow-xl shadow-gray-200/40 dark:shadow-black/20 hover:-translate-y-2 transition-all h-full flex flex-col items-center text-center">
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
                        className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/10 dark:to-indigo-900/10 border border-blue-200 dark:border-blue-900/30 rounded-[2rem] p-6 flex flex-col sm:flex-row items-center gap-6 shadow-sm shadow-blue-500/10"
                    >
                        <div className="w-14 h-14 rounded-2xl bg-blue-500 text-white flex items-center justify-center shadow-lg shadow-blue-500/30 shrink-0">
                            <DollarSign size={24} />
                        </div>
                        <div className="flex-1 text-center sm:text-left">
                            <h4 className="text-lg font-black text-blue-900 dark:text-blue-200">New Payslip Released</h4>
                            <p className="text-sm font-bold text-blue-700 dark:text-blue-400 opacity-80 mt-1">
                                Your salary record for {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][latestPayslip.month - 1]} {latestPayslip.year} is now available in the vault.
                            </p>
                        </div>
                        <Link href="/employee/payslips" className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black text-sm transition-all shadow-lg shadow-blue-600/20 active:scale-95 whitespace-nowrap">
                            Review Vault
                        </Link>
                    </motion.div>
                )}
            </AnimatePresence>
            </div>
        </div>
    );
}
