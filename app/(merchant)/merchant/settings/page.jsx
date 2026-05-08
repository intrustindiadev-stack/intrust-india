'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useSearchParams } from 'next/navigation';
import toast from 'react-hot-toast';
import Link from 'next/link';

export default function MerchantSettingsPage() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [success, setSuccess] = useState(null);
    const [error, setError] = useState(null);
    const [activeTab, setActiveTab] = useState('business');

    const [merchantProfile, setMerchantProfile] = useState(null);
    const [userProfile, setUserProfile] = useState(null);
    const [kycStatus, setKycStatus] = useState(null);

    const [formData, setFormData] = useState({
        business_name: '',
        gst_number: '',
        pan_number: '',
        business_phone: '',
        business_email: '',
    });

    const [bankData, setBankData] = useState({
        account_holder_name: '',
        account_number: '',
        confirm_account_number: '',
        ifsc: '',
        bank_name: '',
    });
    const [savingBank, setSavingBank] = useState(false);

    const [notifSettings, setNotifSettings] = useState({
        email_notifications: true,
        purchase_notifications: true,
        sale_notifications: true,
        marketing_updates: false,
        whatsapp_notifications: true,
    });
    const searchParams = useSearchParams();

    useEffect(() => {
        const tab = searchParams.get('tab');
        if (tab && ['business', 'bank', 'account', 'notifications', 'whatsapp', 'store'].includes(tab)) {
            setActiveTab(tab);
        }
    }, [searchParams]);

    useEffect(() => {
        fetchSettings();
    }, []);

    useEffect(() => {
        if (!merchantProfile?.id) return;

        const channel = supabase
            .channel(`merchant_self_sync_${merchantProfile.id}`)
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'merchants', filter: `id=eq.${merchantProfile.id}` }, (payload) => {
                if (payload.new) {
                    setMerchantProfile(prev => ({ ...prev, is_open: payload.new.is_open }));
                }
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [merchantProfile?.id]);

    const fetchSettings = async () => {
        try {
            setLoading(true);

            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');

            const { data: profile } = await supabase
                .from('user_profiles')
                .select('*')
                .eq('id', user.id)
                .single();

            setUserProfile(profile);

            const { data: merchant } = await supabase
                .from('merchants')
                .select('*')
                .eq('user_id', user.id)
                .single();

            setMerchantProfile(merchant);

            const { data: kyc } = await supabase
                .from('kyc_records')
                .select('status')
                .eq('user_id', user.id)
                .single();

            setKycStatus(kyc?.status);

            setBankData({
                account_holder_name: merchant?.bank_account_name || merchant?.bank_data?.account_holder_name || '',
                account_number: merchant?.bank_account_number || merchant?.bank_data?.account_number || '',
                confirm_account_number: merchant?.bank_account_number || merchant?.bank_data?.account_number || '',
                ifsc: merchant?.bank_ifsc_code || merchant?.bank_data?.ifsc || '',
                bank_name: merchant?.bank_name || merchant?.bank_data?.bank_name || '',
            });

            setFormData({
                business_name: merchant?.business_name || '',
                gst_number: merchant?.gst_number || '',
                pan_number: merchant?.pan_number || '',
                business_phone: merchant?.business_phone || profile?.phone || '',
                business_email: merchant?.business_email || user.email || '',
            });

            // Fetch notification settings
            try {
                const { data: { session } } = await supabase.auth.getSession();
                const response = await fetch('/api/merchant/notification-settings', {
                    headers: {
                        'Authorization': `Bearer ${session?.access_token}`
                    }
                });
                const notifData = await response.json();
                if (notifData.success) {
                    setNotifSettings(notifData.settings);
                }
            } catch (err) {
                console.error('Error fetching notification settings:', err);
            }
        } catch (error) {
            console.error('Error fetching settings:', error);
            setError(error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        try {
            setSaving(true);
            setError(null);
            setSuccess(null);

            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');

            const { error: updateError } = await supabase
                .from('merchants')
                .update({
                    business_name: formData.business_name,
                    gst_number: formData.gst_number,
                    pan_number: formData.pan_number,
                    business_phone: formData.business_phone,
                    business_email: formData.business_email,
                })
                .eq('user_id', user.id);

            if (updateError) throw updateError;

            setSuccess('Settings updated successfully!');
            await fetchSettings();
        } catch (error) {
            console.error('Error saving settings:', error);
            setError(error.message);
        } finally {
            setSaving(false);
        }
    };

    const handleSaveBank = async () => {
        if (!bankData.account_holder_name || !bankData.account_number || !bankData.ifsc) {
            setError('Account holder name, account number, and IFSC are required.');
            return;
        }
        if (bankData.account_number !== bankData.confirm_account_number) {
            setError('Account numbers do not match.');
            return;
        }
        setSavingBank(true);
        setError(null);
        setSuccess(null);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error('Not authenticated');

            const response = await fetch('/api/merchant/bank-details', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`
                },
                body: JSON.stringify({
                    bank_account_name: bankData.account_holder_name,
                    bank_account_number: bankData.account_number,
                    bank_ifsc_code: bankData.ifsc,
                    bank_name: bankData.bank_name,
                }),
            });

            const result = await response.json();
            if (!response.ok) throw new Error(result.error || 'Failed to save bank details');

            setSuccess('Bank details saved! Pending admin verification.');
            await fetchSettings();
        } catch (err) {
            setError(err.message);
        } finally {
            setSavingBank(false);
        }
    };

    const tabs = [
        { id: 'business', label: 'Business Info', icon: 'business' },
        { id: 'store', label: 'Store Status', icon: 'storefront' },
        { id: 'bank', label: 'Bank Account', icon: 'account_balance' },
        { id: 'account', label: 'Account', icon: 'shield' },
        { id: 'notifications', label: 'Notifications', icon: 'notifications' },
        { id: 'whatsapp', label: 'WhatsApp', icon: 'chat' },
    ];

    if (loading) {
        return (
            <div className="relative min-h-[60vh] flex items-center justify-center">
                <span className="material-icons-round animate-spin text-[#D4AF37] text-4xl">autorenew</span>
            </div>
        );
    }

    return (
        <div className="relative">
            {/* Background embellishments */}
            <div className="fixed top-[-10%] left-[-5%] w-[40%] h-[40%] bg-[#D4AF37]/10 rounded-full blur-[120px] pointer-events-none -z-10"></div>
            <div className="fixed bottom-[-10%] right-[-5%] w-[40%] h-[40%] bg-blue-500/5 rounded-full blur-[120px] pointer-events-none -z-10 dark:opacity-20"></div>

            <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 mt-4 sm:mt-6 gap-2 sm:gap-4">
                <div>
                    <h1 className="font-display text-2xl sm:text-4xl font-bold text-slate-800 dark:text-slate-100 mb-1">Settings</h1>
                    <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 font-medium">Manage your account and preferences</p>
                </div>
            </div>

            {/* Alerts */}
            {error && (
                <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-3 shadow-sm">
                    <span className="material-icons-round text-red-600 dark:text-red-400 mt-0.5">error_outline</span>
                    <div>
                        <h3 className="font-bold text-red-600 dark:text-red-400">Error</h3>
                        <p className="text-sm text-red-500 dark:text-red-400/80 font-medium">{error}</p>
                    </div>
                </div>
            )}

            {success && (
                <div className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-start gap-3 shadow-sm">
                    <span className="material-icons-round text-emerald-600 dark:text-emerald-400 mt-0.5">check_circle</span>
                    <div>
                        <h3 className="font-bold text-emerald-600 dark:text-emerald-400">Success</h3>
                        <p className="text-sm text-emerald-600 dark:text-emerald-400/80 font-medium">{success}</p>
                    </div>
                </div>
            )}

            {/* Tabs */}
            <div className="flex gap-2 mb-8 bg-black/5 dark:bg-white/5 p-1.5 rounded-2xl w-fit border border-black/5 dark:border-white/5 overflow-x-auto shadow-sm">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all focus:outline-none whitespace-nowrap ${activeTab === tab.id
                            ? 'bg-[#D4AF37] text-[#020617] shadow-lg shadow-[#D4AF37]/20 gold-glow'
                            : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5'
                            }`}
                    >
                        <span className="material-icons-round text-sm">{tab.icon}</span>
                        <span className="hidden sm:inline">{tab.label}</span>
                    </button>
                ))}
            </div>

            {/* Content Container */}
            <div className="merchant-glass rounded-3xl border border-black/5 dark:border-white/5 overflow-hidden shadow-xl mb-12">
                {activeTab === 'store' && (
                    <div className="p-5 sm:p-8">
                        <h2 className="text-2xl font-display font-bold text-slate-800 dark:text-slate-100 mb-2 flex items-center border-b border-black/5 dark:border-white/5 pb-4">
                            <span className="material-icons-round text-[#D4AF37] mr-3">storefront</span>
                            Store Management
                        </h2>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mb-8">
                            Control your store's visibility and operating hours. Users cannot place orders when the store is closed.
                        </p>
                        <div className="space-y-8 max-w-2xl">
                            {/* Manual Toggle */}
                            <div className="flex items-center justify-between p-6 bg-black/5 dark:bg-white/5 rounded-2xl border border-black/5 dark:border-white/10 group hover:border-[#D4AF37]/30 transition-colors shadow-sm">
                                <div>
                                    <p className="font-bold text-slate-800 dark:text-slate-100 flex items-center">
                                        <span className="material-icons-round text-[#D4AF37] mr-2 text-sm">power_settings_new</span>
                                        Store Availability
                                    </p>
                                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 font-medium">
                                        Manually toggle your store online or offline.
                                    </p>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        className="sr-only peer"
                                        checked={merchantProfile?.is_open}
                                        onChange={async (e) => {
                                            const newVal = e.target.checked;
                                            setMerchantProfile(prev => ({ ...prev, is_open: newVal }));
                                            try {
                                                const { error } = await supabase
                                                    .from('merchants')
                                                    .update({ is_open: newVal })
                                                    .eq('id', merchantProfile.id);
                                                if (error) throw error;
                                                toast.success(`Store is now ${newVal ? 'OPEN' : 'CLOSED'}`);
                                            } catch (err) {
                                                setMerchantProfile(prev => ({ ...prev, is_open: !newVal }));
                                                toast.error('Failed to update status');
                                            }
                                        }}
                                    />
                                    <div className="w-14 h-7 bg-slate-300 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-[#D4AF37]"></div>
                                </label>
                            </div>

                            {/* Store Credit Card */}
                            <div className="flex items-center justify-between p-6 bg-black/5 dark:bg-white/5 rounded-2xl border border-black/5 dark:border-white/10 group hover:border-[#D4AF37]/30 transition-colors shadow-sm">
                                <div className="flex items-center gap-4">
                                    <div className="w-11 h-11 bg-[#D4AF37]/10 border border-[#D4AF37]/30 rounded-xl flex items-center justify-center">
                                        <span className="material-icons-round text-[#D4AF37]">credit_card</span>
                                    </div>
                                    <div>
                                        <p className="font-bold text-slate-800 dark:text-slate-100">
                                            Store Credit (Pay Later)
                                        </p>
                                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-medium">
                                            Configure udhari limits and repayment rules
                                        </p>
                                    </div>
                                </div>
                                <Link
                                    href="/merchant/settings/udhari"
                                    className="px-4 py-2 border border-[#D4AF37]/50 rounded-xl text-[#B8860B] font-bold text-xs hover:bg-[#D4AF37] hover:text-white transition-all whitespace-nowrap"
                                >
                                    Configure →
                                </Link>
                            </div>
                        </div>

                    </div>
                )}

                {activeTab === 'business' && (
                    <div className="p-5 sm:p-8">
                        <h2 className="text-2xl font-display font-bold text-slate-800 dark:text-slate-100 mb-8 flex items-center border-b border-black/5 dark:border-white/5 pb-4">
                            <span className="material-icons-round text-[#D4AF37] mr-3">storefront</span>
                            Business Information
                        </h2>

                        <div className="space-y-6 max-w-2xl">

                            <div className="group">
                                <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-2 group-focus-within:text-[#D4AF37] transition-colors">
                                    Business Name
                                </label>
                                <input
                                    type="text"
                                    value={formData.business_name}
                                    onChange={(e) => setFormData({ ...formData, business_name: e.target.value })}
                                    className="w-full px-5 py-4 bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10 rounded-xl focus:outline-none focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37] text-slate-800 dark:text-slate-100 font-medium transition-all"
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="group">
                                    <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-2 group-focus-within:text-[#D4AF37] transition-colors">
                                        GST Number
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.gst_number}
                                        onChange={(e) => setFormData({ ...formData, gst_number: e.target.value })}
                                        placeholder="22AAAAA0000A1Z5"
                                        className="w-full px-5 py-4 bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10 rounded-xl focus:outline-none focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37] text-slate-800 dark:text-slate-100 font-medium transition-all"
                                    />
                                </div>

                                <div className="group">
                                    <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-2 group-focus-within:text-[#D4AF37] transition-colors">
                                        PAN Number
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.pan_number}
                                        onChange={(e) => setFormData({ ...formData, pan_number: e.target.value.toUpperCase() })}
                                        placeholder="ABCDE1234F"
                                        maxLength={10}
                                        className="w-full px-5 py-4 bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10 rounded-xl focus:outline-none focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37] text-slate-800 dark:text-slate-100 font-medium transition-all"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="group">
                                    <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-2 group-focus-within:text-[#D4AF37] transition-colors">
                                        Business Phone
                                    </label>
                                    <input
                                        type="tel"
                                        value={formData.business_phone}
                                        onChange={(e) => setFormData({ ...formData, business_phone: e.target.value })}
                                        className="w-full px-5 py-4 bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10 rounded-xl focus:outline-none focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37] text-slate-800 dark:text-slate-100 font-medium transition-all"
                                    />
                                </div>

                                <div className="group">
                                    <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-2 group-focus-within:text-[#D4AF37] transition-colors">
                                        Business Email
                                    </label>
                                    <input
                                        type="email"
                                        value={formData.business_email}
                                        onChange={(e) => setFormData({ ...formData, business_email: e.target.value })}
                                        className="w-full px-5 py-4 bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10 rounded-xl focus:outline-none focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37] text-slate-800 dark:text-slate-100 font-medium transition-all"
                                    />
                                </div>
                            </div>

                            <div className="pt-8 border-t border-black/5 dark:border-white/5">
                                <button
                                    onClick={handleSave}
                                    disabled={saving}
                                    className="px-10 py-4 bg-[#D4AF37] text-[#020617] font-bold rounded-xl hover:bg-opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-2 gold-glow shadow-lg shadow-[#D4AF37]/20"
                                >
                                    {saving ? (
                                        <>
                                            <span className="material-icons-round animate-spin text-sm">autorenew</span>
                                            <span>Saving...</span>
                                        </>
                                    ) : (
                                        <>
                                            <span className="material-icons-round text-sm">save</span>
                                            <span>Save Changes</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'bank' && (
                    <div className="p-5 sm:p-8">
                        <h2 className="text-2xl font-display font-bold text-slate-800 dark:text-slate-100 mb-2 flex items-center border-b border-black/5 dark:border-white/5 pb-4">
                            <span className="material-icons-round text-[#D4AF37] mr-3">account_balance</span>
                            Bank Account Details
                        </h2>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mb-8">
                            Enter your bank details to enable withdrawals. An admin will verify your account before payouts are allowed.
                        </p>

                        {/* Verification status banner */}
                        <div className={`flex items-center gap-3 p-4 rounded-2xl mb-8 border ${merchantProfile?.bank_verified
                            ? 'bg-emerald-500/10 border-emerald-500/20'
                            : 'bg-amber-500/10 border-amber-500/20'
                            }`}>
                            <span className={`material-icons-round text-2xl ${merchantProfile?.bank_verified ? 'text-emerald-500' : 'text-amber-500'
                                }`}>
                                {merchantProfile?.bank_verified ? 'verified' : 'pending'}
                            </span>
                            <div>
                                <p className={`font-bold text-sm ${merchantProfile?.bank_verified ? 'text-emerald-700 dark:text-emerald-400' : 'text-amber-700 dark:text-amber-400'
                                    }`}>
                                    {merchantProfile?.bank_verified ? 'Bank Account Verified' : 'Pending Verification'}
                                </p>
                                <p className="text-xs text-slate-500 dark:text-slate-400">
                                    {merchantProfile?.bank_verified
                                        ? 'Your bank account is verified. You can request withdrawals.'
                                        : 'Save your bank details below. Our team will verify them within 24 hours.'}
                                </p>
                            </div>
                        </div>

                        <div className="space-y-5 max-w-2xl">
                            <div className="group">
                                <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-2 group-focus-within:text-[#D4AF37] transition-colors">
                                    Account Holder Name
                                </label>
                                <input
                                    type="text"
                                    value={bankData.account_holder_name}
                                    onChange={(e) => setBankData({ ...bankData, account_holder_name: e.target.value.toUpperCase() })}
                                    placeholder="As per bank records"
                                    className="w-full px-5 py-4 bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10 rounded-xl focus:outline-none focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37] text-slate-800 dark:text-slate-100 font-medium transition-all"
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <div className="group">
                                    <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-2 group-focus-within:text-[#D4AF37] transition-colors">
                                        Account Number
                                    </label>
                                    <input
                                        type="text"
                                        value={bankData.account_number}
                                        onChange={(e) => setBankData({ ...bankData, account_number: e.target.value.replace(/\D/g, '') })}
                                        placeholder="Enter account number"
                                        className="w-full px-5 py-4 bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10 rounded-xl focus:outline-none focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37] text-slate-800 dark:text-slate-100 font-medium font-mono transition-all"
                                    />
                                </div>
                                <div className="group">
                                    <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-2 group-focus-within:text-[#D4AF37] transition-colors">
                                        Confirm Account Number
                                    </label>
                                    <input
                                        type="text"
                                        value={bankData.confirm_account_number}
                                        onChange={(e) => setBankData({ ...bankData, confirm_account_number: e.target.value.replace(/\D/g, '') })}
                                        placeholder="Re-enter account number"
                                        className={`w-full px-5 py-4 bg-black/5 dark:bg-white/5 border rounded-xl focus:outline-none focus:ring-1 text-slate-800 dark:text-slate-100 font-medium font-mono transition-all ${bankData.confirm_account_number && bankData.account_number !== bankData.confirm_account_number
                                            ? 'border-red-400 focus:border-red-400 focus:ring-red-400'
                                            : 'border-black/5 dark:border-white/10 focus:border-[#D4AF37] focus:ring-[#D4AF37]'
                                            }`}
                                    />
                                    {bankData.confirm_account_number && bankData.account_number !== bankData.confirm_account_number && (
                                        <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                                            <span className="material-icons-round text-xs">error</span>
                                            Account numbers do not match
                                        </p>
                                    )}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <div className="group">
                                    <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-2 group-focus-within:text-[#D4AF37] transition-colors">
                                        IFSC Code
                                    </label>
                                    <input
                                        type="text"
                                        value={bankData.ifsc}
                                        onChange={(e) => setBankData({ ...bankData, ifsc: e.target.value.toUpperCase() })}
                                        placeholder="e.g. SBIN0001234"
                                        maxLength={11}
                                        className="w-full px-5 py-4 bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10 rounded-xl focus:outline-none focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37] text-slate-800 dark:text-slate-100 font-medium font-mono transition-all"
                                    />
                                </div>
                                <div className="group">
                                    <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-2 group-focus-within:text-[#D4AF37] transition-colors">
                                        Bank Name
                                    </label>
                                    <input
                                        type="text"
                                        value={bankData.bank_name}
                                        onChange={(e) => setBankData({ ...bankData, bank_name: e.target.value })}
                                        placeholder="e.g. State Bank of India"
                                        className="w-full px-5 py-4 bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10 rounded-xl focus:outline-none focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37] text-slate-800 dark:text-slate-100 font-medium transition-all"
                                    />
                                </div>
                            </div>

                            <div className="p-4 bg-amber-500/5 border border-amber-500/20 rounded-xl flex items-start gap-3 text-sm">
                                <span className="material-icons-round text-amber-500 text-base mt-0.5">info</span>
                                <p className="text-slate-600 dark:text-slate-400">
                                    After saving, please allow up to <strong>24 hours</strong> for admin verification. Changing your bank details will reset verification status.
                                </p>
                            </div>

                            <div className="pt-4 border-t border-black/5 dark:border-white/5">
                                <button
                                    onClick={handleSaveBank}
                                    disabled={savingBank || (bankData.confirm_account_number && bankData.account_number !== bankData.confirm_account_number)}
                                    className="px-10 py-4 bg-[#D4AF37] text-[#020617] font-bold rounded-xl hover:opacity-90 transition-all disabled:opacity-50 flex items-center gap-2 gold-glow shadow-lg shadow-[#D4AF37]/20"
                                >
                                    {savingBank ? (
                                        <>
                                            <span className="material-icons-round animate-spin text-sm">autorenew</span>
                                            <span>Saving...</span>
                                        </>
                                    ) : (
                                        <>
                                            <span className="material-icons-round text-sm">save</span>
                                            <span>Save Bank Details</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'account' && (
                    <div className="p-5 sm:p-8">
                        <h2 className="text-2xl font-display font-bold text-slate-800 dark:text-slate-100 mb-8 flex items-center border-b border-black/5 dark:border-white/5 pb-4">
                            <span className="material-icons-round text-[#D4AF37] mr-3">manage_accounts</span>
                            Account Information
                        </h2>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Account Status */}
                            <div className="p-6 bg-black/5 dark:bg-white/5 rounded-2xl border border-black/5 dark:border-white/10 group hover:border-[#D4AF37]/30 transition-colors shadow-sm">
                                <div className="flex justify-between mb-4">
                                    <div className="w-12 h-12 bg-black/5 dark:bg-white/10 rounded-xl flex items-center justify-center border border-black/5 dark:border-white/10">
                                        <span className="material-icons-round text-slate-500 dark:text-slate-300">verified_user</span>
                                    </div>
                                    <span className={`px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider border flex items-center h-fit ${merchantProfile?.status === 'approved'
                                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                                        : 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-500 border-yellow-500/20'
                                        }`}>
                                        {merchantProfile?.status?.toUpperCase() || 'PENDING'}
                                    </span>
                                </div>
                                <h3 className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-widest mb-1">Merchant Status</h3>
                                <p className="text-slate-800 dark:text-slate-100 font-medium">Your account status allows you to purchase and manage inventory.</p>
                            </div>

                            {/* KYC Status */}
                            <div className="p-6 bg-black/5 dark:bg-white/5 rounded-2xl border border-black/5 dark:border-white/10 group hover:border-[#D4AF37]/30 transition-colors shadow-sm">
                                <div className="flex justify-between mb-4">
                                    <div className="w-12 h-12 bg-black/5 dark:bg-white/10 rounded-xl flex items-center justify-center border border-black/5 dark:border-white/10">
                                        <span className="material-icons-round text-slate-500 dark:text-slate-300">fact_check</span>
                                    </div>
                                    <span className={`px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider border flex items-center h-fit ${kycStatus === 'verified'
                                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                                        : 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-500 border-yellow-500/20'
                                        }`}>
                                        {kycStatus?.toUpperCase() || 'PENDING'}
                                    </span>
                                </div>
                                <h3 className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-widest mb-1">KYC Verification</h3>
                                <p className="text-slate-800 dark:text-slate-100 font-medium">Verified for transactional compliance.</p>
                            </div>

                            {/* Wallet Balance */}
                            <div className="p-6 bg-gradient-to-br from-[#D4AF37]/10 to-transparent dark:from-[#D4AF37]/20 dark:to-transparent rounded-2xl border border-[#D4AF37]/20 relative overflow-hidden group shadow-sm transition-all hover:bg-[#D4AF37]/10">
                                <div className="absolute -right-4 -top-4 w-24 h-24 bg-[#D4AF37]/20 rounded-full blur-2xl group-hover:bg-[#D4AF37]/30 transition-colors pointer-events-none"></div>
                                <div className="flex justify-between mb-2 relative z-10">
                                    <div className="w-12 h-12 bg-[#D4AF37]/10 rounded-xl flex items-center justify-center border border-[#D4AF37]/20">
                                        <span className="material-icons-round text-[#D4AF37]">account_balance_wallet</span>
                                    </div>
                                </div>
                                <h3 className="text-[#D4AF37]/80 text-xs font-bold uppercase tracking-widest mb-1 relative z-10">Wallet Balance</h3>
                                <p className="text-3xl font-display font-bold text-[#D4AF37] relative z-10">
                                    ₹{((merchantProfile?.wallet_balance_paise || 0) / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                </p>
                            </div>

                            {/* Commission Paid */}
                            <div className="p-6 bg-black/5 dark:bg-white/5 rounded-2xl border border-black/5 dark:border-white/10 group hover:border-[#D4AF37]/30 transition-colors shadow-sm">
                                <div className="flex justify-between mb-2">
                                    <div className="w-12 h-12 bg-black/5 dark:bg-white/10 rounded-xl flex items-center justify-center border border-black/5 dark:border-white/10">
                                        <span className="material-icons-round text-slate-500 dark:text-slate-300">receipt_long</span>
                                    </div>
                                </div>
                                <h3 className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-widest mb-1">Total Commission Paid</h3>
                                <p className="text-3xl font-display font-bold text-slate-800 dark:text-slate-100">
                                    ₹{((merchantProfile?.total_commission_paid_paise || 0) / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'notifications' && (
                    <div className="p-5 sm:p-8">
                        <h2 className="text-2xl font-display font-bold text-slate-800 dark:text-slate-100 mb-8 flex items-center border-b border-black/5 dark:border-white/5 pb-4">
                            <span className="material-icons-round text-[#D4AF37] mr-3">notifications_active</span>
                            Notification Preferences
                        </h2>

                        <div className="space-y-4 max-w-2xl">
                            {/* Notification Row Component would be better but keeping it for inline style */}
                            {[
                                { id: 'email_notifications', label: 'Email Notifications', desc: 'Receive account updates and alerts via email', icon: 'email' },
                                { id: 'purchase_notifications', label: 'Purchase Notifications', desc: 'Get notified when you purchase new coupons for inventory', icon: 'shopping_cart' },
                                { id: 'sale_notifications', label: 'Sale Notifications', desc: 'Get real-time alerts when your coupons are sold', icon: 'sell' },
                                { id: 'marketing_updates', label: 'Marketing Updates', desc: 'Receive promotional offers, platform updates, and news', icon: 'campaign' }
                            ].map((item) => (
                                <div key={item.id} className="flex items-center justify-between p-6 bg-black/5 dark:bg-white/5 rounded-2xl border border-black/5 dark:border-white/10 group hover:bg-black/[0.08] dark:hover:bg-white/10 transition-colors shadow-sm">
                                    <div>
                                        <p className="font-bold text-slate-800 dark:text-slate-100 flex items-center">
                                            <span className="material-icons-round text-slate-500 dark:text-slate-400 mr-2 text-sm">{item.icon}</span>
                                            {item.label}
                                        </p>
                                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 font-medium">{item.desc}</p>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            className="sr-only peer"
                                            checked={notifSettings[item.id]}
                                            onChange={async (e) => {
                                                const newVal = e.target.checked;
                                                // Optimistic update
                                                setNotifSettings(prev => ({ ...prev, [item.id]: newVal }));

                                                try {
                                                    const { data: { session } } = await supabase.auth.getSession();
                                                    const res = await fetch('/api/merchant/notification-settings', {
                                                        method: 'PATCH',
                                                        headers: {
                                                            'Content-Type': 'application/json',
                                                            'Authorization': `Bearer ${session?.access_token}`
                                                        },
                                                        body: JSON.stringify({ [item.id]: newVal })
                                                    });

                                                    const result = await res.json();
                                                    if (!result.success) throw new Error(result.error || 'Failed to save');
                                                    toast.success('Preferences saved');
                                                } catch (err) {
                                                    // Revert
                                                    setNotifSettings(prev => ({ ...prev, [item.id]: !newVal }));
                                                    toast.error(err.message || 'Failed to update preferences');
                                                }
                                            }}
                                        />
                                        <div className="w-11 h-6 bg-slate-300 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#D4AF37]"></div>
                                    </label>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {activeTab === 'whatsapp' && (
                    <div className="p-5 sm:p-8">
                        <h2 className="text-2xl font-display font-bold text-slate-800 dark:text-slate-100 mb-8 flex items-center border-b border-black/5 dark:border-white/5 pb-4">
                            <span className="material-icons-round text-[#25D366] mr-3">chat</span>
                            WhatsApp Notifications
                        </h2>

                        <div className="max-w-2xl">
                            <MerchantWhatsAppConnect notifSettings={notifSettings} setNotifSettings={setNotifSettings} />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

function MerchantWhatsAppConnect({ notifSettings, setNotifSettings }) {
    // — Status fetch —
    const [status, setStatus] = useState(null);
    const [statusLoading, setStatusLoading] = useState(true);

    // — Step 1: Send OTP —
    const [sending, setSending] = useState(false);
    const [successMsg, setSuccessMsg] = useState('');
    const [errorMsg, setErrorMsg] = useState('');

    // — Step 2: OTP entry —
    const [otpSent, setOtpSent] = useState(false);
    const [otp, setOtp] = useState('');
    const [verifying, setVerifying] = useState(false);
    const [cooldown, setCooldown] = useState(0);

    const cooldownRef = useRef(null);
    const otpInputRef = useRef(null);

    useEffect(() => {
        fetchStatus();
    }, []);

    useEffect(() => {
        if (otpSent) {
            startCooldown();
        }
        return () => clearInterval(cooldownRef.current);
    }, [otpSent]);

    useEffect(() => {
        if (otpSent && otpInputRef.current) {
            otpInputRef.current.focus();
        }
    }, [otpSent]);

    async function fetchStatus() {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const res = await fetch('/api/merchant/whatsapp/status', {
                headers: { 'Authorization': `Bearer ${session?.access_token}` }
            });
            const data = await res.json();
            setStatus(data);
        } catch {
            setStatus({ linked: false });
        } finally {
            setStatusLoading(false);
        }
    }

    function startCooldown() {
        clearInterval(cooldownRef.current);
        setCooldown(60);
        cooldownRef.current = setInterval(() => {
            setCooldown((prev) => {
                if (prev <= 1) {
                    clearInterval(cooldownRef.current);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
    }

    const handleSendOtp = async () => {
        setSending(true);
        setSuccessMsg('');
        setErrorMsg('');

        try {
            const { data: { session } } = await supabase.auth.getSession();
            const res = await fetch('/api/merchant/whatsapp/link-phone', { 
                method: 'POST',
                headers: { 'Authorization': `Bearer ${session?.access_token}` }
            });
            const data = await res.json();

            if (!res.ok) {
                setErrorMsg(data.error || 'Something went wrong. Please try again.');
            } else {
                setSuccessMsg('');
                setErrorMsg('');
                setOtp('');
                setOtpSent(true);
            }
        } catch {
            setErrorMsg('Network error. Please check your connection.');
        } finally {
            setSending(false);
        }
    };

    const handleResendOtp = async () => {
        setOtp('');
        setErrorMsg('');
        await handleSendOtp();
        startCooldown();
    };

    const handleVerifyOtp = async () => {
        if (otp.length !== 6 || verifying) return;

        setVerifying(true);
        setErrorMsg('');

        try {
            const { data: { session } } = await supabase.auth.getSession();
            const res = await fetch('/api/merchant/whatsapp/verify-otp', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session?.access_token}`
                },
                body: JSON.stringify({ otp }),
            });
            const data = await res.json();

            if (!res.ok) {
                if (res.status === 400) setOtp('');
                setErrorMsg(data.error || 'Verification failed. Please try again.');
            } else {
                setSuccessMsg('WhatsApp connected successfully!');
                setErrorMsg('');
                setOtpSent(false);
                clearInterval(cooldownRef.current);
                await fetchStatus();
            }
        } catch {
            setErrorMsg('Network error. Please check your connection.');
        } finally {
            setVerifying(false);
        }
    };

    const handleOtpKeyDown = (e) => {
        if (e.key === 'Enter') handleVerifyOtp();
    };

    const handleCancelOtp = () => {
        setOtpSent(false);
        setOtp('');
        setErrorMsg('');
        setSuccessMsg('');
        clearInterval(cooldownRef.current);
        setCooldown(0);
    };

    const formatDate = (iso) => {
        if (!iso) return '';
        return new Date(iso).toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
        });
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between p-6 bg-black/5 dark:bg-white/5 rounded-2xl border border-black/5 dark:border-white/10 group hover:bg-black/[0.08] dark:hover:bg-white/10 transition-colors shadow-sm">
                <div>
                    <p className="font-bold text-slate-800 dark:text-slate-100 flex items-center">
                        <span className="material-icons-round text-[#25D366] mr-2 text-sm">mark_chat_unread</span>
                        Enable WhatsApp Alerts
                    </p>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 font-medium">Receive important order alerts, payouts, and customer inquiries directly on WhatsApp.</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                    <input
                        type="checkbox"
                        className="sr-only peer"
                        checked={notifSettings?.whatsapp_notifications ?? false}
                        onChange={async (e) => {
                            const newVal = e.target.checked;
                            setNotifSettings(prev => ({ ...prev, whatsapp_notifications: newVal }));

                            try {
                                const { data: { session } } = await supabase.auth.getSession();
                                const res = await fetch('/api/merchant/notification-settings', {
                                    method: 'PATCH',
                                    headers: {
                                        'Content-Type': 'application/json',
                                        'Authorization': `Bearer ${session?.access_token}`
                                    },
                                    body: JSON.stringify({ whatsapp_notifications: newVal })
                                });

                                const result = await res.json();
                                if (!result.success) throw new Error(result.error || 'Failed to save');
                                toast.success('WhatsApp preferences saved');
                            } catch (err) {
                                setNotifSettings(prev => ({ ...prev, whatsapp_notifications: !newVal }));
                                toast.error(err.message || 'Failed to update preferences');
                            }
                        }}
                    />
                    <div className="w-11 h-6 bg-slate-300 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#25D366]"></div>
                </label>
            </div>

            <div className="p-6 bg-black/5 dark:bg-white/5 rounded-2xl border border-black/5 dark:border-white/10 shadow-sm">
                <h3 className="font-bold text-slate-800 dark:text-slate-100 mb-4 flex items-center">
                    <span className="material-icons-round text-slate-500 mr-2 text-sm">phonelink_ring</span>
                    Connection Status
                </h3>
                
                {statusLoading ? (
                    <div className="animate-pulse flex space-x-4">
                        <div className="flex-1 space-y-4 py-1">
                            <div className="h-4 bg-slate-300 dark:bg-slate-700 rounded w-3/4"></div>
                            <div className="space-y-2">
                                <div className="h-4 bg-slate-300 dark:bg-slate-700 rounded"></div>
                            </div>
                        </div>
                    </div>
                ) : status?.linked ? (
                    <div>
                        <div className="flex items-center gap-2 mb-4">
                            <span className="px-3 py-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 rounded-full text-xs font-bold uppercase tracking-wider flex items-center">
                                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full mr-2"></span>
                                Connected
                            </span>
                        </div>
                        <p className="text-sm text-slate-600 dark:text-slate-400 mb-2 font-medium">
                            <strong className="text-slate-800 dark:text-slate-200">{status.phone}</strong>
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-500 mb-6">
                            Linked on {formatDate(status.linkedAt)}
                        </p>
                        <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl">
                            <p className="text-sm text-blue-700 dark:text-blue-400 font-medium">
                                Your merchant WhatsApp is successfully connected. You will receive important alerts here.
                            </p>
                        </div>
                    </div>
                ) : (
                    <div>
                        <div className="flex items-center gap-2 mb-4">
                            <span className="px-3 py-1 bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 rounded-full text-xs font-bold uppercase tracking-wider flex items-center">
                                <span className="w-1.5 h-1.5 bg-rose-500 rounded-full mr-2"></span>
                                Not Connected
                            </span>
                        </div>

                        {!otpSent ? (
                            <>
                                <p className="text-sm text-slate-600 dark:text-slate-400 mb-6 font-medium">
                                    Link your business phone number to start receiving WhatsApp alerts. We'll send an OTP to verify your number.
                                </p>
                                
                                <button
                                    onClick={handleSendOtp}
                                    disabled={sending}
                                    className="px-6 py-3 bg-[#25D366] text-white font-bold rounded-xl hover:opacity-90 transition-all disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-[#25D366]/20 w-full sm:w-auto justify-center"
                                >
                                    {sending ? (
                                        <>
                                            <span className="material-icons-round animate-spin text-sm">autorenew</span>
                                            <span>Sending OTP...</span>
                                        </>
                                    ) : (
                                        <>
                                            <span className="material-icons-round text-sm">send</span>
                                            <span>Send OTP to WhatsApp</span>
                                        </>
                                    )}
                                </button>
                                
                                {errorMsg && (
                                    <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-600 dark:text-red-400 text-sm font-medium flex items-center gap-2">
                                        <span className="material-icons-round text-sm">error</span>
                                        {errorMsg}
                                    </div>
                                )}
                            </>
                        ) : (
                            <div className="space-y-4">
                                <p className="text-sm text-slate-600 dark:text-slate-400 font-medium">
                                    A 6-digit code has been sent to your WhatsApp. Enter it below to complete linking.
                                </p>
                                
                                <div>
                                    <input
                                        ref={otpInputRef}
                                        type="text"
                                        inputMode="numeric"
                                        maxLength={6}
                                        value={otp}
                                        onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                        onKeyDown={handleOtpKeyDown}
                                        disabled={verifying}
                                        placeholder="••••••"
                                        className="w-full sm:w-48 px-5 py-4 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:border-[#25D366] focus:ring-1 focus:ring-[#25D366] text-slate-800 dark:text-slate-100 font-mono text-center text-2xl tracking-[0.2em] transition-all"
                                    />
                                </div>

                                <div className="flex flex-col sm:flex-row gap-3 mt-2">
                                    <button
                                        onClick={handleVerifyOtp}
                                        disabled={otp.length !== 6 || verifying}
                                        className="px-8 py-3 bg-[#25D366] text-white font-bold rounded-xl hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-[#25D366]/20"
                                    >
                                        {verifying ? 'Verifying...' : 'Verify & Connect'}
                                    </button>
                                    
                                    <button
                                        onClick={handleCancelOtp}
                                        className="px-6 py-3 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-xl hover:bg-slate-300 dark:hover:bg-slate-700 transition-all flex items-center justify-center"
                                    >
                                        Cancel
                                    </button>
                                </div>
                                
                                <div className="mt-4 flex items-center text-sm text-slate-500">
                                    <span>Didn't get the code?</span>
                                    <button
                                        onClick={handleResendOtp}
                                        disabled={cooldown > 0 || sending}
                                        className="ml-2 font-bold text-[#D4AF37] hover:text-[#B8860B] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend'}
                                    </button>
                                </div>

                                {errorMsg && (
                                    <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-600 dark:text-red-400 text-sm font-medium flex items-center gap-2">
                                        <span className="material-icons-round text-sm">error</span>
                                        {errorMsg}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
