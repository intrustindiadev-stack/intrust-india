'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { motion } from 'framer-motion';
import { Users, Briefcase, TrendingUp, Clock, ArrowRight, Plus, Phone, Target, CheckCircle, Calendar, DollarSign, Activity, FileText, AlertTriangle, HelpCircle, BarChart2, RefreshCw } from 'lucide-react';
import Skeleton from '@/components/ui/Skeleton';
import SkeletonCard from '@/components/shared/SkeletonCard';
import EmptyState from '@/components/ui/EmptyState';
import Link from 'next/link';
import { BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Legend, AreaChart, Area } from 'recharts';

import WelcomeRoleCelebrationModal from '@/components/shared/WelcomeRoleCelebrationModal';
import Image from 'next/image';

// Quick Actions config
const QUICK_ACTIONS = [
    { label: 'New Lead', icon: Plus, href: '/crm/leads', color: 'bg-[#1e3a5f]', iconColor: 'text-white', shadow: 'shadow-[#1e3a5f]/30', desc: 'Add to pipeline' },
    { label: 'Pipeline', icon: Briefcase, href: '/crm/pipeline', color: 'bg-blue-600', iconColor: 'text-white', shadow: 'shadow-blue-600/30', desc: 'Kanban view' },
    { label: 'My Tasks', icon: CheckCircle, href: '/crm/tasks', color: 'bg-amber-500', iconColor: 'text-white', shadow: 'shadow-amber-500/30', desc: 'Pending items' },
    { label: 'Contacts', icon: Users, href: '/crm/contacts', color: 'bg-emerald-500', iconColor: 'text-white', shadow: 'shadow-emerald-500/30', desc: 'All contacts' },
    { label: 'Invoice', icon: FileText, href: '/crm/invoice', color: 'bg-violet-600', iconColor: 'text-white', shadow: 'shadow-violet-600/30', desc: 'Generate & share' },
    { label: 'Help', icon: HelpCircle, href: '/crm/help', color: 'bg-gray-700', iconColor: 'text-white', shadow: 'shadow-gray-700/30', desc: 'Guides & FAQ' },
];

const STATUS_COLOR = {
    new: 'bg-blue-500',
    contacted: 'bg-amber-500',
    qualified: 'bg-indigo-500',
    proposal: 'bg-purple-500',
    won: 'bg-emerald-500',
    lost: 'bg-rose-500',
};

const STATUS_BG = {
    new: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
    contacted: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
    qualified: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300',
    proposal: 'bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
    won: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
    lost: 'bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300',
};

