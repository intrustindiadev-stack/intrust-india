'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useSearchParams } from 'next/navigation';

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
    const searchParams = useSearchParams();

    useEffect(() => {
        const tab = searchParams.get('tab');
        if (tab && ['business', 'bank', 'account', 'notifications'].includes(tab)) {
            setActiveTab(tab);
        }
    }, [searchParams]);

    useEffect(() => {
        fetchSettings();
    }, []);

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
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');
            const payload = {
                bank_account_name: bankData.account_holder_name,
                bank_account_number: bankData.account_number,
                bank_ifsc_code: bankData.ifsc,
                bank_name: bankData.bank_name,
                bank_data: {
                    account_holder_name: bankData.account_holder_name,
                    account_number: bankData.account_number,
                    ifsc: bankData.ifsc,
                    bank_name: bankData.bank_name,
                },
                // Reset verification — admin must re-verify after any change
                bank_verified: false,
            };
            const { error: updateError } = await supabase
                .from('merchants')
                .update(payload)
                .eq('user_id', user.id);
            if (updateError) throw updateError;
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
        { id: 'bank', label: 'Bank Account', icon: 'account_balance' },
        { id: 'account', label: 'Account', icon: 'shield' },
        { id: 'notifications', label: 'Notifications', icon: 'notifications' },
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

            <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 mt-6 gap-4">
                <div>
                    <h1 className="font-display text-4xl font-bold text-slate-800 dark:text-slate-100 mb-2">Settings</h1>
                    <p className="text-slate-600 dark:text-slate-400 font-medium">Manage your account and business preferences</p>
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
                {activeTab === 'business' && (
                    <div className="p-8">
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
                    <div className="p-8">
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
                    <div className="p-8">
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
                                    <span className={`px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider border flex items-center h-fit ${kycStatus === 'approved'
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
                    <div className="p-8">
                        <h2 className="text-2xl font-display font-bold text-slate-800 dark:text-slate-100 mb-8 flex items-center border-b border-black/5 dark:border-white/5 pb-4">
                            <span className="material-icons-round text-[#D4AF37] mr-3">notifications_active</span>
                            Notification Preferences
                        </h2>

                        <div className="space-y-4 max-w-2xl">
                            {/* Notification Row Component would be better but keeping it for inline style */}
                            {[
                                { id: 'email', label: 'Email Notifications', desc: 'Receive account updates and alerts via email', icon: 'email', checked: true },
                                { id: 'purchase', label: 'Purchase Notifications', desc: 'Get notified when you purchase new coupons for inventory', icon: 'shopping_cart_test', checked: true },
                                { id: 'sale', label: 'Sale Notifications', desc: 'Get real-time alerts when your coupons are sold', icon: 'sell', checked: true },
                                { id: 'marketing', label: 'Marketing Updates', desc: 'Receive promotional offers, platform updates, and news', icon: 'campaign', checked: false }
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
                                        <input type="checkbox" className="sr-only peer" defaultChecked={item.checked} />
                                        <div className="w-11 h-6 bg-slate-300 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#D4AF37]"></div>
                                    </label>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
