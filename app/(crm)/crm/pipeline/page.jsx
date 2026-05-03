'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, RefreshCw, ArrowRight, DollarSign, Thermometer, Clock, Phone } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';

const COLUMNS = [
    { id: 'new', title: 'New', color: 'border-t-blue-500', badge: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', iconColor: 'text-blue-500' },
    { id: 'contacted', title: 'Contacted', color: 'border-t-amber-500', badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400', iconColor: 'text-amber-500' },
    { id: 'qualified', title: 'Qualified', color: 'border-t-indigo-500', badge: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400', iconColor: 'text-indigo-500' },
    { id: 'proposal', title: 'Proposal', color: 'border-t-purple-500', badge: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400', iconColor: 'text-purple-500' },
    { id: 'won', title: 'Won ✓', color: 'border-t-emerald-500', badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400', iconColor: 'text-emerald-500' },
];

const SOURCES = ['All', 'Solar', 'Merchants', 'Users', 'Imported'];

const getSourceCategory = (source) => {
    if (!source) return 'Other';
    const s = source.toLowerCase();
    if (s.includes('merchant')) return 'Merchants';
    if (s.includes('user')) return 'Users';
    if (s.includes('solar')) return 'Solar';
    if (s.includes('csv') || s.includes('import')) return 'Imported';
    return 'Other';
};

const SOURCE_COLORS = {
    'Merchants': 'bg-fuchsia-50 text-fuchsia-600 border-fuchsia-200 dark:bg-fuchsia-900/30 dark:text-fuchsia-400 dark:border-fuchsia-800',
    'Users': 'bg-cyan-50 text-cyan-600 border-cyan-200 dark:bg-cyan-900/30 dark:text-cyan-400 dark:border-cyan-800',
    'Solar': 'bg-orange-50 text-orange-600 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800',
    'Imported': 'bg-gray-100 text-gray-600 border-gray-300 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700',
    'Other': 'bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'
};

const TEMP_COLORS = {
    'hot': 'text-rose-500',
    'warm': 'text-amber-500',
    'cold': 'text-blue-500'
};

export default function PipelinePage() {
    const [leads, setLeads] = useState([]);
    const [loading, setLoading] = useState(true);
    const [dragging, setDragging] = useState(null);
    const [sourceFilter, setSourceFilter] = useState('All');

    const fetchLeads = useCallback(async () => {
        const { data } = await supabase
            .from('crm_leads')
            .select('id, title, contact_name, phone, status, source, created_at, deal_value, temperature')
            .not('status', 'eq', 'lost')
            .order('created_at', { ascending: false });
        setLeads(data || []);
        setLoading(false);
    }, []);

    useEffect(() => {
        fetchLeads();
        const ch = supabase.channel('crm_pipeline')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'crm_leads' }, fetchLeads)
            .subscribe();
        return () => supabase.removeChannel(ch);
    }, [fetchLeads]);

    const filteredLeads = leads.filter(l => {
        if (sourceFilter === 'All') return true;
        return getSourceCategory(l.source) === sourceFilter;
    });

    const getByStatus = (status) => filteredLeads.filter(l => l.status === status);

    const formatCurrency = (val) => {
        if (!val) return '₹0';
        if (val >= 10000000) return `₹${(val / 10000000).toFixed(1)}Cr`;
        if (val >= 100000) return `₹${(val / 100000).toFixed(1)}L`;
        if (val >= 1000) return `₹${(val / 1000).toFixed(1)}K`;
        return `₹${val}`;
    };

    const calculateDays = (dateString) => {
        const diffTime = Math.abs(new Date() - new Date(dateString));
        return Math.floor(diffTime / (1000 * 60 * 60 * 24));
    };

    // Drag & Drop handlers
    const handleDragStart = (e, lead) => {
        setDragging(lead);
        e.dataTransfer.effectAllowed = 'move';
        // Required for Firefox
        if (e.dataTransfer.setData) e.dataTransfer.setData('text/plain', lead.id);
    };

    const handleDrop = async (e, colId) => {
        e.preventDefault();
        if (!dragging || dragging.status === colId) { setDragging(null); return; }
        // Optimistically update UI
        setLeads(prev => prev.map(l => l.id === dragging.id ? { ...l, status: colId } : l));
        await supabase.from('crm_leads').update({ status: colId }).eq('id', dragging.id);
        setDragging(null);
    };

    const handleDragOver = (e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; };

    return (
        <div className="p-4 sm:p-6 lg:p-8 h-screen flex flex-col gap-5 bg-gray-50/50 dark:bg-gray-900/50 font-[family-name:var(--font-outfit)] overflow-hidden">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shrink-0">
                <div>
                    <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 dark:text-white tracking-tight">Pipeline Board</h1>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mt-1">Drag and drop leads to advance stages.</p>
                </div>
                <div className="flex items-center gap-3">
                    <button onClick={fetchLeads} className="p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-sm text-gray-600 dark:text-gray-300">
                        <RefreshCw size={18} className={loading ? 'animate-spin text-indigo-500' : ''} />
                    </button>
                    <Link href="/crm/leads" className="inline-flex items-center gap-2 px-5 py-2.5 bg-gray-900 dark:bg-white dark:text-gray-900 hover:bg-gray-800 dark:hover:bg-gray-100 text-white rounded-xl font-bold text-sm shadow-lg transition-all">
                        <Plus size={16} /> New Lead
                    </Link>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-2 shrink-0">
                {SOURCES.map(src => (
                    <button
                        key={src}
                        onClick={() => setSourceFilter(src)}
                        className={`px-4 py-2 rounded-xl text-sm font-bold border transition-all shadow-sm ${sourceFilter === src ? 'bg-indigo-600 border-indigo-600 text-white shadow-indigo-500/20' : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-indigo-300 dark:hover:border-indigo-700'}`}
                    >
                        {src}
                    </button>
                ))}
            </div>

            {loading ? (
                <div className="flex-1 flex items-center justify-center">
                    <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
                </div>
            ) : (
                <div className="flex-1 overflow-x-auto overflow-y-hidden pb-4 snap-x">
                    <div className="flex gap-4 h-full min-w-max px-2">
                        {COLUMNS.map(col => {
                            const colLeads = getByStatus(col.id);
                            const totalValue = colLeads.reduce((sum, l) => sum + (Number(l.deal_value) || 0), 0);
                            
                            return (
                                <div
                                    key={col.id}
                                    onDragOver={handleDragOver}
                                    onDrop={e => handleDrop(e, col.id)}
                                    className="w-80 flex flex-col h-full snap-center"
                                >
                                    {/* Column header */}
                                    <div className={`px-5 py-4 rounded-t-3xl border-t-4 ${col.color} bg-white dark:bg-gray-800 border border-b-0 border-gray-100 dark:border-gray-700 flex flex-col shrink-0 shadow-sm relative overflow-hidden`}>
                                        <div className="flex items-center justify-between mb-2 relative z-10">
                                            <h3 className="font-bold text-gray-900 dark:text-white text-base">{col.title}</h3>
                                            <span className={`text-xs font-bold px-2.5 py-1 rounded-lg ${col.badge}`}>{colLeads.length}</span>
                                        </div>
                                        <div className="flex items-center justify-between text-xs font-bold text-gray-500 dark:text-gray-400 relative z-10">
                                            <span>{formatCurrency(totalValue)}</span>
                                            {colLeads.length > 0 && <span>Avg {Math.round(colLeads.reduce((sum, l) => sum + calculateDays(l.created_at), 0) / colLeads.length)}d</span>}
                                        </div>
                                        <div className={`absolute -right-6 -bottom-6 opacity-5 ${col.iconColor}`}><DollarSign size={80} /></div>
                                    </div>

                                    {/* Scrollable column body */}
                                    <div className="flex-1 bg-gray-50/50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-700 border-t-0 rounded-b-3xl p-3 overflow-y-auto space-y-3 min-h-[200px] custom-scrollbar">
                                        <AnimatePresence>
                                            {colLeads.map(lead => {
                                                const category = getSourceCategory(lead.source);
                                                const tempColor = TEMP_COLORS[lead.temperature || 'warm'];
                                                
                                                return (
                                                    <motion.div
                                                        layoutId={lead.id}
                                                        initial={{ opacity: 0, scale: 0.95 }}
                                                        animate={{ opacity: 1, scale: 1 }}
                                                        exit={{ opacity: 0, scale: 0.95 }}
                                                        key={lead.id}
                                                        draggable
                                                        onDragStart={e => handleDragStart(e, lead)}
                                                        className={`bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-4 shadow-sm hover:shadow-lg hover:border-indigo-300 dark:hover:border-indigo-600 transition-all cursor-grab active:cursor-grabbing select-none group ${dragging?.id === lead.id ? 'opacity-40 scale-95' : ''}`}
                                                    >
                                                        <div className="flex items-start justify-between gap-3 mb-3">
                                                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 flex items-center justify-center text-gray-700 dark:text-gray-300 font-bold text-sm flex-shrink-0 shadow-inner">
                                                                {(lead.contact_name || lead.title || '?').charAt(0).toUpperCase()}
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <Link href={`/crm/leads/${lead.id}`} className="font-bold text-gray-900 dark:text-white text-sm leading-tight truncate hover:text-indigo-600 dark:hover:text-indigo-400 block transition-colors">
                                                                    {lead.contact_name || lead.title}
                                                                </Link>
                                                                {lead.phone && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-1"><Phone size={10} /> {lead.phone}</p>}
                                                            </div>
                                                        </div>
                                                        
                                                        <div className="flex items-center justify-between border-t border-gray-50 dark:border-gray-700/50 pt-3">
                                                            <div className="flex flex-col gap-1">
                                                                <span className="text-xs font-black text-gray-900 dark:text-white tracking-tight">{formatCurrency(lead.deal_value)}</span>
                                                                {lead.source && (
                                                                    <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-md border ${SOURCE_COLORS[category] || SOURCE_COLORS.Other}`}>
                                                                        {lead.source}
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                <span title={`${lead.temperature || 'warm'} lead`} className={tempColor}>
                                                                    <Thermometer size={14} />
                                                                </span>
                                                                <span title={`${calculateDays(lead.created_at)} days old`} className="text-gray-400 dark:text-gray-500 flex items-center text-[10px] font-bold">
                                                                    <Clock size={12} className="mr-0.5" />
                                                                    {calculateDays(lead.created_at)}d
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </motion.div>
                                                )
                                            })}
                                        </AnimatePresence>
                                        
                                        {colLeads.length === 0 && (
                                            <div className="flex flex-col items-center justify-center py-12 text-gray-400 dark:text-gray-500 text-xs font-bold uppercase tracking-widest">
                                                <div className="w-12 h-12 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-2xl mb-3 flex items-center justify-center">
                                                    <Plus size={16} className="text-gray-300 dark:text-gray-600" />
                                                </div>
                                                Drop here
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}