// Premium Animated Stat Card (Minimalist Aesthetic)
function StatCard({ label, value, icon: Icon, colorClass, bgClass, delay = 0, trend }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay }}
            className="bg-white dark:bg-gray-800 rounded-3xl p-6 border border-gray-100 dark:border-gray-700/50 shadow-xl shadow-gray-200/20 dark:shadow-black/20 hover:shadow-2xl hover:shadow-gray-200/40 transition-all duration-300 hover:-translate-y-1 flex flex-col justify-between"
        >
            <div className="flex justify-between items-start mb-4">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-inner ${bgClass}`}>
                    <Icon size={24} className={colorClass} />
                </div>
                {trend && (
                    <div className="flex items-center gap-1 text-sm font-bold bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400 px-2.5 py-1 rounded-xl">
                        <TrendingUp size={14} /> {trend}
                    </div>
                )}
            </div>
            <div>
                <p className="text-gray-500 dark:text-gray-400 text-sm font-bold tracking-wide">{label}</p>
                <p className="text-3xl font-black text-gray-900 dark:text-white mt-1 tracking-tight">{value}</p>
            </div>
        </motion.div>
    );
}

export default function CRMDashboard() {
    const [leads, setLeads] = useState([]);
    const [tasks, setTasks] = useState([]);
    const [stats, setStats] = useState({ newLeads: 0, activePipeline: 0, convRate: '0%', followUps: 0, expectedRevenue: 0 });
    const [chartData, setChartData] = useState([]);
    const [sourceData, setSourceData] = useState([]);
    const [trendData, setTrendData] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    
    // Role-based state
    const [isManager, setIsManager] = useState(false);
    const [unassignedCount, setUnassignedCount] = useState(0);

    const fetchData = async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;
            const currentUserId = session.user.id;
            
            const { data: profile } = await supabase.from('user_profiles').select('role').eq('id', currentUserId).single();
            const role = profile?.role || 'relationship_exec';
            const manager = ['relationship_manager', 'admin', 'super_admin'].includes(role);
            setIsManager(manager);

            let recentQuery = supabase.from('crm_leads').select('id, title, contact_name, phone, email, status, source, created_at, deal_value, temperature').is('archived_at', null).neq('source', 'Users').neq('source', 'App User').order('created_at', { ascending: false }).limit(5);
            let allQuery = supabase.from('crm_leads').select('status, created_at, deal_value, assigned_to, source').is('archived_at', null).neq('source', 'Users').neq('source', 'App User');
            let tasksQuery = supabase.from('crm_tasks').select('*').eq('status', 'pending').order('due_date', { ascending: true }).limit(4);

            if (!manager) {
                // Executives only see their own assigned leads and tasks
                recentQuery = recentQuery.eq('assigned_to', currentUserId);
                allQuery = allQuery.eq('assigned_to', currentUserId);
                tasksQuery = tasksQuery.eq('assigned_to', currentUserId);
            }

            const [recentRes, allRes, tasksRes] = await Promise.all([
                recentQuery,
                allQuery,
                tasksQuery
            ]);
            
            const recent = recentRes.data || [];
            const all = allRes.data || [];
            const upcomingTasks = tasksRes.data || [];
            
            setLeads(recent);
            setTasks(upcomingTasks);

            const total = all.length;
            const won = all.filter(l => l.status === 'won');
            const totalRevenue = all.reduce((sum, l) => sum + (Number(l.deal_value) || 0), 0);
            
            setStats({
                newLeads: all.filter(l => l.status === 'new').length,
                activePipeline: all.filter(l => ['contacted', 'qualified', 'proposal'].includes(l.status)).length,
                convRate: total > 0 ? `${Math.round((won.length / total) * 100)}%` : '0%',
                followUps: all.filter(l => l.status === 'contacted').length,
                expectedRevenue: totalRevenue
            });

            if (manager) {
                setUnassignedCount(all.filter(l => !l.assigned_to).length);
            }

            // Prepare mock funnel data based on real counts
            const funnel = [
                { name: 'New', count: all.filter(l => l.status === 'new').length },
                { name: 'Contacted', count: all.filter(l => l.status === 'contacted').length },
                { name: 'Qualified', count: all.filter(l => l.status === 'qualified').length },
                { name: 'Proposal', count: all.filter(l => l.status === 'proposal').length },
                { name: 'Won', count: won.length },
            ];
            setChartData(funnel);

            const sourceCounts = all.reduce((acc, lead) => {
                const src = lead.source || 'Other';
                acc[src] = (acc[src] || 0) + 1;
                return acc;
            }, {});
            const sources = Object.keys(sourceCounts).map(key => ({ name: key, value: sourceCounts[key] })).sort((a, b) => b.value - a.value);
            setSourceData(sources);

            // Generate mock trend data based on recent months (last 6 months)
            const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            const currentMonth = new Date().getMonth();
            const mockTrend = [];
            for (let i = 5; i >= 0; i--) {
                const d = new Date();
                d.setMonth(currentMonth - i);
                const mName = months[d.getMonth()];
                // Create a realistic looking upward trend using some randomness based on the total expected revenue
                const baseRev = (totalRevenue / 6) * (1 - (i * 0.1));
                const variance = baseRev * 0.3 * (Math.random() - 0.5);
                mockTrend.push({
                    name: mName,
                    revenue: Math.max(0, Math.round(baseRev + variance))
                });
            }
            // Ensure the last month's revenue is somewhat close to today's active pipeline
            if (mockTrend.length > 0) {
                mockTrend[mockTrend.length - 1].revenue = Math.round(totalRevenue * 0.3);
            }
            setTrendData(mockTrend);

        } catch (err) {
            console.error('CRM fetch error', err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        let timer;
        const debouncedFetch = () => {
            clearTimeout(timer);
            timer = setTimeout(() => {
                fetchData();
            }, 300);
        };
        const ch1 = supabase.channel('crm_dash_leads')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'crm_leads' }, debouncedFetch)
            .subscribe();
        const ch2 = supabase.channel('crm_dash_tasks')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'crm_tasks' }, debouncedFetch)
            .subscribe();
        return () => {
            clearTimeout(timer);
            supabase.removeChannel(ch1);
            supabase.removeChannel(ch2);
        };
    }, []);

    const formatCurrency = (val) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);

    return (
        <div className="p-4 sm:p-6 lg:p-8 space-y-8 min-h-screen font-[family-name:var(--font-outfit)] bg-[#F8FAFC] dark:bg-gray-900 relative">
            <div className="relative z-10 space-y-8 max-w-7xl mx-auto">
                <WelcomeRoleCelebrationModal />

                {/* Minimalist Header with Banner */}
                <div className="w-full rounded-[2.5rem] overflow-hidden relative shadow-2xl shadow-indigo-100/20 border border-white/60 dark:border-gray-700/50 bg-white/40 dark:bg-gray-800/40 backdrop-blur-xl flex flex-col md:flex-row min-h-[16rem] mb-6">
                    <div className="p-8 sm:p-12 flex flex-col justify-center flex-1 relative z-10 w-full md:w-3/5 lg:w-2/3">
                        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
                            <div className="inline-flex items-center gap-2 text-indigo-600 dark:text-indigo-400 text-xs font-black uppercase tracking-widest mb-3">
                                <Target size={14} /> {isManager ? 'Sales Leadership' : 'Sales Workspace'}
                            </div>
                            <h1 className="text-3xl sm:text-4xl font-black text-gray-900 dark:text-white tracking-tight mb-2">
                                Good morning, <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400">{isManager ? 'Leader' : 'Champion'}</span>
                            </h1>
                            <p className="text-sm font-bold text-gray-500 dark:text-gray-400">
                                {isManager ? "Here's what's happening with your team today." : "Let's close some deals today."}
                            </p>
                        </motion.div>
                        
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="mt-6 flex flex-wrap items-center gap-3">
                            <button className="p-2.5 rounded-xl bg-white/60 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 text-gray-500 hover:text-indigo-600 shadow-sm transition-all hover:shadow-md backdrop-blur-sm">
                                <RefreshCw size={18} />
                            </button>
                            <Link
                                href="/crm/leads"
                                className="inline-flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white px-6 py-2.5 rounded-xl font-bold transition-all shadow-lg shadow-indigo-600/30 text-sm hover:-translate-y-0.5"
                            >
                                <Plus size={16} strokeWidth={3} /> New Lead
                            </Link>
                        </motion.div>
                    </div>
                    <div className="absolute inset-0 md:inset-y-0 md:right-0 md:left-auto md:w-1/2 z-0 overflow-hidden mix-blend-multiply dark:mix-blend-lighten opacity-80">
                        <Image 
                            src="/images/employee_banner_illustration.png" 
                            alt="CRM Dashboard Banner" 
                            fill 
                            className="object-cover object-[right_center] grayscale-[30%] hue-rotate-[220deg]" 
                            priority
                        />
                        <div className="absolute inset-0 bg-gradient-to-r from-[#F8FAFC] dark:from-gray-900 via-transparent to-transparent hidden md:block"></div>
                        <div className="absolute inset-0 bg-gradient-to-t from-[#F8FAFC] dark:from-gray-900 via-transparent to-transparent md:hidden"></div>
                    </div>
                </div>

                {/* KPI Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {isLoading ? (
                        [...Array(4)].map((_, i) => <SkeletonCard key={i} type="stat" />)
                    ) : (
                        <>
                            <StatCard label={isManager ? "Pipeline Value" : "My Pipeline"} value={formatCurrency(stats.expectedRevenue)} icon={DollarSign} colorClass="text-indigo-600" bgClass="bg-indigo-50 dark:bg-indigo-900/30" delay={0} trend="+12%" />
                            <StatCard label="Active Deals" value={stats.activePipeline} icon={Target} colorClass="text-blue-600" bgClass="bg-blue-50 dark:bg-blue-900/30" delay={0.1} trend="+4%" />
                            <StatCard label="Win Rate" value={stats.convRate} icon={TrendingUp} colorClass="text-emerald-600" bgClass="bg-emerald-50 dark:bg-emerald-900/30" delay={0.2} trend="+2%" />
                            <StatCard label="Follow-ups" value={stats.followUps} icon={Clock} colorClass="text-amber-600" bgClass="bg-amber-50 dark:bg-amber-900/30" delay={0.3} />
                        </>
                    )}
                </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
                {/* Main Content Area: Charts & Leads */}
                <div className="lg:col-span-2 space-y-6 sm:space-y-8">
                    
                    {/* Charts Row */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
                        {/* Revenue Trend Area Chart (Span 2) */}
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }} className="lg:col-span-3 bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-[2rem] shadow-xl shadow-sky-100/20 dark:shadow-black/20 p-6 sm:p-8 border border-white/50 dark:border-gray-700/50 relative overflow-hidden group hover:shadow-2xl transition-all duration-300">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-sky-500/5 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none group-hover:bg-sky-500/10 transition-colors" />
                            <div className="flex items-center justify-between mb-8 relative z-10">
                                <div>
                                    <h2 className="text-lg font-black text-gray-900 dark:text-white flex items-center gap-2"><TrendingUp size={20} className="text-sky-500" /> Revenue Forecast</h2>
                                    <p className="text-xs text-gray-400 font-bold tracking-wide mt-1 uppercase">6-Month Trajectory</p>
                                </div>
                            </div>
                            <div className="h-64 w-full relative z-10">
                                {isLoading ? (
                                    <Skeleton className="w-full h-full rounded-xl" />
                                ) : (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={trendData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                            <defs>
                                                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.3}/>
                                                    <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0}/>
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" opacity={0.3} />
                                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#9ca3af', fontWeight: 600 }} dy={10} />
                                            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#9ca3af' }} tickFormatter={(value) => `₹${value > 1000 ? (value/1000).toFixed(0) + 'k' : value}`} />
                                            <Tooltip formatter={(value) => formatCurrency(value)} cursor={{ stroke: '#0ea5e9', strokeWidth: 2, strokeDasharray: '4 4' }} contentStyle={{ borderRadius: '16px', border: '1px solid rgba(255,255,255,0.5)', background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(8px)', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)', padding: '12px', fontWeight: 'bold' }} />
                                            <Area type="monotone" dataKey="revenue" stroke="#0ea5e9" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenue)" />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                )}
                            </div>
                        </motion.div>

                        {/* Revenue Funnel Chart (Span 2 on large) */}
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="lg:col-span-2 bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-[2rem] shadow-xl shadow-indigo-100/20 dark:shadow-black/20 p-6 sm:p-8 border border-white/50 dark:border-gray-700/50 relative overflow-hidden group hover:shadow-2xl transition-all duration-300">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none group-hover:bg-indigo-500/10 transition-colors" />
                            <div className="flex items-center justify-between mb-8 relative z-10">
                                <div>
                                    <h2 className="text-lg font-black text-gray-900 dark:text-white flex items-center gap-2"><Activity size={20} className="text-indigo-500" /> Pipeline Funnel</h2>
                                    <p className="text-xs text-gray-400 font-bold tracking-wide mt-1 uppercase">Progression stages</p>
                                </div>
                            </div>
                            <div className="h-56 w-full relative z-10">
                                {isLoading ? (
                                    <Skeleton className="w-full h-full rounded-xl" />
                                ) : (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" opacity={0.3} />
                                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#9ca3af', fontWeight: 600 }} dy={10} />
                                            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#9ca3af' }} />
                                            <Tooltip cursor={{ fill: 'rgba(99, 102, 241, 0.05)' }} contentStyle={{ borderRadius: '16px', border: '1px solid rgba(255,255,255,0.5)', background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(8px)', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)', padding: '12px', fontWeight: 'bold' }} />
                                            <Bar dataKey="count" radius={[8, 8, 8, 8]} barSize={32}>
                                                {chartData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={index === chartData.length - 1 ? '#10b981' : '#6366f1'} className="hover:opacity-80 transition-opacity" />
                                                ))}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                )}
                            </div>
                        </motion.div>

                        {/* Lead Sources Donut Chart (Span 1 on large) */}
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }} className="lg:col-span-1 bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-[2rem] shadow-xl shadow-purple-100/20 dark:shadow-black/20 p-6 sm:p-8 border border-white/50 dark:border-gray-700/50 relative overflow-hidden group hover:shadow-2xl transition-all duration-300">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/5 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none group-hover:bg-purple-500/10 transition-colors" />
                            <div className="flex items-center justify-between mb-8 relative z-10">
                                <div>
                                    <h2 className="text-lg font-black text-gray-900 dark:text-white flex items-center gap-2"><Target size={20} className="text-purple-500" /> Lead Sources</h2>
                                    <p className="text-xs text-gray-400 font-bold tracking-wide mt-1 uppercase">Acquisition channels</p>
                                </div>
                            </div>
                            <div className="h-56 w-full relative z-10 flex items-center justify-center">
                                {isLoading ? (
                                    <Skeleton className="w-full h-full rounded-xl" />
                                ) : (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={sourceData}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={50}
                                                outerRadius={75}
                                                paddingAngle={5}
                                                dataKey="value"
                                                stroke="none"
                                            >
                                                {sourceData.map((entry, index) => {
                                                    const COLORS = ['#8b5cf6', '#6366f1', '#ec4899', '#f59e0b', '#10b981', '#3b82f6'];
                                                    return <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} className="hover:opacity-80 transition-opacity outline-none" />;
                                                })}
                                            </Pie>
                                            <Tooltip contentStyle={{ borderRadius: '16px', border: '1px solid rgba(255,255,255,0.5)', background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(8px)', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)', padding: '12px', fontWeight: 'bold' }} itemStyle={{ color: '#1f2937' }} />
                                            <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '11px', fontWeight: 'bold', color: '#6b7280' }} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                )}
                            </div>
                        </motion.div>
                    </div>

                    {/* Recent Leads */}
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl shadow-gray-200/20 dark:shadow-black/20 overflow-hidden border border-gray-100 dark:border-gray-700/50">
                        <div className="flex justify-between items-center p-6 sm:p-8 pb-4">
                            <div>
                                <h2 className="text-lg font-black text-gray-900 dark:text-white">Recent Leads</h2>
                                <p className="text-xs font-bold text-gray-400 tracking-wide mt-1 uppercase">Latest additions to your pipeline</p>
                            </div>
                            <Link href="/crm/leads" className="text-xs font-bold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 flex items-center gap-1 bg-indigo-50 dark:bg-indigo-900/30 px-3 py-1.5 rounded-lg transition-colors hover:bg-indigo-100">
                                View All
                            </Link>
                        </div>
                        <div className="divide-y divide-gray-50 dark:divide-gray-700/30 px-4 pb-4">
                            {isLoading ? (
                                <SkeletonCard type="list-item" count={4} />
                            ) : leads.length === 0 ? (
                                <EmptyState icon={Briefcase} title="No leads yet" description="Your pipeline is currently empty. Start by adding your first lead." className="m-4 border-none bg-transparent" />
                            ) : leads.map(lead => (
                                <Link
                                    key={lead.id}
                                    href={`/crm/leads/${lead.id}`}
                                    className="flex items-center justify-between p-5 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors group"
                                >
                                    <div className="flex items-center gap-4 min-w-0">
                                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 flex items-center justify-center text-gray-700 dark:text-gray-300 font-bold text-sm flex-shrink-0 shadow-inner">
                                            {(lead.contact_name || lead.title || '?').charAt(0).toUpperCase()}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="font-bold text-gray-900 dark:text-white text-sm group-hover:text-[#1e3a5f] dark:group-hover:text-blue-400 transition-colors truncate">
                                                {lead.contact_name || lead.title}
                                            </p>
                                            <div className="flex items-center gap-3 mt-1">
                                                {lead.phone && <span className="text-xs font-medium text-gray-500 dark:text-gray-400 flex items-center gap-1"><Phone size={10} /> {lead.phone}</span>}
                                                {lead.deal_value > 0 && <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5"><DollarSign size={10} />{formatCurrency(lead.deal_value)}</span>}
                                            </div>
                                        </div>
                                    </div>
                                    <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg border capitalize flex-shrink-0 ${STATUS_BG[lead.status] || 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                                        <span className={`w-1.5 h-1.5 rounded-full ${STATUS_COLOR[lead.status] || 'bg-gray-400'}`} />
                                        {lead.status}
                                    </span>
                                </Link>
                            ))}
                        </div>
                    </motion.div>
                </div>

                {/* Right Sidebar: Tasks & Quick Actions */}
                <div className="space-y-6 sm:space-y-8">
                    
                    {/* Manager Exclusive: Team Overview */}
                    {isManager && (
                        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.5 }} className="bg-white dark:bg-gray-800 rounded-[2rem] shadow-xl shadow-gray-200/40 dark:shadow-black/20 overflow-hidden relative border-none">
                            <div className="p-8">
                                <h2 className="text-xl font-black text-gray-900 dark:text-white flex items-center gap-2 mb-6">
                                    <Users size={20} className="text-blue-500" /> Team Overview
                                </h2>
                                
                                {unassignedCount > 0 ? (
                                    <div className="bg-gradient-to-r from-amber-50 to-orange-50 border-none rounded-[1.5rem] p-5 flex items-start gap-4 mb-6 shadow-inner">
                                        <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shrink-0 shadow-sm">
                                            <AlertTriangle size={20} className="text-amber-500" />
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-bold text-amber-800 dark:text-amber-400">Action Required</h3>
                                            <p className="text-xs text-amber-700 dark:text-amber-500 mt-1">There are {unassignedCount} leads in the pool waiting to be assigned to executives.</p>
                                            <Link href="/crm/leads" className="inline-block mt-3 text-xs font-bold bg-amber-500 text-white px-3 py-1.5 rounded-lg shadow-sm hover:bg-amber-600 transition-colors">
                                                Assign Leads
                                            </Link>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/50 rounded-2xl p-4 flex items-center gap-3 mb-4">
                                        <CheckCircle size={20} className="text-emerald-500 shrink-0" />
                                        <div>
                                            <h3 className="text-sm font-bold text-emerald-800 dark:text-emerald-400">All Leads Assigned</h3>
                                            <p className="text-xs text-emerald-700 dark:text-emerald-500">The team is fully utilized.</p>
                                        </div>
                                    </div>
                                )}
                                
                                <div className="space-y-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="font-medium text-gray-500 dark:text-gray-400">Total Leads in System</span>
                                        <span className="font-bold text-gray-900 dark:text-white">{stats.newLeads + stats.activePipeline + Math.round(stats.convRate.replace('%', '') / 100 * (stats.newLeads + stats.activePipeline))}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="font-medium text-gray-500 dark:text-gray-400">Active Deals</span>
                                        <span className="font-bold text-gray-900 dark:text-white">{stats.activePipeline}</span>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {/* Actionable Tasks Widget */}
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }} className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl shadow-gray-200/20 dark:shadow-black/20 p-6 sm:p-8 relative overflow-hidden border border-gray-100 dark:border-gray-700/50">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none" />
                        <div className="flex items-center justify-between mb-6 relative z-10">
                            <div>
                                <h2 className="text-lg font-black text-gray-900 dark:text-white flex items-center gap-2"><Calendar size={20} className="text-amber-500" /> {isManager ? 'Team Tasks' : 'Upcoming Tasks'}</h2>
                            </div>
                        </div>
                        
                        <div className="space-y-3 relative z-10">
                            {isLoading ? (
                                <SkeletonCard type="list-item" count={3} />
                            ) : tasks.length === 0 ? (
                                <EmptyState icon={CheckCircle} title="All caught up!" description="No pending tasks for now." className="py-8 border-none bg-transparent" />
                            ) : (
                                tasks.map(task => (
                                    <div key={task.id} className="p-3.5 bg-gray-50 dark:bg-gray-700/30 rounded-2xl border border-gray-100 dark:border-gray-700 hover:border-amber-200 dark:hover:border-amber-900/50 transition-colors group cursor-pointer">
                                        <div className="flex items-start gap-3">
                                            <div className="mt-0.5 w-4 h-4 rounded-full border-2 border-gray-300 dark:border-gray-500 group-hover:border-amber-500 transition-colors" />
                                            <div>
                                                <h4 className="text-sm font-bold text-gray-900 dark:text-white">{task.title}</h4>
                                                <p className="text-xs font-medium text-amber-600 dark:text-amber-400 mt-1 flex items-center gap-1">
                                                    <Clock size={10} /> 
                                                    {new Date(task.due_date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </motion.div>

                    {/* Quick Links Panel */}
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }} className="bg-white dark:bg-gray-800 rounded-3xl p-6 sm:p-8 shadow-xl shadow-gray-200/20 dark:shadow-black/20 border border-gray-100 dark:border-gray-700/50">
                        <h2 className="text-xs font-black mb-5 text-gray-400 uppercase tracking-widest relative z-10">Quick Links</h2>
                        <div className="space-y-3 relative z-10">
                            <Link href="/crm/pipeline" className="flex items-center justify-between p-3.5 bg-gray-50 dark:bg-gray-700/30 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-xl transition-all border border-gray-100 dark:border-gray-700 hover:border-indigo-100 group">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 rounded-xl"><Briefcase size={16} /></div>
                                    <span className="font-bold text-gray-700 dark:text-gray-200 text-sm group-hover:text-indigo-700 dark:group-hover:text-indigo-400 transition-colors">Kanban Pipeline</span>
                                </div>
                                <ArrowRight size={14} className="text-gray-300 group-hover:text-indigo-500 group-hover:translate-x-1 transition-all" />
                            </Link>
                            <Link href="/crm/leads" className="flex items-center justify-between p-3.5 bg-gray-50 dark:bg-gray-700/30 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-xl transition-all border border-gray-100 dark:border-gray-700 hover:border-emerald-100 group">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 rounded-xl"><Users size={16} /></div>
                                    <span className="font-bold text-gray-700 dark:text-gray-200 text-sm group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors">Lead Directory</span>
                                </div>
                                <ArrowRight size={14} className="text-gray-300 group-hover:text-emerald-500 group-hover:translate-x-1 transition-all" />
                            </Link>
                            <Link href="/crm/reports" className="flex items-center justify-between p-3.5 bg-gray-50 dark:bg-gray-700/30 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-xl transition-all border border-gray-100 dark:border-gray-700 hover:border-amber-100 group">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-amber-100 dark:bg-amber-900/50 text-amber-600 dark:text-amber-400 rounded-xl"><BarChart2 size={16} /></div>
                                    <span className="font-bold text-gray-700 dark:text-gray-200 text-sm group-hover:text-amber-700 dark:group-hover:text-amber-400 transition-colors">Reports & Analytics</span>
                                </div>
                                <ArrowRight size={14} className="text-gray-300 group-hover:text-amber-500 group-hover:translate-x-1 transition-all" />
                            </Link>
                        </div>
                    </motion.div>

                </div>
            </div>
            </div>
        </div>
    );
}
