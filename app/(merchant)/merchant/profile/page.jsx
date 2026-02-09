'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import {
    User,
    Mail,
    Phone,
    Building2,
    FileText,
    CreditCard,
    MapPin,
    Calendar,
    CheckCircle2,
    XCircle,
    Clock,
    Edit2,
    Save,
    Loader2,
    AlertCircle
} from 'lucide-react';

export default function MerchantProfilePage() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    const [editing, setEditing] = useState(false);

    const [userProfile, setUserProfile] = useState(null);
    const [merchantProfile, setMerchantProfile] = useState(null);
    const [formData, setFormData] = useState({
        business_name: '',
        gst_number: '',
        pan_number: '',
        full_name: '',
        phone: '',
    });

    useEffect(() => {
        fetchProfile();
    }, []);

    const fetchProfile = async () => {
        try {
            setLoading(true);
            setError(null);

            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');

            // Get user profile
            const { data: profile, error: profileError } = await supabase
                .from('user_profiles')
                .select('*')
                .eq('id', user.id)
                .single();

            if (profileError) throw profileError;
            setUserProfile(profile);

            // Get merchant profile
            const { data: merchant, error: merchantError } = await supabase
                .from('merchants')
                .select('*')
                .eq('user_id', user.id)
                .single();

            if (merchantError && merchantError.code !== 'PGRST116') {
                throw merchantError;
            }

            setMerchantProfile(merchant);

            // Set form data
            setFormData({
                business_name: merchant?.business_name || '',
                gst_number: merchant?.gst_number || '',
                pan_number: merchant?.pan_number || '',
                full_name: profile?.full_name || '',
                phone: profile?.phone || '',
            });
        } catch (err) {
            console.error('Error fetching profile:', err);
            setError(err.message);
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

            // Update user profile
            const { error: profileError } = await supabase
                .from('user_profiles')
                .update({
                    full_name: formData.full_name,
                    phone: formData.phone,
                })
                .eq('id', user.id);

            if (profileError) throw profileError;

            // Update or create merchant profile
            if (merchantProfile) {
                const { error: merchantError } = await supabase
                    .from('merchants')
                    .update({
                        business_name: formData.business_name,
                        gst_number: formData.gst_number,
                        pan_number: formData.pan_number,
                    })
                    .eq('user_id', user.id);

                if (merchantError) throw merchantError;
            } else {
                const { error: merchantError } = await supabase
                    .from('merchants')
                    .insert({
                        user_id: user.id,
                        business_name: formData.business_name,
                        gst_number: formData.gst_number,
                        pan_number: formData.pan_number,
                        status: 'pending',
                    });

                if (merchantError) throw merchantError;
            }

            setSuccess('Profile updated successfully!');
            setEditing(false);
            await fetchProfile();
        } catch (err) {
            console.error('Error saving profile:', err);
            setError(err.message);
        } finally {
            setSaving(false);
        }
    };

    const getStatusBadge = (status) => {
        const badges = {
            approved: { icon: CheckCircle2, text: 'Approved', color: 'bg-green-100 text-green-700 border-green-200' },
            pending: { icon: Clock, text: 'Pending Review', color: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
            suspended: { icon: XCircle, text: 'Suspended', color: 'bg-red-100 text-red-700 border-red-200' },
            rejected: { icon: XCircle, text: 'Rejected', color: 'bg-gray-100 text-gray-700 border-gray-200' },
        };

        const badge = badges[status] || badges.pending;
        const Icon = badge.icon;

        return (
            <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full border ${badge.color}`}>
                <Icon size={18} />
                <span className="font-semibold">{badge.text}</span>
            </div>
        );
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-[#92BCEA]" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 sm:p-6">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="mb-6">
                    <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2 font-[family-name:var(--font-outfit)]">
                        Merchant Profile
                    </h1>
                    <p className="text-gray-600">Manage your business information and account details</p>
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

                {/* Status Card */}
                {merchantProfile && (
                    <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6 mb-6">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                            <div>
                                <h2 className="text-lg font-bold text-gray-900 mb-1">Account Status</h2>
                                <p className="text-sm text-gray-600">Your merchant account verification status</p>
                            </div>
                            {getStatusBadge(merchantProfile.status)}
                        </div>

                        {merchantProfile.status === 'pending' && (
                            <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-xl">
                                <p className="text-sm text-yellow-800">
                                    Your merchant account is under review. You'll be notified once it's approved.
                                </p>
                            </div>
                        )}
                    </div>
                )}

                {/* Profile Information */}
                <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
                    {/* Header */}
                    <div className="p-6 border-b border-gray-200 flex items-center justify-between">
                        <h2 className="text-xl font-bold text-gray-900">Profile Information</h2>
                        {!editing ? (
                            <button
                                onClick={() => setEditing(true)}
                                className="flex items-center gap-2 px-4 py-2 bg-[#92BCEA] text-white rounded-xl hover:bg-[#7A93AC] transition-colors"
                            >
                                <Edit2 size={18} />
                                <span className="font-semibold">Edit</span>
                            </button>
                        ) : (
                            <div className="flex gap-2">
                                <button
                                    onClick={() => {
                                        setEditing(false);
                                        fetchProfile();
                                    }}
                                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-semibold"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSave}
                                    disabled={saving}
                                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors disabled:opacity-50"
                                >
                                    {saving ? (
                                        <Loader2 size={18} className="animate-spin" />
                                    ) : (
                                        <Save size={18} />
                                    )}
                                    <span className="font-semibold">{saving ? 'Saving...' : 'Save'}</span>
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Form */}
                    <div className="p-6 space-y-6">
                        {/* Personal Information */}
                        <div>
                            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
                                Personal Information
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                                        <User size={16} className="inline mr-2" />
                                        Full Name
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.full_name}
                                        onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                                        disabled={!editing}
                                        className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:border-[#92BCEA] focus:ring-2 focus:ring-[#92BCEA]/20 disabled:bg-gray-50 disabled:text-gray-600"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                                        <Phone size={16} className="inline mr-2" />
                                        Phone Number
                                    </label>
                                    <input
                                        type="tel"
                                        value={formData.phone}
                                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                        disabled={!editing}
                                        className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:border-[#92BCEA] focus:ring-2 focus:ring-[#92BCEA]/20 disabled:bg-gray-50 disabled:text-gray-600"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Business Information */}
                        <div>
                            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
                                Business Information
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                                        <Building2 size={16} className="inline mr-2" />
                                        Business Name
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.business_name}
                                        onChange={(e) => setFormData({ ...formData, business_name: e.target.value })}
                                        disabled={!editing}
                                        className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:border-[#92BCEA] focus:ring-2 focus:ring-[#92BCEA]/20 disabled:bg-gray-50 disabled:text-gray-600"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                                        <FileText size={16} className="inline mr-2" />
                                        GST Number
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.gst_number}
                                        onChange={(e) => setFormData({ ...formData, gst_number: e.target.value })}
                                        disabled={!editing}
                                        placeholder="22AAAAA0000A1Z5"
                                        className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:border-[#92BCEA] focus:ring-2 focus:ring-[#92BCEA]/20 disabled:bg-gray-50 disabled:text-gray-600"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                                        <CreditCard size={16} className="inline mr-2" />
                                        PAN Number
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.pan_number}
                                        onChange={(e) => setFormData({ ...formData, pan_number: e.target.value })}
                                        disabled={!editing}
                                        placeholder="ABCDE1234F"
                                        className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:border-[#92BCEA] focus:ring-2 focus:ring-[#92BCEA]/20 disabled:bg-gray-50 disabled:text-gray-600"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Account Details (Read-only) */}
                        {merchantProfile && (
                            <div>
                                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
                                    Account Details
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                                        <div className="text-sm text-gray-600 mb-1">Wallet Balance</div>
                                        <div className="text-2xl font-bold text-[#92BCEA]">
                                            ₹{((merchantProfile.wallet_balance_paise || 0) / 100).toLocaleString()}
                                        </div>
                                    </div>

                                    <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                                        <div className="text-sm text-gray-600 mb-1">Total Commission Paid</div>
                                        <div className="text-2xl font-bold text-gray-900">
                                            ₹{((merchantProfile.total_commission_paid_paise || 0) / 100).toLocaleString()}
                                        </div>
                                    </div>

                                    <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                                        <div className="text-sm text-gray-600 mb-1 flex items-center gap-2">
                                            <Calendar size={14} />
                                            Member Since
                                        </div>
                                        <div className="text-lg font-semibold text-gray-900">
                                            {new Date(merchantProfile.created_at).toLocaleDateString('en-IN', {
                                                month: 'long',
                                                year: 'numeric'
                                            })}
                                        </div>
                                    </div>

                                    <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                                        <div className="text-sm text-gray-600 mb-1">Merchant ID</div>
                                        <div className="text-sm font-mono text-gray-900 truncate">
                                            {merchantProfile.id}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
