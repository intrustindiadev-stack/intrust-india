'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { motion } from 'framer-motion';
import { Users, Briefcase, TrendingUp, Clock, ArrowRight, Plus, Phone, Mail, Zap, Target, CheckCircle, Calendar, DollarSign, Activity } from 'lucide-react';
import Link from 'next/link';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts';

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
            className={`relative overflow-hidden rounded-3xl p-6 text-white bg-gradient-to-br ${gradient} shadow-lg shadow-${gradient.split('-')[1]}-500/20`}
        >
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
            <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-black/10 rounded-full blur-2xl" />
            <div className="relative z-10 flex justify-between items-start">
                <div>
                    <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center mb-4 border border-white/20">
                        <Icon size={20} className="text-white drop-shadow-md" />
                    </div>
                    <p className="text-white/80 text-xs font-bold uppercase tracking-widest">{label}</p>
                    <p className="text-3xl font-black mt-1 tracking-tight drop-shadow-md">{value}</p>
                </div>
                {trend && (
                    <div className="flex flex-col items-end">
                        <span className="flex items-center gap-1 text-sm font-bold bg-white/20 backdrop-blur-md px-2 py-1 rounded-lg border border-white/20">
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

    const fetchData = async () => {
        try {
            const [recentRes, allRes, tasksRes] = await Promise.all([
                supabase.from('crm_leads').select('id, title, contact_name, phone, email, status, source, created_at, deal_value, temperature').order('created_at', { ascending: false }).limit(5),
                supabase.from('crm_leads').select('status, created_at, deal_value'),
                supabase.from('crm_tasks').select('*').eq('status', 'pending').order('due_date', { ascending: true }).limit(4)
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
        const ch1 = supabase.channel('crm_dash_leads')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'crm_leads' }, fetchData)
            .subscribe();
        const ch2 = supabase.channel('crm_dash_tasks')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'crm_tasks' }, fetchData)
            .subscribe();
        return () => {
            supabase.removeChannel(ch1);
            supabase.removeChannel(ch2);
        };
    }, []);

    const formatCurrency = (val) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);

    return (
        <div className="p-4 sm:p-6 lg:p-8 space-y-8 min-h-screen font-[family-name:var(--font-outfit)] bg-gray-50/50 dark:bg-gray-900/50 transition-colors">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 dark:text-white tracking-tight">Sales Command Center</h1>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mt-1">Real-time pipeline visibility and revenue forecasting.</p>
                </div>
                <Link
                    href="/crm/leads"
                    className="inline-flex items-center gap-2 bg-gray-900 dark:bg-white dark:text-gray-900 hover:bg-gray-800 dark:hover:bg-gray-100 text-white px-5 py-2.5 rounded-xl font-bold transition-all shadow-lg text-sm"
                >
                    <Plus size={16} /> New Lead
                </Link>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                <StatCard label="Pipeline Value" value={isLoading ? '…' : formatCurrency(stats.expectedRevenue)} icon={DollarSign} gradient="from-slate-800 to-slate-900" delay={0} trend="+12%" />
                <StatCard label="Active Pipeline" value={isLoading ? '…' : stats.activePipeline} icon={Target} gradient="from-indigo-600 to-violet-600" delay={0.1} />
                <StatCard label="Conversion" value={isLoading ? '…' : stats.convRate} icon={TrendingUp} gradient="from-emerald-500 to-teal-600" delay={0.2} trend="+2%" />
                <StatCard label="Follow-ups" value={isLoading ? '…' : stats.followUps} icon={Clock} gradient="from-amber-500 to-orange-500" delay={0.3} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
                {/* Main Content Area: Charts & Leads */}
                <div className="lg:col-span-2 space-y-6 sm:space-y-8">
                    
                    {/* Revenue Funnel Chart */}
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm p-5 sm:p-6">
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2"><Activity size={18} className="text-indigo-500" /> Pipeline Funnel</h2>
                                <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Lead progression across stages</p>
                            </div>
                        </div>
                        <div className="h-64 w-full">
                            {isLoading ? (
                                <div className="w-full h-full flex items-center justify-center"><div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" /></div>
                            ) : (
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" opacity={0.5} />
                                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280', fontWeight: 600 }} dy={10} />
                                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280' }} />
                                        <Tooltip cursor={{ fill: 'rgba(99, 102, 241, 0.05)' }} contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', padding: '12px', fontWeight: 'bold' }} />
                                        <Bar dataKey="count" radius={[6, 6, 6, 6]} barSize={40}>
                                            {chartData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={index === chartData.length - 1 ? '#10b981' : '#6366f1'} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            )}
                        </div>
                    </motion.div>

                    {/* Recent Leads */}
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
                        <div className="flex justify-between items-center p-6 border-b border-gray-100 dark:border-gray-700">
                            <div>
                                <h2 className="text-lg font-bold text-gray-900 dark:text-white">Recent Leads</h2>
                                <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Latest additions to your pipeline</p>
                            </div>
                            <Link href="/crm/leads" className="text-sm font-bold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 flex items-center gap-1 bg-indigo-50 dark:bg-indigo-900/30 px-3 py-1.5 rounded-lg transition-colors">
                                View All
                            </Link>
                        </div>
                        <div className="divide-y divide-gray-50 dark:divide-gray-700/50">
                            {isLoading ? (
                                [...Array(4)].map((_, i) => <div key={i} className="p-4 h-16 animate-pulse bg-gray-50/50 dark:bg-gray-800" />)
                            ) : leads.length === 0 ? (
                                <div className="p-12 text-center text-gray-400 text-sm">
                                    <Briefcase size={32} className="mx-auto mb-3 opacity-30" />
                                    No leads yet. Start by adding one!
                                </div>
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
                                            <p className="font-bold text-gray-900 dark:text-white text-sm group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors truncate">
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
                    
                    {/* Actionable Tasks Widget */}
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }} className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm p-6 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-2xl -mr-10 -mt-10" />
                        <div className="flex items-center justify-between mb-5 relative z-10">
                            <div>
                                <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2"><Calendar size={18} className="text-amber-500" /> Upcoming Tasks</h2>
                            </div>
                        </div>
                        
                        <div className="space-y-3 relative z-10">
                            {isLoading ? (
                                [...Array(3)].map((_, i) => <div key={i} className="h-16 animate-pulse bg-gray-50 dark:bg-gray-700/50 rounded-xl" />)
                            ) : tasks.length === 0 ? (
                                <div className="text-center py-6 bg-gray-50 dark:bg-gray-900/50 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700">
                                    <CheckCircle size={24} className="mx-auto text-gray-300 dark:text-gray-600 mb-2" />
                                    <p className="text-sm font-bold text-gray-500 dark:text-gray-400">All caught up!</p>
                                </div>
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

                    {/* Quick Navigation Panel */}
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }} className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden">
                        <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-indigo-500/20 rounded-full blur-3xl" />
                        <h2 className="text-xs font-black mb-5 opacity-50 uppercase tracking-widest relative z-10">Navigation</h2>
                        <div className="space-y-3 relative z-10">
                            <Link href="/crm/pipeline" className="flex items-center justify-between p-4 bg-white/5 hover:bg-white/10 rounded-2xl transition-all border border-white/5 hover:border-white/20 group backdrop-blur-sm">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-indigo-500/20 text-indigo-300 rounded-xl"><Briefcase size={16} /></div>
                                    <span className="font-bold text-sm tracking-wide">Kanban Pipeline</span>
                                </div>
                                <ArrowRight size={16} className="opacity-40 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                            </Link>
                            <Link href="/crm/leads" className="flex items-center justify-between p-4 bg-white/5 hover:bg-white/10 rounded-2xl transition-all border border-white/5 hover:border-white/20 group backdrop-blur-sm">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-emerald-500/20 text-emerald-300 rounded-xl"><Users size={16} /></div>
                                    <span className="font-bold text-sm tracking-wide">Lead Directory</span>
                                </div>
                                <ArrowRight size={16} className="opacity-40 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                            </Link>
                        </div>
                    </motion.div>

                </div>
            </div>
        </div>
    );
}
