'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { Save, Loader2, ArrowLeft, ShieldAlert } from 'lucide-react';
import Link from 'next/link';

export default function MerchantUdhariSettingsPage() {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    
    const [settings, setSettings] = useState({
        udhari_enabled: false,
        max_duration_days: 15,
        max_credit_limit_paise: 500000,
    });

    useEffect(() => {
        if (!authLoading && !user) router.push('/login');
        if (user) fetchSettings();
    }, [user, authLoading]);

    async function fetchSettings() {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const res = await fetch('/api/merchant/udhari-settings', {
                headers: { 'Authorization': `Bearer ${session?.access_token}` }
            });
            const data = await res.json();
            if (res.ok && data.settings) {
                setSettings(data.settings);
            }
        } catch (error) {
            toast.error('Failed to load store credit settings');
        } finally {
            setLoading(false);
        }
    }

    async function handleSave(e) {
        e.preventDefault();
        setSaving(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const res = await fetch('/api/merchant/udhari-settings', {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session?.access_token}`
                },
                body: JSON.stringify({
                    udhari_enabled: settings.udhari_enabled,
                    max_duration_days: parseInt(settings.max_duration_days),
                    max_credit_limit_paise: parseInt(settings.max_credit_limit_paise),
                })
            });
            
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error);
            }
            toast.success('Settings saved successfully');
        } catch (error) {
            toast.error(error.message || 'Failed to save settings');
        } finally {
            setSaving(false);
        }
    }

    if (authLoading || loading) return <div className="p-8 flex items-center justify-center"><Loader2 className="animate-spin text-amber-500" /></div>;

    return (
        <div className="max-w-3xl mx-auto">
            <div className="flex items-center gap-4 mb-8">
                <Link href="/merchant/udhari" className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                    <ArrowLeft size={20} className="text-gray-600" />
                </Link>
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Store Credit Configuration</h1>
                    <p className="text-sm text-gray-500">Manage rules for accepting deferred payments</p>
                </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-8 flex gap-3 text-amber-800">
                <ShieldAlert size={24} className="shrink-0 text-amber-600" />
                <div className="text-sm">
                    <strong>Important Compliance Notice:</strong> By enabling Store Credit, you act as the credit provider. Intrust India only provides the ledger software. You assume all risk for non-payment. You cannot charge interest or late fees per RBI regulations on Store Credit.
                </div>
            </div>

            <form onSubmit={handleSave} className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 md:p-8 space-y-8">
                
                {/* Enable Toggle */}
                <div className="flex items-center justify-between pb-6 border-b border-gray-100">
                    <div>
                        <h3 className="font-bold text-lg text-gray-900">Enable Store Credit (Pay Later)</h3>
                        <p className="text-sm text-gray-500">Allow customers to request deferred payments on your gift cards</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input
                            type="checkbox"
                            className="sr-only peer"
                            checked={settings.udhari_enabled}
                            onChange={(e) => setSettings({ ...settings, udhari_enabled: e.target.checked })}
                        />
                        <div className="w-14 h-7 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-amber-500"></div>
                    </label>
                </div>

                <div className={`space-y-6 transition-opacity duration-300 ${!settings.udhari_enabled ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
                    
                    {/* Duration */}
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Maximum Repayment Duration</label>
                        <p className="text-xs text-gray-500 mb-3">How many days do customers have to pay after approval?</p>
                        <div className="flex gap-4">
                            {[5, 10, 15].map(days => (
                                <label key={days} className="cursor-pointer">
                                    <input
                                        type="radio"
                                        name="duration"
                                        className="sr-only peer"
                                        value={days}
                                        checked={settings.max_duration_days === days}
                                        onChange={(e) => setSettings({ ...settings, max_duration_days: parseInt(e.target.value) })}
                                    />
                                    <div className="px-6 py-3 rounded-xl border-2 peer-checked:border-amber-500 peer-checked:bg-amber-50 peer-checked:text-amber-700 border-gray-200 text-gray-600 font-bold transition-all">
                                        {days} Days
                                    </div>
                                </label>
                            ))}
                        </div>
                    </div>

                    {/* Credit Limit */}
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Max Credit per Customer</label>
                        <p className="text-xs text-gray-500 mb-2">Total unpaid amount a user can have</p>
                        <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-bold">₹</span>
                            <input
                                type="number"
                                min="0"
                                step="1"
                                required
                                value={settings.max_credit_limit_paise / 100}
                                onChange={(e) => setSettings({ ...settings, max_credit_limit_paise: parseFloat(e.target.value) * 100 || 0 })}
                                className="w-full pl-8 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:bg-white transition-all font-medium"
                            />
                        </div>
                    </div>
                </div>

                <div className="flex justify-end pt-4 border-t border-gray-100">
                    <button
                        type="submit"
                        disabled={saving}
                        className="px-8 py-3 bg-gray-900 hover:bg-gray-800 text-white font-bold rounded-xl transition-all flex items-center gap-2 shadow-lg shadow-gray-200 disabled:opacity-70 text-lg"
                    >
                        {saving ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />}
                        Save Configuration
                    </button>
                </div>
            </form>
        </div>
    );
}
