'use client';

import { Users, Briefcase, TrendingUp, Clock, ArrowRight, Plus, Phone, Mail, Zap, Target } from 'lucide-react';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { motion } from 'framer-motion';

const STATUS_COLOR = {
    new: 'bg-blue-100 text-blue-700 border-blue-200',
    contacted: 'bg-amber-100 text-amber-700 border-amber-200',
    qualified: 'bg-indigo-100 text-indigo-700 border-indigo-200',
    proposal: 'bg-purple-100 text-purple-700 border-purple-200',
    won: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    lost: 'bg-rose-100 text-rose-700 border-rose-200',
};

const STATUS_DOT = {
    new: 'bg-blue-500', contacted: 'bg-amber-500', qualified: 'bg-indigo-500',
    proposal: 'bg-purple-500', won: 'bg-emerald-500', lost: 'bg-rose-500',
};

function StatCard({ label, value, icon: Icon, gradient, delay = 0 }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay }}
            className={`relative overflow-hidden rounded-3xl p-5 text-white bg-gradient-to-br ${gradient} shadow-lg`}
        >
            <div className="absolute -top-4 -right-4 w-20 h-20 bg-white/10 rounded-full" />
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center mb-3">
                <Icon size={20} />
            </div>
            <p className="text-white/70 text-xs font-bold uppercase tracking-widest">{label}</p>
            <p className="text-3xl font-black mt-1">{value}</p>
        </motion.div>
    );
}

