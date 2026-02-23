'use client';

import { useState, useEffect } from 'react';
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
            // Optionally, show a success toast here
        } catch (err) {
            console.error('Error updating profile:', err);
            alert('Failed to update profile');
        } finally {
            setSaving(false);
        }
    };

    if (merchantLoading) {
        return (
            <div className="relative min-h-[60vh] flex items-center justify-center">
                <span className="material-icons-round animate-spin text-[#D4AF37] text-4xl">autorenew</span>
            </div>
        );
    }

    if (merchantError || !merchant) {
        return (
            <div className="relative min-h-[60vh] flex items-center justify-center">
                <div className="bg-red-500/10 border border-red-500/20 p-8 rounded-3xl text-center shadow-sm">
                    <span className="material-icons-round text-red-500 text-6xl mb-4">error</span>
                    <h2 className="text-xl font-bold text-red-600 dark:text-red-400">Merchant Profile Error</h2>
                    <p className="text-red-500 dark:text-red-400/80 mt-2 font-medium">{merchantError || 'Merchant not found'}</p>
                </div>
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
                    <h1 className="font-display text-4xl font-bold text-slate-800 dark:text-slate-100 mb-2">Merchant Profile</h1>
                    <p className="text-slate-600 dark:text-slate-400 font-medium">Manage your business profile and information</p>
                </div>
            </div>

            <div className="merchant-glass rounded-3xl border border-black/5 dark:border-white/5 overflow-hidden max-w-2xl relative shadow-xl">
                <div className="absolute -left-10 w-20 h-[200%] bg-gradient-to-b from-white/0 via-black/5 dark:via-white/5 to-white/0 transform -rotate-45 pointer-events-none"></div>

                <div className="p-8 relative z-10">
                    <h2 className="text-2xl font-display font-bold text-slate-800 dark:text-slate-100 mb-8 flex items-center border-b border-black/5 dark:border-white/5 pb-4">
                        <span className="material-icons-round text-[#D4AF37] mr-3">storefront</span>
                        Business Details
                    </h2>

                    <form onSubmit={handleSave} className="space-y-6">
                        <div className="group">
                            <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-2 group-focus-within:text-[#D4AF37] transition-colors">
                                Business Name
                            </label>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#D4AF37] material-icons-round text-lg select-none transition-colors">business</span>
                                <input
                                    type="text"
                                    value={formData.business_name}
                                    onChange={(e) => setFormData({ ...formData, business_name: e.target.value })}
                                    className="w-full pl-12 pr-5 py-4 bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10 rounded-xl focus:outline-none focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37] text-slate-800 dark:text-slate-100 font-medium transition-all"
                                    placeholder="Your Business Name"
                                />
                            </div>
                        </div>

                        <div className="group">
                            <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-2 group-focus-within:text-[#D4AF37] transition-colors">
                                GST Number
                            </label>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#D4AF37] material-icons-round text-lg select-none transition-colors">receipt</span>
                                <input
                                    type="text"
                                    value={formData.gst_number}
                                    onChange={(e) => setFormData({ ...formData, gst_number: e.target.value })}
                                    className="w-full pl-12 pr-5 py-4 bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10 rounded-xl focus:outline-none focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37] text-slate-800 dark:text-slate-100 font-medium transition-all"
                                    placeholder="GSTIN"
                                />
                            </div>
                        </div>

                        {/* Contact Info (Read Only) */}
                        <div className="pt-8 mt-8 border-t border-black/5 dark:border-white/5">
                            <div className="flex items-center space-x-2 text-slate-700 dark:text-slate-300 mb-2">
                                <span className="material-icons-round text-lg text-slate-500">contact_mail</span>
                                <h3 className="text-lg font-bold font-display">Contact Information</h3>
                            </div>
                            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">
                                To update contact details such as your phone or email, please contact support.
                            </p>

                            <div className="mt-4 p-4 bg-black/5 dark:bg-white/5 rounded-2xl border border-black/5 dark:border-white/10 flex items-center space-x-3 opacity-80">
                                <span className="material-icons-round text-[#D4AF37]">info</span>
                                <span className="text-sm text-slate-600 dark:text-slate-200">Contact information is tied to your primary account.</span>
                            </div>
                        </div>

                        <div className="pt-6">
                            <button
                                type="submit"
                                disabled={saving}
                                className="w-full sm:w-auto px-10 py-4 bg-[#D4AF37] text-[#020617] font-bold rounded-xl shadow-lg shadow-[#D4AF37]/20 hover:bg-opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 gold-glow"
                            >
                                {saving ? (
                                    <>
                                        <span className="material-icons-round animate-spin text-sm">autorenew</span>
                                        <span>Saving Profile...</span>
                                    </>
                                ) : (
                                    <>
                                        <span className="material-icons-round text-sm">save</span>
                                        <span>Save Changes</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
