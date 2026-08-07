'use client';

import { Clock, Calendar, FileText, CheckCircle2, ChevronRight, Bell, ClipboardList, Zap, Building, Plus, DollarSign, BookOpen, HelpCircle } from 'lucide-react';
import Link from 'next/link';
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import SkeletonCard from '@/components/shared/SkeletonCard';
import Breadcrumbs from '@/components/ui/Breadcrumbs';
import WelcomeRoleCelebrationModal from '@/components/shared/WelcomeRoleCelebrationModal';
import Image from 'next/image';
import { useAttendanceActions } from '@/hooks/useAttendanceActions';
import IDCard from '@/components/shared/IDCard';
import CalendarWidget from '@/components/shared/CalendarWidget';

const QUICK_ACTIONS = [
    { label: 'Attendance', icon: ClipboardList, href: '/employee/attendance', color: 'bg-emerald-500', shadow: 'shadow-emerald-500/30', desc: 'Log your shifts' },
    { label: 'My Leaves', icon: Calendar, href: '/employee/leaves', color: 'bg-violet-600', shadow: 'shadow-violet-600/30', desc: 'Apply & track' },
    { label: 'Payslips', icon: FileText, href: '/employee/payslips', color: 'bg-amber-500', shadow: 'shadow-amber-500/30', desc: 'Salary records' },
    { label: 'Training', icon: BookOpen, href: '/employee/training', color: 'bg-rose-500', shadow: 'shadow-rose-500/30', desc: 'Learning hub' },
    { label: 'My Profile', icon: UserCircle, href: '/employee/profile', color: 'bg-blue-600', shadow: 'shadow-blue-600/30', desc: 'Identity details' },
    { label: 'Help', icon: HelpCircle, href: '/employee/help', color: 'bg-gray-700', shadow: 'shadow-gray-700/30', desc: 'Guides & support' },
];

// Extracted from lucide-react above to avoid missing imports in array mapping
import { UserCircle } from 'lucide-react';

