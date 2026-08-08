'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
    Users, Clock, Calendar, Briefcase, ArrowRight, TrendingUp, 
    UserCheck, Bell, Zap, MoreHorizontal, UserPlus, Filter, 
    Download, Building, Plus, DollarSign, CheckCircle2, Star, HelpCircle, BookOpen, FileText
} from 'lucide-react';
import Link from 'next/link';

const QUICK_ACTIONS = [
    { label: 'New Employee', icon: UserPlus, href: '/hrm/employees', color: 'bg-blue-600', shadow: 'shadow-blue-600/30', desc: 'Add to team' },
    { label: 'Attendance', icon: Clock, href: '/hrm/attendance', color: 'bg-amber-500', shadow: 'shadow-amber-500/30', desc: 'Mark today' },
    { label: 'Leaves', icon: Calendar, href: '/hrm/leaves', color: 'bg-violet-600', shadow: 'shadow-violet-600/30', desc: 'Approve requests' },
    { label: 'Salary', icon: DollarSign, href: '/hrm/salary', color: 'bg-emerald-600', shadow: 'shadow-emerald-600/30', desc: 'Process payroll' },
    { label: 'Training', icon: BookOpen, href: '/hrm/training', color: 'bg-rose-500', shadow: 'shadow-rose-500/30', desc: 'Manage sessions' },
    { label: 'Help', icon: HelpCircle, href: '/hrm/help', color: 'bg-gray-700', shadow: 'shadow-gray-700/30', desc: 'Guides & FAQ' },
];
import Image from 'next/image';
import { supabase } from '@/lib/supabaseClient';
import { motion, AnimatePresence } from 'framer-motion';
import Skeleton from '@/components/ui/Skeleton';
import SkeletonCard from '@/components/shared/SkeletonCard';
import EmptyState from '@/components/ui/EmptyState';
import { toast } from 'react-hot-toast';
import WelcomeRoleCelebrationModal from '@/components/shared/WelcomeRoleCelebrationModal';

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
            className="bg-white dark:bg-gray-800 rounded-[2rem] p-6 border-none shadow-xl shadow-gray-200/40 dark:shadow-black/20 hover:-translate-y-1 transition-all duration-300 group"
        >
            <div className="flex items-start justify-between mb-4">
                <div className={`p-4 rounded-[1rem] ${COLOR_VARIANTS[color]} shadow-inner group-hover:scale-110 transition-transform`}>
                    <Icon size={24} />
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
                    <p className="text-4xl font-black text-gray-900 dark:text-white tracking-tight drop-shadow-sm">{value}</p>
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
                supabase.from('user_profiles').select('id', { count: 'exact' }).in('role', [
                    'employee', 'relationship_exec', 'relationship_manager', 'hr_manager',
                    'freelancer', 'video_editor', 'social_media_manager',
                    'seo_specialist', 'advertiser', 'support_agent'
                ]),
                supabase.from('leave_requests').select('id, leave_type, from_date, to_date, status, created_at, user_profiles!employee_id(full_name, avatar_url)').eq('status', 'pending').order('created_at', { ascending: false }).limit(5),
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

    const handleLeaveAction = async (leaveId, action) => {
        const originalLeaves = [...pendingLeaves];
        setPendingLeaves(prev => prev.filter(l => l.id !== leaveId));
        setStats(prev => ({ ...prev, pendingLeaves: Math.max(0, prev.pendingLeaves - 1) }));

        try {
            const { data: { user } } = await supabase.auth.getUser();
            const { error } = await supabase.from('leave_requests').update({
                status: action,
                reviewed_at: new Date().toISOString(),
                reviewed_by: user?.id
            }).eq('id', leaveId);
            
            if (error) throw error;
            toast.success(`Leave ${action} successfully`);

            // Audit log
            if (user) {
                supabase.from('audit_logs_hrm').insert({
                    actor_id: user.id,
                    actor_name: user.user_metadata?.full_name || 'System',
                    action: `Leave ${action}`,
                    table_name: 'leave_requests',
                    record_id: leaveId,
                    old_data: { status: 'pending' },
                    new_data: { status: action },
                    module: 'Leaves',
                    severity: 'low'
                }).then(({ error: auditError }) => {
                    if (auditError) console.warn('Audit log failed:', auditError);
                });
            }

        } catch (err) {
            console.error(err);
            toast.error(err.message || `Failed to ${action} leave`);
            setPendingLeaves(originalLeaves);
            setStats(prev => ({ ...prev, pendingLeaves: prev.pendingLeaves + 1 }));
        }
    };

    useEffect(() => { fetchStats(); }, [fetchStats]);

    return (
        <div className="p-4 sm:p-6 lg:p-8 space-y-8 min-h-screen font-[family-name:var(--font-outfit)] bg-[#F8FAFC] dark:bg-gray-900 relative">
            {/* Background elements */}
            <div className="absolute top-0 inset-x-0 h-96 bg-gradient-to-b from-emerald-50/80 dark:from-emerald-900/20 to-transparent pointer-events-none" />
            <div className="absolute top-20 right-0 w-96 h-96 bg-teal-200/40 dark:bg-teal-900/20 rounded-full blur-[100px] pointer-events-none" />
            <div className="absolute top-40 left-0 w-96 h-96 bg-emerald-200/40 dark:bg-emerald-900/20 rounded-full blur-[100px] pointer-events-none" />

            <div className="relative z-10 space-y-8 max-w-7xl mx-auto">
                {/* First Time Welcome Celebration Modal */}
                <WelcomeRoleCelebrationModal />
                
                {/* Header Graphic Banner */}
                <motion.div 
                    initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} 
                    className="relative w-full rounded-[2.5rem] bg-gradient-to-r from-emerald-500 via-teal-600 to-emerald-800 p-8 sm:p-12 overflow-hidden shadow-2xl shadow-emerald-600/30 text-white flex flex-col md:flex-row justify-between items-center gap-8"
                >
                    <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
                    <div className="absolute bottom-0 left-1/2 w-64 h-64 bg-teal-400/30 rounded-full blur-3xl transform -translate-x-1/2 pointer-events-none" />
                    <Image src="/images/hrm_dashboard_banner.png" alt="HRM Dashboard Banner" fill className="object-cover opacity-40 mix-blend-overlay pointer-events-none" />

                    <div className="relative z-10 flex flex-col gap-4 max-w-2xl">
                        <div className="flex items-center gap-3 mb-1">
                            <span className="bg-white/10 text-white px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest flex items-center gap-1.5 border border-white/20 backdrop-blur-md shadow-lg">
                                <Zap size={14} fill="currentColor" /> HR Hub
                            </span>
                            <span className="text-[10px] font-bold text-emerald-50 uppercase tracking-widest bg-black/20 px-3 py-1.5 rounded-full backdrop-blur-sm hidden sm:block">
                                {new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
                            </span>
                        </div>
                        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight drop-shadow-md">
                            Personnel Command
                        </h1>
                        <p className="text-sm font-medium text-emerald-50 mt-2 max-w-xl opacity-90 leading-relaxed">
                            Manage your workforce, track attendance, and oversee recruitment pipelines all from one powerful interface.
                        </p>
                        
                        <div className="mt-4 flex flex-wrap items-center gap-3">
                            <Link href="/hrm/recruitment" className="inline-flex items-center gap-2 bg-white hover:bg-gray-50 text-emerald-600 px-8 py-4 rounded-[1.25rem] font-black text-sm shadow-xl shadow-black/10 transition-all hover:-translate-y-1 hover:shadow-2xl">
                                <UserPlus size={18} strokeWidth={3} /> New Hire
                            </Link>
                        </div>
                    </div>
                </motion.div>

                {/* ⚡ Quick Actions */}
                <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-sm font-black text-gray-500 uppercase tracking-widest">Quick Actions</h2>
                    </div>
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

            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {isLoading ? (
                    [...Array(4)].map((_, i) => <SkeletonCard key={i} type="stat" />)
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
                    <div className="bg-white dark:bg-gray-800 rounded-[2.5rem] border-none shadow-xl shadow-gray-200/40 dark:shadow-black/20 overflow-hidden">
                        <div className="p-8 pb-4 flex items-center justify-between">
                            <div>
                                <h3 className="text-xl font-black text-gray-900 dark:text-white tracking-tight">Leave Approvals</h3>
                                <p className="text-xs font-bold text-gray-400 mt-1 uppercase tracking-widest">Pending Requests</p>
                            </div>
                            <Link href="/hrm/leaves" className="text-xs font-black text-emerald-600 hover:text-emerald-700 flex items-center gap-1 group bg-emerald-50 px-4 py-2 rounded-xl">
                                View Full Queue <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                            </Link>
                        </div>
                        <div className="p-2">
                            {isLoading ? (
                                <SkeletonCard type="list-item" count={3} />
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
                                                <button onClick={() => handleLeaveAction(leave.id, 'approved')} className="px-4 py-2 rounded-xl bg-emerald-50 text-emerald-600 font-black text-[10px] uppercase hover:bg-emerald-600 hover:text-white transition-all">Approve</button>
                                                <button onClick={() => handleLeaveAction(leave.id, 'rejected')} className="px-4 py-2 rounded-xl bg-rose-50 text-rose-600 font-black text-[10px] uppercase hover:bg-rose-600 hover:text-white transition-all">Reject</button>
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
                <div className="bg-white dark:bg-gray-800 rounded-[2.5rem] border-none shadow-xl shadow-gray-200/40 dark:shadow-black/20 p-8 space-y-8">
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

                    <Link href="/hrm/audit" className="block w-full py-4 text-center rounded-2xl bg-gray-50 dark:bg-gray-900 text-xs font-black text-gray-400 hover:text-gray-900 dark:hover:text-white transition-all uppercase tracking-widest">
                        Full Audit Logs
                    </Link>
                </div>
            </div>
            </div>
        </div>
    );
}
