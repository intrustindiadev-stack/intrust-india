'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
    Users, Clock, Calendar, Briefcase, ArrowRight, TrendingUp, 
    UserCheck, Bell, Zap, MoreHorizontal, UserPlus, Filter, 
    Download, Building, Plus, DollarSign, CheckCircle2, Star 
} from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { supabase } from '@/lib/supabaseClient';
import { motion, AnimatePresence } from 'framer-motion';
import Skeleton from '@/components/ui/Skeleton';
import EmptyState from '@/components/ui/EmptyState';

function StatCard({ label, value, icon: Icon, color, subValue, trend, delay = 0 }) {
    const COLOR_VARIANTS = {
        emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800',
        blue: 'bg-blue-50 text-blue-600 border-blue-100 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800',
        amber: 'bg-amber-50 text-amber-600 border-amber-100 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800',
        violet: 'bg-violet-50 text-violet-600 border-violet-100 dark:bg-violet-900/20 dark:text-violet-400 dark:border-violet-800',
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }}
            className="bg-white dark:bg-gray-800 rounded-[2rem] p-6 border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-xl hover:shadow-gray-200/50 dark:hover:shadow-none transition-all group"
        >
            <div className="flex items-start justify-between mb-4">
                <div className={`p-3 rounded-2xl ${COLOR_VARIANTS[color]} shadow-inner group-hover:scale-110 transition-transform`}>
                    <Icon size={20} />
                </div>
                {trend && (
                    <span className="flex items-center gap-1 text-[10px] font-black text-emerald-500 bg-emerald-50 px-2 py-1 rounded-full uppercase tracking-tighter">
                        <TrendingUp size={10} /> {trend}
                    </span>
                )}
            </div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{label}</p>
            <div className="flex items-end justify-between">
                <div>
                    <p className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">{value}</p>
                    <p className="text-[10px] font-bold text-gray-400 mt-1">{subValue}</p>
                </div>
            </div>
        </motion.div>
    );
}

