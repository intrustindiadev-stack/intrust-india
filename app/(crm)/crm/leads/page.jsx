'use client';

import { useState, useEffect, useCallback } from 'react';
import { Search, Filter, Plus, Phone, Mail, ArrowUpRight, X, ChevronDown, RefreshCw, User, Building2, MapPin, Briefcase } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/lib/contexts/AuthContext';
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

const STATUSES = ['new', 'contacted', 'qualified', 'proposal', 'won', 'lost'];

const STATUS_STYLE = {
    new: 'bg-blue-50 text-blue-700 border-blue-200',
    contacted: 'bg-amber-50 text-amber-700 border-amber-200',
    qualified: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    proposal: 'bg-purple-50 text-purple-700 border-purple-200',
    won: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    lost: 'bg-rose-50 text-rose-700 border-rose-200',
};

function AddLeadDrawer({ onClose, onSave }) {
    const { user } = useAuth();
    const [form, setForm] = useState({ title: '', contact_name: '', phone: '', email: '', source: '', status: 'new', notes: '' });
    const [saving, setSaving] = useState(false);
    const up = (k, v) => setForm(p => ({ ...p, [k]: v }));

    const handleSave = async () => {
        if (!form.contact_name) { toast.error('Contact name is required'); return; }
        setSaving(true);
        try {
            const { data, error } = await supabase.from('crm_leads').insert([{
                ...form,
                title: form.title || form.contact_name,
                created_by: user?.id,
                assigned_to: user?.id,
            }]).select().single();
            if (error) throw error;
            toast.success('Lead added successfully!');
            onSave(data);
            onClose();
        } catch (err) {
            toast.error(err.message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex">
            <div className="flex-1 bg-black/40 backdrop-blur-sm" onClick={onClose} />
            <motion.div
                initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
                transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                className="w-full max-w-md bg-white flex flex-col h-full shadow-2xl"
            >
                <div className="p-5 border-b border-gray-100 flex items-center justify-between">
                    <div>
                        <h2 className="text-lg font-bold text-gray-900">Add New Lead</h2>
                        <p className="text-xs text-gray-400 mt-0.5">Fill in the prospect's details</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl transition-colors"><X size={18} className="text-gray-500" /></button>
                </div>
                <div className="flex-1 overflow-y-auto p-5 space-y-4">
                    {[
                        { label: 'Contact Name *', key: 'contact_name', icon: User, placeholder: 'Full name' },
                        { label: 'Lead Title', key: 'title', icon: Briefcase, placeholder: 'e.g. Insurance inquiry' },
                        { label: 'Phone', key: 'phone', icon: Phone, placeholder: '10-digit mobile' },
                        { label: 'Email', key: 'email', icon: Mail, placeholder: 'email@example.com', type: 'email' },
                        { label: 'Source', key: 'source', icon: MapPin, placeholder: 'e.g. Referral, Website' },
                    ].map(f => (
                        <div key={f.key}>
                            <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wider">{f.label}</label>
                            <div className="relative">
                                <f.icon size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input
                                    type={f.type || 'text'}
                                    value={form[f.key]}
                                    onChange={e => up(f.key, e.target.value)}
                                    placeholder={f.placeholder}
                                    className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
                                />
                            </div>
                        </div>
                    ))}
                    <div>
                        <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wider">Status</label>
                        <select value={form.status} onChange={e => up('status', e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                            {STATUSES.map(s => <option key={s} value={s} className="capitalize">{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wider">Notes</label>
                        <textarea value={form.notes} onChange={e => up('notes', e.target.value)} rows={3} placeholder="Initial notes..." className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none" />
                    </div>
                </div>
                <div className="p-5 border-t border-gray-100 flex gap-3">
                    <button onClick={onClose} className="flex-1 py-3 rounded-2xl border-2 border-gray-200 text-gray-600 font-semibold text-sm hover:bg-gray-50 transition-all">Cancel</button>
                    <button onClick={handleSave} disabled={saving} className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-bold text-sm disabled:opacity-60 flex items-center justify-center gap-2">
                        {saving ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Saving…</> : 'Add Lead'}
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
}

function UpdateStatusDrawer({ lead, onClose, onUpdate }) {
    const [status, setStatus] = useState(lead?.status || 'new');
    const [notes, setNotes] = useState(lead?.notes || '');
    const [saving, setSaving] = useState(false);

    const handleSave = async () => {
        setSaving(true);
        try {
            const { error } = await supabase.from('crm_leads').update({ status, notes, updated_at: new Date().toISOString() }).eq('id', lead.id);
            if (error) throw error;
            toast.success('Lead updated!');
            onUpdate({ ...lead, status, notes });
            onClose();
        } catch (err) { toast.error(err.message); }
        finally { setSaving(false); }
    };

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex">
            <div className="flex-1 bg-black/40 backdrop-blur-sm" onClick={onClose} />
            <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 30, stiffness: 300 }} className="w-full max-w-md bg-white flex flex-col h-full shadow-2xl">
                <div className="p-5 border-b border-gray-100 flex items-center justify-between">
                    <div>
                        <h2 className="text-lg font-bold text-gray-900">{lead?.contact_name || lead?.title}</h2>
                        <p className="text-xs text-gray-400 mt-0.5">Update lead status & notes</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl transition-colors"><X size={18} className="text-gray-500" /></button>
                </div>
                <div className="flex-1 p-5 space-y-4 overflow-y-auto">
                    <div className="bg-gray-50 rounded-2xl p-4 space-y-2 text-sm">
                        {lead?.phone && <p className="flex items-center gap-2 text-gray-600"><Phone size={13} className="text-gray-400" />{lead.phone}</p>}
                        {lead?.email && <p className="flex items-center gap-2 text-gray-600"><Mail size={13} className="text-gray-400" />{lead.email}</p>}
                        {lead?.source && <p className="flex items-center gap-2 text-gray-600"><MapPin size={13} className="text-gray-400" />Source: {lead.source}</p>}
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-600 mb-2 uppercase tracking-wider">Pipeline Status</label>
                        <div className="grid grid-cols-3 gap-2">
                            {STATUSES.map(s => (
                                <button key={s} onClick={() => setStatus(s)} className={`py-2 px-3 rounded-xl text-xs font-bold border-2 transition-all capitalize ${status === s ? STATUS_STYLE[s] + ' border-current' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}>
                                    {s}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-600 mb-2 uppercase tracking-wider">Notes</label>
                        <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={4} placeholder="Add call notes, follow-up reminders..." className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none" />
                    </div>
                </div>
                <div className="p-5 border-t border-gray-100 flex gap-3">
                    <button onClick={onClose} className="flex-1 py-3 rounded-2xl border-2 border-gray-200 text-gray-600 font-semibold text-sm">Cancel</button>
                    <button onClick={handleSave} disabled={saving} className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-bold text-sm disabled:opacity-60 flex items-center justify-center gap-2">
                        {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Save Changes'}
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
}

export default function LeadsPage() {
    const [leads, setLeads] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [showAdd, setShowAdd] = useState(false);
    const [selectedLead, setSelectedLead] = useState(null);

    const fetchLeads = useCallback(async () => {
        try {
            let q = supabase.from('crm_leads').select('*').order('created_at', { ascending: false });
            if (statusFilter !== 'all') q = q.eq('status', statusFilter);
            const { data, error } = await q;
            if (error) throw error;
            setLeads(data || []);
        } catch (err) {
            console.error(err);
            toast.error('Failed to load leads');
        } finally {
            setIsLoading(false);
        }
    }, [statusFilter]);

    useEffect(() => {
        fetchLeads();
        const ch = supabase.channel('crm_leads_list')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'crm_leads' }, fetchLeads)
            .subscribe();
        return () => supabase.removeChannel(ch);
    }, [fetchLeads]);

    const filtered = leads.filter(l =>
        !search ||
        l.contact_name?.toLowerCase().includes(search.toLowerCase()) ||
        l.title?.toLowerCase().includes(search.toLowerCase()) ||
        l.email?.toLowerCase().includes(search.toLowerCase()) ||
        l.phone?.includes(search)
    );

    const handleLeadAdded = (newLead) => setLeads(prev => [newLead, ...prev]);
    const handleLeadUpdated = (updated) => setLeads(prev => prev.map(l => l.id === updated.id ? updated : l));

    return (
        <div className="p-4 sm:p-6 lg:p-8 space-y-5 min-h-screen">
            <AnimatePresence>
                {showAdd && <AddLeadDrawer onClose={() => setShowAdd(false)} onSave={handleLeadAdded} />}
                {selectedLead && <UpdateStatusDrawer lead={selectedLead} onClose={() => setSelectedLead(null)} onUpdate={handleLeadUpdated} />}
            </AnimatePresence>

            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">Leads</h1>
                    <p className="text-sm text-gray-500 mt-0.5">{filtered.length} lead{filtered.length !== 1 ? 's' : ''} · tap a row to update status</p>
                </div>
                <div className="flex gap-2">
                    <button onClick={fetchLeads} className="p-2.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 transition-colors">
                        <RefreshCw size={16} className="text-gray-500" />
                    </button>
                    <button onClick={() => setShowAdd(true)} className="inline-flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white px-4 py-2.5 rounded-xl font-bold transition-all shadow-lg shadow-indigo-500/25 text-sm">
                        <Plus size={16} /> New Lead
                    </button>
                </div>
            </div>

            {/* Filter Bar */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-3 flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                    <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text" placeholder="Search by name, phone, email..."
                        value={search} onChange={e => setSearch(e.target.value)}
                        className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
                    />
                </div>
                <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500">
                    <option value="all">All Status</option>
                    {STATUSES.map(s => <option key={s} value={s} className="capitalize">{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                </select>
            </div>

            {/* Mobile cards + Desktop table */}
            {isLoading ? (
                <div className="flex justify-center py-16"><div className="w-8 h-8 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" /></div>
            ) : filtered.length === 0 ? (
                <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-16 text-center">
                    <Briefcase size={40} className="mx-auto text-gray-200 mb-3" />
                    <p className="text-gray-500 font-medium">No leads found</p>
                    <p className="text-sm text-gray-400 mt-1">{search ? 'Try a different search' : 'Add your first lead to get started'}</p>
                    <button onClick={() => setShowAdd(true)} className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl font-semibold text-sm hover:bg-indigo-700 transition-colors">
                        <Plus size={15} /> Add Lead
                    </button>
                </div>
            ) : (
                <>
                    {/* Mobile: cards */}
                    <div className="space-y-3 lg:hidden">
                        {filtered.map(lead => (
                            <motion.div key={lead.id} layout onClick={() => setSelectedLead(lead)}
                                className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 cursor-pointer hover:border-indigo-200 hover:shadow-md transition-all">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-100 to-violet-100 flex items-center justify-center text-indigo-700 font-bold flex-shrink-0">
                                            {(lead.contact_name || lead.title || '?').charAt(0).toUpperCase()}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="font-bold text-gray-900 text-sm truncate">{lead.contact_name || lead.title}</p>
                                            {lead.phone && <p className="text-xs text-gray-400 flex items-center gap-1"><Phone size={10} />{lead.phone}</p>}
                                        </div>
                                    </div>
                                    <span className={`text-xs font-bold px-2.5 py-1 rounded-lg border capitalize flex-shrink-0 ${STATUS_STYLE[lead.status] || 'bg-gray-50 border-gray-200 text-gray-600'}`}>
                                        {lead.status}
                                    </span>
                                </div>
                                {lead.source && <p className="text-xs text-gray-400 mt-2 ml-13">Source: {lead.source}</p>}
                            </motion.div>
                        ))}
                    </div>

                    {/* Desktop: table */}
                    <div className="hidden lg:block bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50 border-b border-gray-100 text-xs uppercase tracking-wider text-gray-500 font-semibold">
                                <tr>
                                    <th className="p-4 pl-6">Lead</th>
                                    <th className="p-4">Contact</th>
                                    <th className="p-4">Source</th>
                                    <th className="p-4">Status</th>
                                    <th className="p-4">Date</th>
                                    <th className="p-4 pr-6">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {filtered.map(lead => (
                                    <tr key={lead.id} onClick={() => setSelectedLead(lead)} className="hover:bg-indigo-50/20 transition-colors cursor-pointer group">
                                        <td className="p-4 pl-6">
                                            <div className="flex items-center gap-3">
                                                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-100 to-violet-100 flex items-center justify-center text-indigo-700 font-bold text-sm">
                                                    {(lead.contact_name || lead.title || '?').charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <p className="font-semibold text-gray-900 text-sm group-hover:text-indigo-600 transition-colors">{lead.contact_name || lead.title}</p>
                                                    {lead.title && lead.contact_name && <p className="text-xs text-gray-400">{lead.title}</p>}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            {lead.phone && <p className="text-xs text-gray-600 flex items-center gap-1"><Phone size={11} />{lead.phone}</p>}
                                            {lead.email && <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5"><Mail size={11} />{lead.email}</p>}
                                        </td>
                                        <td className="p-4 text-sm text-gray-500">{lead.source || '—'}</td>
                                        <td className="p-4">
                                            <span className={`text-xs font-bold px-2.5 py-1 rounded-lg border capitalize ${STATUS_STYLE[lead.status] || 'bg-gray-50 border-gray-200 text-gray-600'}`}>
                                                {lead.status}
                                            </span>
                                        </td>
                                        <td className="p-4 text-xs text-gray-400">
                                            {new Date(lead.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                                        </td>
                                        <td className="p-4 pr-6">
                                            <button className="p-2 rounded-xl bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-colors opacity-0 group-hover:opacity-100">
                                                <ArrowUpRight size={14} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </>
            )}
        </div>
    );
}
