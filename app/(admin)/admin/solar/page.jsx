'use client';

import { useState, useEffect, useMemo } from 'react';
import { Sun, RefreshCw } from 'lucide-react';
import { createClient } from '@/lib/supabaseClient';
import { toast } from 'react-hot-toast';
import SolarStats from '@/components/solar/admin/SolarStats';
import SolarLeadFilters from '@/components/solar/admin/SolarLeadFilters';
import SolarLeadTable from '@/components/solar/admin/SolarLeadTable';

export default function AdminSolarPage() {
    const supabase = createClient();
    const [leads, setLeads] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filterStatus, setFilterStatus] = useState('all');
    const [updatingId, setUpdatingId] = useState(null);
    const [savingNotesId, setSavingNotesId] = useState(null);

    const fetchLeads = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('solar_leads')
            .select('*')
            .order('created_at', { ascending: false });
        if (!error) setLeads(data || []);
        else toast.error('Failed to load leads');
        setLoading(false);
    };

    useEffect(() => { fetchLeads(); }, []);

    const updateStatus = async (id, status) => {
        setUpdatingId(id);
        const { error } = await supabase.from('solar_leads').update({ status }).eq('id', id);
        if (!error) {
            setLeads(prev => prev.map(l => l.id === id ? { ...l, status } : l));
            toast.success(`Status updated successfully`);
        } else toast.error('Update failed');
        setUpdatingId(null);
    };

    const saveNotes = async (id, notesContent) => {
        setSavingNotesId(id);
        const { error } = await supabase.from('solar_leads').update({ internal_notes: notesContent }).eq('id', id);
        if (!error) {
            setLeads(prev => prev.map(l => l.id === id ? { ...l, internal_notes: notesContent } : l));
            toast.success('Notes saved');
        } else toast.error('Save failed');
        setSavingNotesId(null);
    };

    const filtered = useMemo(() => leads.filter(l => {
        const matchSearch = [l.name, l.mobile, l.city, l.email, l.reference_code]
            .some(v => v?.toLowerCase().includes(search.toLowerCase()));
        const matchStatus = filterStatus === 'all' || l.status === filterStatus;
        return matchSearch && matchStatus;
    }), [leads, search, filterStatus]);

    const stats = useMemo(() => ({
        total: leads.length,
        new: leads.filter(l => l.status === 'new').length,
        converted: leads.filter(l => l.status === 'converted').length,
        today: leads.filter(l => new Date(l.created_at).toDateString() === new Date().toDateString()).length,
    }), [leads]);

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center">
            <RefreshCw size={32} className="animate-spin text-amber-500" />
        </div>
    );

    return (
        <div className="min-h-screen bg-[#fcfdfe] dark:bg-black lg:p-10 p-4 font-[family-name:var(--font-outfit)]">
            {/* Header */}
            <header className="max-w-7xl mx-auto mb-10">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
                    <div className="space-y-3">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[10px] font-black uppercase tracking-[0.2em] border border-amber-500/20">
                            <Sun size={12} /> Solar Service Admin
                        </div>
                        <h1 className="text-5xl sm:text-6xl font-black text-slate-950 dark:text-white tracking-tight leading-none">
                            Solar <span className="text-amber-500">Leads.</span>
                        </h1>
                    </div>
                    <button onClick={fetchLeads} className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400 font-black text-sm hover:bg-slate-50 transition-all">
                        <RefreshCw size={16} /> Refresh
                    </button>
                </div>

                <SolarStats stats={stats} />
            </header>

            <div className="max-w-7xl mx-auto mb-6">
                <SolarLeadFilters 
                    search={search} 
                    setSearch={setSearch} 
                    filterStatus={filterStatus} 
                    setFilterStatus={setFilterStatus} 
                />
            </div>

            <main className="max-w-7xl mx-auto pb-20 space-y-4">
                {filtered.length === 0 ? (
                    <div className="py-32 text-center bg-white dark:bg-white/[0.02] rounded-[3rem] border-2 border-dashed border-slate-200 dark:border-white/10">
                        <Sun size={56} className="mx-auto text-slate-200 dark:text-white/10 mb-4" />
                        <h3 className="text-lg font-black text-slate-400 uppercase tracking-widest">No Leads Found</h3>
                    </div>
                ) : (
                    <SolarLeadTable 
                        leads={filtered} 
                        updatingId={updatingId} 
                        savingNotesId={savingNotesId} 
                        onUpdateStatus={updateStatus} 
                        onSaveNotes={saveNotes} 
                    />
                )}
            </main>
        </div>
    );
}
