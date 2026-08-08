'use client';

import { Clock, Calendar, FileText, CheckCircle2, ChevronRight, Bell, ClipboardList, Zap, Building, Plus, DollarSign, BookOpen, HelpCircle, UserCircle, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import SkeletonCard from '@/components/shared/SkeletonCard';
import WelcomeRoleCelebrationModal from '@/components/shared/WelcomeRoleCelebrationModal';
import Image from 'next/image';
import { useAttendanceActions } from '@/hooks/useAttendanceActions';
import IDCard from '@/components/shared/IDCard';
import MiniCalendarWidget from '@/components/shared/MiniCalendarWidget';
import AttendanceCameraModal from '@/components/employee/AttendanceCameraModal';

const QUICK_ACTIONS = [
    { label: 'Attendance', icon: ClipboardList, href: '/employee/attendance', color: 'bg-emerald-500', shadow: 'shadow-emerald-500/30', desc: 'Log your shifts' },
    { label: 'My Leaves', icon: Calendar, href: '/employee/leaves', color: 'bg-violet-600', shadow: 'shadow-violet-600/30', desc: 'Apply & track' },
    { label: 'Payslips', icon: FileText, href: '/employee/payslips', color: 'bg-amber-500', shadow: 'shadow-amber-500/30', desc: 'Salary records' },
    { label: 'Training', icon: BookOpen, href: '/employee/training', color: 'bg-rose-500', shadow: 'shadow-rose-500/30', desc: 'Learning hub' },
    { label: 'My Profile', icon: UserCircle, href: '/employee/profile', color: 'bg-blue-600', shadow: 'shadow-blue-600/30', desc: 'Identity details' },
    { label: 'Help', icon: HelpCircle, href: '/employee/help', color: 'bg-gray-700', shadow: 'shadow-gray-700/30', desc: 'Guides & support' },
];


export default function EmployeeDashboard() {
    const { user, profile } = useAuth();
    const [currentTime, setCurrentTime] = useState(new Date());
    const [greeting, setGreeting] = useState('');
    
    const [data, setData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [showCameraModal, setShowCameraModal] = useState(false);

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
        <div className="p-4 sm:p-6 lg:p-8 space-y-8 min-h-screen font-[family-name:var(--font-outfit)] bg-[#F8FAFC] dark:bg-gray-900 relative pb-24 lg:pb-8">
            {/* Background Light Blooms */}
            <div className="absolute top-0 inset-x-0 h-[40vh] bg-gradient-to-b from-sky-50/80 dark:from-sky-900/10 to-transparent pointer-events-none" />
            <div className="absolute top-20 left-10 w-72 h-72 bg-blue-200/30 dark:bg-blue-500/10 rounded-full blur-[80px] pointer-events-none" />
            <div className="absolute top-40 right-10 w-96 h-96 bg-indigo-200/20 dark:bg-indigo-500/10 rounded-full blur-[100px] pointer-events-none" />

            <div className="relative z-10 space-y-8 max-w-7xl mx-auto">
                <WelcomeRoleCelebrationModal />

                {/* Modals */}
                <AnimatePresence>
                    {showCameraModal && (
                        <AttendanceCameraModal 
                            onClose={() => setShowCameraModal(false)}
                            onConfirm={async ({ selfieBase64, locationData }) => {
                                await handleClockIn(selfieBase64, locationData);
                                setShowCameraModal(false);
                            }}
                            isClocking={clocking}
                        />
                    )}
                </AnimatePresence>

                {/* Top Bar */}
                <div className="flex justify-end items-center mb-4">
                    <div className="flex items-center gap-3 bg-white/60 dark:bg-gray-800/60 backdrop-blur-md px-5 py-2.5 rounded-full border border-white/50 dark:border-gray-700/50 shadow-sm">
                        <span className="w-2 h-2 rounded-full bg-sky-500 animate-pulse"></span>
                        <span className="text-xs font-bold text-sky-700 dark:text-sky-400 uppercase tracking-widest">
                            {businessDate ? new Date(businessDate).toLocaleDateString('en-IN', { month: 'long', day: 'numeric', year: 'numeric' }) : 'Loading...'}
                        </span>
                    </div>
                </div>

                {/* Main Content Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    
                    {/* Left Column (Main Ops) */}
                    <div className="lg:col-span-8 space-y-8">
                        
                        {data?.pending_access_request && (
                            <div className="bg-amber-500/10 backdrop-blur-md border border-amber-500/20 rounded-[2rem] p-6 flex flex-col sm:flex-row items-start gap-5 shadow-lg shadow-amber-500/5">
                                <div className="w-14 h-14 rounded-2xl bg-amber-500/20 flex items-center justify-center flex-shrink-0 text-amber-600 dark:text-amber-400">
                                    <ShieldCheck size={28} />
                                </div>
                                <div>
                                    <h3 className="text-amber-900 dark:text-amber-200 font-black text-xl tracking-tight mb-2">System Access Pending</h3>
                                    <p className="text-amber-800 dark:text-amber-300/80 text-sm font-medium leading-relaxed max-w-xl">
                                        HR has requested <span className="font-black text-amber-900 dark:text-white bg-amber-500/20 px-2 py-1 rounded-lg">{data.pending_access_request.requested_role}</span> access for your account. You will have limited access until an Admin approves.
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* Unified Hero Section (Glassmorphic) */}
                        <div className="w-full rounded-[2.5rem] overflow-hidden relative shadow-2xl shadow-sky-100/20 border border-white/60 dark:border-gray-700/50 bg-white/40 dark:bg-gray-800/40 backdrop-blur-xl flex flex-col md:flex-row min-h-[18rem]">
                            <div className="p-8 sm:p-12 flex flex-col justify-center flex-1 relative z-10 w-full md:w-3/5 lg:w-2/3">
                                <h1 className="text-4xl sm:text-5xl font-black text-slate-900 dark:text-white tracking-tight mb-3">
                                    {greeting}, <br/><span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-600 to-indigo-600 dark:from-sky-400 dark:to-indigo-400">{profile?.full_name?.split(' ')[0] || 'Team Member'}</span>!
                                </h1>
                                <p className="text-base font-bold text-slate-500 dark:text-gray-400 flex items-center gap-2">
                                    <span className="px-3 py-1 bg-white/50 dark:bg-gray-900/50 rounded-lg backdrop-blur-sm border border-white/50 dark:border-gray-600/50 text-sky-700 dark:text-sky-300">
                                        {profile?.role ? profile.role.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()) : 'Not Assigned'}
                                    </span>
                                    <span>•</span>
                                    <span>{profile?.department || 'Department Not Assigned'}</span>
                                </p>
                            </div>
                            <div className="absolute inset-0 md:inset-y-0 md:right-0 md:left-auto md:w-1/2 z-0 overflow-hidden mix-blend-multiply dark:mix-blend-lighten opacity-80">
                                <Image 
                                    src="/images/employee_banner_illustration.png" 
                                    alt="Employee Dashboard Banner" 
                                    fill 
                                    className="object-cover object-[right_center]" 
                                    priority
                                />
                                <div className="absolute inset-0 bg-gradient-to-r from-[#F8FAFC] dark:from-gray-900 via-transparent to-transparent"></div>
                            </div>
                        </div>

                        {/* Glass Attendance Card */}
                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border border-white/50 dark:border-gray-700/50 rounded-[2.5rem] p-8 shadow-2xl shadow-indigo-100/10 flex flex-col sm:flex-row justify-between items-center sm:items-start gap-8">
                            <div className="flex-1 text-center sm:text-left">
                                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100/50 dark:bg-gray-900/50 border border-slate-200/50 dark:border-gray-700/50 text-slate-500 dark:text-gray-400 text-xs font-bold uppercase tracking-widest mb-4">
                                    <Clock size={12} /> Time Clock
                                </div>
                                
                                {isLoading ? (
                                    <div className="h-14 bg-slate-200/50 dark:bg-gray-700 rounded-2xl animate-pulse w-56 mb-2"></div>
                                ) : isStaleShift ? (
                                    <>
                                        <p className="text-3xl font-mono text-amber-600 font-black tracking-tight">Pending Checkout</p>
                                        <p className="text-sm font-semibold text-slate-500 mt-2">Please close your shift from {new Date(openShift.date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })} before clocking in today.</p>
                                    </>
                                ) : clockedIn ? (
                                    <>
                                        <div className="text-5xl sm:text-6xl font-black tracking-tighter font-mono text-slate-900 dark:text-white mb-3">
                                            {currentTime.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}
                                        </div>
                                        <div className="flex flex-col sm:flex-row sm:items-center gap-3 mt-2">
                                            <span className="px-3 py-1 rounded-xl text-xs font-bold uppercase tracking-widest bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 inline-flex items-center gap-2 w-max">
                                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                                Active Shift
                                            </span>
                                            <span className="text-sm font-semibold text-slate-500">
                                                Clocked in at {new Date(openShift.check_in).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <div className="text-5xl sm:text-6xl font-black tracking-tighter font-mono text-slate-900 dark:text-white mb-3 opacity-50">
                                            {currentTime.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}
                                        </div>
                                        <p className="text-sm font-bold text-slate-500 mt-2">Not clocked in yet today</p>
                                    </>
                                )}
                            </div>

                            <div className="flex flex-col items-center sm:items-end gap-4 w-full sm:w-auto border-t sm:border-t-0 pt-6 sm:pt-0 border-slate-200/50 dark:border-gray-700/50">
                                {isLoading ? (
                                    <div className="w-40 h-14 bg-slate-200/50 dark:bg-gray-700 rounded-2xl animate-pulse"></div>
                                ) : isStaleShift ? (
                                    <button onClick={() => handleForceCheckoutPrevious(openShift.id)} disabled={clocking} className="w-full sm:w-auto px-8 py-4 rounded-2xl text-sm font-black transition-all bg-amber-500 text-white hover:bg-amber-600 shadow-xl shadow-amber-500/20 flex items-center justify-center">
                                        {clocking ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Force Close Shift'}
                                    </button>
                                ) : (
                                    <button 
                                        onClick={clockedIn ? () => handleClockOut(openShift.id) : () => setShowCameraModal(true)} 
                                        disabled={clocking}
                                        className={`w-full sm:w-auto px-10 py-4 rounded-2xl text-sm font-black transition-all flex items-center justify-center gap-2 shadow-xl ${clockedIn ? 'bg-rose-500 text-white hover:bg-rose-600 shadow-rose-500/20' : 'bg-gradient-to-r from-indigo-600 to-sky-600 text-white hover:from-indigo-700 hover:to-sky-700 shadow-indigo-500/20'}`}
                                    >
                                        {clocking ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : clockedIn ? 'Clock Out Now' : 'Start My Shift'}
                                    </button>
                                )}
                                
                                {clockedIn && !isStaleShift && (
                                    <div className="bg-white/50 dark:bg-gray-900/50 px-5 py-3 rounded-2xl border border-white/50 dark:border-gray-800/50 text-center w-full sm:w-auto backdrop-blur-sm">
                                        <span className="text-[11px] text-slate-500 font-bold uppercase tracking-wider block sm:inline sm:mr-3">Elapsed Time</span>
                                        <span className="text-base font-mono font-black text-slate-900 dark:text-white">{getElapsedTime()}</span>
                                    </div>
                                )}
                            </div>
                        </motion.div>

                        {/* Latest Payslip */}
                        <AnimatePresence>
                            {data?.latest_payslip && (
                                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-gradient-to-r from-indigo-500 to-violet-600 rounded-[2rem] p-1 flex shadow-xl shadow-indigo-500/20">
                                    <div className="bg-white dark:bg-gray-800 rounded-[1.85rem] p-6 sm:p-8 flex flex-col sm:flex-row items-center gap-6 w-full">
                                        <div className="w-16 h-16 rounded-3xl bg-indigo-50 text-indigo-600 flex items-center justify-center flex-shrink-0">
                                            <DollarSign size={28} strokeWidth={2.5} />
                                        </div>
                                        <div className="flex-1 text-center sm:text-left">
                                            <h4 className="text-xl font-black text-slate-900 dark:text-white">New Payslip Released</h4>
                                            <p className="text-sm font-semibold text-slate-500 dark:text-gray-400 mt-1">
                                                Your salary record for {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][data.latest_payslip.month - 1]} {data.latest_payslip.year} is now available.
                                            </p>
                                        </div>
                                        <Link href="/employee/payslips" className="px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-sm transition-all shadow-lg shadow-indigo-600/30 whitespace-nowrap">
                                            View Vault
                                        </Link>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Quick Actions Grid (Glass Cards) */}
                        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="pt-4">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="h-px bg-slate-200 dark:bg-gray-800 flex-1"></div>
                                <h2 className="text-xs font-black text-slate-400 dark:text-gray-500 uppercase tracking-widest px-2">Work Apps</h2>
                                <div className="h-px bg-slate-200 dark:bg-gray-800 flex-1"></div>
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-5">
                                {QUICK_ACTIONS.map((action) => {
                                    const Icon = action.icon;
                                    return (
                                        <Link key={action.href} href={action.href} className="group flex flex-col items-start gap-4 p-5 bg-white/60 dark:bg-gray-800/60 backdrop-blur-md rounded-[2rem] border border-white/50 dark:border-gray-700/50 shadow-sm hover:shadow-xl hover:shadow-indigo-500/5 transition-all duration-300">
                                            <div className={`w-14 h-14 shrink-0 rounded-2xl ${action.color} flex items-center justify-center shadow-lg ${action.shadow} group-hover:scale-110 transition-transform duration-300`}>
                                                <Icon size={24} className="text-white" strokeWidth={2.5} />
                                            </div>
                                            <div>
                                                <p className="text-base font-black text-slate-900 dark:text-white leading-tight mb-1 group-hover:text-indigo-600 transition-colors">{action.label}</p>
                                                <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">{action.desc}</p>
                                            </div>
                                        </Link>
                                    );
                                })}
                            </div>
                        </motion.div>

                        {/* Mini Calendar Widget */}
                        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="pt-8">
                            <MiniCalendarWidget events={data?.schedule_events || []} />
                        </motion.div>

                    </div>

                    {/* Right Column (Sidebar Summary & ID) */}
                    <div className="lg:col-span-4 space-y-8">
                        
                        {/* Digital ID Display */}
                        <div className="hidden sm:block mb-10">
                            <h2 className="text-xs font-black text-slate-400 dark:text-gray-500 uppercase tracking-widest mb-6 text-center">Digital Identity</h2>
                            <div className="relative">
                                {/* Ambient Glow Behind ID Card */}
                                <div className="absolute inset-0 bg-indigo-500/20 blur-2xl rounded-[3rem] transform scale-95" />
                                <div className="relative">
                                    <IDCard profile={profile} />
                                </div>
                            </div>
                        </div>

                        {/* Summary Metrics Glass Cards */}
                        {isLoading ? (
                            <>
                                <SkeletonCard type="stat" />
                                <SkeletonCard type="stat" />
                            </>
                        ) : (
                            <div className="space-y-5">
                                <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }} className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl rounded-[2rem] p-7 border border-white/50 dark:border-gray-700/50 shadow-xl shadow-slate-100/30 dark:shadow-none">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h3 className="text-xs font-bold text-slate-400 dark:text-gray-500 uppercase tracking-widest mb-2">Leave Balance</h3>
                                            <p className="text-4xl font-black text-slate-900 dark:text-white tracking-tight">
                                                {data?.leave_balance > 0 ? data.leave_balance : <span className="text-xl text-slate-300 font-bold">Unallocated</span>}
                                            </p>
                                        </div>
                                        <div className="w-14 h-14 rounded-3xl bg-violet-500/10 flex items-center justify-center text-violet-600 dark:text-violet-400 border border-violet-500/20 shadow-inner">
                                            <Calendar size={24} strokeWidth={2.5} />
                                        </div>
                                    </div>
                                    <div className="mt-4 pt-4 border-t border-slate-200/50 dark:border-gray-700/50">
                                        <p className="text-xs text-slate-500 font-bold">Total available days for this year</p>
                                    </div>
                                </motion.div>

                                <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }} className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl rounded-[2rem] p-7 border border-white/50 dark:border-gray-700/50 shadow-xl shadow-slate-100/30 dark:shadow-none">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h3 className="text-xs font-bold text-slate-400 dark:text-gray-500 uppercase tracking-widest mb-2">Next Holiday</h3>
                                            <p className="text-xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">
                                                {data?.next_holiday ? data.next_holiday.holiday_name : <span className="text-slate-300">None Scheduled</span>}
                                            </p>
                                        </div>
                                        <div className="w-14 h-14 rounded-3xl bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shadow-inner">
                                            <CheckCircle2 size={24} strokeWidth={2.5} />
                                        </div>
                                    </div>
                                    <div className="mt-4 pt-4 border-t border-slate-200/50 dark:border-gray-700/50">
                                        <p className="text-xs text-slate-500 font-bold">
                                            {data?.next_holiday ? new Date(data.next_holiday.holiday_date).toLocaleDateString('en-IN', { month: 'long', day: 'numeric', year: 'numeric' }) : 'Check HR portal'}
                                        </p>
                                    </div>
                                </motion.div>
                            </div>
                        )}
                    </div>

                </div>
            </div>
        </div>
    );
}