export default function CRMDashboard() {
    const [leads, setLeads] = useState([]);
    const [stats, setStats] = useState({ newLeads: 0, activePipeline: 0, convRate: '0%', followUps: 0 });
    const [isLoading, setIsLoading] = useState(true);

    const fetchData = async () => {
        try {
            const [recentRes, allRes] = await Promise.all([
                supabase.from('crm_leads').select('id, title, contact_name, phone, email, status, source, created_at').order('created_at', { ascending: false }).limit(6),
                supabase.from('crm_leads').select('status'),
            ]);
            const recent = recentRes.data || [];
            const all = allRes.data || [];
            setLeads(recent);

            const total = all.length;
            const won = all.filter(l => l.status === 'won').length;
            setStats({
                newLeads: all.filter(l => l.status === 'new').length,
                activePipeline: all.filter(l => ['contacted', 'qualified', 'proposal'].includes(l.status)).length,
                convRate: total > 0 ? `${Math.round((won / total) * 100)}%` : '0%',
                followUps: all.filter(l => l.status === 'contacted').length,
            });
        } catch (err) {
            console.error('CRM fetch error', err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        const ch = supabase.channel('crm_dash')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'crm_leads' }, fetchData)
            .subscribe();
        return () => supabase.removeChannel(ch);
    }, []);

    return (
        <div className="p-4 sm:p-6 lg:p-8 space-y-6 min-h-screen">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">Sales Dashboard</h1>
                    <p className="text-sm text-gray-500 mt-0.5">Real-time pipeline visibility for your team.</p>
                </div>
                <Link
                    href="/crm/leads"
                    className="inline-flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white px-5 py-2.5 rounded-xl font-bold transition-all shadow-lg shadow-indigo-500/30 text-sm"
                >
                    <Plus size={16} /> Add New Lead
                </Link>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard label="New Leads" value={isLoading ? '…' : stats.newLeads} icon={Zap} gradient="from-blue-600 to-indigo-600" delay={0} />
                <StatCard label="Active Pipeline" value={isLoading ? '…' : stats.activePipeline} icon={Target} gradient="from-violet-600 to-purple-600" delay={0.05} />
                <StatCard label="Conversion" value={isLoading ? '…' : stats.convRate} icon={TrendingUp} gradient="from-emerald-500 to-teal-600" delay={0.1} />
                <StatCard label="Follow-ups" value={isLoading ? '…' : stats.followUps} icon={Clock} gradient="from-amber-500 to-orange-500" delay={0.15} />
            </div>

            {/* Recent Leads + Quick Actions */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Recent Leads */}
                <div className="lg:col-span-2 bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="flex justify-between items-center p-5 border-b border-gray-100">
                        <h2 className="text-base font-bold text-gray-900">Recent Leads</h2>
                        <Link href="/crm/leads" className="text-sm font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1">
                            View All <ArrowRight size={14} />
                        </Link>
                    </div>
                    <div className="divide-y divide-gray-50">
                        {isLoading ? (
                            [...Array(4)].map((_, i) => <div key={i} className="p-4 h-16 animate-pulse bg-gray-50/50" />)
                        ) : leads.length === 0 ? (
                            <div className="p-12 text-center text-gray-400 text-sm">
                                <Briefcase size={32} className="mx-auto mb-3 opacity-30" />
                                No leads yet. Start by adding one!
                            </div>
                        ) : leads.map(lead => (
                            <Link
                                key={lead.id}
                                href="/crm/leads"
                                className="flex items-center justify-between px-5 py-3.5 hover:bg-indigo-50/30 transition-colors group"
                            >
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-100 to-violet-100 flex items-center justify-center text-indigo-700 font-bold text-sm flex-shrink-0">
                                        {(lead.contact_name || lead.title || '?').charAt(0).toUpperCase()}
                                    </div>
                                    <div className="min-w-0">
                                        <p className="font-semibold text-gray-900 text-sm group-hover:text-indigo-600 transition-colors truncate">
                                            {lead.contact_name || lead.title}
                                        </p>
                                        <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                                            {lead.phone && <><Phone size={10} /> {lead.phone}</>}
                                        </p>
                                    </div>
                                </div>
                                <span className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-lg border capitalize flex-shrink-0 ${STATUS_COLOR[lead.status] || 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                                    <span className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[lead.status] || 'bg-gray-400'}`} />
                                    {lead.status}
                                </span>
                            </Link>
                        ))}
                    </div>
                </div>

                {/* Quick Actions */}
                <div className="space-y-4">
                    <div className="bg-gradient-to-br from-indigo-900 via-indigo-800 to-violet-900 rounded-3xl p-5 text-white shadow-xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full blur-2xl -mr-10 -mt-10" />
                        <h2 className="text-sm font-bold mb-4 opacity-80 uppercase tracking-widest relative z-10">Quick Actions</h2>
                        <div className="space-y-2.5 relative z-10">
                            <Link href="/crm/pipeline" className="flex items-center justify-between p-3.5 bg-white/10 hover:bg-white/20 rounded-2xl transition-all border border-white/10 group">
                                <span className="font-semibold text-sm">Pipeline Board</span>
                                <ArrowRight size={15} className="opacity-60 group-hover:translate-x-1 transition-transform" />
                            </Link>
                            <Link href="/crm/leads" className="flex items-center justify-between p-3.5 bg-white/10 hover:bg-white/20 rounded-2xl transition-all border border-white/10 group">
                                <span className="font-semibold text-sm">All Leads</span>
                                <ArrowRight size={15} className="opacity-60 group-hover:translate-x-1 transition-transform" />
                            </Link>
                        </div>
                    </div>

                    {/* Pipeline snapshot */}
                    <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-5">
                        <h3 className="text-sm font-bold text-gray-700 mb-3">Pipeline Status</h3>
                        <div className="space-y-2">
                            {[
                                { label: 'New', key: 'new', color: 'bg-blue-500' },
                                { label: 'Active', key: 'active', color: 'bg-violet-500' },
                                { label: 'Won', key: 'won', color: 'bg-emerald-500' },
                            ].map(s => (
                                <div key={s.key} className="flex items-center gap-2">
                                    <span className={`w-2.5 h-2.5 rounded-full ${s.color}`} />
                                    <span className="text-xs text-gray-500 flex-1">{s.label}</span>
                                    <span className="text-xs font-bold text-gray-800">
                                        {s.key === 'new' ? stats.newLeads : s.key === 'active' ? stats.activePipeline : stats.convRate}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
