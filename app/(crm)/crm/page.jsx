'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { motion } from 'framer-motion';
import { Users, Briefcase, TrendingUp, Clock, ArrowRight, Plus, Phone, Target, CheckCircle, Calendar, DollarSign, Activity, FileText, AlertTriangle, HelpCircle, BarChart2 } from 'lucide-react';
import Skeleton from '@/components/ui/Skeleton';
import SkeletonCard from '@/components/shared/SkeletonCard';
import EmptyState from '@/components/ui/EmptyState';
import Link from 'next/link';
import { BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

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

// Premium Animated Stat Card
function StatCard({ label, value, icon: Icon, gradient, delay = 0, trend }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay }}
            className={`relative overflow-hidden rounded-[2rem] p-6 text-white bg-gradient-to-br ${gradient} shadow-2xl shadow-${gradient.split('-')[1]}-500/20 hover:-translate-y-1 transition-all duration-300`}
        >
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
            <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-black/10 rounded-full blur-2xl" />
            <div className="relative z-10 flex justify-between items-start">
                <div>
                    <div className="w-12 h-12 rounded-[1rem] bg-white/20 backdrop-blur-md flex items-center justify-center mb-4 border border-white/20 shadow-inner">
                        <Icon size={24} className="text-white drop-shadow-md" />
                    </div>
                    <p className="text-white/80 text-xs font-bold uppercase tracking-widest">{label}</p>
                    <p className="text-4xl font-black mt-1 tracking-tight drop-shadow-md">{value}</p>
                </div>
                {trend && (
                    <div className="flex flex-col items-end">
                        <span className="flex items-center gap-1 text-sm font-bold bg-white/20 backdrop-blur-md px-2.5 py-1.5 rounded-xl border border-white/20 shadow-sm">
                            <TrendingUp size={14} /> {trend}
                        </span>
                    </div>
                )}
            </div>
        </motion.div>
    );
}

