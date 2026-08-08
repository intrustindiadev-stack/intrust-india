'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { fetchTeamLeadsData } from '@/app/actions/admin-crm';
import { useAuth } from '@/lib/contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Target, Users, Zap, CheckCircle2, ChevronDown, ChevronUp, User, MapPin, Building, Target as TargetIcon } from 'lucide-react';
import { format } from 'date-fns';

const STATUS_CONFIG = {
    new: { bg: 'bg-blue-100 text-blue-800', dot: 'bg-blue-500' },
    contacted: { bg: 'bg-amber-100 text-amber-800', dot: 'bg-amber-500' },
    qualified: { bg: 'bg-purple-100 text-purple-800', dot: 'bg-purple-500' },
    proposal: { bg: 'bg-indigo-100 text-indigo-800', dot: 'bg-indigo-500' },
    won: { bg: 'bg-emerald-100 text-emerald-800', dot: 'bg-emerald-500' },
    lost: { bg: 'bg-rose-100 text-rose-800', dot: 'bg-rose-500' }
};

export default function AdminTeamLeadsPage() {
    const [team, setTeam] = useState([]);
    const [leads, setLeads] = useState([]);
    const [loading, setLoading] = useState(true);
    const [expandedRep, setExpandedRep] = useState(null);
    const router = useRouter();

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const { team: teamData, leads: leadsData, error } = await fetchTeamLeadsData();
            
            if (error) {
                console.error('Error fetching data:', error);
            } else {
                setTeam(teamData || []);
                setLeads(leadsData || []);
            }
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };

    const getRepStats = (repId) => {
        const repLeads = leads.filter(l => l.assigned_to === repId);
        const wonLeads = repLeads.filter(l => l.status === 'won');
        const openLeads = repLeads.filter(l => !['won', 'lost'].includes(l.status));
        const hotLeads = repLeads.filter(l => l.temperature === 'hot');
        const expectedValue = repLeads.reduce((sum, l) => sum + (Number(l.deal_value) || 0), 0);

        return { total: repLeads.length, won: wonLeads.length, open: openLeads.length, hot: hotLeads.length, expectedValue, leads: repLeads };
    };

    const formatCurrency = (val) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);

    return (
        <div className="p-4 sm:p-6 lg:p-8 space-y-8 font-[family-name:var(--font-outfit)] min-h-screen bg-gray-50/30 dark:bg-gray-900/30">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">Team Leads</h1>
                    <p className="text-sm font-bold text-gray-500 mt-1">Admin overview of sales team performance & lead distribution</p>
                </div>
            </div>

            {/* Team Members List */}
            {loading ? (
                <div className="space-y-4 animate-pulse">
                    {[1, 2, 3].map(i => <div key={i} className="h-32 bg-gray-200 dark:bg-gray-800 rounded-[2rem]" />)}
                </div>
            ) : (
                <div className="space-y-6">
                    {team.map(rep => {
                        const stats = getRepStats(rep.id);
                        const isExpanded = expandedRep === rep.id;
                        
                        return (
                            <div key={rep.id} className="bg-white dark:bg-gray-800 rounded-[2rem] border border-gray-100 dark:border-gray-700 shadow-xl shadow-gray-200/40 dark:shadow-none overflow-hidden transition-all duration-300">
                                {/* Rep Header (Clickable) */}
                                <div 
                                    onClick={() => setExpandedRep(isExpanded ? null : rep.id)}
                                    className="p-6 sm:p-8 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors flex flex-col lg:flex-row lg:items-center justify-between gap-6"
                                >
                                    <div className="flex items-center gap-6">
                                        <div className="w-16 h-16 rounded-[1.25rem] bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 font-black text-2xl shadow-inner">
                                            {rep.full_name?.charAt(0).toUpperCase() || 'U'}
                                        </div>
                                        <div>
                                            <h2 className="text-xl font-black text-gray-900 dark:text-white flex items-center gap-2">{rep.full_name}</h2>
                                            <p className="text-sm font-bold text-gray-500 flex items-center gap-1.5"><User size={14}/> {rep.role === 'relationship_manager' ? 'RM Manager' : 'Sales Executive'}</p>
                                        </div>
                                    </div>
                                    
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 flex-1 max-w-2xl">
                                        <div className="bg-gray-50 dark:bg-gray-900 rounded-2xl p-3 border border-gray-100 dark:border-gray-700">
                                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Total Leads</p>
                                            <p className="text-lg font-black text-gray-900 dark:text-white">{stats.total}</p>
                                        </div>
                                        <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl p-3 border border-indigo-100 dark:border-indigo-800/30">
                                            <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-1">Open Leads</p>
                                            <p className="text-lg font-black text-indigo-700 dark:text-indigo-400">{stats.open}</p>
                                        </div>
                                        <div className="bg-rose-50 dark:bg-rose-900/20 rounded-2xl p-3 border border-rose-100 dark:border-rose-800/30">
                                            <p className="text-[10px] font-black text-rose-500 uppercase tracking-widest mb-1">Hot Priority</p>
                                            <p className="text-lg font-black text-rose-700 dark:text-rose-400">{stats.hot}</p>
                                        </div>
                                        <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl p-3 border border-emerald-100 dark:border-emerald-800/30">
                                            <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-1">Expected Val</p>
                                            <p className="text-base font-black text-emerald-700 dark:text-emerald-400">{formatCurrency(stats.expectedValue)}</p>
                                        </div>
                                    </div>

                                    <div className="hidden lg:flex items-center justify-center w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-500 shrink-0">
                                        {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                                    </div>
                                </div>

                                {/* Expanded Leads List */}
                                <AnimatePresence>
                                    {isExpanded && (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: 'auto', opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            className="border-t border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/50 overflow-hidden"
                                        >
                                            <div className="p-6 sm:p-8">
                                                {stats.leads.length === 0 ? (
                                                    <div className="text-center py-10 bg-white dark:bg-gray-800 rounded-3xl border border-dashed border-gray-200 dark:border-gray-700">
                                                        <TargetIcon size={32} className="mx-auto text-gray-300 mb-3" />
                                                        <p className="text-sm font-bold text-gray-500">No leads assigned to this executive.</p>
                                                    </div>
                                                ) : (
                                                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                                                        {stats.leads.map(lead => {
                                                            const style = STATUS_CONFIG[lead.status] || { bg: 'bg-gray-100 text-gray-800', dot: 'bg-gray-500' };
                                                            return (
                                                                <div 
                                                                    key={lead.id} 
                                                                    onClick={() => router.push(`/admin/crm/leads/${lead.id}`)}
                                                                    className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-lg hover:border-indigo-300 dark:hover:border-indigo-700 cursor-pointer transition-all group"
                                                                >
                                                                    <div className="flex items-start justify-between mb-3">
                                                                        <h3 className="text-base font-black text-gray-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors truncate pr-2">{lead.contact_name || lead.title}</h3>
                                                                        <span className={`shrink-0 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-widest ${style.bg}`}>
                                                                            <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
                                                                            {lead.status}
                                                                        </span>
                                                                    </div>
                                                                    <div className="space-y-2 mb-4">
                                                                        <p className="text-xs font-bold text-gray-500 flex items-center gap-2 truncate"><Building size={14} className="opacity-70"/> {lead.title || 'Individual'}</p>
                                                                        {(lead.area || lead.city) && <p className="text-xs font-bold text-gray-500 flex items-center gap-2 truncate"><MapPin size={14} className="opacity-70"/> {[lead.area, lead.city].filter(Boolean).join(', ')}</p>}
                                                                    </div>
                                                                    <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-gray-700">
                                                                        <p className="text-[10px] font-black text-gray-400 uppercase">{format(new Date(lead.created_at), 'MMM dd')}</p>
                                                                        <p className="text-sm font-black text-gray-900 dark:text-white">{formatCurrency(lead.deal_value || 0)}</p>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                )}
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
