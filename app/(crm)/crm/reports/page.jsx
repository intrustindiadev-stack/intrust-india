'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { BarChart2, TrendingUp, Users, Target, Activity } from 'lucide-react';
import { motion } from 'framer-motion';

export default function CRMReportsPage() {
    const [stats, setStats] = useState({
        totalLeads: 0,
        wonLeads: 0,
        activeLeads: 0,
        conversionRate: 0,
        sourceBreakdown: {},
        statusBreakdown: {}
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchAnalytics() {
            try {
                const { data, error } = await supabase.from('crm_leads').select('status, source');
                if (error) throw error;

                const leads = data || [];
                const totalLeads = leads.length;
                const wonLeads = leads.filter(l => l.status === 'won').length;
                const activeLeads = leads.filter(l => !['won', 'lost'].includes(l.status)).length;
                
                const sourceBreakdown = leads.reduce((acc, l) => {
                    const src = l.source || 'direct';
                    acc[src] = (acc[src] || 0) + 1;
                    return acc;
                }, {});

                const statusBreakdown = leads.reduce((acc, l) => {
                    const st = l.status || 'new';
                    acc[st] = (acc[st] || 0) + 1;
                    return acc;
                }, {});

                setStats({
                    totalLeads,
                    wonLeads,
                    activeLeads,
                    conversionRate: totalLeads > 0 ? Math.round((wonLeads / totalLeads) * 100) : 0,
                    sourceBreakdown,
                    statusBreakdown
                });
            } catch (err) {
                console.error('Error fetching analytics:', err);
            } finally {
                setLoading(false);
            }
        }

        fetchAnalytics();
        
        // Listen for real-time changes
        const ch = supabase.channel('crm_reports_changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'crm_leads' }, fetchAnalytics)
            .subscribe();

        return () => supabase.removeChannel(ch);
    }, []);

    if (loading) {
        return (
            <div className="flex-1 flex items-center justify-center min-h-screen">
                <div className="w-8 h-8 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="p-4 sm:p-6 lg:p-8 space-y-6 min-h-screen bg-gray-50/30">
            <div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">Analytics</h1>
                <p className="text-sm text-gray-500 mt-0.5">Real-time pipeline metrics and sales performance.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                    { label: 'Conversion Rate', icon: Target, value: `${stats.conversionRate}%`, sub: 'All-time won deals', color: 'text-emerald-600', bg: 'bg-emerald-50' },
                    { label: 'Active Pipeline', icon: Activity, value: stats.activeLeads, sub: 'Leads in progress', color: 'text-blue-600', bg: 'bg-blue-50' },
                    { label: 'Total Won', icon: TrendingUp, value: stats.wonLeads, sub: 'Closed deals', color: 'text-indigo-600', bg: 'bg-indigo-50' },
                    { label: 'Total Volume', icon: Users, value: stats.totalLeads, sub: 'Total leads captured', color: 'text-purple-600', bg: 'bg-purple-50' },
                ].map((c, i) => (
                    <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 }}
                        key={c.label} 
                        className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition-shadow"
                    >
                        <div className="flex items-center gap-3 mb-3">
                            <div className={`w-9 h-9 rounded-xl ${c.bg} flex items-center justify-center`}>
                                <c.icon size={18} className={c.color} />
                            </div>
                            <p className="text-sm font-bold text-gray-700">{c.label}</p>
                        </div>
                        <p className="text-3xl font-black text-gray-900">{c.value}</p>
                        <p className="text-xs text-gray-400 mt-1 font-medium">{c.sub}</p>
                    </motion.div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
                {/* Status Breakdown */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                    <h3 className="font-bold text-gray-900 mb-6 flex items-center gap-2">
                        <BarChart2 size={18} className="text-gray-400" />
                        Pipeline Distribution
                    </h3>
                    <div className="space-y-4">
                        {Object.entries(stats.statusBreakdown).sort((a,b) => b[1]-a[1]).map(([status, count]) => (
                            <div key={status}>
                                <div className="flex justify-between text-sm mb-1.5">
                                    <span className="font-semibold text-gray-700 capitalize">{status}</span>
                                    <span className="font-bold text-gray-900">{count}</span>
                                </div>
                                <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                                    <motion.div 
                                        initial={{ width: 0 }}
                                        animate={{ width: `${(count / stats.totalLeads) * 100}%` }}
                                        className={`h-full rounded-full ${status === 'won' ? 'bg-emerald-500' : status === 'lost' ? 'bg-red-400' : 'bg-indigo-500'}`}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Lead Sources */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                    <h3 className="font-bold text-gray-900 mb-6 flex items-center gap-2">
                        <Users size={18} className="text-gray-400" />
                        Top Sources
                    </h3>
                    <div className="space-y-4">
                        {Object.entries(stats.sourceBreakdown).sort((a,b) => b[1]-a[1]).map(([source, count]) => (
                            <div key={source} className="flex items-center justify-between p-3 rounded-xl bg-gray-50 border border-gray-100">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-white shadow-sm flex items-center justify-center font-bold text-gray-400 text-xs uppercase">
                                        {source.substring(0,2)}
                                    </div>
                                    <span className="font-bold text-gray-800 capitalize">{source}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-sm font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-lg">{count} leads</span>
                                </div>
                            </div>
                        ))}
                        {Object.keys(stats.sourceBreakdown).length === 0 && (
                            <p className="text-sm text-gray-500 text-center py-4">No source data available.</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
