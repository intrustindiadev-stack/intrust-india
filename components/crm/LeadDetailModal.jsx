'use client';

import { useState, useEffect } from 'react';
import { X, Phone, Mail, DollarSign, Calendar, Tag, FileText, CheckCircle, XCircle, Save, Loader2, Award, Clock, ArrowRight, UserCheck } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

const STATUS_OPTIONS = ['new', 'contacted', 'qualified', 'proposal', 'won', 'lost'];

export default function LeadDetailModal({ lead, isOpen, onClose, onUpdate }) {
    const [saving, setSaving] = useState(false);
    const [status, setStatus] = useState(lead?.status || 'new');
    const [temperature, setTemperature] = useState(lead?.temperature || 'warm');
    const [dealValue, setDealValue] = useState(lead?.deal_value || '');
    const [notes, setNotes] = useState(lead?.notes || '');
    const [callLog, setCallLog] = useState('');
    const [callHistory, setCallHistory] = useState(lead?.call_history || []);

    useEffect(() => {
        if (lead) {
            setStatus(lead.status || 'new');
            setTemperature(lead.temperature || 'warm');
            setDealValue(lead.deal_value || '');
            setNotes(lead.notes || '');
            setCallHistory(lead.call_history || []);
        }
    }, [lead]);

    if (!isOpen || !lead) return null;

    const handleSave = async () => {
        setSaving(true);
        try {
            const updatedData = {
                status,
                temperature,
                deal_value: parseFloat(dealValue) || 0,
                notes,
                call_history: callHistory,
                updated_at: new Date().toISOString()
            };

            const { data, error } = await supabase
                .from('crm_leads')
                .update(updatedData)
                .eq('id', lead.id)
                .select()
                .single();

            if (error) throw error;

            toast.success('Lead updated successfully!');
            if (onUpdate) onUpdate(data || { ...lead, ...updatedData });
            onClose();
        } catch (err) {
            console.error('Error updating lead:', err);
            toast.error(err.message || 'Failed to update lead');
        } finally {
            setSaving(false);
        }
    };

    const handleAddCallNote = () => {
        if (!callLog.trim()) return;
        const newLog = {
            id: Date.now(),
            note: callLog,
            date: new Date().toISOString()
        };
        setCallHistory(prev => [newLog, ...prev]);
        setCallLog('');
        toast.success('Call log added!');
    };

    const formatCurrency = (val) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val || 0);

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="bg-white dark:bg-gray-900 rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-gray-100 dark:border-gray-800 space-y-6 max-h-[90vh] overflow-y-auto font-[family-name:var(--font-outfit)]"
                >
                    {/* Top Header */}
                    <div className="flex justify-between items-start pb-4 border-b border-gray-100 dark:border-gray-800">
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center text-white font-black text-2xl shadow-lg shadow-indigo-500/20 shrink-0">
                                {(lead.contact_name || lead.title || 'L').charAt(0).toUpperCase()}
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <h2 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">{lead.contact_name || 'Lead Details'}</h2>
                                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-black uppercase ${temperature === 'hot' ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400' : 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400'}`}>
                                        {temperature}
                                    </span>
                                </div>
                                <p className="text-sm font-bold text-gray-500 dark:text-gray-400 mt-0.5">{lead.title || 'Inbound Prospect'}</p>
                            </div>
                        </div>
                        <button onClick={onClose} className="p-2 rounded-xl text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800">
                            <X size={18} />
                        </button>
                    </div>

                    {/* Quick Call / Email Bar */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {lead.phone ? (
                            <a
                                href={`tel:${lead.phone}`}
                                className="flex items-center justify-center gap-2 p-3 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/50 rounded-2xl font-bold text-xs hover:bg-emerald-100 transition-colors"
                            >
                                <Phone size={14} /> Call {lead.phone}
                            </a>
                        ) : (
                            <div className="flex items-center justify-center gap-2 p-3 bg-gray-50 dark:bg-gray-800 text-gray-400 rounded-2xl font-semibold text-xs">
                                No Phone
                            </div>
                        )}

                        {lead.email ? (
                            <a
                                href={`mailto:${lead.email}`}
                                className="flex items-center justify-center gap-2 p-3 bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-900/50 rounded-2xl font-bold text-xs hover:bg-blue-100 transition-colors"
                            >
                                <Mail size={14} /> Email Lead
                            </a>
                        ) : (
                            <div className="flex items-center justify-center gap-2 p-3 bg-gray-50 dark:bg-gray-800 text-gray-400 rounded-2xl font-semibold text-xs">
                                No Email
                            </div>
                        )}

                        <div className="col-span-2 sm:col-span-1 flex items-center justify-center gap-1.5 p-3 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-900/50 rounded-2xl font-black text-sm">
                            <DollarSign size={16} /> {formatCurrency(dealValue)}
                        </div>
                    </div>

                    {/* Stage & Temperature Selector Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 bg-gray-50 dark:bg-gray-950 rounded-2xl border border-gray-100 dark:border-gray-800">
                        <div>
                            <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Pipeline Stage</label>
                            <select
                                value={status}
                                onChange={e => setStatus(e.target.value)}
                                className="w-full px-3 py-2 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white font-bold text-sm outline-none"
                            >
                                {STATUS_OPTIONS.map(st => (
                                    <option key={st} value={st}>{st.toUpperCase()}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Lead Temperature</label>
                            <select
                                value={temperature}
                                onChange={e => setTemperature(e.target.value)}
                                className="w-full px-3 py-2 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white font-bold text-sm outline-none"
                            >
                                <option value="hot">🔥 Hot Priority</option>
                                <option value="warm">⚡ Warm Interest</option>
                                <option value="cold">❄️ Cold Prospect</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Deal Value (₹)</label>
                            <input
                                type="number"
                                value={dealValue}
                                onChange={e => setDealValue(e.target.value)}
                                className="w-full px-3 py-2 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white font-bold text-sm outline-none"
                                placeholder="50000"
                            />
                        </div>
                    </div>

                    {/* Activity & Call Logging */}
                    <div className="space-y-3">
                        <h4 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                            <Clock size={16} className="text-indigo-500" /> Log Call / Activity Note
                        </h4>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={callLog}
                                onChange={e => setCallLog(e.target.value)}
                                placeholder="Called prospect: discussed gift card bulk discounts..."
                                className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 dark:bg-gray-950 text-gray-900 dark:text-white font-semibold text-sm outline-none focus:border-indigo-500"
                            />
                            <button
                                type="button"
                                onClick={handleAddCallNote}
                                className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl transition-all shrink-0"
                            >
                                Add Note
                            </button>
                        </div>

                        {callHistory.length > 0 && (
                            <div className="space-y-2 max-h-36 overflow-y-auto pt-2">
                                {callHistory.map(item => (
                                    <div key={item.id} className="p-3 bg-gray-50 dark:bg-gray-800/60 rounded-xl text-xs space-y-0.5 border border-gray-100 dark:border-gray-700">
                                        <p className="font-semibold text-gray-800 dark:text-gray-200">{item.note}</p>
                                        <p className="text-[10px] font-bold text-gray-400">{new Date(item.date).toLocaleString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Overall Notes Textarea */}
                    <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Lead Requirement Notes</label>
                        <textarea
                            rows={3}
                            value={notes}
                            onChange={e => setNotes(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 dark:bg-gray-950 text-gray-900 dark:text-white font-semibold text-sm outline-none focus:border-indigo-500 resize-none"
                            placeholder="Detailed notes regarding this lead..."
                        />
                    </div>

                    {/* Bottom Action Footer */}
                    <div className="pt-4 flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 dark:border-gray-800">
                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={() => { setStatus('won'); handleSave(); }}
                                className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-black rounded-xl text-xs shadow-md shadow-emerald-500/20"
                            >
                                Mark Won 🎉
                            </button>
                            <button
                                type="button"
                                onClick={() => { setStatus('lost'); handleSave(); }}
                                className="px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white font-black rounded-xl text-xs shadow-md shadow-rose-500/20"
                            >
                                Mark Lost
                            </button>
                        </div>

                        <div className="flex gap-3">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-4 py-2.5 rounded-xl font-bold text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 text-xs"
                            >
                                Close
                            </button>
                            <button
                                type="button"
                                onClick={handleSave}
                                disabled={saving}
                                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-xl shadow-lg shadow-indigo-600/20 flex items-center gap-2 text-xs transition-all"
                            >
                                {saving ? <Loader2 className="animate-spin" size={14} /> : <Save size={14} />}
                                {saving ? 'Saving...' : 'Save Lead Updates'}
                            </button>
                        </div>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
