'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { ArrowLeft, Save, Loader2, IndianRupee, Clock, ShieldCheck, AlertCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';
import Link from 'next/link';

export default function AdminUdhariSettingsPage({ params }) {
    const merchantId = params.id;
    const [merchant, setMerchant] = useState(null);
    const [settings, setSettings] = useState({
        udhari_enabled: false,
        max_credit_limit_paise: 500000,
        extra_fee_paise: 0,
        max_duration_days: 15,
        min_customer_age_days: 0
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            const { data: { session } } = await supabase.auth.getSession();

            // Fetch merchant profile independently — failure should not block settings
            try {
                const mRes = await fetch(`/api/admin/merchants/${merchantId}`, {
                    headers: { Authorization: `Bearer ${session.access_token}` },
                });
                if (mRes.ok) {
                    const mData = await mRes.json();
                    setMerchant(mData.merchant);
                }
            } catch (err) {
                console.error('Error fetching merchant details:', err);
            }

            // Fetch current udhari settings independently
            try {
                const sRes = await fetch(`/api/admin/merchants/${merchantId}/udhari-settings`, {
                    headers: { Authorization: `Bearer ${session.access_token}` },
                });
                if (sRes.ok) {
                    const sData = await sRes.json();
                    if (sData.settings) {
                        setSettings({
                            udhari_enabled: sData.settings.udhari_enabled || false,
                            max_credit_limit_paise: sData.settings.max_credit_limit_paise || 500000,
                            extra_fee_paise: sData.settings.extra_fee_paise || 0,
                            max_duration_days: sData.settings.max_duration_days || 15,
                            min_customer_age_days: sData.settings.min_customer_age_days || 0
                        });
                    }
                }
            } catch (err) {
                console.error('Error fetching udhari settings:', err);
                toast.error('Failed to load settings');
            }

            setLoading(false);
        };

        fetchData();
    }, [merchantId]);

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        const toastId = toast.loading('Saving settings...');

        try {
            const { data: { session } } = await supabase.auth.getSession();
            const res = await fetch(`/api/admin/merchants/${merchantId}/udhari-settings`, {
                method: 'PATCH',
                headers: { 
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${session.access_token}` 
                },
                body: JSON.stringify(settings)
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to save');

            toast.success('Settings updated successfully', { id: toastId });
        } catch (err) {
            console.error('Error saving:', err);
            toast.error(err.message || 'Error updating settings', { id: toastId });
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-20">
                <div className="w-12 h-12 border-4 border-slate-100 border-t-blue-600 rounded-full animate-spin"></div>
                <p className="mt-4 text-slate-500 font-bold">Loading setup...</p>
            </div>
        );
    }

    return (
        <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto font-[family-name:var(--font-outfit)]">
            <Link href={`/admin/merchants/${merchantId}/udhari`} className="inline-flex items-center gap-1.5 text-sm font-bold text-slate-500 hover:text-blue-600 transition-colors mb-6">
                <ArrowLeft size={16} /> Back to Requests
            </Link>

            <div className="space-y-1 mb-8">
                <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
                    Store Credit Settings
                </h1>
                <p className="text-slate-500 font-medium">
                    Manage Store Credit configuration for {merchant?.business_name || 'this merchant'}. Admin overrides.
                </p>
            </div>

            <form onSubmit={handleSave} className="space-y-6">
                {/* Enable Toggle Card */}
                <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm">
                    <div className="flex items-start justify-between gap-4">
                        <div className="flex gap-4 items-start">
                            <div className={`p-3 rounded-2xl shrink-0 ${settings.udhari_enabled ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-50 text-slate-500'}`}>
                                <ShieldCheck size={28} strokeWidth={2.5} />
                            </div>
                            <div>
                                <h3 className="text-xl font-extrabold text-slate-900">Enable Store Credit Feature</h3>
                                <p className="text-sm text-slate-500 font-medium mt-1">
                                    Allow this merchant to offer store credit (Buy Now, Pay Later) to customers.
                                </p>
                            </div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-2">
                            <input
                                type="checkbox"
                                className="sr-only peer"
                                checked={settings.udhari_enabled}
                                onChange={(e) => setSettings({ ...settings, udhari_enabled: e.target.checked })}
                            />
                            <div className="w-14 h-7 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-1 after:left-1 after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                        </label>
                    </div>
                </div>

                {/* Configuration Card */}
                <div className={`bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm transition-opacity ${!settings.udhari_enabled ? 'opacity-50 pointer-events-none' : ''}`}>
                    <h3 className="text-xl font-extrabold text-slate-900 mb-6">Credit Limits & Rules</h3>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        {/* Max Credit Limit */}
                        <div className="space-y-2">
                            <label className="block text-sm font-bold text-slate-700">Max Credit Limit (₹)</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <IndianRupee size={18} className="text-slate-400" />
                                </div>
                                <input
                                    type="number"
                                    min="0"
                                    step="1"
                                    required
                                    className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 font-bold focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none"
                                    value={settings.max_credit_limit_paise / 100}
                                    onChange={(e) => setSettings({ ...settings, max_credit_limit_paise: Math.round(parseFloat(e.target.value) * 100) || 0 })}
                                />
                            </div>
                            <p className="text-xs text-slate-500 font-medium">Maximum credit amount per request</p>
                        </div>

                        {/* Extra Fee */}
                        <div className="space-y-2">
                            <label className="block text-sm font-bold text-slate-700">Extra Fee (₹) - Hidden from customer</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <IndianRupee size={18} className="text-slate-400" />
                                </div>
                                <input
                                    type="number"
                                    min="0"
                                    step="1"
                                    required
                                    className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 font-bold focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none"
                                    value={settings.extra_fee_paise / 100}
                                    onChange={(e) => setSettings({ ...settings, extra_fee_paise: Math.round(parseFloat(e.target.value) * 100) || 0 })}
                                />
                            </div>
                            <p className="text-xs text-slate-500 font-medium">Platform fee added for providing this credit</p>
                        </div>

                        {/* Max Duration */}
                        <div className="space-y-2">
                            <label className="block text-sm font-bold text-slate-700">Max Duration (Days)</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <Clock size={18} className="text-slate-400" />
                                </div>
                                <select
                                    required
                                    className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 font-bold focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none appearance-none"
                                    value={settings.max_duration_days}
                                    onChange={(e) => setSettings({ ...settings, max_duration_days: parseInt(e.target.value) || 15 })}
                                >
                                    <option value={5}>5 Days</option>
                                    <option value={10}>10 Days</option>
                                    <option value={15}>15 Days</option>
                                </select>
                            </div>
                            <p className="text-xs text-slate-500 font-medium">Maximum days customer has to repay</p>
                        </div>

                        {/* Min Customer Age */}
                        <div className="space-y-2">
                            <label className="block text-sm font-bold text-slate-700">Min. Customer Account Age (Days)</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <AlertCircle size={18} className="text-slate-400" />
                                </div>
                                <input
                                    type="number"
                                    min="0"
                                    step="1"
                                    required
                                    className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 font-bold focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none"
                                    value={settings.min_customer_age_days}
                                    onChange={(e) => setSettings({ ...settings, min_customer_age_days: parseInt(e.target.value) || 0 })}
                                />
                            </div>
                            <p className="text-xs text-slate-500 font-medium">To prevent fraud from brand new accounts</p>
                        </div>
                    </div>
                </div>

                <div className="flex justify-end pt-4">
                    <button
                        type="submit"
                        disabled={saving}
                        className="flex items-center gap-2 px-8 py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold transition-all shadow-lg shadow-blue-600/20"
                    >
                        {saving ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />}
                        Save Settings
                    </button>
                </div>
            </form>
        </div>
    );
}
