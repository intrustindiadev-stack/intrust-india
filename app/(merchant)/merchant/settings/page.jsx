'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import {
    Building2,
    CreditCard,
    Bell,
    Shield,
    Save,
    Loader2,
    CheckCircle2,
    AlertCircle,
    FileText
} from 'lucide-react';

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

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            setLoading(true);

            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');

            // Get user profile
            const { data: profile } = await supabase
                .from('user_profiles')
                .select('*')
                .eq('id', user.id)
                .single();

            setUserProfile(profile);

            // Get merchant profile
            const { data: merchant } = await supabase
                .from('merchants')
                .select('*')
                .eq('user_id', user.id)
                .single();

            setMerchantProfile(merchant);

            // Get KYC status
            const { data: kyc } = await supabase
                .from('kyc_records')
                .select('status')
                .eq('user_id', user.id)
                .single();

            setKycStatus(kyc?.status);

            // Set form data
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

            // Update merchant profile
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

    const tabs = [
        { id: 'business', label: 'Business Info', icon: Building2 },
        { id: 'account', label: 'Account', icon: Shield },
        { id: 'notifications', label: 'Notifications', icon: Bell },
    ];

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-[#92BCEA]" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 sm:p-6">
            <div className="max-w-5xl mx-auto">
                {/* Header */}
                <div className="mb-6 sm:mb-8">
                    <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2 font-[family-name:var(--font-outfit)]">
                        Settings
                    </h1>
                    <p className="text-sm sm:text-base text-gray-600">Manage your account and business preferences</p>
                </div>

                {/* Alerts */}
                {error && (
                    <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
                        <AlertCircle className="text-red-600 flex-shrink-0 mt-0.5" size={20} />
                        <div>
                            <h3 className="font-semibold text-red-900">Error</h3>
                            <p className="text-sm text-red-700">{error}</p>
                        </div>
                    </div>
                )}

                {success && (
                    <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl flex items-start gap-3">
                        <CheckCircle2 className="text-green-600 flex-shrink-0 mt-0.5" size={20} />
                        <div>
                            <h3 className="font-semibold text-green-900">Success</h3>
                            <p className="text-sm text-green-700">{success}</p>
                        </div>
                    </div>
                )}

                {/* Tabs */}
                <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
                    {tabs.map((tab) => {
                        const Icon = tab.icon;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center gap-2 px-4 py-3 rounded-xl font-semibold whitespace-nowrap transition-all ${activeTab === tab.id
                                        ? 'bg-white text-[#92BCEA] shadow-lg border-2 border-[#92BCEA]'
                                        : 'bg-white text-gray-600 hover:bg-gray-50 border-2 border-transparent'
                                    }`}
                            >
                                <Icon size={20} />
                                <span className="hidden sm:inline">{tab.label}</span>
                            </button>
                        );
                    })}
                </div>

                {/* Content */}
                <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
                    {activeTab === 'business' && (
                        <div className="p-6">
                            <h2 className="text-xl font-bold text-gray-900 mb-6">Business Information</h2>

                            <div className="space-y-6">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                                        Business Name
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.business_name}
                                        onChange={(e) => setFormData({ ...formData, business_name: e.target.value })}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:border-[#92BCEA] focus:ring-2 focus:ring-[#92BCEA]/20"
                                    />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                                            GST Number
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.gst_number}
                                            onChange={(e) => setFormData({ ...formData, gst_number: e.target.value })}
                                            placeholder="22AAAAA0000A1Z5"
                                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:border-[#92BCEA] focus:ring-2 focus:ring-[#92BCEA]/20"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                                            PAN Number
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.pan_number}
                                            onChange={(e) => setFormData({ ...formData, pan_number: e.target.value.toUpperCase() })}
                                            placeholder="ABCDE1234F"
                                            maxLength={10}
                                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:border-[#92BCEA] focus:ring-2 focus:ring-[#92BCEA]/20"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                                            Business Phone
                                        </label>
                                        <input
                                            type="tel"
                                            value={formData.business_phone}
                                            onChange={(e) => setFormData({ ...formData, business_phone: e.target.value })}
                                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:border-[#92BCEA] focus:ring-2 focus:ring-[#92BCEA]/20"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                                            Business Email
                                        </label>
                                        <input
                                            type="email"
                                            value={formData.business_email}
                                            onChange={(e) => setFormData({ ...formData, business_email: e.target.value })}
                                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:border-[#92BCEA] focus:ring-2 focus:ring-[#92BCEA]/20"
                                        />
                                    </div>
                                </div>

                                <div className="pt-4">
                                    <button
                                        onClick={handleSave}
                                        disabled={saving}
                                        className="px-6 py-3 bg-gradient-to-r from-[#92BCEA] to-[#AFB3F7] text-white font-bold rounded-xl hover:shadow-lg transition-all disabled:opacity-50 flex items-center gap-2"
                                    >
                                        {saving ? (
                                            <>
                                                <Loader2 size={20} className="animate-spin" />
                                                Saving...
                                            </>
                                        ) : (
                                            <>
                                                <Save size={20} />
                                                Save Changes
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'account' && (
                        <div className="p-6">
                            <h2 className="text-xl font-bold text-gray-900 mb-6">Account Information</h2>

                            <div className="space-y-6">
                                {/* Account Status */}
                                <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-sm font-semibold text-gray-700">Merchant Status</span>
                                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${merchantProfile?.status === 'approved'
                                                ? 'bg-green-100 text-green-700'
                                                : 'bg-yellow-100 text-yellow-700'
                                            }`}>
                                            {merchantProfile?.status?.toUpperCase()}
                                        </span>
                                    </div>
                                </div>

                                {/* KYC Status */}
                                <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-sm font-semibold text-gray-700">KYC Status</span>
                                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${kycStatus === 'approved'
                                                ? 'bg-green-100 text-green-700'
                                                : 'bg-yellow-100 text-yellow-700'
                                            }`}>
                                            {kycStatus?.toUpperCase() || 'PENDING'}
                                        </span>
                                    </div>
                                </div>

                                {/* Wallet Balance */}
                                <div className="p-4 bg-gradient-to-br from-[#92BCEA] to-[#AFB3F7] rounded-xl text-white">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-white/80 text-sm mb-1">Wallet Balance</p>
                                            <p className="text-3xl font-bold">
                                                ₹{((merchantProfile?.wallet_balance_paise || 0) / 100).toLocaleString()}
                                            </p>
                                        </div>
                                        <CreditCard size={32} className="text-white/50" />
                                    </div>
                                </div>

                                {/* Commission Paid */}
                                <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm font-semibold text-gray-700">Total Commission Paid</span>
                                        <span className="text-lg font-bold text-gray-900">
                                            ₹{((merchantProfile?.total_commission_paid_paise || 0) / 100).toLocaleString()}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'notifications' && (
                        <div className="p-6">
                            <h2 className="text-xl font-bold text-gray-900 mb-6">Notification Preferences</h2>

                            <div className="space-y-4">
                                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                                    <div>
                                        <p className="font-semibold text-gray-900">Email Notifications</p>
                                        <p className="text-sm text-gray-600">Receive updates via email</p>
                                    </div>
                                    <input type="checkbox" className="w-5 h-5 text-[#92BCEA]" defaultChecked />
                                </div>

                                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                                    <div>
                                        <p className="font-semibold text-gray-900">Purchase Notifications</p>
                                        <p className="text-sm text-gray-600">Get notified when you purchase coupons</p>
                                    </div>
                                    <input type="checkbox" className="w-5 h-5 text-[#92BCEA]" defaultChecked />
                                </div>

                                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                                    <div>
                                        <p className="font-semibold text-gray-900">Sale Notifications</p>
                                        <p className="text-sm text-gray-600">Get notified when your coupons are sold</p>
                                    </div>
                                    <input type="checkbox" className="w-5 h-5 text-[#92BCEA]" defaultChecked />
                                </div>

                                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                                    <div>
                                        <p className="font-semibold text-gray-900">Marketing Updates</p>
                                        <p className="text-sm text-gray-600">Receive promotional offers and updates</p>
                                    </div>
                                    <input type="checkbox" className="w-5 h-5 text-[#92BCEA]" />
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