export default function EmployeeDashboard() {
    const { user, profile } = useAuth();
    const [currentTime, setCurrentTime] = useState(new Date());
    const [greeting, setGreeting] = useState('');
    
    const [data, setData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    const fetchDashboardData = useCallback(async () => {
        if (!user) return;
        try {
            const res = await fetch('/api/employee/dashboard');
            if (!res.ok) throw new Error('Failed to load dashboard data');
            const json = await res.json();
            setData(json);
        } catch (err) {
            console.error('Dashboard fetch error:', err);
        } finally {
            setIsLoading(false);
        }
    }, [user]);

    useEffect(() => {
        fetchDashboardData();
    }, [fetchDashboardData]);

    const { clocking, handleClockIn, handleClockOut, handleForceCheckoutPrevious } = useAttendanceActions(fetchDashboardData);

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        // We will base greeting on user's current local time for personal feel, 
        // though business dates are strict IST.
        const h = new Date().getHours();
        setGreeting(h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening');
        return () => clearInterval(timer);
    }, []);

    const openShift = data?.open_shift;
    const businessDate = data?.business_date; // YYYY-MM-DD
    
    // Determine if open shift is stale
    let isStaleShift = false;
    if (openShift && businessDate) {
        // Simple string comparison works for YYYY-MM-DD
        const shiftDate = openShift.date; // assuming DB stores date in YYYY-MM-DD format
        if (shiftDate < businessDate) {
            isStaleShift = true;
        }
    }

    const clockedIn = !!openShift && !isStaleShift;

    const getElapsedTime = () => {
        if (!openShift?.check_in) return '';
        const diff = Math.floor((currentTime - new Date(openShift.check_in)) / 1000);
        if (diff < 0) return '00:00:00';
        const h = Math.floor(diff / 3600).toString().padStart(2, '0');
        const m = Math.floor((diff % 3600) / 60).toString().padStart(2, '0');
        const s = (diff % 60).toString().padStart(2, '0');
        return `${h}:${m}:${s}`;
    };

    return (
        <div className="p-4 sm:p-6 lg:p-8 space-y-8 min-h-screen font-[family-name:var(--font-outfit)] bg-[#F8FAFC] dark:bg-gray-900 relative">
            <div className="absolute top-0 inset-x-0 h-[30vh] bg-gradient-to-b from-sky-50/80 dark:from-sky-900/10 to-transparent pointer-events-none" />
            
            <div className="relative z-10 space-y-8 max-w-7xl mx-auto">
                <WelcomeRoleCelebrationModal />

                {/* Top Bar */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl p-4 rounded-3xl border border-gray-200 dark:border-gray-700 shadow-sm shadow-sky-500/5">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 flex items-center justify-center p-1.5">
                            <Image src="/logo.png" alt="InTrust Logo" width={28} height={28} className="object-contain" />
                        </div>
                        <Breadcrumbs />
                    </div>
                    <div className="flex items-center gap-3 bg-sky-50/50 dark:bg-sky-900/20 px-4 py-2 rounded-xl border border-sky-100/50 dark:border-sky-800/30">
                        <span className="text-[10px] font-black text-sky-700 dark:text-sky-400 uppercase tracking-widest">
                            {businessDate ? new Date(businessDate).toLocaleDateString('en-IN', { month: 'long', day: 'numeric', year: 'numeric' }) : 'Loading...'}
                        </span>
                    </div>
                </div>

                {/* Main Content Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    
                    {/* Left Column (Main Ops) */}
                    <div className="lg:col-span-8 space-y-8">
                        
                        {/* Compact Welcome Header */}
                        <div className="flex items-center justify-between">
                            <div>
                                <h1 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">
                                    {greeting}, <span className="text-blue-600 dark:text-blue-400">{profile?.full_name?.split(' ')[0] || 'Team Member'}</span>!
                                </h1>
                                <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mt-1">
                                    {profile?.role ? profile.role.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()) : 'Not Assigned'} • {profile?.department || 'Department Not Assigned'}
                                </p>
                            </div>
                        </div>

                        {/* Attendance Card */}
                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-3xl p-6 sm:p-8 shadow-sm flex flex-col sm:flex-row justify-between items-center sm:items-start gap-6">
                            <div className="flex-1 text-center sm:text-left">
                                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Time Clock</p>
                                
                                {isLoading ? (
                                    <div className="h-12 bg-gray-100 dark:bg-gray-700 rounded-lg animate-pulse w-48 mb-2"></div>
                                ) : isStaleShift ? (
                                    <>
                                        <p className="text-2xl font-mono text-amber-600 font-bold tracking-tight">Pending Checkout</p>
                                        <p className="text-sm text-gray-500 mt-1">Please close your shift from {new Date(openShift.date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })} before clocking in today.</p>
                                    </>
                                ) : clockedIn ? (
                                    <>
                                        <div className="text-4xl sm:text-5xl font-medium tracking-tight font-mono text-gray-900 dark:text-white mb-2">
                                            {currentTime.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}
                                        </div>
                                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 mt-2">
                                            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest bg-emerald-50 text-emerald-700 border border-emerald-100 inline-block w-max">
                                                ● Active Shift
                                            </span>
                                            <span className="text-sm text-gray-500">
                                                Clocked in at {new Date(openShift.check_in).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <div className="text-4xl sm:text-5xl font-medium tracking-tight font-mono text-gray-900 dark:text-white mb-2">
                                            {currentTime.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}
                                        </div>
                                        <p className="text-sm text-gray-500 mt-1">Not clocked in yet today</p>
                                    </>
                                )}
                            </div>

                            <div className="flex flex-col items-center sm:items-end gap-3 w-full sm:w-auto border-t sm:border-t-0 pt-4 sm:pt-0 border-gray-100 dark:border-gray-700">
                                {isLoading ? (
                                    <div className="w-32 h-12 bg-gray-100 dark:bg-gray-700 rounded-xl animate-pulse"></div>
                                ) : isStaleShift ? (
                                    <button onClick={() => handleForceCheckoutPrevious(openShift.id)} disabled={clocking} className="w-full sm:w-auto px-6 py-3 rounded-xl text-sm font-semibold transition-colors bg-amber-100 text-amber-800 hover:bg-amber-200 shadow-sm flex items-center justify-center">
                                        {clocking ? <div className="w-5 h-5 border-2 border-current/30 border-t-current rounded-full animate-spin" /> : 'Force Close Shift'}
                                    </button>
                                ) : (
                                    <button 
                                        onClick={clockedIn ? () => handleClockOut(openShift.id) : () => handleClockIn()} 
                                        disabled={clocking}
                                        className={`w-full sm:w-auto px-8 py-3 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 shadow-sm ${clockedIn ? 'bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-200' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}
                                    >
                                        {clocking ? <div className="w-5 h-5 border-2 border-current/30 border-t-current rounded-full animate-spin" /> : clockedIn ? 'Clock Out' : 'Clock In'}
                                    </button>
                                )}
                                
                                {clockedIn && !isStaleShift && (
                                    <div className="bg-gray-50 dark:bg-gray-900 px-4 py-2 rounded-lg border border-gray-100 dark:border-gray-800 text-center w-full sm:w-auto">
                                        <span className="text-[11px] text-gray-500 font-bold uppercase tracking-wider block sm:inline sm:mr-2">Elapsed</span>
                                        <span className="text-sm font-mono font-bold text-gray-900 dark:text-white">{getElapsedTime()}</span>
                                    </div>
                                )}
                            </div>
                        </motion.div>

                        {/* Updates / Latest Payslip */}
                        <AnimatePresence>
                            {data?.latest_payslip && (
                                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/10 dark:to-indigo-900/10 border border-blue-200 dark:border-blue-900/30 rounded-3xl p-6 flex flex-col sm:flex-row items-center gap-6 shadow-sm shadow-blue-500/10">
                                    <div className="w-14 h-14 rounded-2xl bg-blue-500 text-white flex items-center justify-center shadow-lg shadow-blue-500/30 shrink-0">
                                        <DollarSign size={24} />
                                    </div>
                                    <div className="flex-1 text-center sm:text-left">
                                        <h4 className="text-lg font-black text-blue-900 dark:text-blue-200">New Payslip Released</h4>
                                        <p className="text-sm font-bold text-blue-700 dark:text-blue-400 opacity-80 mt-1">
                                            Your salary record for {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][data.latest_payslip.month - 1]} {data.latest_payslip.year} is now available in the vault.
                                        </p>
                                    </div>
                                    <Link href="/employee/payslips" className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black text-sm transition-all shadow-lg shadow-blue-600/20 active:scale-95 whitespace-nowrap">
                                        View Vault
                                    </Link>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Quick Actions Grid */}
                        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
                            <h2 className="text-sm font-black text-gray-500 uppercase tracking-widest mb-4">Work Apps</h2>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                                {QUICK_ACTIONS.map((action) => {
                                    const Icon = action.icon;
                                    return (
                                        <Link key={action.href} href={action.href} className="group flex items-start gap-4 p-4 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 shadow-sm transition-all duration-200">
                                            <div className={`w-12 h-12 shrink-0 rounded-xl ${action.color} flex items-center justify-center shadow-md ${action.shadow} group-hover:scale-105 transition-transform duration-200`}>
                                                <Icon size={20} className="text-white" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-black text-gray-900 dark:text-white leading-tight">{action.label}</p>
                                                <p className="text-[10px] text-gray-500 font-bold mt-1 uppercase tracking-wider">{action.desc}</p>
                                            </div>
                                        </Link>
                                    );
                                })}
                            </div>
                        </motion.div>

                        {/* Calendar Widget */}
                        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="pt-4">
                            <h2 className="text-sm font-black text-gray-500 uppercase tracking-widest mb-4">My Schedule & Calendar</h2>
                            <div className="h-[420px]">
                                <CalendarWidget events={data?.schedule_events || []} />
                            </div>
                        </motion.div>

                    </div>

                    {/* Right Column (Sidebar Summary & ID) */}
                    <div className="lg:col-span-4 space-y-6">
                        
                        {/* Digital ID Display */}
                        <div className="hidden sm:block mb-8">
                            <h2 className="text-sm font-black text-gray-500 uppercase tracking-widest mb-4">Digital Identity</h2>
                            <IDCard profile={profile} />
                        </div>

                        {/* Summary Metrics */}
                        {isLoading ? (
                            <>
                                <SkeletonCard type="stat" />
                                <SkeletonCard type="stat" />
                            </>
                        ) : (
                            <>
                                <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }} className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Leave Balance</h3>
                                            <p className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">
                                                {data?.leave_balance > 0 ? data.leave_balance : <span className="text-lg text-gray-400 font-medium">Unallocated</span>}
                                            </p>
                                            <p className="text-xs text-gray-500 mt-1 font-medium">Total available days</p>
                                        </div>
                                        <div className="w-10 h-10 rounded-full bg-violet-50 dark:bg-violet-900/20 flex items-center justify-center text-violet-600 dark:text-violet-400">
                                            <Calendar size={18} />
                                        </div>
                                    </div>
                                </motion.div>

                                <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }} className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Next Holiday</h3>
                                            <p className="text-lg font-black text-gray-900 dark:text-white tracking-tight leading-tight">
                                                {data?.next_holiday ? data.next_holiday.holiday_name : <span className="text-gray-400">None Scheduled</span>}
                                            </p>
                                            <p className="text-xs text-gray-500 mt-1 font-medium">
                                                {data?.next_holiday ? new Date(data.next_holiday.holiday_date).toLocaleDateString('en-IN', { month: 'long', day: 'numeric' }) : 'Check HR portal'}
                                            </p>
                                        </div>
                                        <div className="w-10 h-10 rounded-full bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                                            <CheckCircle2 size={18} />
                                        </div>
                                    </div>
                                </motion.div>
                            </>
                        )}
                    </div>

                </div>
            </div>
        </div>
    );
}
