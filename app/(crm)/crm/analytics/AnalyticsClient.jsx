'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { createClient } from '@/lib/supabaseClient';
import { Loader2, AlertCircle, TrendingUp, Users, Target, CalendarDays, BarChart3, Filter } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';

export default function AnalyticsClient({ currentUserId, currentUserRole }) {
    const [leads, setLeads] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [timeRange, setTimeRange] = useState('30d'); // '7d', '30d', 'all'

    const isManager = ['relationship_manager', 'admin', 'super_admin'].includes(currentUserRole);

    const fetchAnalytics = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const supabase = createClient();
            
            let query = supabase
                .from('crm_leads')
                .select('id, status, deal_value, created_at, assigned_to, user_profiles(full_name, avatar_url)')
                .neq('source', 'App User');

            if (!isManager) {
                query = query.eq('assigned_to', currentUserId);
            }

            if (timeRange !== 'all') {
                const date = new Date();
                if (timeRange === '7d') date.setDate(date.getDate() - 7);
                if (timeRange === '30d') date.setDate(date.getDate() - 30);
                query = query.gte('created_at', date.toISOString());
            }

            const { data, error: fetchError } = await query;
            if (fetchError) throw fetchError;
            
            setLeads(data || []);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [isManager, currentUserId, timeRange]);

    useEffect(() => {
        fetchAnalytics();
    }, [fetchAnalytics]);

    // Compute Metrics
    const metrics = useMemo(() => {
        const total = leads.length;
        const won = leads.filter(l => l.status === 'won').length;
        const active = leads.filter(l => !['won', 'lost'].includes(l.status)).length;
        const winRate = total ? ((won / total) * 100).toFixed(1) : 0;
        const revenue = leads.filter(l => l.status === 'won').reduce((sum, l) => sum + Number(l.deal_value || 0), 0);
        const activeValue = leads.filter(l => !['won', 'lost'].includes(l.status)).reduce((sum, l) => sum + Number(l.deal_value || 0), 0);

        return { total, won, active, winRate, revenue, activeValue };
    }, [leads]);

    // Compute Team Metrics for Managers
    const teamLeaderboard = useMemo(() => {
        if (!isManager) return [];
        const teamMap = {};
        leads.forEach(l => {
            const assigneeId = l.assigned_to || 'unassigned';
            const assigneeName = l.user_profiles?.full_name || 'Unassigned';
            const assigneeAvatar = l.user_profiles?.avatar_url;
            
            if (!teamMap[assigneeId]) {
                teamMap[assigneeId] = {
                    id: assigneeId,
                    name: assigneeName,
                    avatar: assigneeAvatar,
                    totalLeads: 0,
                    wonLeads: 0,
                    revenue: 0,
                    activePipeline: 0
                };
            }
            
            teamMap[assigneeId].totalLeads += 1;
            if (l.status === 'won') {
                teamMap[assigneeId].wonLeads += 1;
                teamMap[assigneeId].revenue += Number(l.deal_value || 0);
            } else if (l.status !== 'lost') {
                teamMap[assigneeId].activePipeline += Number(l.deal_value || 0);
            }
        });
        
        return Object.values(teamMap)
            .map(t => ({
                ...t,
                winRate: t.totalLeads > 0 ? ((t.wonLeads / t.totalLeads) * 100).toFixed(1) : 0
            }))
            .sort((a, b) => b.revenue - a.revenue || b.wonLeads - a.wonLeads);
    }, [leads, isManager]);

    // Chart Data Generation
    const chartData = useMemo(() => {
        const data = [];
        const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90; // Limit 'all' to 90 days for charting
        
        for (let i = days - 1; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const dateStr = d.toISOString().split('T')[0];
            
            const dayLeads = leads.filter(l => l.created_at.startsWith(dateStr));
            data.push({
                name: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                leads: dayLeads.length,
                won: dayLeads.filter(l => l.status === 'won').length
            });
        }
        return data;
    }, [leads, timeRange]);

    const formatCurrency = (val) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 font-[family-name:var(--font-outfit)] min-h-screen">
            
            {/* Header & Filters */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
                <div>
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-xs font-black uppercase tracking-widest mb-4">
                        <BarChart3 size={14} /> Performance
                    </div>
                    <h1 className="text-3xl sm:text-4xl font-black text-gray-900 dark:text-white tracking-tight">Analytics Command Center</h1>
                    <p className="text-gray-500 dark:text-gray-400 font-medium mt-2">
                        {isManager ? 'Analyze team performance, conversion rates, and revenue generation.' : 'Track your personal sales metrics and conversion goals.'}
                    </p>
                </div>

                <div className="flex items-center gap-2 bg-white/60 dark:bg-gray-800/60 p-1.5 rounded-2xl border border-gray-200 dark:border-gray-700 backdrop-blur-xl shadow-sm w-fit">
                    {[
                        { id: '7d', label: 'Last 7 Days' },
                        { id: '30d', label: 'Last 30 Days' },
                        { id: 'all', label: 'All Time' }
                    ].map(tr => (
                        <button
                            key={tr.id}
                            onClick={() => setTimeRange(tr.id)}
                            className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                                timeRange === tr.id
                                    ? 'bg-indigo-600 text-white shadow-md'
                                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700'
                            }`}
                        >
                            {tr.label}
                        </button>
                    ))}
                </div>
            </div>

            {loading ? (
                <div className="flex flex-col items-center justify-center py-32 gap-4">
                    <Loader2 size={40} className="animate-spin text-indigo-500" />
                    <p className="text-sm font-bold text-gray-400 uppercase tracking-widest animate-pulse">Syncing Metrics...</p>
                </div>
            ) : error ? (
                <div className="flex flex-col items-center justify-center py-20 gap-4 bg-red-50 dark:bg-red-900/10 rounded-[2rem] border border-red-100 dark:border-red-900/30">
                    <AlertCircle size={40} className="text-red-500" />
                    <p className="text-red-900 dark:text-red-400 font-bold">{error}</p>
                    <button onClick={fetchAnalytics} className="mt-2 px-6 py-2 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 font-bold rounded-xl hover:bg-red-200 transition-colors">Retry</button>
                </div>
            ) : (
                <div className="space-y-8">
                    {/* Key Metrics Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        
                        <motion.div initial={{opacity:0, y:20}} animate={{opacity:1, y:0}} transition={{delay: 0.0}} className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-[2rem] p-6 sm:p-8 shadow-xl shadow-indigo-500/20 text-white relative overflow-hidden group">
                            <div className="absolute -right-6 -top-6 opacity-20 group-hover:scale-110 transition-transform duration-500">
                                <TrendingUp size={120} />
                            </div>
                            <h3 className="text-indigo-100 text-[10px] font-black uppercase tracking-widest mb-3 flex items-center gap-2"><Target size={14}/> Total Revenue</h3>
                            <p className="text-3xl sm:text-4xl font-black relative z-10">{formatCurrency(metrics.revenue)}</p>
                            <p className="text-xs font-bold text-indigo-200 mt-2 relative z-10">From {metrics.won} won deals</p>
                        </motion.div>

                        <motion.div initial={{opacity:0, y:20}} animate={{opacity:1, y:0}} transition={{delay: 0.1}} className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-xl rounded-[2rem] p-6 sm:p-8 border border-gray-200/50 dark:border-gray-700/50 shadow-lg shadow-gray-200/20 dark:shadow-none relative overflow-hidden group hover:-translate-y-1 transition-transform">
                            <div className="absolute -right-6 -top-6 text-gray-100 dark:text-gray-800 group-hover:scale-110 transition-transform duration-500">
                                <CalendarDays size={120} />
                            </div>
                            <h3 className="text-gray-500 dark:text-gray-400 text-[10px] font-black uppercase tracking-widest mb-3 flex items-center gap-2"><Target size={14}/> Active Pipeline</h3>
                            <p className="text-3xl sm:text-4xl font-black text-gray-900 dark:text-white relative z-10">{formatCurrency(metrics.activeValue)}</p>
                            <p className="text-xs font-bold text-gray-400 mt-2 relative z-10">Across {metrics.active} active leads</p>
                        </motion.div>

                        <motion.div initial={{opacity:0, y:20}} animate={{opacity:1, y:0}} transition={{delay: 0.2}} className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-xl rounded-[2rem] p-6 sm:p-8 border border-gray-200/50 dark:border-gray-700/50 shadow-lg shadow-gray-200/20 dark:shadow-none relative overflow-hidden group hover:-translate-y-1 transition-transform">
                            <h3 className="text-gray-500 dark:text-gray-400 text-[10px] font-black uppercase tracking-widest mb-3 flex items-center gap-2"><Users size={14}/> Win Rate</h3>
                            <div className="flex items-end gap-3 relative z-10">
                                <p className="text-3xl sm:text-4xl font-black text-indigo-600 dark:text-indigo-400">{metrics.winRate}%</p>
                            </div>
                            
                            <div className="mt-4 w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2 overflow-hidden relative z-10">
                                <motion.div 
                                    initial={{ width: 0 }}
                                    animate={{ width: `${Math.min(metrics.winRate, 100)}%` }}
                                    transition={{ duration: 1, delay: 0.5 }}
                                    className="h-full bg-indigo-500 rounded-full"
                                />
                            </div>
                        </motion.div>

                        <motion.div initial={{opacity:0, y:20}} animate={{opacity:1, y:0}} transition={{delay: 0.3}} className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-xl rounded-[2rem] p-6 sm:p-8 border border-gray-200/50 dark:border-gray-700/50 shadow-lg shadow-gray-200/20 dark:shadow-none relative overflow-hidden group hover:-translate-y-1 transition-transform">
                            <h3 className="text-gray-500 dark:text-gray-400 text-[10px] font-black uppercase tracking-widest mb-3 flex items-center gap-2"><Users size={14}/> Total Leads</h3>
                            <p className="text-3xl sm:text-4xl font-black text-gray-900 dark:text-white relative z-10">{metrics.total}</p>
                            <p className="text-xs font-bold text-gray-400 mt-2 relative z-10">For selected period</p>
                        </motion.div>

                    </div>

                    {/* Charts & Visualizations */}
                    <motion.div initial={{opacity:0, y:20}} animate={{opacity:1, y:0}} transition={{delay: 0.4}} className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-xl rounded-[2.5rem] p-6 sm:p-8 border border-gray-200/50 dark:border-gray-700/50 shadow-2xl shadow-gray-200/20 dark:shadow-none">
                        <div className="flex items-center justify-between mb-8">
                            <h2 className="text-xl font-black text-gray-900 dark:text-white tracking-tight">Lead Volume Trends</h2>
                        </div>
                        <div className="h-[350px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="colorLeads" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#818cf8" stopOpacity={0.4}/>
                                            <stop offset="95%" stopColor="#818cf8" stopOpacity={0}/>
                                        </linearGradient>
                                        <linearGradient id="colorWon" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#34d399" stopOpacity={0.4}/>
                                            <stop offset="95%" stopColor="#34d399" stopOpacity={0}/>
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#e2e8f0" strokeOpacity={0.5} />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94a3b8', fontWeight: 'bold' }} dy={10} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94a3b8', fontWeight: 'bold' }} />
                                    <Tooltip 
                                        contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.9)', backdropFilter: 'blur(8px)', borderRadius: '1rem', border: '1px solid #e2e8f0', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                        itemStyle={{ fontWeight: 'bold' }}
                                    />
                                    <Area type="monotone" dataKey="leads" name="Total Leads" stroke="#6366f1" strokeWidth={4} fillOpacity={1} fill="url(#colorLeads)" />
                                    <Area type="monotone" dataKey="won" name="Won Deals" stroke="#10b981" strokeWidth={4} fillOpacity={1} fill="url(#colorWon)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </motion.div>

                    {/* Team Leaderboard (Managers Only) */}
                    {isManager && (
                        <motion.div initial={{opacity:0, y:20}} animate={{opacity:1, y:0}} transition={{delay: 0.5}} className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-xl rounded-[2.5rem] p-6 sm:p-8 border border-gray-200/50 dark:border-gray-700/50 shadow-2xl shadow-gray-200/20 dark:shadow-none">
                            <h2 className="text-xl font-black text-gray-900 dark:text-white tracking-tight mb-8">Team Leaderboard</h2>
                            
                            {teamLeaderboard.length === 0 ? (
                                <div className="text-center py-12">
                                    <p className="text-gray-500 font-bold">No performance data for this period.</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {teamLeaderboard.map((member, index) => (
                                        <div key={member.id} className="bg-white dark:bg-gray-900 p-6 rounded-[1.5rem] border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-lg transition-shadow relative overflow-hidden group">
                                            {/* Rank Badge */}
                                            {index < 3 && (
                                                <div className={`absolute top-0 right-0 w-16 h-16 -mr-8 -mt-8 rounded-full blur-xl opacity-50 ${index === 0 ? 'bg-amber-400' : index === 1 ? 'bg-slate-400' : 'bg-amber-600'}`} />
                                            )}
                                            
                                            <div className="flex items-center gap-4 mb-6 relative z-10">
                                                <div className="relative">
                                                    <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-gray-800 flex items-center justify-center text-indigo-600 font-black text-xl overflow-hidden border-2 border-white dark:border-gray-700 shadow-sm">
                                                        {member.avatar ? (
                                                            <img src={member.avatar} alt={member.name} className="w-full h-full object-cover" />
                                                        ) : (
                                                            member.name.charAt(0).toUpperCase()
                                                        )}
                                                    </div>
                                                    {index < 3 && (
                                                        <div className={`absolute -bottom-2 -right-2 w-6 h-6 rounded-full border-2 border-white dark:border-gray-900 flex items-center justify-center text-[10px] font-black text-white shadow-sm ${index === 0 ? 'bg-amber-400' : index === 1 ? 'bg-slate-400' : 'bg-amber-600'}`}>
                                                            #{index + 1}
                                                        </div>
                                                    )}
                                                </div>
                                                <div>
                                                    <h3 className="font-black text-gray-900 dark:text-white text-base">{member.name}</h3>
                                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{member.totalLeads} Leads Handled</p>
                                                </div>
                                            </div>

                                            <div className="space-y-4 relative z-10">
                                                <div>
                                                    <div className="flex justify-between text-xs font-bold mb-1.5">
                                                        <span className="text-gray-500 dark:text-gray-400 uppercase">Win Rate</span>
                                                        <span className={member.winRate > 20 ? 'text-emerald-500' : 'text-indigo-500'}>{member.winRate}%</span>
                                                    </div>
                                                    <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-1.5 overflow-hidden">
                                                        <div className={`h-full rounded-full ${member.winRate > 20 ? 'bg-emerald-500' : 'bg-indigo-500'}`} style={{ width: `${Math.min(member.winRate, 100)}%` }} />
                                                    </div>
                                                </div>

                                                <div className="pt-4 border-t border-gray-100 dark:border-gray-800 flex justify-between items-end">
                                                    <div>
                                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Revenue</p>
                                                        <p className="text-lg font-black text-gray-900 dark:text-white">{formatCurrency(member.revenue)}</p>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Pipeline</p>
                                                        <p className="text-sm font-bold text-gray-500 dark:text-gray-400">{formatCurrency(member.activePipeline)}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </motion.div>
                    )}
                </div>
            )}
        </div>
    );
}

