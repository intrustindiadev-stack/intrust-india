import { useState } from 'react';
import { User, Phone, Mail, MapPin, Briefcase, X } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/lib/contexts/AuthContext';
import { toast } from 'react-hot-toast';
import { motion } from 'framer-motion';
import { CrmLeadCreateSchema } from '@/lib/crm/validation';

const STATUSES = ['new', 'contacted', 'qualified', 'proposal', 'won', 'lost'];

export default function AddLeadDrawer({ onClose, onSave }) {
    const { user } = useAuth();
    const [form, setForm] = useState({ title: '', contact_name: '', phone: '', email: '', source: '', status: 'new', notes: '', state: '', city: '', area: '' });
    const [saving, setSaving] = useState(false);
    const up = (k, v) => setForm(p => ({ ...p, [k]: v }));

    const handleSave = async () => {
        const validation = CrmLeadCreateSchema.safeParse(form);
        if (!validation.success) {
            toast.error(validation.error.issues[0]?.message || 'Invalid lead details');
            return;
        }
        setSaving(true);
        try {
            const valid = validation.data;
            const { data, error } = await supabase.from('crm_leads').insert([{
                ...valid,
                title: valid.title || valid.contact_name,
                created_by: user?.id,
                assigned_to: user?.id,
            }]).select().single();
            if (error) throw error;
            toast.success('Lead added successfully!');
            onSave && onSave(data);
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
                        { label: 'State', key: 'state', icon: MapPin, placeholder: 'e.g. Maharashtra' },
                        { label: 'City', key: 'city', icon: MapPin, placeholder: 'e.g. Mumbai' },
                        { label: 'Area', key: 'area', icon: MapPin, placeholder: 'e.g. Andheri West' },
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
