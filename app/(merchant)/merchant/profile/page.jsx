'use client';

import { useState, useEffect } from 'react';
import { User, Mail, Phone, MapPin, Building, Loader2, Save } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { useMerchant } from '@/hooks/useMerchant';

export default function ProfilePage() {
    const { merchant, loading: merchantLoading, error: merchantError } = useMerchant();
    const [formData, setFormData] = useState({
        business_name: '',
        gst_number: '',
    });
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (merchant) {
            setFormData({
                business_name: merchant.business_name || '',
                gst_number: merchant.gst_number || '',
            });
        }
    }, [merchant]);

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const { error } = await supabase
                .from('merchants')
                .update(formData)
                .eq('id', merchant.id);

            if (error) throw error;
            alert('Profile updated successfully!');
        } catch (err) {
            console.error('Error updating profile:', err);
            alert('Failed to update profile');
        } finally {
            setSaving(false);
        }
    };

    if (merchantLoading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-[#92BCEA]" />
            </div>
        );
    }

    if (merchantError || !merchant) {
        return <div className="p-8 text-center text-red-500">Error: {merchantError || 'Merchant not found'}</div>;
    }

    return (
        <div className="min-h-screen bg-gray-50 pt-24 pb-12">
            <div className="max-w-7xl mx-auto px-4 sm:px-6">
                <div className="mb-8">
                    <h1 className="text-4xl font-bold text-gray-900 mb-2 font-[family-name:var(--font-outfit)]">
                        Merchant Profile
                    </h1>
                    <p className="text-gray-600">Manage your business profile</p>
                </div>

                <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden max-w-2xl">
                    <div className="p-8">
                        <form onSubmit={handleSave} className="space-y-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Business Name</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <Building className="h-5 w-5 text-gray-400" />
                                    </div>
                                    <input
                                        type="text"
                                        value={formData.business_name}
                                        onChange={(e) => setFormData({ ...formData, business_name: e.target.value })}
                                        className="pl-10 block w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-[#92BCEA] focus:ring-[#92BCEA]"
                                        placeholder="Your Business Name"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">GST Number</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <Building className="h-5 w-5 text-gray-400" />
                                    </div>
                                    <input
                                        type="text"
                                        value={formData.gst_number}
                                        onChange={(e) => setFormData({ ...formData, gst_number: e.target.value })}
                                        className="pl-10 block w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-[#92BCEA] focus:ring-[#92BCEA]"
                                        placeholder="GSTIN"
                                    />
                                </div>
                            </div>

                            {/* Contact Info (Read Only for now as it's likely in user_profiles) */}
                            <div>
                                <h3 className="text-lg font-medium text-gray-700 mb-4 pt-4 border-t">Contact Information</h3>
                                <p className="text-sm text-gray-500 italic">To update contact details, please contact support.</p>
                            </div>

                            <button
                                type="submit"
                                disabled={saving}
                                className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-[#92BCEA] hover:bg-[#7A93AC] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#92BCEA]"
                            >
                                {saving ? (
                                    <>
                                        <Loader2 className="animate-spin -ml-1 mr-2 h-5 w-5" />
                                        Saving...
                                    </>
                                ) : (
                                    <>
                                        <Save className="-ml-1 mr-2 h-5 w-5" />
                                        Save Changes
                                    </>
                                )}
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
}
