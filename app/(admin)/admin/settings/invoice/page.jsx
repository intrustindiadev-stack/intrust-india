'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { 
    Save, 
    Building2, 
    MapPin, 
    Phone, 
    Mail, 
    Hash, 
    Percent, 
    FileText, 
    Loader2,
    CheckCircle2,
    AlertCircle
} from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function InvoiceSettingsPage() {
    const [settings, setSettings] = useState({
        company_name: '',
        company_address: '',
        company_phone: '',
        company_email: '',
        gst_number: '',
        sac_code: '9971',
        platform_fee_percent: 2,
        gst_percent: 18,
        disclaimer: ''
    });

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('invoice_settings')
                .select('*')
                .eq('id', '00000000-0000-0000-0000-000000000000')
                .maybeSingle();

            if (error) throw error;
            if (data) {
                setSettings({
                    ...data,
                    platform_fee_percent: parseFloat(data.platform_fee_percent) || 0,
                    gst_percent: parseFloat(data.gst_percent) || 0
                });
            }
        } catch (err) {
            console.error('Error fetching invoice settings:', err);
            setMessage({ type: 'error', text: 'Failed to load settings.' });
            toast.error('Could not sync invoice settings');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        setMessage({ type: '', text: '' });

        try {
            const { error } = await supabase
                .from('invoice_settings')
                .update({
                    ...settings,
                    updated_at: new Date().toISOString()
                })
                .eq('id', '00000000-0000-0000-0000-000000000000');

            if (error) throw error;
            setMessage({ type: 'success', text: 'Invoice settings updated successfully!' });
            toast.success('Official details saved!');
        } catch (err) {
            console.error('Error saving invoice settings:', err);
            setMessage({ type: 'error', text: 'Failed to save settings.' });
            toast.error(err.message || 'Update failed');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
                    <p className="text-slate-500 font-medium">Syncing official records...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 p-6 sm:p-10">
            <div className="max-w-4xl mx-auto space-y-8 pb-20">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Invoice Configuration</h1>
                        <p className="text-slate-500 font-medium mt-1">Manage official company details and tax logic for platform invoices.</p>
                    </div>
                    {message.text && (
                        <div className={`px-4 py-2 rounded-xl flex items-center gap-2 text-sm font-bold border animate-in fade-in slide-in-from-right-4 ${
                            message.type === 'success' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-red-50 text-red-600 border-red-100'
                        }`}>
                            {message.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                            {message.text}
                        </div>
                    )}
                </div>

                <form onSubmit={handleSave} className="space-y-8">
                    {/* Official Entity Details */}
                    <div className="bg-white rounded-[2rem] shadow-sm border border-slate-200 overflow-hidden">
                        <div className="px-8 py-6 border-b border-slate-100 flex items-center gap-3 bg-slate-50/50">
                            <Building2 className="text-blue-600" size={24} />
                            <div>
                                <h2 className="text-lg font-bold text-slate-900">Entity Details</h2>
                                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Official Company Information</p>
                            </div>
                        </div>
                        <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="md:col-span-2">
                                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Company Legal Name</label>
                                <input
                                    type="text"
                                    required
                                    value={settings.company_name}
                                    onChange={(e) => setSettings({ ...settings, company_name: e.target.value })}
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-bold text-slate-700"
                                    placeholder="e.g. Intrust Financial Services India Pvt Ltd"
                                />
                            </div>

                            <div className="md:col-span-2">
                                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                                    <MapPin size={12} /> Registered Address
                                </label>
                                <textarea
                                    required
                                    rows={3}
                                    value={settings.company_address}
                                    onChange={(e) => setSettings({ ...settings, company_address: e.target.value })}
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-bold text-slate-700"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                                    <Phone size={12} /> Support Phone
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={settings.company_phone}
                                    onChange={(e) => setSettings({ ...settings, company_phone: e.target.value })}
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-bold text-slate-700"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                                    <Mail size={12} /> Official Email
                                </label>
                                <input
                                    type="email"
                                    required
                                    value={settings.company_email}
                                    onChange={(e) => setSettings({ ...settings, company_email: e.target.value })}
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-bold text-slate-700"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Tax & Fees Configuration */}
                    <div className="bg-white rounded-[2rem] shadow-sm border border-slate-200 overflow-hidden">
                        <div className="px-8 py-6 border-b border-slate-100 flex items-center gap-3 bg-slate-50/50">
                            <Percent className="text-emerald-600" size={24} />
                            <div>
                                <h2 className="text-lg font-bold text-slate-900">Tax & Fees</h2>
                                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Default values for invoice calculations</p>
                            </div>
                        </div>
                        <div className="p-8 grid grid-cols-1 md:grid-cols-3 gap-8">
                            <div>
                                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                                    <Hash size={12} /> GST Number
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={settings.gst_number}
                                    onChange={(e) => setSettings({ ...settings, gst_number: e.target.value })}
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-bold text-slate-700"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                                    <Hash size={12} /> Default SAC Code
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={settings.sac_code}
                                    onChange={(e) => setSettings({ ...settings, sac_code: e.target.value })}
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-bold text-slate-700"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Platform Fee %</label>
                                    <input
                                        type="number"
                                        required
                                        step="0.01"
                                        value={isNaN(settings.platform_fee_percent) ? '' : settings.platform_fee_percent}
                                        onChange={(e) => setSettings({ ...settings, platform_fee_percent: e.target.value === '' ? '' : parseFloat(e.target.value) })}
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-bold text-slate-700"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">GST %</label>
                                    <input
                                        type="number"
                                        required
                                        step="0.01"
                                        value={isNaN(settings.gst_percent) ? '' : settings.gst_percent}
                                        onChange={(e) => setSettings({ ...settings, gst_percent: e.target.value === '' ? '' : parseFloat(e.target.value) })}
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-bold text-slate-700"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Legal Disclaimer */}
                    <div className="bg-white rounded-[2rem] shadow-sm border border-slate-200 overflow-hidden">
                        <div className="px-8 py-6 border-b border-slate-100 flex items-center gap-3 bg-slate-50/50">
                            <FileText className="text-amber-600" size={24} />
                            <div>
                                <h2 className="text-lg font-bold text-slate-900">Legal Disclaimer</h2>
                                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Footer text for printed invoices</p>
                            </div>
                        </div>
                        <div className="p-8">
                            <textarea
                                required
                                rows={4}
                                value={settings.disclaimer}
                                onChange={(e) => setSettings({ ...settings, disclaimer: e.target.value })}
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-bold text-slate-700"
                                placeholder="..."
                            />
                        </div>
                    </div>

                    {/* Action Bar */}
                    <div className="flex items-center justify-end pt-4 pb-20">
                        <button
                            type="submit"
                            disabled={saving}
                            className="flex items-center gap-3 px-12 py-5 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-[0.2em] text-xs hover:scale-105 transition-all shadow-2xl shadow-slate-900/20 disabled:opacity-50 disabled:scale-100 active:scale-95"
                        >
                            {saving ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Updating...
                                </>
                            ) : (
                                <>
                                    <Save size={18} />
                                    Save Official Details
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