export default function HRMDashboard() {
    const [stats, setStats] = useState({ employees: 0, presentToday: 0, pendingLeaves: 0, newApplications: 0 });
    const [pendingLeaves, setPendingLeaves] = useState([]);
    const [recentApps, setRecentApps] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchStats = useCallback(async () => {
        try {
            const today = new Date().toISOString().split('T')[0];
            const [empRes, leaveRes, appRes, attRes] = await Promise.allSettled([
                supabase.from('user_profiles').select('id', { count: 'exact' }).in('role', ['employee', 'sales_exec', 'sales_manager', 'hr_manager']),
                supabase.from('leave_requests').select('id, leave_type, from_date, to_date, status, created_at, user_profiles(full_name, avatar_url)').eq('status', 'pending').order('created_at', { ascending: false }).limit(5),
                supabase.from('career_applications').select('id, full_name, role_category, status, created_at').in('status', ['pending', 'under_review']).order('created_at', { ascending: false }).limit(4),
                supabase.from('attendance').select('id', { count: 'exact' }).eq('date', today).eq('status', 'present'),
            ]);
            
            const empCount = empRes.status === 'fulfilled' ? (empRes.value.count || 0) : 0;
            const leaves = leaveRes.status === 'fulfilled' ? (leaveRes.value.data || []) : [];
            const apps = appRes.status === 'fulfilled' ? (appRes.value.data || []) : [];
            const presentCount = attRes.status === 'fulfilled' ? (attRes.value.count || 0) : 0;

            setStats({ employees: empCount, presentToday: presentCount, pendingLeaves: leaves.length, newApplications: apps.length });
            setPendingLeaves(leaves);
            setRecentApps(apps);
        } catch (err) { console.error(err); }
        finally { setIsLoading(false); }
    }, []);

    useEffect(() => { fetchStats(); }, [fetchStats]);

    return (
        <div className="p-4 sm:p-6 lg:p-8 space-y-8 min-h-screen font-[family-name:var(--font-outfit)] bg-gray-50/30 dark:bg-gray-900/30">
            
            {/* Header Area */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <span className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 border border-emerald-200/50">
                            <Zap size={12} fill="currentColor" /> HR Hub
                        </span>
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}</span>
                    </div>
                    <h1 className="text-4xl font-black text-gray-900 dark:text-white tracking-tight leading-none">
                        Personnel <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-500 to-teal-600">Command</span>
                    </h1>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <button className="p-3 rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 text-gray-500 hover:text-emerald-500 transition-all shadow-sm">
                        <Download size={20} />
                    </button>
                    <Link href="/hrm/recruitment" className="inline-flex items-center gap-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 px-6 py-3 rounded-2xl font-black text-sm shadow-xl shadow-gray-200 dark:shadow-none hover:bg-gray-800 dark:hover:bg-gray-100 transition-all active:scale-95">
                        <UserPlus size={18} /> New Hire
                    </Link>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {isLoading ? (
                    [...Array(4)].map((_, i) => <Skeleton key={i} className="h-44" />)
                ) : (
                    <>
                        <StatCard label="Total Force" value={stats.employees} color="blue" subValue="Active Personnel" trend="+2.4%" delay={0} icon={Users} />
                        <StatCard label="Attendance" value={stats.presentToday} color="emerald" subValue="Clocked in today" trend="98%" delay={0.1} icon={UserCheck} />
                        <StatCard label="Pending Leaves" value={stats.pendingLeaves} color="amber" subValue="Action Required" delay={0.2} icon={Calendar} />
                        <StatCard label="New Leads" value={stats.newApplications} color="violet" subValue="Talent Pipeline" trend="+12" delay={0.3} icon={Briefcase} />
                    </>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Pending Actions */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white dark:bg-gray-800 rounded-[2.5rem] border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
                        <div className="p-8 border-b border-gray-50 dark:border-gray-700/50 flex items-center justify-between">
                            <div>
                                <h3 className="text-xl font-black text-gray-900 dark:text-white tracking-tight">Leave Approvals</h3>
                                <p className="text-xs font-bold text-gray-400 mt-1 uppercase tracking-widest">Pending Requests</p>
                            </div>
                            <Link href="/hrm/leaves" className="text-xs font-black text-emerald-600 hover:text-emerald-700 flex items-center gap-1 group">
                                View Full Queue <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                            </Link>
                        </div>
                        <div className="p-2">
                            {isLoading ? (
                                [...Array(3)].map((_, i) => <div key={i} className="p-4 flex items-center gap-4"><Skeleton className="w-12 h-12 rounded-xl" /><div className="flex-1 space-y-2"><Skeleton className="h-4 w-1/3" /><Skeleton className="h-3 w-1/4" /></div></div>)
                            ) : pendingLeaves.length > 0 ? (
                                <div className="space-y-1">
                                    {pendingLeaves.map((leave) => (
                                        <div key={leave.id} className="flex items-center gap-4 p-4 hover:bg-gray-50 dark:hover:bg-gray-900/50 rounded-2xl transition-all group">
                                            <div className="w-12 h-12 rounded-xl bg-gray-100 dark:bg-gray-900 overflow-hidden shrink-0 text-center flex items-center justify-center">
                                                {leave.user_profiles?.avatar_url ? (
                                                    <Image src={leave.user_profiles.avatar_url} alt={leave.user_profiles.full_name} width={48} height={48} className="object-cover" />
                                                ) : (
                                                    <span className="text-sm font-bold text-gray-400">{leave.user_profiles?.full_name?.charAt(0)}</span>
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-black text-gray-900 dark:text-white truncate">{leave.user_profiles?.full_name}</p>
                                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">{leave.leave_type} · {new Date(leave.from_date).toLocaleDateString()}</p>
                                            </div>
                                            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button className="px-4 py-2 rounded-xl bg-emerald-50 text-emerald-600 font-black text-[10px] uppercase hover:bg-emerald-600 hover:text-white transition-all">Approve</button>
                                                <button className="px-4 py-2 rounded-xl bg-rose-50 text-rose-600 font-black text-[10px] uppercase hover:bg-rose-600 hover:text-white transition-all">Reject</button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <EmptyState icon={CheckCircle2} title="All caught up!" description="No pending leave requests to review." className="m-4 border-none bg-transparent" />
                            )}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Link href="/hrm/recruitment" className="relative group overflow-hidden rounded-[2.5rem] aspect-[16/9] sm:aspect-auto sm:h-48 bg-gray-900">
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent p-8 flex flex-col justify-end z-10">
                                <p className="text-[10px] font-black text-white/60 uppercase tracking-[0.2em] mb-1">Pipeline</p>
                                <h4 className="text-2xl font-black text-white tracking-tight">Talent Acquisition</h4>
                                <div className="mt-4 flex items-center gap-2">
                                    <div className="px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/10 text-[10px] font-bold text-white uppercase tracking-widest">
                                        {stats.newApplications} Active Leads
                                    </div>
                                </div>
                            </div>
                        </Link>

                        <Link href="/hrm/training" className="relative group overflow-hidden rounded-[2.5rem] aspect-[16/9] sm:aspect-auto sm:h-48 bg-emerald-900">
                            <div className="absolute inset-0 bg-gradient-to-t from-emerald-950/80 via-transparent to-transparent p-8 flex flex-col justify-end z-10">
                                <p className="text-[10px] font-black text-white/60 uppercase tracking-[0.2em] mb-1">Growth</p>
                                <h4 className="text-2xl font-black text-white tracking-tight">Upskilling Portal</h4>
                                <div className="mt-4 flex items-center gap-2 text-white/60">
                                    <Star size={16} fill="currentColor" />
                                    <Star size={16} fill="currentColor" />
                                    <Star size={16} fill="currentColor" />
                                    <span className="text-[10px] font-bold uppercase tracking-widest ml-1">4.8 Avg Rating</span>
                                </div>
                            </div>
                        </Link>
                    </div>
                </div>

                {/* Live Operations Feed */}
                <div className="bg-white dark:bg-gray-800 rounded-[2.5rem] border border-gray-100 dark:border-gray-700 shadow-sm p-8 space-y-8">
                    <div>
                        <h3 className="text-xl font-black text-gray-900 dark:text-white tracking-tight">Live Ops</h3>
                        <p className="text-xs font-bold text-gray-400 mt-1 uppercase tracking-widest">Real-time Activity</p>
                    </div>

                    <div className="space-y-8 relative before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-px before:bg-gray-100 dark:before:bg-gray-700">
                        {isLoading ? (
                            [...Array(4)].map((_, i) => <div key={i} className="relative pl-10 space-y-2"><div className="absolute left-0 top-1.5 w-5 h-5 rounded-full bg-gray-100 dark:bg-gray-700" /><Skeleton className="h-4 w-1/2" /><Skeleton className="h-3 w-1/3" /></div>)
                        ) : recentApps.length > 0 ? (
                            recentApps.map((app, i) => (
                                <div key={app.id} className="relative pl-10">
                                    <div className={`absolute left-0 top-1.5 w-5 h-5 rounded-full border-4 border-white dark:border-gray-800 shadow-sm ${app.status === 'pending' ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                                    <div className="space-y-1">
                                        <p className="text-sm font-black text-gray-900 dark:text-white">{app.full_name}</p>
                                        <p className="text-xs font-bold text-gray-400">Applied for {app.role_category}</p>
                                        <div className="flex items-center gap-2 mt-2">
                                            <span className="text-[10px] font-black bg-gray-50 dark:bg-gray-900 px-2 py-1 rounded text-gray-500 uppercase tracking-widest">
                                                {app.status}
                                            </span>
                                            <span className="text-[10px] font-bold text-gray-300">
                                                {new Date(app.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <EmptyState icon={Zap} title="No recent activity" description="The live feed is currently quiet." className="py-8 border-none bg-transparent" />
                        )}
                    </div>

                    <Link href="/hrm/activity" className="block w-full py-4 text-center rounded-2xl bg-gray-50 dark:bg-gray-900 text-xs font-black text-gray-400 hover:text-gray-900 dark:hover:text-white transition-all uppercase tracking-widest">
                        Full Audit Logs
                    </Link>
                </div>
            </div>
        </div>
    );
}
