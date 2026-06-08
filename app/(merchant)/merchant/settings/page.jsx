'use client';

import { useState, useEffect, useRef } from 'react';
import MerchantWhatsAppConnect from '@/components/merchant/MerchantWhatsAppConnect';
import MerchantSubscriptionPayButton from '@/components/merchant/MerchantSubscriptionPayButton';
import { supabase } from '@/lib/supabaseClient';
import { useRouter, useSearchParams } from 'next/navigation';
import toast from 'react-hot-toast';
import Link from 'next/link';
import { useSubscription } from '@/components/merchant/SubscriptionContext';
import { useMerchant } from '@/hooks/useMerchant';
import { displayEmail } from '@/lib/auth';

const lockedTabIds = ['store', 'bank'];

const tabs = [
    { id: 'business', label: 'Business Info', icon: 'business', locked: false },
    { id: 'account', label: 'Account', icon: 'shield', locked: false },
    { id: 'notifications', label: 'Notifications', icon: 'notifications', locked: false },
    { id: 'whatsapp', label: 'WhatsApp', icon: 'chat', locked: false },
    { id: 'store', label: 'Store Status', icon: 'storefront', locked: true },
    { id: 'bank', label: 'Bank Account', icon: 'account_balance', locked: true },
];

export default function MerchantSettingsPage() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [success, setSuccess] = useState(null);
    const [error, setError] = useState(null);
    const [activeTab, setActiveTab] = useState('business');
    const [highlightedField, setHighlightedField] = useState(null);
    const phoneRef = useRef(null);
    const emailRef = useRef(null);

    const [merchantProfile, setMerchantProfile] = useState(null);
    const [userProfile, setUserProfile] = useState(null);
    const [kycStatus, setKycStatus] = useState(null);

    const {
        isSubscribed,
        expiresAt,
        subscriptionStatus,
        daysUntilExpiry,
        requireSubscription,
        setShowModal,
        merchantData,
        plans = [],
    } = useSubscription();
    const { merchant } = useMerchant();
    const subscriptionMerchant = merchantData || merchant;

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
        whatsapp_order_alerts: true,
        whatsapp_payout_alerts: true,
        whatsapp_store_credit_alerts: true,
        whatsapp_kyc_alerts: true,
        whatsapp_subscription_alerts: true,
        whatsapp_product_alerts: true,
        whatsapp_marketing: false,
    });
    const searchParams = useSearchParams();
    const router = useRouter();
    const focusParam = searchParams.get('focus');
    const returnPath = searchParams.get('return') || '/merchant/subscription';

    useEffect(() => {
        const tab = searchParams.get('tab');
        const validTabIds = tabs.map(t => t.id);
        if (tab && validTabIds.includes(tab)) {
            // If locked tab and not subscribed, don't switch — show modal
            if (lockedTabIds.includes(tab) && !isSubscribed) {
                const tabObj = tabs.find(t => t.id === tab);
                requireSubscription(tabObj?.label || tab);
            } else {
                setActiveTab(tab);
            }
        }
    }, [searchParams, isSubscribed, requireSubscription]);

    useEffect(() => {
        if (!focusParam || loading) return;
        if (!['business_phone', 'business_email'].includes(focusParam)) return;

        setActiveTab('business');
        setHighlightedField(focusParam);
        const target = focusParam === 'business_phone' ? phoneRef.current : emailRef.current;
        window.setTimeout(() => {
            target?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            target?.focus();
        }, 100);

        const timeoutId = window.setTimeout(() => setHighlightedField(null), 2000);
        return () => window.clearTimeout(timeoutId);
    }, [focusParam, loading]);

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
                business_email: merchant?.business_email || displayEmail(user.email) || '',
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

            const isReservedName = formData.business_name.trim().toLowerCase() === 'intrust';
            const isNameChanged = formData.business_name !== merchantProfile?.business_name;
            
            const merchantUpdatePayload = {
                gst_number: formData.gst_number,
                pan_number: formData.pan_number,
                business_phone: formData.business_phone,
                business_email: formData.business_email,
            };

            if (!(isReservedName && isNameChanged)) {
                merchantUpdatePayload.business_name = formData.business_name;
            }

            const { error: updateError } = await supabase
                .from('merchants')
                .update(merchantUpdatePayload)
                .eq('user_id', user.id);

            if (updateError) throw updateError;

            const { error: profileUpdateError } = await supabase
                .from('user_profiles')
                .update({
                    email: formData.business_email,
                    phone: formData.business_phone
                })
                .eq('id', user.id);

            if (profileUpdateError) throw profileUpdateError;

            setSuccess('Settings updated successfully!');
            if (focusParam === 'business_phone' || focusParam === 'business_email') {
                setHighlightedField(null);
            }
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

    const handleTabClick = (tab) => {
        if (tab.locked && !isSubscribed) {
            requireSubscription(tab.label);
            return;
        }
        setActiveTab(tab.id);
    };

    if (loading) {
        return (
            <div className="relative min-h-[60vh] flex items-center justify-center">
                <span className="material-icons-round animate-spin text-[#D4AF37] text-4xl">autorenew</span>
            </div>
        );
    }

    const expiryFormatted = expiresAt
        ? new Date(expiresAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
        : null;

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

            {/* Subscription Status Banner */}
            {!isSubscribed ? (
                <div className="mb-6 p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-center gap-4 shadow-sm">
                    <div className="w-10 h-10 bg-amber-500/20 rounded-xl flex items-center justify-center shrink-0">
                        <span className="material-icons-round text-amber-600 dark:text-amber-400">warning</span>
                    </div>
                    <div className="flex-1">
                        <p className="font-bold text-amber-700 dark:text-amber-400 text-sm">Account ready. Activate your subscription to unlock storefront operations and payouts.</p>
                    </div>
                    <button
                        onClick={() => requireSubscription()}
                        className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs rounded-xl transition-colors whitespace-nowrap"
                    >
                        Subscribe
                    </button>
                </div>
            ) : (
                <div className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center gap-4 shadow-sm">
                    <div className="w-10 h-10 bg-emerald-500/20 rounded-xl flex items-center justify-center shrink-0">
                        <span className="material-icons-round text-emerald-600 dark:text-emerald-400">verified</span>
                    </div>
                    <div className="flex-1">
                        <p className="font-bold text-emerald-700 dark:text-emerald-400 text-sm">
                            Subscription active{expiryFormatted ? ` until ${expiryFormatted}` : ''}
                            {daysUntilExpiry !== null && daysUntilExpiry <= 7 && daysUntilExpiry > 0 && (
                                <span className="text-amber-600 dark:text-amber-400 ml-2">· Expires in {daysUntilExpiry} day{daysUntilExpiry !== 1 ? 's' : ''}</span>
                            )}
                        </p>
                    </div>
                </div>
            )}

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

            {(focusParam === 'business_phone' || focusParam === 'business_email') && (
                <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 shadow-sm dark:border-amber-500/20 dark:bg-amber-500/10">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <p className="text-sm font-bold text-amber-800 dark:text-amber-300">
                            Please update your {focusParam === 'business_phone' ? 'business phone' : 'business email'} to continue subscribing.
                        </p>
                        <button
                            type="button"
                            onClick={() => router.push(returnPath)}
                            className="rounded-xl bg-amber-500 px-4 py-2 text-xs font-black text-white transition-colors hover:bg-amber-600"
                        >
                            Back to Subscribe
                        </button>
                    </div>
                </div>
            )}

            {/* Tabs */}
            <div className="flex gap-2 mb-8 bg-black/5 dark:bg-white/5 p-1.5 rounded-2xl w-fit border border-black/5 dark:border-white/5 overflow-x-auto shadow-sm">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => handleTabClick(tab)}
                        className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all focus:outline-none whitespace-nowrap ${activeTab === tab.id
                            ? 'bg-[#D4AF37] text-[#020617] shadow-lg shadow-[#D4AF37]/20 gold-glow'
                            : tab.locked && !isSubscribed
                                ? 'text-slate-400 dark:text-slate-500 hover:text-slate-500 dark:hover:text-slate-400 hover:bg-black/5 dark:hover:bg-white/5 opacity-60'
                                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5'
                            }`}
                    >
                        <span className="material-icons-round text-sm">{tab.icon}</span>
                        <span className="hidden sm:inline">{tab.label}</span>
                        {tab.locked && !isSubscribed && (
                            <span className="material-icons-round text-[12px] text-amber-500">lock</span>
                        )}
                    </button>
                ))}
            </div>

            {/* Content Container */}
            <div className="merchant-glass rounded-3xl border border-black/5 dark:border-white/5 overflow-hidden shadow-xl mb-12">
                {/* Locked tab soft-lock overlay */}
                {lockedTabIds.includes(activeTab) && !isSubscribed && (
                    <div className="relative p-5 sm:p-8 min-h-[300px]">
                        <div className="absolute inset-0 backdrop-blur-sm bg-white/60 dark:bg-black/60 z-10 flex items-center justify-center">
                            <div className="text-center p-8 bg-white dark:bg-slate-900 rounded-3xl border border-black/10 dark:border-white/10 shadow-2xl max-w-sm">
                                <div className="w-16 h-16 bg-amber-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                    <span className="material-icons-round text-amber-500 text-3xl">lock</span>
                                </div>
                                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-2">Subscription Required</h3>
                                <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">Subscribe to manage {tabs.find(t => t.id === activeTab)?.label || 'this feature'}</p>
                                <button
                                    onClick={() => requireSubscription(tabs.find(t => t.id === activeTab)?.label)}
                                    className="px-8 py-3 bg-[#D4AF37] text-[#020617] font-bold rounded-xl hover:opacity-90 transition-all gold-glow shadow-lg shadow-[#D4AF37]/20"
                                >
                                    Subscribe Now
                                </button>
                            </div>
                        </div>
                        {/* Blurred preview content */}
                        <div className="opacity-30 pointer-events-none select-none">
                            <div className="h-8 bg-black/5 dark:bg-white/5 rounded-xl mb-4 w-48"></div>
                            <div className="h-4 bg-black/5 dark:bg-white/5 rounded-lg mb-8 w-72"></div>
                            <div className="space-y-4">
                                <div className="h-16 bg-black/5 dark:bg-white/5 rounded-2xl"></div>
                                <div className="h-16 bg-black/5 dark:bg-white/5 rounded-2xl"></div>
                                <div className="h-16 bg-black/5 dark:bg-white/5 rounded-2xl"></div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'store' && isSubscribed && (
                    <div className="p-5 sm:p-8">
                        <h2 className="text-2xl font-display font-bold text-slate-800 dark:text-slate-100 mb-2 flex items-center border-b border-black/5 dark:border-white/5 pb-4">
                            <span className="material-icons-round text-[#D4AF37] mr-3">storefront</span>
                            Store Management
                        </h2>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mb-8">
                            Control your store&apos;s visibility and operating hours. Users cannot place orders when the store is closed.
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
                                <div className="flex justify-between items-center mb-2">
                                    <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 group-focus-within:text-[#D4AF37] transition-colors">
                                        Business Name
                                    </label>
                                    {formData.business_name.trim().toLowerCase() === 'intrust' && formData.business_name !== merchantProfile?.business_name && (
                                        <span className="text-[10px] font-bold text-red-500">Cannot be &quot;intrust&quot; (Reserved Name)</span>
                                    )}
                                </div>
                                <input
                                    type="text"
                                    value={formData.business_name}
                                    onChange={(e) => setFormData({ ...formData, business_name: e.target.value })}
                                    className={`w-full px-5 py-4 bg-black/5 dark:bg-white/5 border rounded-xl focus:outline-none focus:ring-1 text-slate-800 dark:text-slate-100 font-medium transition-all ${formData.business_name.trim().toLowerCase() === 'intrust' && formData.business_name !== merchantProfile?.business_name ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : 'border-black/5 dark:border-white/10 focus:border-[#D4AF37] focus:ring-[#D4AF37]'}`}
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
                                        ref={phoneRef}
                                        type="tel"
                                        value={formData.business_phone}
                                        onChange={(e) => setFormData({ ...formData, business_phone: e.target.value })}
                                        className={`w-full px-5 py-4 bg-black/5 dark:bg-white/5 border rounded-xl focus:outline-none focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37] text-slate-800 dark:text-slate-100 font-medium transition-all ${highlightedField === 'business_phone' ? 'border-amber-400 ring-2 ring-amber-400 animate-pulse' : 'border-black/5 dark:border-white/10'}`}
                                    />
                                </div>

                                <div className="group">
                                    <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-2 group-focus-within:text-[#D4AF37] transition-colors">
                                        Business Email
                                    </label>
                                    <input
                                        ref={emailRef}
                                        type="email"
                                        value={formData.business_email}
                                        onChange={(e) => setFormData({ ...formData, business_email: e.target.value })}
                                        className={`w-full px-5 py-4 bg-black/5 dark:bg-white/5 border rounded-xl focus:outline-none focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37] text-slate-800 dark:text-slate-100 font-medium transition-all ${highlightedField === 'business_email' ? 'border-amber-400 ring-2 ring-amber-400 animate-pulse' : 'border-black/5 dark:border-white/10'}`}
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

                {activeTab === 'bank' && isSubscribed && (
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
                                                setNotifSettings(prev => ({ ...prev, [item.id]: newVal }));

                                                try {
                                                    const { data: { session } } = await supabase.auth.getSession();
                                                    const res = await fetch('/api/merchant/notification-settings', {
                                                        method: 'PATCH',
                                                        headers: {
                                                            'Content-Type': 'application/json',
                                                            'Authorization': `Bearer ${session?.access_token}`
                                                        },
                                                        body: JSON.stringify({
                                                            [item.id]: newVal,
                                                        }),
                                                    });

                                                    const result = await res.json();
                                                    if (!result.success) throw new Error(result.error || 'Failed to save');
                                                    toast.success('Preferences saved');
                                                } catch (err) {
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
