'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Briefcase, TrendingUp, Clock, Plus, Target, CheckCircle, Calendar, BarChart2, DollarSign, Activity, Flame } from 'lucide-react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';

// Components
import GlassMetricCard from '@/components/crm/dashboard/GlassMetricCard';
import GradientAreaChart from '@/components/crm/dashboard/GradientAreaChart';
import PipelineFunnelChart from '@/components/crm/dashboard/PipelineFunnelChart';
import LeadSourcesChart from '@/components/crm/dashboard/LeadSourcesChart';
import TemperatureChart from '@/components/crm/dashboard/TemperatureChart';
import RevenueBySourceChart from '@/components/crm/dashboard/RevenueBySourceChart';
import RecentDealsTable from '@/components/crm/dashboard/RecentDealsTable';
import DashboardTabs from '@/components/crm/dashboard/DashboardTabs';
import TeamLeaderboard from '@/components/crm/dashboard/TeamLeaderboard';
import WelcomeRoleCelebrationModal from '@/components/shared/WelcomeRoleCelebrationModal';

export default function CRMDashboard() {
    const [activeTab, setActiveTab] = useState('overview');

    // Analytics data from server
    const [analytics, setAnalytics] = useState(null);
    // Separate lightweight fetch for recent leads table and tasks
    const [leads, setLeads] = useState([]);
    const [tasks, setTasks] = useState([]);

    const [isLoading, setIsLoading] = useState(true);
    const [isManager, setIsManager] = useState(false);
    const [userName, setUserName] = useState('');

    const fetchAnalytics = useCallback(async () => {
        try {
            const res = await fetch('/api/crm/analytics');
            if (!res.ok) throw new Error('Analytics fetch failed');
            const json = await res.json();
            const a = json.analytics;

            setIsManager(json.meta.isManager);
            setAnalytics(a);
        } catch (err) {
            console.error('[Dashboard] analytics fetch error:', err);
        }
    }, []);

    const fetchSideData = useCallback(async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;
            const currentUserId = session.user.id;

            // Get user name
            const { data: profile } = await supabase
                .from('user_profiles')
                .select('full_name, role')
                .eq('id', currentUserId)
                .single();

            if (profile?.full_name) {
                setUserName(profile.full_name.split(' ')[0]);
            }

            const manager = ['relationship_manager', 'admin', 'super_admin'].includes(profile?.role);

            // Recent leads for the table (lightweight: only 6 rows)
            let recentQuery = supabase
                .from('crm_leads')
                .select('id, title, contact_name, phone, email, status, source, created_at, temperature, deal_value')
                .is('archived_at', null)
                .neq('source', 'Users')
                .neq('source', 'App User')
                .order('created_at', { ascending: false })
                .limit(6);

            // Upcoming tasks
            let tasksQuery = supabase
                .from('crm_tasks')
                .select('*')
                .eq('status', 'pending')
                .order('due_date', { ascending: true })
                .limit(4);

            if (!manager) {
                recentQuery = recentQuery.eq('assigned_to', currentUserId);
                tasksQuery = tasksQuery.eq('assigned_to', currentUserId);
            }

            const [recentRes, tasksRes] = await Promise.all([recentQuery, tasksQuery]);
            setLeads(recentRes.data || []);
            setTasks(tasksRes.data || []);
        } catch (err) {
            console.error('[Dashboard] side data fetch error:', err);
        }
    }, []);

    useEffect(() => {
        Promise.all([fetchAnalytics(), fetchSideData()]).finally(() => setIsLoading(false));
    }, [fetchAnalytics, fetchSideData]);

    const formatCurrency = (val) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val || 0);

    // Derived chart-ready data from server analytics
    const totals = analytics?.totals ?? {};
    const funnelData = (analytics?.by_status ?? []).map(s => ({ name: s.name.charAt(0).toUpperCase() + s.name.slice(1), count: s.count }));
    const sourceData = analytics?.by_source ?? [];
    const temperatureData = analytics?.by_temperature ?? [];
    const revenueData = (analytics?.monthly_trend ?? []).map(m => ({ name: m.name, value: m.value }));
    const revenueBySourceData = analytics?.revenue_by_source ?? [];
    const teamData = (analytics?.team_leaderboard ?? []).map(m => ({
        id: m.id,
        name: m.name,
        avatar_url: m.avatar_url,
        dealsWon: m.deals_won,
        revenue: m.revenue,
        totalAssigned: m.total_assigned,
        winRate: m.win_rate,
    }));

    const tabs = [
        { id: 'overview', label: 'Overview', icon: Target },
        ...(isManager ? [
            { id: 'analytics', label: 'Lead Analytics', icon: BarChart2 },
            { id: 'team', label: 'Team Performance', icon: Users }
        ] : [])
    ];

    return (
        <div className="p-4 sm:p-6 lg:p-8 min-h-screen font-[family-name:var(--font-outfit)] bg-[#F8FAFC] dark:bg-gray-900 relative overflow-hidden transition-colors duration-300">
            {/* Ambient Effects */}
            <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-cyan-400/10 dark:bg-cyan-900/20 rounded-full blur-[120px] pointer-events-none transition-colors"></div>
            <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-purple-400/10 dark:bg-purple-900/10 rounded-full blur-[150px] pointer-events-none transition-colors"></div>

            <div className="relative z-10 space-y-8 max-w-7xl mx-auto">
                <WelcomeRoleCelebrationModal />

                {/* Dashboard Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-2">
                    <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
                        <h1 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">
                            Hello {userName || 'there'}, welcome to <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-600 to-purple-600 dark:from-cyan-400 dark:to-purple-500">
                                Intrust CRM
                            </span>
                        </h1>
                        <p className="text-sm font-bold text-gray-500 dark:text-cyan-100/50 mt-1">
                            Your complete CRM command center.
                        </p>
                    </motion.div>

                    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="flex items-center gap-3">
                        <Link
                            href="/crm/leads"
                            className="inline-flex items-center gap-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white px-6 py-2.5 rounded-xl font-bold transition-all shadow-[0_4px_14px_rgba(6,182,212,0.39)] hover:shadow-[0_6px_20px_rgba(6,182,212,0.23)] hover:-translate-y-0.5 text-sm"
                        >
                            <Plus size={16} strokeWidth={3} /> New Lead
                        </Link>
                    </motion.div>
                </div>

                {/* Tab Navigation */}
                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
                    <DashboardTabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />
                </motion.div>

                {/* Tab Content */}
                <AnimatePresence mode="wait">
                    {/* OVERVIEW TAB */}
                    {activeTab === 'overview' && (
                        <motion.div
                            key="overview"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{ duration: 0.3 }}
                            className="space-y-6"
                        >
                            {/* Metric Cards Row */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <GlassMetricCard title="Total Leads" value={totals.total ?? 0} icon={Users} trend="Pipeline Health" trendUp={true} accentColor="cyan" delay={0.1} href="/crm/leads" isLoading={isLoading} />
                                <GlassMetricCard title="Active Deals" value={totals.active ?? 0} icon={Target} progress={totals.win_rate ?? 0} accentColor="purple" delay={0.2} href="/crm/pipeline" isLoading={isLoading} />
                                {isManager && (
                                    <GlassMetricCard title="Total Revenue" value={formatCurrency(totals.revenue)} icon={DollarSign} trend="Closed Won" trendUp={true} accentColor="emerald" delay={0.3} href="/crm/reports" isLoading={isLoading} />
                                )}
                            </div>

                            <div className={`grid grid-cols-1 ${isManager ? 'lg:grid-cols-3' : 'lg:grid-cols-1'} gap-6`}>
                                {isManager && (
                                    <Link href="/crm/reports" className="lg:col-span-2 block hover:scale-[1.02] hover:shadow-2xl transition-all duration-300 cursor-pointer hover:-translate-y-1">
                                        <GradientAreaChart data={revenueData} title="Revenue Growth" subtitle="6-Month Pipeline Velocity" icon={BarChart2} isLoading={isLoading} />
                                    </Link>
                                )}

                                {/* Actionable Tasks */}
                                <motion.div
                                    initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}
                                    className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-[1.25rem] p-6 border border-gray-100 dark:border-gray-700/50 shadow-xl shadow-gray-200/20 dark:shadow-black/20 relative overflow-hidden flex flex-col"
                                >
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 dark:bg-amber-500/10 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none" />
                                    <h2 className="text-sm font-black text-gray-900 dark:text-white flex items-center gap-2 mb-4 relative z-10">
                                        <Calendar size={16} className="text-amber-500" /> Upcoming Tasks
                                    </h2>
                                    <div className="space-y-3 relative z-10 flex-1 overflow-y-auto">
                                        {tasks.length === 0 && !isLoading ? (
                                            <p className="text-sm text-gray-500 dark:text-gray-400 py-4 font-medium">No pending tasks.</p>
                                        ) : (
                                            tasks.map(task => (
                                                <div key={task.id} className="p-3 bg-gray-50 dark:bg-gray-700/30 rounded-xl border border-gray-100 dark:border-gray-700 hover:border-amber-200 dark:hover:border-amber-500/30 transition-colors cursor-pointer group">
                                                    <h4 className="text-sm font-bold text-gray-900 dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">{task.title}</h4>
                                                    <p className="text-xs font-medium text-gray-500 mt-1 flex items-center gap-1">
                                                        <Clock size={10} /> {new Date(task.due_date).toLocaleDateString()}
                                                    </p>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </motion.div>
                            </div>

                            <RecentDealsTable leads={leads} isLoading={isLoading} />
                        </motion.div>
                    )}

                    {/* LEAD ANALYTICS TAB */}
                    {activeTab === 'analytics' && (
                        <motion.div
                            key="analytics"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{ duration: 0.3 }}
                            className="space-y-6"
                        >
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                <Link href="/crm/pipeline" className="block hover:scale-[1.02] hover:shadow-2xl transition-all duration-300 cursor-pointer hover:-translate-y-1">
                                    <PipelineFunnelChart data={funnelData} title="Pipeline Funnel" subtitle="Current Deal Stages" icon={Activity} isLoading={isLoading} />
                                </Link>
                                <Link href="/crm/analytics" className="block hover:scale-[1.02] hover:shadow-2xl transition-all duration-300 cursor-pointer hover:-translate-y-1">
                                    <LeadSourcesChart data={sourceData} title="Lead Sources" subtitle="Acquisition Channels" icon={Target} isLoading={isLoading} />
                                </Link>
                            </div>
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                <Link href="/crm/analytics" className="block hover:scale-[1.02] hover:shadow-2xl transition-all duration-300 cursor-pointer hover:-translate-y-1">
                                    <TemperatureChart data={temperatureData} title="Lead Quality" subtitle="By Temperature" icon={Flame} isLoading={isLoading} />
                                </Link>
                                <Link href="/crm/reports" className="block hover:scale-[1.02] hover:shadow-2xl transition-all duration-300 cursor-pointer hover:-translate-y-1">
                                    <RevenueBySourceChart data={revenueBySourceData} title="Revenue by Source" subtitle="Top Performing Channels" icon={TrendingUp} isLoading={isLoading} />
                                </Link>
                            </div>
                        </motion.div>
                    )}

                    {/* TEAM PERFORMANCE TAB */}
                    {activeTab === 'team' && (
                        <motion.div
                            key="team"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{ duration: 0.3 }}
                            className="space-y-6"
                        >
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                <div className="lg:col-span-2">
                                    <TeamLeaderboard teamData={teamData} totalRevenue={totals.revenue ?? 0} isLoading={isLoading} />
                                </div>
                                <div className="space-y-6">
                                    <GlassMetricCard title="Total Team Deals" value={teamData.reduce((acc, m) => acc + m.dealsWon, 0)} icon={Briefcase} accentColor="cyan" delay={0.1} isLoading={isLoading} />
                                    <GlassMetricCard
                                        title="Average Win Rate"
                                        value={`${teamData.length > 0 ? Math.round(teamData.reduce((acc, m) => acc + Number(m.winRate), 0) / teamData.length) : 0}%`}
                                        icon={TrendingUp}
                                        accentColor="emerald"
                                        delay={0.2}
                                        isLoading={isLoading}
                                    />
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

            </div>
        </div>
    );
}
