'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, RefreshCw, ArrowRight } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';

const COLUMNS = [
    { id: 'new', title: 'New', color: 'border-t-blue-500', badge: 'bg-blue-100 text-blue-700' },
    { id: 'contacted', title: 'Contacted', color: 'border-t-amber-500', badge: 'bg-amber-100 text-amber-700' },
    { id: 'qualified', title: 'Qualified', color: 'border-t-indigo-500', badge: 'bg-indigo-100 text-indigo-700' },
    { id: 'proposal', title: 'Proposal', color: 'border-t-purple-500', badge: 'bg-purple-100 text-purple-700' },
    { id: 'won', title: 'Won ✓', color: 'border-t-emerald-500', badge: 'bg-emerald-100 text-emerald-700' },
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
    'Merchants': 'bg-fuchsia-50 text-fuchsia-600 border-fuchsia-200',
    'Users': 'bg-cyan-50 text-cyan-600 border-cyan-200',
    'Solar': 'bg-orange-50 text-orange-600 border-orange-200',
    'Imported': 'bg-gray-100 text-gray-600 border-gray-300',
    'Other': 'bg-slate-50 text-slate-600 border-slate-200'
};

export default function PipelinePage() {
    const [leads, setLeads] = useState([]);
    const [loading, setLoading] = useState(true);
    const [dragging, setDragging] = useState(null);
    const [sourceFilter, setSourceFilter] = useState('All');

    const fetchLeads = useCallback(async () => {
        const { data } = await supabase
            .from('crm_leads')
            .select('id, title, contact_name, phone, status, source, created_at')
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

    // Drag & Drop handlers
    const handleDragStart = (e, lead) => {
        setDragging(lead);
        e.dataTransfer.effectAllowed = 'move';
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
        <div className="p-4 sm:p-6 lg:p-8 h-screen flex flex-col gap-5">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shrink-0">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">Pipeline Board</h1>
                    <p className="text-sm text-gray-500 mt-0.5">Drag cards across stages to update status in real-time.</p>
                </div>
                <div className="flex gap-2">
                    <button onClick={fetchLeads} className="p-2.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 transition-colors">
                        <RefreshCw size={15} className="text-gray-500" />
                    </button>
                    <Link href="/crm/leads" className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white rounded-xl font-bold text-sm shadow-lg shadow-indigo-500/25 transition-all">
                        <Plus size={15} /> Add Lead
                    </Link>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-2 shrink-0">
                {SOURCES.map(src => (
                    <button
                        key={src}
                        onClick={() => setSourceFilter(src)}
                        className={`px-3.5 py-1.5 rounded-lg text-sm font-bold border transition-colors ${sourceFilter === src ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                    >
                        {src}
                    </button>
                ))}
            </div>

            {loading ? (
                <div className="flex-1 flex items-center justify-center">
                    <div className="w-8 h-8 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
                </div>
            ) : (
                <div className="flex-1 overflow-x-auto pb-4">
                    <div className="flex gap-4 h-full min-w-max">
                        {COLUMNS.map(col => {
                            const colLeads = getByStatus(col.id);
                            return (
                                <div
                                    key={col.id}
                                    onDragOver={handleDragOver}
                                    onDrop={e => handleDrop(e, col.id)}
                                    className="w-72 flex flex-col max-h-full"
                                >
                                    {/* Column header */}
                                    <div className={`px-4 py-3 rounded-t-2xl border-t-4 ${col.color} bg-white border border-b-0 border-gray-200 flex items-center justify-between shrink-0`}>
                                        <h3 className="font-bold text-gray-800 text-sm">{col.title}</h3>
                                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${col.badge}`}>{colLeads.length}</span>
                                    </div>

                                    {/* Scrollable column body */}
                                    <div className="flex-1 bg-gray-50/80 border border-gray-200 border-t-0 rounded-b-2xl p-2.5 overflow-y-auto space-y-2.5 min-h-[200px]">
                                        {colLeads.map(lead => {
                                            const category = getSourceCategory(lead.source);
                                            return (
                                                <div
                                                    key={lead.id}
                                                    draggable
                                                    onDragStart={e => handleDragStart(e, lead)}
                                                    className={`bg-white rounded-xl border border-gray-100 p-3.5 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all cursor-grab active:cursor-grabbing select-none ${dragging?.id === lead.id ? 'opacity-40' : ''}`}
                                                >
                                                    <div className="flex items-start justify-between gap-2 mb-2">
                                                        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-100 to-violet-100 flex items-center justify-center text-indigo-700 font-bold text-xs flex-shrink-0">
                                                            {(lead.contact_name || lead.title || '?').charAt(0).toUpperCase()}
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="font-semibold text-gray-900 text-sm leading-tight truncate">{lead.contact_name || lead.title}</p>
                                                            {lead.phone && <p className="text-[11px] text-gray-400 mt-0.5">{lead.phone}</p>}
                                                        </div>
                                                    </div>
                                                    {lead.source && (
                                                        <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded border mt-1 ${SOURCE_COLORS[category] || SOURCE_COLORS.Other}`}>
                                                            {lead.source}
                                                        </span>
                                                    )}
                                                </div>
                                            )
                                        })}
                                        {colLeads.length === 0 && (
                                            <div className="flex flex-col items-center justify-center py-8 text-gray-300 text-xs font-medium">
                                                <div className="w-8 h-8 border-2 border-dashed border-gray-200 rounded-xl mb-2" />
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
