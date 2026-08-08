'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Network, AlertCircle, Users, Activity, Loader2, Target, CheckCircle2, RefreshCw } from 'lucide-react';
import AssignmentQueueTab from './AssignmentQueueTab';
import NeedsActionTab from './NeedsActionTab';
import TeamWorkloadTab from './TeamWorkloadTab';
import RoutingTraceTab from './RoutingTraceTab';

export default function DistributionDashboard({ initialStats }) {
    const [activeTab, setActiveTab] = useState('queue');
    const [stats, setStats] = useState(initialStats);
    const [isRefreshing, setIsRefreshing] = useState(false);

    const tabs = [
        { id: 'queue', label: 'Assignment Queue', icon: Target },
        { id: 'needs_action', label: 'Needs Action', icon: AlertCircle, badge: stats.reroute_pending },
        { id: 'workload', label: 'Team Workload', icon: Users },
        { id: 'trace', label: 'Routing Trace', icon: Network }
    ];

    const refreshStats = async () => {
        setIsRefreshing(true);
        try {
            // Need to import dynamically to avoid circular dependencies if used elsewhere, 
            // but it's safe to import at the top if we use server actions properly.
            // Alternatively, trigger a router.refresh() or have child components bubble up refresh events.
            // For now, we rely on the tabs to bubble up refresh events when they do actions.
        } finally {
            setIsRefreshing(false);
        }
    };

    return (
        <div className="flex flex-col h-[calc(100vh-73px)] overflow-hidden bg-slate-50">
            {/* Header / Health Strip */}
            <div className="shrink-0 bg-white border-b border-slate-200 z-10 px-6 py-4 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h1 className="text-2xl font-black tracking-tight text-slate-900 flex items-center gap-3">
                            Lead Distribution
                        </h1>
                        <p className="text-slate-500 text-sm font-medium mt-1">
                            Operational assignment console and routing diagnostics.
                        </p>
                    </div>
                </div>

                {/* Health Metrics */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    <MetricCard 
                        label="Total Leads" 
                        value={stats.total} 
                        icon={Target} 
                        color="slate" 
                    />
                    <MetricCard 
                        label="Assigned" 
                        value={stats.assigned} 
                        icon={CheckCircle2} 
                        color="emerald" 
                    />
                    <MetricCard 
                        label="Unassigned" 
                        value={stats.unassigned} 
                        icon={Activity} 
                        color="amber" 
                    />
                    <MetricCard 
                        label="Reroute Pending" 
                        value={stats.reroute_pending} 
                        icon={AlertCircle} 
                        color="rose" 
                        highlight={stats.reroute_pending > 0}
                    />
                    <MetricCard 
                        label="Auto Matched" 
                        value={stats.auto} 
                        icon={RefreshCw} 
                        color="blue" 
                    />
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className="shrink-0 bg-white border-b border-slate-200 px-6 overflow-x-auto hide-scrollbar">
                <div className="flex gap-6 min-w-max">
                    {tabs.map((tab) => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`
                                    relative py-4 flex items-center gap-2 font-semibold text-sm transition-colors
                                    ${isActive ? 'text-blue-600' : 'text-slate-500 hover:text-slate-800'}
                                `}
                            >
                                <Icon size={18} className={isActive ? 'text-blue-600' : 'text-slate-400'} />
                                <span>{tab.label}</span>
                                
                                {tab.badge !== undefined && tab.badge > 0 && (
                                    <span className={`
                                        px-2 py-0.5 rounded-full text-[10px] font-black
                                        ${isActive ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-500'}
                                    `}>
                                        {tab.badge}
                                    </span>
                                )}

                                {isActive && (
                                    <motion.div
                                        layoutId="distribution_active_tab"
                                        className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-t-full"
                                        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                                    />
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Tab Content Area */}
            <div className="flex-1 overflow-hidden relative">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={activeTab}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2 }}
                        className="absolute inset-0 overflow-y-auto"
                    >
                        {activeTab === 'queue' && <AssignmentQueueTab onAction={() => window.location.reload()} />}
                        {activeTab === 'needs_action' && <NeedsActionTab onAction={() => window.location.reload()} />}
                        {activeTab === 'workload' && <TeamWorkloadTab />}
                        {activeTab === 'trace' && <RoutingTraceTab />}
                    </motion.div>
                </AnimatePresence>
            </div>
        </div>
    );
}

function MetricCard({ label, value, icon: Icon, color, highlight }) {
    const colorStyles = {
        slate: 'bg-slate-50 border-slate-200 text-slate-600',
        emerald: 'bg-emerald-50 border-emerald-200 text-emerald-700',
        amber: 'bg-amber-50 border-amber-200 text-amber-700',
        rose: 'bg-rose-50 border-rose-200 text-rose-700',
        blue: 'bg-blue-50 border-blue-200 text-blue-700',
    };
    
    return (
        <div className={`
            p-3 rounded-xl border flex flex-col gap-1 transition-all
            ${colorStyles[color]}
            ${highlight ? 'shadow-sm shadow-rose-500/20 ring-1 ring-rose-500/30' : ''}
        `}>
            <div className="flex items-center gap-2 opacity-80">
                <Icon size={14} />
                <span className="text-xs font-bold uppercase tracking-wider">{label}</span>
            </div>
            <div className="text-xl font-black tracking-tight">{value?.toLocaleString() || 0}</div>
        </div>
    );
}
