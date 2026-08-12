'use client';

import { Clock, Calendar, FileText, CheckCircle2, ChevronRight, Bell, ClipboardList, Zap, Building, Plus, DollarSign, BookOpen, HelpCircle, UserCircle, ShieldCheck, Sparkles, AlertCircle } from 'lucide-react';
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

    const [themeClass, setThemeClass] = useState('from-sky-600 to-indigo-600');
    const [iconType, setIconType] = useState('day');

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        const currentH = new Date().getHours();
        const stages = [
            { theme: 'from-amber-400 to-orange-500 dark:from-amber-500/80 dark:to-orange-600/80', icon: 'morning', text: 'Good morning' },
            { theme: 'from-sky-400 to-blue-600 dark:from-sky-500/80 dark:to-blue-600/80', icon: 'afternoon', text: 'Good afternoon' },
            { theme: 'from-indigo-500 to-purple-600 dark:from-indigo-600/80 dark:to-purple-700/80', icon: 'evening', text: 'Good evening' },
            { theme: 'from-slate-800 to-slate-950 dark:from-slate-900 dark:to-black', icon: 'night', text: 'Good evening' },
        ];

        let targetIndex = 0;
        if (currentH >= 5 && currentH < 12) targetIndex = 0;
        else if (currentH >= 12 && currentH < 17) targetIndex = 1;
        else if (currentH >= 17 && currentH < 20) targetIndex = 2;
        else targetIndex = 3;

        setThemeClass(stages[targetIndex].theme);
        setIconType(stages[targetIndex].icon);
        setGreeting(stages[targetIndex].text);
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

                        {/* Unified Premium Hero Section */}
                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className={`w-full transition-all duration-[2000ms] ease-in-out rounded-[2.5rem] overflow-hidden relative shadow-2xl border border-white/80 dark:border-gray-700/80 bg-gradient-to-br ${themeClass} flex flex-col md:flex-row min-h-[22rem]`}>
                            {/* Decorative Elements */}
                            <div className="absolute top-0 right-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 mix-blend-overlay pointer-events-none" />
                            <div className="absolute -top-32 -right-32 w-96 h-96 bg-white/20 rounded-full blur-[80px]" />
                            <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-black/10 rounded-full blur-[80px]" />

                            <div className="p-8 sm:p-12 flex flex-col justify-center flex-1 relative z-10 w-full text-white">
                                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-black/10 backdrop-blur-md border border-white/20 shadow-sm w-max mb-6">
                                    <Sparkles size={16} className="text-white" />
                                    <span className="text-xs font-black text-white tracking-widest uppercase">Welcome to the Portal</span>
                                </div>
                                <h1 className="text-4xl sm:text-6xl font-black text-white tracking-tight mb-4 leading-tight drop-shadow-md">
                                    {greeting}, <br/><span className="text-white/90">{profile?.full_name?.split(' ')[0] || 'Team Member'}</span>!
                                </h1>
                                <p className="text-lg font-medium text-white/80 mb-8 max-w-md">
                                    Stay connected, be productive, and track your daily progress seamlessly.
                                </p>
                                <div className="flex flex-wrap items-center gap-3">
                                    <span className="px-5 py-2.5 bg-white/20 rounded-xl backdrop-blur-md border border-white/30 text-white font-bold shadow-inner">
                                        {profile?.role ? profile.role.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()) : 'Not Assigned'}
                                    </span>
                                    <span className="px-5 py-2.5 bg-black/20 rounded-xl backdrop-blur-md border border-white/10 text-white/90 font-bold flex items-center gap-2 shadow-inner">
                                        <Building size={16} />
                                        {profile?.department || 'Dept Not Assigned'}
                                    </span>
                                </div>
                            </div>
                            
                            {/* Visual Time Indicator instead of generic Image */}
                            <div className="hidden md:flex relative w-1/3 min-h-[250px] z-0 items-center justify-center p-6 border-l border-white/10 overflow-hidden">
                                <motion.div 
                                    animate={{ 
                                        y: [20, 0],
                                        rotate: iconType === 'morning' || iconType === 'afternoon' ? [5, 0] : 0,
                                        scale: iconType === 'evening' || iconType === 'night' ? [0.9, 1] : 1
                                    }} 
                                    transition={{ duration: 0.6, type: "spring", bounce: 0.4 }}
                                    key={iconType} // Forces re-animation when type changes
                                    className="relative w-48 h-48 rounded-full bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl flex items-center justify-center overflow-hidden"
                                >
                                    <div className="absolute inset-0 bg-gradient-to-t from-transparent to-white/20" />
                                    {iconType === 'morning' || iconType === 'afternoon' ? (
                                        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-yellow-200 to-amber-500 shadow-[0_0_50px_rgba(252,211,77,0.8)] flex items-center justify-center">
                                            {/* Sun Rays */}
                                            <div className="absolute w-32 h-32 bg-amber-400/20 rounded-full animate-ping" />
                                        </div>
                                    ) : (
                                        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-slate-200 to-slate-400 shadow-[0_0_50px_rgba(226,232,240,0.4)] relative overflow-hidden">
                                            {/* Moon craters */}
                                            <div className="absolute top-3 right-4 w-4 h-4 rounded-full bg-slate-300/50" />
                                            <div className="absolute bottom-5 left-4 w-6 h-6 rounded-full bg-slate-300/40" />
                                            <div className="absolute top-10 left-8 w-3 h-3 rounded-full bg-slate-300/60" />
                                            {iconType === 'night' && (
                                                <div className="absolute -top-2 -right-2 w-20 h-20 rounded-full bg-slate-800 shadow-[inset_-10px_-10px_0_0_rgba(0,0,0,0.1)] opacity-40 mix-blend-multiply" />
                                            )}
                                        </div>
                                    )}
                                </motion.div>

                                {/* Stars for Evening/Night */}
                                {(iconType === 'evening' || iconType === 'night') && (
                                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="absolute inset-0 pointer-events-none">
                                        <div className="absolute top-10 left-10 w-1 h-1 bg-white rounded-full animate-ping" style={{ animationDelay: '0s', animationDuration: '2s' }} />
                                        <div className="absolute top-20 right-20 w-1.5 h-1.5 bg-white rounded-full animate-ping" style={{ animationDelay: '0.5s', animationDuration: '3s' }} />
                                        <div className="absolute bottom-20 left-1/4 w-1 h-1 bg-white rounded-full animate-ping" style={{ animationDelay: '1s', animationDuration: '2.5s' }} />
                                        <div className="absolute top-1/3 right-10 w-2 h-2 bg-white/50 rounded-full blur-[1px]" />
                                    </motion.div>
                                )}
                            </div>
                        </motion.div>

                        {/* Premium Glass Attendance Card */}
                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-2xl border border-white/60 dark:border-gray-700/60 rounded-[2.5rem] p-8 sm:p-10 shadow-2xl shadow-indigo-100/20 dark:shadow-none flex flex-col lg:flex-row justify-between items-center lg:items-center gap-8 relative overflow-hidden">
                            {/* Animated Background Gradient for Active Shift */}
                            {clockedIn && !isStaleShift && (
                                <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/5 to-teal-500/5 animate-pulse pointer-events-none" />
                            )}
                            
                            <div className="flex-1 text-center lg:text-left relative z-10 w-full">
                                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-100 dark:bg-gray-900 border border-slate-200 dark:border-gray-700 text-slate-600 dark:text-gray-400 text-xs font-black uppercase tracking-widest mb-6 shadow-sm">
                                    <Clock size={14} className="text-indigo-500" /> Time Clock
                                </div>
                                
                                {isLoading ? (
                                    <div className="h-16 bg-slate-200 dark:bg-gray-700 rounded-2xl animate-pulse w-64 mb-3 mx-auto lg:mx-0"></div>
                                ) : isStaleShift ? (
                                    <>
                                        <p className="text-4xl sm:text-5xl font-mono text-amber-600 font-black tracking-tight mb-2">Action Required</p>
                                        <p className="text-base font-semibold text-slate-600 dark:text-gray-400">Please close your previous shift from {new Date(openShift.date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}.</p>
                                    </>
                                ) : clockedIn ? (
                                    <>
                                        <div className="text-6xl sm:text-7xl font-black tracking-tighter font-mono text-slate-900 dark:text-white mb-4 drop-shadow-sm">
                                            {currentTime.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}
                                        </div>
                                        <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4">
                                            <span className="px-4 py-2 rounded-xl text-sm font-black uppercase tracking-widest bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 flex items-center gap-2 shadow-inner">
                                                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping absolute"></span>
                                                <span className="w-2 h-2 rounded-full bg-emerald-500 relative"></span>
                                                Active Shift
                                            </span>
                                            <span className="text-base font-semibold text-slate-500 bg-white/50 dark:bg-gray-900/50 px-4 py-2 rounded-xl border border-slate-200 dark:border-gray-700">
                                                In: {new Date(openShift.check_in).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <div className="text-6xl sm:text-7xl font-black tracking-tighter font-mono text-slate-400 dark:text-gray-600 mb-4 opacity-70">
                                            {currentTime.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}
                                        </div>
                                        <p className="text-base font-bold text-slate-500 dark:text-gray-400">You are not clocked in yet today.</p>
                                    </>
                                )}
                            </div>

                            <div className="flex flex-col items-center lg:items-end gap-5 w-full lg:w-auto relative z-10">
                                {isLoading ? (
                                    <div className="w-48 h-16 bg-slate-200 dark:bg-gray-700 rounded-2xl animate-pulse"></div>
                                ) : isStaleShift ? (
                                    <button onClick={() => handleForceCheckoutPrevious(openShift.id)} disabled={clocking} className="w-full lg:w-auto px-10 py-5 rounded-2xl text-base font-black transition-all bg-amber-500 text-white hover:bg-amber-600 hover:scale-105 shadow-xl shadow-amber-500/30 flex items-center justify-center gap-2">
                                        {clocking ? <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><AlertCircle size={20} /> Force Close Shift</>}
                                    </button>
                                ) : (
                                    <button 
                                        onClick={clockedIn ? () => handleClockOut(openShift.id) : () => setShowCameraModal(true)} 
                                        disabled={clocking}
                                        className={`w-full lg:w-auto px-12 py-5 rounded-2xl text-lg font-black transition-all flex items-center justify-center gap-3 shadow-2xl hover:-translate-y-1 ${clockedIn ? 'bg-rose-500 text-white hover:bg-rose-600 shadow-rose-500/30' : 'bg-gradient-to-r from-indigo-600 to-sky-600 text-white hover:from-indigo-700 hover:to-sky-700 shadow-indigo-500/30'}`}
                                    >
                                        {clocking ? (
                                            <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        ) : clockedIn ? (
                                            <><Zap size={22} className="fill-white/20" /> Clock Out Now</>
                                        ) : (
                                            <><CheckCircle2 size={22} /> Start My Shift</>
                                        )}
                                    </button>
                                )}
                                
                                {clockedIn && !isStaleShift && (
                                    <div className="bg-white dark:bg-gray-900 px-6 py-4 rounded-2xl border border-slate-100 dark:border-gray-800 text-center w-full lg:w-auto shadow-sm">
                                        <span className="text-xs text-slate-500 font-bold uppercase tracking-widest block lg:inline lg:mr-4 mb-1 lg:mb-0">Session Duration</span>
                                        <span className="text-xl font-mono font-black text-indigo-600 dark:text-indigo-400">{getElapsedTime()}</span>
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
