'use client';

import { useState, useEffect, useCallback } from 'react';
import { Users, Clock, Calendar, Briefcase, ArrowRight, TrendingUp, UserCheck } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { supabase } from '@/lib/supabaseClient';
import { motion } from 'framer-motion';

function StatCard({ label, value, icon: Icon, gradient, href, delay = 0 }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay }}
            whileHover={{ y: -4, scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
        >
            <Link href={href || '#'} className={`block relative overflow-hidden rounded-3xl p-5 text-white bg-gradient-to-br ${gradient} shadow-lg hover:shadow-2xl transition-all duration-300`}>
                <div className="absolute -top-6 -right-6 w-24 h-24 bg-white/10 rounded-full" />
                <div className="absolute bottom-0 left-0 w-32 h-32 bg-black/10 rounded-full blur-2xl" />
                <div className="w-11 h-11 rounded-2xl bg-white/20 flex items-center justify-center mb-4 relative z-10"><Icon size={22} /></div>
                <p className="text-white/70 text-xs font-bold uppercase tracking-widest relative z-10">{label}</p>
                <p className="text-4xl font-black mt-1 relative z-10">{value}</p>
            </Link>
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
                supabase.from('user_profiles').select('id', { count: 'exact' }).in('role', ['employee', 'sales_exec', 'sales_manager', 'hr_manager', 'crm_user']),
                supabase.from('leave_requests').select('id, leave_type, from_date, to_date, user_profiles(full_name)').eq('status', 'pending').order('created_at', { ascending: false }).limit(5),
                supabase.from('career_applications').select('id, full_name, role_category, status').in('status', ['pending', 'under_review']).order('created_at', { ascending: false }).limit(4),
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

    const STATS = [
        { label: 'Total Employees', value: isLoading ? '…' : stats.employees, icon: Users, gradient: 'from-emerald-500 to-teal-600', href: '/hrm/employees' },
        { label: 'Present Today', value: isLoading ? '…' : stats.presentToday, icon: UserCheck, gradient: 'from-sky-500 to-blue-600', href: '/hrm/attendance' },
        { label: 'Leave Queue', value: isLoading ? '…' : stats.pendingLeaves, icon: Calendar, gradient: 'from-amber-500 to-orange-500', href: '/hrm/leaves' },
        { label: 'New Applications', value: isLoading ? '…' : stats.newApplications, icon: Briefcase, gradient: 'from-violet-500 to-purple-600', href: '/hrm/recruitment' },
    ];

    return (
        <div className="p-4 sm:p-6 lg:p-8 space-y-6 min-h-screen">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">HR Dashboard</h1>
                    <p className="text-sm text-gray-500 mt-1">{new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
                </div>
                <div className="flex gap-2">
                    <Link href="/hrm/recruitment" className="inline-flex items-center gap-2 bg-gradient-to-r from-violet-600 to-purple-600 text-white px-4 py-2.5 rounded-xl font-bold text-sm shadow-lg shadow-violet-500/30 hover:from-violet-500 transition-all">
                        <Briefcase size={16} /> Recruitment
                    </Link>
                    <Link href="/hrm/employees" className="inline-flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white px-4 py-2.5 rounded-xl font-bold text-sm shadow-lg shadow-emerald-500/30 hover:from-emerald-500 transition-all">
                        <Users size={16} /> Employees
                    </Link>
                </div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {STATS.map((s, i) => <StatCard key={s.label} {...s} delay={i * 0.05} />)}
            </div>

            {/* Dashboard Preview Banner */}
            <motion.div
                initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
                className="relative overflow-hidden rounded-3xl h-40 sm:h-52 shadow-xl group cursor-default"
            >
                <Image
                    src="/images/hrm-preview.png"
                    alt="HR Management Dashboard"
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-emerald-900/80 via-emerald-900/40 to-transparent" />
                <div className="absolute inset-0 flex flex-col justify-center px-8">
                    <p className="text-white/70 text-xs font-bold uppercase tracking-widest mb-1">InTrust HR Suite</p>
                    <p className="text-white text-2xl sm:text-3xl font-black">People. Data. Results.</p>
                    <p className="text-white/60 text-sm mt-1">Everything HR in one place.</p>
                </div>
            </motion.div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Pending Leaves */}
                <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="flex justify-between items-center p-5 border-b border-gray-100">
                        <h2 className="text-base font-bold text-gray-900">Pending Leave Requests</h2>
                        <Link href="/hrm/leaves" className="text-sm font-semibold text-emerald-600 flex items-center gap-1">View All <ArrowRight size={14} /></Link>
                    </div>
                    <div className="divide-y divide-gray-50">
                        {isLoading ? [...Array(3)].map((_, i) => <div key={i} className="h-16 mx-5 my-2 animate-pulse bg-gray-100 rounded-xl" />) :
                         pendingLeaves.length === 0 ? (
                            <div className="p-10 text-center">
                                <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto mb-3"><Calendar size={22} className="text-emerald-500" /></div>
                                <p className="text-sm font-semibold text-gray-700">All caught up!</p>
                                <p className="text-xs text-gray-400 mt-1">No pending leave requests</p>
                            </div>
                        ) : pendingLeaves.map(req => (
                            <div key={req.id} className="flex items-center justify-between px-5 py-3.5 hover:bg-amber-50/30 transition-colors">
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center text-amber-700 font-bold text-sm flex-shrink-0">
                                        {(req.user_profiles?.full_name || '?').charAt(0).toUpperCase()}
                                    </div>
                                    <div className="min-w-0">
                                        <p className="font-semibold text-gray-900 text-sm truncate">{req.user_profiles?.full_name || 'Employee'}</p>
                                        <p className="text-xs text-gray-400">{req.leave_type} · {req.from_date} → {req.to_date}</p>
                                    </div>
                                </div>
                                <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-amber-50 text-amber-700 border border-amber-100 flex-shrink-0">Pending</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* New Applications */}
                <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="flex justify-between items-center p-5 border-b border-gray-100">
                        <h2 className="text-base font-bold text-gray-900">New Applications</h2>
                        <Link href="/hrm/recruitment" className="text-sm font-semibold text-violet-600 flex items-center gap-1">Review All <ArrowRight size={14} /></Link>
                    </div>
                    <div className="divide-y divide-gray-50">
                        {isLoading ? [...Array(3)].map((_, i) => <div key={i} className="h-16 mx-5 my-2 animate-pulse bg-gray-100 rounded-xl" />) :
                         recentApps.length === 0 ? (
                            <div className="p-10 text-center">
                                <div className="w-12 h-12 bg-violet-50 rounded-2xl flex items-center justify-center mx-auto mb-3"><Briefcase size={22} className="text-violet-500" /></div>
                                <p className="text-sm font-semibold text-gray-700">No new applications</p>
                                <p className="text-xs text-gray-400 mt-1">New career applications will appear here</p>
                            </div>
                        ) : recentApps.map(app => (
                            <div key={app.id} className="flex items-center justify-between px-5 py-3.5 hover:bg-violet-50/30 transition-colors">
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className="w-9 h-9 rounded-xl bg-violet-100 flex items-center justify-center text-violet-700 font-bold text-sm flex-shrink-0">
                                        {(app.full_name || '?').charAt(0).toUpperCase()}
                                    </div>
                                    <div className="min-w-0">
                                        <p className="font-semibold text-gray-900 text-sm truncate">{app.full_name}</p>
                                        <p className="text-xs text-gray-400">{app.role_category || 'General Application'}</p>
                                    </div>
                                </div>
                                <span className={`text-xs font-bold px-2.5 py-1 rounded-lg flex-shrink-0 ${app.status === 'pending' ? 'bg-blue-50 text-blue-700 border border-blue-100' : 'bg-amber-50 text-amber-700 border border-amber-100'}`}>
                                    {app.status === 'under_review' ? 'In Review' : 'New'}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-gradient-to-br from-emerald-900 via-emerald-800 to-teal-800 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl -mr-20 -mt-20" />
                <h2 className="text-sm font-bold mb-5 opacity-70 uppercase tracking-widest relative z-10">Quick Actions</h2>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 relative z-10">
                    {[
                        { href: '/hrm/attendance', icon: Clock, label: 'Attendance' },
                        { href: '/hrm/leaves', icon: Calendar, label: 'Leave Queue' },
                        { href: '/hrm/salary', icon: TrendingUp, label: 'Payroll' },
                        { href: '/hrm/recruitment', icon: Briefcase, label: 'Recruitment' },
                    ].map(({ href, icon: Icon, label }) => (
                        <Link key={href} href={href} className="flex flex-col items-center gap-2 p-4 bg-white/10 hover:bg-white/20 rounded-2xl border border-white/10 transition-all group">
                            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                                <Icon size={20} className="text-emerald-200" />
                            </div>
                            <span className="text-xs font-semibold">{label}</span>
                        </Link>
                    ))}
                </div>
            </div>
        </div>
    );
}