export default function CRMDashboard() {
    const [leads, setLeads] = useState([]);
    const [tasks, setTasks] = useState([]);
    const [stats, setStats] = useState({ newLeads: 0, activePipeline: 0, convRate: '0%', followUps: 0, expectedRevenue: 0 });
    const [chartData, setChartData] = useState([]);
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

            let recentQuery = supabase.from('crm_leads').select('id, title, contact_name, phone, email, status, source, created_at, deal_value, temperature').is('archived_at', null).neq('source', 'App User').order('created_at', { ascending: false }).limit(5);
            let allQuery = supabase.from('crm_leads').select('status, created_at, deal_value, assigned_to').is('archived_at', null).neq('source', 'App User');
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
            {/* Background elements */}
            <div className="absolute top-0 inset-x-0 h-96 bg-gradient-to-b from-slate-50/80 dark:from-slate-900/20 to-transparent pointer-events-none" />
            <div className="absolute top-20 right-0 w-96 h-96 bg-blue-200/30 dark:bg-blue-900/20 rounded-full blur-[100px] pointer-events-none" />
            <div className="absolute top-40 left-0 w-96 h-96 bg-slate-200/40 dark:bg-slate-900/20 rounded-full blur-[100px] pointer-events-none" />

            <div className="relative z-10 space-y-8 max-w-7xl mx-auto">
                {/* First Time Welcome Celebration Modal */}
                <WelcomeRoleCelebrationModal />

                {/* Header Graphic Banner — Navy Blue Theme */}
                <motion.div 
                    initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} 
                    className="relative w-full rounded-[2.5rem] bg-gradient-to-r from-[#1e3a5f] via-[#1e4080] to-[#0f2447] p-8 sm:p-12 overflow-hidden shadow-2xl shadow-[#1e3a5f]/40 text-white flex flex-col md:flex-row justify-between items-center gap-8"
                >
                    {/* Abstract Graphic Elements */}
                    <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
                    <div className="absolute bottom-0 left-1/2 w-64 h-64 bg-blue-600/20 rounded-full blur-3xl transform -translate-x-1/2 pointer-events-none" />
                    <div className="absolute inset-0 bg-[linear-gradient(60deg,transparent_30%,rgba(255,255,255,0.03)_50%,transparent_70%)] pointer-events-none" />
                    
                    <div className="absolute right-0 bottom-0 h-full w-1/2 pointer-events-none hidden lg:block">
                        <Image 
                            src="/images/crm_banner_illustration.png"
                            alt="CRM Dashboard Illustration"
                            fill
                            className="object-contain object-right-bottom scale-110 origin-bottom-right drop-shadow-2xl translate-y-4 mix-blend-screen opacity-90"
                            priority
                        />
                    </div>

                    <div className="relative z-10 flex flex-col gap-4 max-w-2xl">
                        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 backdrop-blur-md text-white text-xs font-black uppercase tracking-widest w-fit border border-white/20 shadow-lg">
                            <Target size={14} /> CRM Workspace
                        </div>
                        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight drop-shadow-sm">
                            Welcome back,<br className="hidden sm:block"/>
                            <span className="text-blue-200">{isManager ? 'Sales Leader' : 'Champion'}!</span>
                        </h1>
                        <p className="text-sm font-medium text-blue-100/80 mt-2 max-w-xl leading-relaxed">
                            {isManager 
                                ? 'Real-time command center. Track team pipeline, analytics, and revenue forecasting.' 
                                : "Active leads are waiting. Let's close some deals today."}
                        </p>
                        <div className="mt-4">
                            <Link
                                href="/crm/leads"
                                className="inline-flex items-center gap-2 bg-white text-[#1e3a5f] hover:bg-blue-50 px-7 py-3.5 rounded-xl font-black transition-all shadow-lg shadow-black/10 text-sm hover:-translate-y-0.5"
                            >
                                <Plus size={16} strokeWidth={3} /> Add New Lead
                            </Link>
                        </div>
                    </div>
                </motion.div>

                {/* ⚡ Quick Action Buttons */}
                <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-sm font-black text-gray-500 uppercase tracking-widest">Quick Actions</h2>
                    </div>
                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                        {QUICK_ACTIONS.map((action, i) => {
                            const Icon = action.icon;
                            return (
                                <Link
                                    key={action.href}
                                    href={action.href}
                                    className="group flex flex-col items-center gap-2.5 p-4 bg-white rounded-2xl border border-gray-100 hover:border-gray-200 shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 text-center"
                                >
                                    <div className={`w-11 h-11 rounded-xl ${action.color} flex items-center justify-center shadow-lg ${action.shadow} group-hover:scale-110 transition-transform duration-200`}>
                                        <Icon size={20} className={action.iconColor} />
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

            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                {isLoading ? (
                    [...Array(4)].map((_, i) => <SkeletonCard key={i} type="stat" />)
                ) : (
                    <>
                        <StatCard label={isManager ? "Team Pipeline Value" : "My Pipeline Value"} value={formatCurrency(stats.expectedRevenue)} icon={DollarSign} gradient="from-[#1e3a5f] to-[#0f2447]" delay={0} trend="+12%" />
                        <StatCard label="Active Pipeline" value={stats.activePipeline} icon={Target} gradient="from-blue-600 to-blue-700" delay={0.1} />
                        <StatCard label="Conversion" value={stats.convRate} icon={TrendingUp} gradient="from-emerald-500 to-teal-600" delay={0.2} trend="+2%" />
                        <StatCard label="Follow-ups" value={stats.followUps} icon={Clock} gradient="from-amber-500 to-orange-500" delay={0.3} />
                    </>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
                {/* Main Content Area: Charts & Leads */}
                <div className="lg:col-span-2 space-y-6 sm:space-y-8">
                    
                    {/* Revenue Funnel Chart */}
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="bg-white dark:bg-gray-800 rounded-[2rem] shadow-xl shadow-gray-200/40 dark:shadow-black/20 p-6 sm:p-8 border-none">
                        <div className="flex items-center justify-between mb-8">
                            <div>
                                <h2 className="text-xl font-black text-gray-900 dark:text-white flex items-center gap-2"><Activity size={20} className="text-[#1e3a5f]" /> Pipeline Funnel</h2>
                                <p className="text-xs text-gray-400 font-bold tracking-wide mt-1 uppercase">Lead progression across stages</p>
                            </div>
                        </div>
                        <div className="h-64 w-full">
                            {isLoading ? (
                                <Skeleton className="w-full h-full" />
                            ) : (
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" opacity={0.5} />
                                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280', fontWeight: 600 }} dy={10} />
                                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280' }} />
                                        <Tooltip cursor={{ fill: 'rgba(30, 58, 95, 0.04)' }} contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', padding: '12px', fontWeight: 'bold' }} />
                                        <Bar dataKey="count" radius={[6, 6, 6, 6]} barSize={40}>
                                            {chartData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={index === chartData.length - 1 ? '#10b981' : '#1e3a5f'} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            )}
                        </div>
                    </motion.div>

                    {/* Recent Leads */}
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="bg-white dark:bg-gray-800 rounded-[2rem] shadow-xl shadow-gray-200/40 dark:shadow-black/20 overflow-hidden border-none">
                        <div className="flex justify-between items-center p-8 pb-4">
                            <div>
                                <h2 className="text-xl font-black text-gray-900 dark:text-white">Recent Leads</h2>
                                <p className="text-xs font-bold text-gray-400 tracking-wide mt-1 uppercase">Latest additions to your pipeline</p>
                            </div>
                            <Link href="/crm/leads" className="text-sm font-bold text-[#1e3a5f] hover:text-blue-700 dark:text-blue-400 flex items-center gap-1 bg-blue-50 dark:bg-blue-900/30 px-4 py-2 rounded-xl transition-colors hover:bg-blue-100">
                                View All
                            </Link>
                        </div>
                        <div className="divide-y divide-gray-50/50 dark:divide-gray-700/30 px-4 pb-4">
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
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }} className="bg-white dark:bg-gray-800 rounded-[2rem] shadow-xl shadow-gray-200/40 dark:shadow-black/20 p-8 relative overflow-hidden border-none">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none" />
                        <div className="flex items-center justify-between mb-6 relative z-10">
                            <div>
                                <h2 className="text-xl font-black text-gray-900 dark:text-white flex items-center gap-2"><Calendar size={20} className="text-amber-500" /> {isManager ? 'Team Tasks' : 'Upcoming Tasks'}</h2>
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
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }} className="bg-gradient-to-br from-[#1e3a5f] via-[#1e4080] to-[#0f2447] rounded-3xl p-6 text-white shadow-xl relative overflow-hidden">
                        <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-blue-500/20 rounded-full blur-3xl" />
                        <h2 className="text-xs font-black mb-5 opacity-50 uppercase tracking-widest relative z-10">Quick Links</h2>
                        <div className="space-y-2.5 relative z-10">
                            <Link href="/crm/pipeline" className="flex items-center justify-between p-3.5 bg-white/5 hover:bg-white/10 rounded-xl transition-all border border-white/5 hover:border-white/20 group">
                                <div className="flex items-center gap-3">
                                    <div className="p-1.5 bg-blue-400/20 text-blue-300 rounded-lg"><Briefcase size={15} /></div>
                                    <span className="font-semibold text-sm">Kanban Pipeline</span>
                                </div>
                                <ArrowRight size={14} className="opacity-40 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                            </Link>
                            <Link href="/crm/leads" className="flex items-center justify-between p-3.5 bg-white/5 hover:bg-white/10 rounded-xl transition-all border border-white/5 hover:border-white/20 group">
                                <div className="flex items-center gap-3">
                                    <div className="p-1.5 bg-emerald-400/20 text-emerald-300 rounded-lg"><Users size={15} /></div>
                                    <span className="font-semibold text-sm">Lead Directory</span>
                                </div>
                                <ArrowRight size={14} className="opacity-40 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                            </Link>
                            <Link href="/crm/reports" className="flex items-center justify-between p-3.5 bg-white/5 hover:bg-white/10 rounded-xl transition-all border border-white/5 hover:border-white/20 group">
                                <div className="flex items-center gap-3">
                                    <div className="p-1.5 bg-amber-400/20 text-amber-300 rounded-lg"><BarChart2 size={15} /></div>
                                    <span className="font-semibold text-sm">Reports</span>
                                </div>
                                <ArrowRight size={14} className="opacity-40 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                            </Link>
                        </div>
                    </motion.div>

                </div>
            </div>
            </div>
        </div>
    );
}
