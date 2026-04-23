'use client';

import { useState, useEffect, useMemo } from 'react';
import {
    Sun, Search, RefreshCw, ChevronDown, ChevronUp,
    Phone, Mail, MapPin, User, Filter, TrendingUp,
    CheckCircle2, Clock, XCircle, PhoneCall, Sparkles,
    IndianRupee, Home, Building2, Factory, Loader2,
    MessageSquare, Save
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { createClient } from '@/lib/supabaseClient';
import { toast } from 'react-hot-toast';

const BILL_LABEL = {
    less_1500: '< ₹1,500', '1500_2500': '₹1,500–2,500', '2500_4000': '₹2,500–4,000',
    '4000_8000': '₹4,000–8,000', more_8000: '> ₹8,000'
};

const STATUS_CONFIG = {
    new: { label: 'New', color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/20', border: 'border-blue-200 dark:border-blue-800', icon: Sparkles },
    contacted: { label: 'Contacted', color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-900/20', border: 'border-amber-200 dark:border-amber-800', icon: PhoneCall },
    qualified: { label: 'Qualified', color: 'text-violet-600', bg: 'bg-violet-50 dark:bg-violet-900/20', border: 'border-violet-200 dark:border-violet-800', icon: CheckCircle2 },
    converted: { label: 'Converted', color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-900/20', border: 'border-emerald-200 dark:border-emerald-800', icon: TrendingUp },
    lost: { label: 'Lost', color: 'text-red-500', bg: 'bg-red-50 dark:bg-red-900/20', border: 'border-red-200 dark:border-red-800', icon: XCircle },
};

const STATUS_FLOW = ['new', 'contacted', 'qualified', 'converted', 'lost'];

const PROP_ICON = { residential: Home, commercial: Building2, industrial: Factory };

export default function AdminSolarPage() {
    const supabase = createClient();
    const [leads, setLeads] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filterStatus, setFilterStatus] = useState('all');
    const [expanded, setExpanded] = useState(null);
    const [updatingId, setUpdatingId] = useState(null);
    const [notes, setNotes] = useState({});
    const [savingNotes, setSavingNotes] = useState(null);

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
            toast.success(`Status → ${STATUS_CONFIG[status].label}`);
        } else toast.error('Update failed');
        setUpdatingId(null);
    };

    const saveNotes = async (id) => {
        setSavingNotes(id);
        const { error } = await supabase.from('solar_leads').update({ notes: notes[id] }).eq('id', id);
        if (!error) {
            setLeads(prev => prev.map(l => l.id === id ? { ...l, notes: notes[id] } : l));
            toast.success('Notes saved');
        } else toast.error('Save failed');
        setSavingNotes(null);
    };

    const filtered = useMemo(() => leads.filter(l => {
        const matchSearch = [l.name, l.mobile, l.city, l.email].some(v => v?.toLowerCase().includes(search.toLowerCase()));
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

                {/* Stats */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {[
                        { label: 'Total Leads', value: stats.total, icon: Sun, color: 'text-amber-500', bg: 'bg-amber-500/10' },
                        { label: 'New Today', value: stats.today, icon: Sparkles, color: 'text-blue-500', bg: 'bg-blue-500/10' },
                        { label: 'Pending', value: stats.new, icon: Clock, color: 'text-orange-500', bg: 'bg-orange-500/10' },
                        { label: 'Converted', value: stats.converted, icon: TrendingUp, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
                    ].map((s, i) => (
                        <div key={i} className="bg-white dark:bg-white/[0.03] rounded-[2rem] border border-slate-200 dark:border-white/5 p-6 shadow-sm">
                            <div className={`w-10 h-10 ${s.bg} rounded-2xl flex items-center justify-center mb-4`}>
                                <s.icon size={20} className={s.color} />
                            </div>
                            <p className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter">{s.value}</p>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">{s.label}</p>
                        </div>
                    ))}
                </div>
            </header>

            {/* Filters */}
            <div className="max-w-7xl mx-auto mb-6 flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                    <Search size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input type="text" placeholder="Search by name, mobile, city..."
                        value={search} onChange={e => setSearch(e.target.value)}
                        className="w-full pl-14 pr-5 py-4 rounded-2xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 font-medium text-sm text-slate-900 dark:text-white transition-all" />
                </div>
                <div className="flex items-center gap-2 overflow-x-auto pb-1">
                    <Filter size={14} className="text-slate-400 shrink-0" />
                    {['all', ...STATUS_FLOW].map(s => (
                        <button key={s} onClick={() => setFilterStatus(s)}
                            className={`whitespace-nowrap px-4 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all shrink-0 ${filterStatus === s
                                ? 'bg-slate-900 dark:bg-white text-white dark:text-black shadow-lg'
                                : 'bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-500 hover:bg-slate-50'}`}>
                            {s === 'all' ? 'All' : STATUS_CONFIG[s].label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Leads List */}
            <main className="max-w-7xl mx-auto pb-20 space-y-4">
                {filtered.length === 0 ? (
                    <div className="py-32 text-center bg-white dark:bg-white/[0.02] rounded-[3rem] border-2 border-dashed border-slate-200 dark:border-white/10">
                        <Sun size={56} className="mx-auto text-slate-200 dark:text-white/10 mb-4" />
                        <h3 className="text-lg font-black text-slate-400 uppercase tracking-widest">No Leads Found</h3>
                    </div>
                ) : filtered.map(lead => {
                    const status = STATUS_CONFIG[lead.status] || STATUS_CONFIG.new;
                    const StatusIcon = status.icon;
                    const PropIcon = PROP_ICON[lead.property_type] || Home;
                    const isExp = expanded === lead.id;

                    return (
                        <div key={lead.id} className="bg-white dark:bg-white/[0.03] rounded-[2rem] border border-slate-200 dark:border-white/5 overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300">
                            {/* Row Header */}
                            <div className="flex items-center gap-4 p-5 cursor-pointer select-none"
                                onClick={() => setExpanded(isExp ? null : lead.id)}>
                                {/* Status Icon */}
                                <div className={`w-12 h-12 rounded-2xl ${status.bg} border ${status.border} flex items-center justify-center shrink-0`}>
                                    <StatusIcon size={22} className={status.color} />
                                </div>

                                {/* Info */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-0.5">
                                        <p className="font-black text-slate-900 dark:text-white text-base truncate">{lead.name}</p>
                                        <PropIcon size={13} className="text-slate-400 shrink-0" />
                                    </div>
                                    <div className="flex items-center gap-3 text-[11px] font-bold text-slate-400 flex-wrap">
                                        <span className="flex items-center gap-1"><Phone size={10} />{lead.mobile}</span>
                                        {lead.city && <span className="flex items-center gap-1"><MapPin size={10} />{lead.city}</span>}
                                        <span className="text-amber-500">{BILL_LABEL[lead.monthly_bill_range] || lead.monthly_bill_range}</span>
                                    </div>
                                </div>

                                {/* Status badge + date */}
                                <div className="hidden sm:flex flex-col items-end gap-1.5 shrink-0">
                                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${status.bg} ${status.color} ${status.border}`}>
                                        {status.label}
                                    </span>
                                    <span className="text-[10px] text-slate-400 font-medium">
                                        {new Date(lead.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                                    </span>
                                </div>

                                <div className={`text-slate-400 transition-transform duration-200 ${isExp ? 'rotate-180' : ''}`}>
                                    <ChevronDown size={18} />
                                </div>
                            </div>

                            {/* Expanded Details */}
                            <AnimatePresence>
                                {isExp && (
                                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                                        className="overflow-hidden border-t border-slate-100 dark:border-white/5">
                                        <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-6">
                                            {/* Lead Details */}
                                            <div className="space-y-3">
                                                <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                                                    <User size={12} /> Contact Details
                                                </h4>
                                                <div className={`p-4 rounded-2xl space-y-2 bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5`}>
                                                    {lead.email && <p className="text-sm font-medium text-slate-600 dark:text-slate-300 flex items-center gap-2"><Mail size={13} className="text-slate-400" />{lead.email}</p>}
                                                    {lead.pincode && <p className="text-sm font-medium text-slate-600 dark:text-slate-300 flex items-center gap-2"><MapPin size={13} className="text-slate-400" />{lead.address || ''} {lead.city} - {lead.pincode}</p>}
                                                    <p className="text-sm font-medium text-slate-600 dark:text-slate-300">Bill: <span className="text-amber-600 dark:text-amber-400 font-black">{BILL_LABEL[lead.monthly_bill_range]}</span></p>
                                                    <p className="text-sm font-medium text-slate-600 dark:text-slate-300">Type: <span className="font-black text-slate-900 dark:text-white capitalize">{lead.property_type}</span></p>
                                                    <p className="text-xs text-slate-400">Submitted: {new Date(lead.created_at).toLocaleString('en-IN')}</p>
                                                </div>

                                                {/* Notes */}
                                                <div>
                                                    <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2 mb-2">
                                                        <MessageSquare size={12} /> Notes
                                                    </h4>
                                                    <textarea
                                                        rows={3}
                                                        placeholder="Add internal notes..."
                                                        defaultValue={lead.notes || ''}
                                                        onChange={e => setNotes(prev => ({ ...prev, [lead.id]: e.target.value }))}
                                                        className="w-full px-4 py-3 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-sm text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 resize-none transition-all"
                                                    />
                                                    <button onClick={() => saveNotes(lead.id)} disabled={savingNotes === lead.id}
                                                        className="mt-2 flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-black font-black text-[10px] uppercase tracking-widest disabled:opacity-60 transition-all">
                                                        {savingNotes === lead.id ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                                                        Save Notes
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Status Controls */}
                                            <div>
                                                <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2 mb-3">
                                                    <RefreshCw size={12} /> Update Status
                                                </h4>
                                                <div className="grid grid-cols-2 gap-2">
                                                    {STATUS_FLOW.map(s => (
                                                        <button key={s} disabled={updatingId === lead.id}
                                                            onClick={() => updateStatus(lead.id, s)}
                                                            className={`py-3 px-3 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all flex items-center justify-center gap-1.5 ${lead.status === s
                                                                ? 'bg-slate-950 dark:bg-white text-white dark:text-black border-slate-950 dark:border-white shadow-lg'
                                                                : 'bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-500 hover:border-slate-400'}`}>
                                                            {updatingId === lead.id ? <Loader2 size={10} className="animate-spin" /> : null}
                                                            {STATUS_CONFIG[s].label}
                                                        </button>
                                                    ))}
                                                </div>

                                                {/* Quick Call CTA */}
                                                <a href={`tel:${lead.mobile}`}
                                                    className="mt-4 w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-amber-500 hover:bg-amber-400 text-white font-black text-sm shadow-lg shadow-amber-500/20 transition-all active:scale-95">
                                                    <Phone size={16} /> Call {lead.name.split(' ')[0]}
                                                </a>
                                            </div>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    );
                })}
            </main>
        </div>
    );
}
