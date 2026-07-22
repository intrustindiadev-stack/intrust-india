'use client';

import { useState } from 'react';
import { X, User, Phone, Mail, DollarSign, Building2, FileText, Loader2, Save, Sparkles } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/lib/contexts/AuthContext';
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

export default function NewLeadModal({ isOpen, onClose, onSuccess, defaultStatus = 'new' }) {
    const { user } = useAuth();
    const [saving, setSaving] = useState(false);
    const [formData, setFormData] = useState({
        contact_name: '',
        title: '',
        phone: '',
        email: '',
        deal_value: '',
        status: defaultStatus,
        temperature: 'warm',
        source: 'Direct Inbound',
        notes: ''
    });

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.contact_name.trim() && !formData.title.trim()) {
            toast.error('Please enter contact name or lead title.');
            return;
        }

        setSaving(true);
        try {
            const dealVal = parseFloat(formData.deal_value) || 0;
            const newRecord = {
                contact_name: formData.contact_name || formData.title,
                title: formData.title || formData.contact_name,
                phone: formData.phone,
                email: formData.email,
                deal_value: dealVal,
                status: formData.status,
                temperature: formData.temperature,
                source: formData.source,
                notes: formData.notes,
                assigned_to: user?.id,
                created_at: new Date().toISOString()
            };

            const { data, error } = await supabase
                .from('crm_leads')
                .insert([newRecord])
                .select()
                .single();

            if (error) throw error;

            toast.success('New lead created successfully! 🚀');
            if (onSuccess) onSuccess(data);
            onClose();
        } catch (err) {
            console.error('Error creating lead:', err);
            toast.error(err.message || 'Failed to create lead');
        } finally {
            setSaving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="bg-white dark:bg-gray-900 rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-gray-100 dark:border-gray-800 space-y-6 relative overflow-hidden font-[family-name:var(--font-outfit)]"
                >
                    <div className="flex justify-between items-center pb-4 border-b border-gray-100 dark:border-gray-800">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center">
                                <Sparkles size={20} />
                            </div>
                            <div>
                                <h3 className="font-extrabold text-lg text-gray-900 dark:text-white">Create New Lead</h3>
                                <p className="text-xs text-gray-500 dark:text-gray-400">Add prospect details to your pipeline</p>
                            </div>
                        </div>
                        <button onClick={onClose} className="p-2 rounded-xl text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                            <X size={18} />
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Contact Name *</label>
                                <input
                                    type="text"
                                    required
                                    value={formData.contact_name}
                                    onChange={e => setFormData({ ...formData, contact_name: e.target.value })}
                                    className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 dark:bg-gray-950 text-gray-900 dark:text-white font-semibold text-sm outline-none focus:border-indigo-500"
                                    placeholder="Rahul Sharma"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Company / Title</label>
                                <input
                                    type="text"
                                    value={formData.title}
                                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                                    className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 dark:bg-gray-950 text-gray-900 dark:text-white font-semibold text-sm outline-none focus:border-indigo-500"
                                    placeholder="Acme Enterprises"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Mobile Phone</label>
                                <input
                                    type="tel"
                                    value={formData.phone}
                                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                    className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 dark:bg-gray-950 text-gray-900 dark:text-white font-semibold text-sm outline-none focus:border-indigo-500"
                                    placeholder="+91 98765 43210"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Email Address</label>
                                <input
                                    type="email"
                                    value={formData.email}
                                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                                    className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 dark:bg-gray-950 text-gray-900 dark:text-white font-semibold text-sm outline-none focus:border-indigo-500"
                                    placeholder="rahul@acme.com"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-3 gap-3">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Deal Value (₹)</label>
                                <input
                                    type="number"
                                    value={formData.deal_value}
                                    onChange={e => setFormData({ ...formData, deal_value: e.target.value })}
                                    className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 dark:bg-gray-950 text-gray-900 dark:text-white font-semibold text-sm outline-none focus:border-indigo-500"
                                    placeholder="50000"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Stage</label>
                                <select
                                    value={formData.status}
                                    onChange={e => setFormData({ ...formData, status: e.target.value })}
                                    className="w-full px-3 py-3 rounded-xl border border-gray-200 dark:border-gray-700 dark:bg-gray-950 text-gray-900 dark:text-white font-semibold text-sm outline-none focus:border-indigo-500"
                                >
                                    <option value="new">New</option>
                                    <option value="contacted">Contacted</option>
                                    <option value="qualified">Qualified</option>
                                    <option value="proposal">Proposal</option>
                                    <option value="won">Won</option>
                                    <option value="lost">Lost</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Priority</label>
                                <select
                                    value={formData.temperature}
                                    onChange={e => setFormData({ ...formData, temperature: e.target.value })}
                                    className="w-full px-3 py-3 rounded-xl border border-gray-200 dark:border-gray-700 dark:bg-gray-950 text-gray-900 dark:text-white font-semibold text-sm outline-none focus:border-indigo-500"
                                >
                                    <option value="hot">🔥 Hot</option>
                                    <option value="warm">⚡ Warm</option>
                                    <option value="cold">❄️ Cold</option>
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Initial Notes</label>
                            <textarea
                                rows={3}
                                value={formData.notes}
                                onChange={e => setFormData({ ...formData, notes: e.target.value })}
                                className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 dark:bg-gray-950 text-gray-900 dark:text-white font-semibold text-sm outline-none focus:border-indigo-500 resize-none"
                                placeholder="Key conversation points, requirement summary..."
                            />
                        </div>

                        <div className="pt-4 flex justify-end gap-3 border-t border-gray-100 dark:border-gray-800">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-5 py-2.5 rounded-xl font-bold text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 text-sm"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={saving}
                                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-xl shadow-lg shadow-indigo-600/20 flex items-center gap-2 text-sm transition-all"
                            >
                                {saving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                                {saving ? 'Creating...' : 'Save Lead'}
                            </button>
                        </div>
                    </form>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
