'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useMerchant } from '@/hooks/useMerchant';
import ConfirmModal from '@/components/ui/ConfirmModal';
import { 
    Store, 
    User, 
    Mail, 
    Phone, 
    MapPin, 
    ShieldCheck, 
    Camera, 
    Save, 
    LogOut,
    Loader2,
    CheckCircle2,
    AlertCircle,
    ChevronRight,
    Briefcase,
    Globe
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

function AvatarUpload({ userId, avatarUrl, displayName, onUpload }) {
    const [uploading, setUploading] = useState(false);
    const fileRef = useRef(null);
    const initial = displayName?.trim()?.charAt(0)?.toUpperCase() || 'M';

    const handleFileChange = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (!file.type.startsWith('image/')) { onUpload(null, 'Please select an image'); return; }
        if (file.size > 2 * 1024 * 1024) { onUpload(null, 'Image must be under 2MB'); return; }

        setUploading(true);
        try {
            const ext = file.name.split('.').pop();
            const filePath = `${userId}/merchant_avatar.${ext}`;
            const { error } = await supabase.storage
                .from('avatars')
                .upload(filePath, file, { upsert: true });
            if (error) throw error;
            const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
            onUpload(`${data.publicUrl}?t=${Date.now()}`, null);
        } catch (err) {
            console.error('Avatar upload error:', err);
            onUpload(null, 'Upload failed. Please try again.');
        } finally {
            setUploading(false);
            e.target.value = '';
        }
    };

    return (
        <div className="relative group mx-auto mb-10 w-fit">
            <div 
                className="relative w-32 h-32 rounded-[2.5rem] overflow-hidden cursor-pointer shadow-2xl ring-4 ring-white/10 group-hover:ring-blue-500/50 transition-all duration-500"
                onClick={() => !uploading && fileRef.current?.click()}
            >
                {avatarUrl ? (
                    <img src={avatarUrl} alt="Merchant Avatar" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                ) : (
                    <div className="w-full h-full bg-gradient-to-br from-blue-600/20 to-violet-600/20 flex items-center justify-center text-blue-500 text-4xl font-black">
                        {initial}
                    </div>
                )}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center backdrop-blur-[2px]">
                    {uploading ? <Loader2 size={24} className="text-white animate-spin" /> : <Camera size={24} className="text-white" />}
                </div>
            </div>
            <div className="absolute -bottom-2 -right-2 w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-xl border-4 border-white dark:border-[#020617] pointer-events-none transition-transform group-hover:scale-110">
                <Camera size={16} />
            </div>
            <input ref={fileRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
        </div>
    );
}

export default function ProfilePage() {
    const { merchant, loading: merchantLoading, error: merchantError } = useMerchant();
    const [formData, setFormData] = useState({
        business_name: '',
        owner_name: '',
        gst_number: '',
        business_phone: '',
        business_email: '',
        business_address: '',
        avatar_url: ''
    });

    const [saving, setSaving] = useState(false);
    const [saveStatus, setSaveStatus] = useState(null); // 'success' | 'error'
    const [errorMessage, setErrorMessage] = useState('');
    const [showLogoutModal, setShowLogoutModal] = useState(false);

    useEffect(() => {
        if (merchant) {
            setFormData({
                business_name: merchant.business_name || '',
                owner_name: merchant.owner_name || merchant.user_profiles?.full_name || '',
                gst_number: merchant.gst_number || '',
                business_phone: merchant.business_phone || merchant.user_profiles?.phone || '',
                business_email: merchant.business_email || merchant.user_profiles?.email || '',
                business_address: merchant.business_address || '',
                avatar_url: merchant.user_profiles?.avatar_url || ''
            });
        }
    }, [merchant]);

    const handleSave = async (e) => {
        e.preventDefault();
        
        // 1. Validation for "intrust"
        if (formData.business_name.trim().toLowerCase() === 'intrust') {
            setSaveStatus('error');
            setErrorMessage('Business name cannot be "intrust" (Reserved Name)');
            return;
        }

        setSaving(true);
        setSaveStatus(null);
        setErrorMessage('');

        try {
            // Update Merchants Table
            const { error: merchantUpdateError } = await supabase
                .from('merchants')
                .update({
                    business_name: formData.business_name,
                    gst_number: formData.gst_number,
                    owner_name: formData.owner_name,
                    business_phone: formData.business_phone,
                    business_email: formData.business_email,
                    business_address: formData.business_address
                })
                .eq('id', merchant.id);

            if (merchantUpdateError) throw merchantUpdateError;

            // Update user_profiles Table
            const { error: profileUpdateError } = await supabase
                .from('user_profiles')
                .update({
                    full_name: formData.owner_name,
                    avatar_url: formData.avatar_url
                })
                .eq('id', merchant.user_id);

            if (profileUpdateError) throw profileUpdateError;

            setSaveStatus('success');
            setTimeout(() => setSaveStatus(null), 3000);
        } catch (err) {
            console.error('Error updating profile:', err);
            setSaveStatus('error');
            setErrorMessage(err.message || 'Failed to update profile');
        } finally {
            setSaving(false);
        }
    };

    const confirmLogout = async () => {
        await supabase.auth.signOut();
        window.location.href = "/login";
    };

    if (merchantLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
                <div className="relative w-16 h-16">
                    <div className="absolute inset-0 rounded-full border-4 border-blue-500/10 border-t-blue-500 animate-spin" />
                    <div className="absolute inset-2 rounded-full border-4 border-blue-500/5 border-b-blue-600 animate-spin-slow" />
                </div>
                <p className="text-slate-400 font-black text-xs uppercase tracking-widest animate-pulse">Loading Profile...</p>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
            {/* Header */}
            <motion.div 
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 mb-12"
            >
                <div className="space-y-2">
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-900/5 text-blue-600 text-[10px] font-black uppercase tracking-widest">
                        <User size={12} />
                        Merchant Account
                    </div>
                    <h1 className="text-4xl sm:text-5xl font-black text-slate-950 dark:text-slate-100 tracking-tight leading-none font-[family-name:var(--font-outfit)]">
                        My <span className="text-blue-600">Profile</span>
                    </h1>
                    <p className="text-slate-400 dark:text-slate-500 font-medium text-sm max-w-sm">
                        Manage your business identity, contact details, and storefront settings.
                    </p>
                </div>
                <button 
                    onClick={() => setShowLogoutModal(true)}
                    className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-slate-100 dark:bg-white/5 hover:bg-red-50 dark:hover:bg-red-500/10 text-slate-600 dark:text-slate-400 hover:text-red-600 transition-all font-black text-sm self-start sm:self-auto border border-transparent hover:border-red-500/20"
                >
                    <LogOut size={16} />
                    Logout
                </button>
            </motion.div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Profile Hero / Avatar */}
                <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                    className="lg:col-span-4"
                >
                    <div className="bg-white dark:bg-white/[0.03] backdrop-blur-3xl rounded-[2.5rem] border border-slate-100 dark:border-white/10 p-8 shadow-2xl relative overflow-hidden group">
                        {/* Decorative Background */}
                        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 blur-[60px] rounded-full -mr-10 -mt-10" />
                        <div className="absolute bottom-0 left-0 w-32 h-32 bg-violet-500/10 blur-[60px] rounded-full -ml-10 -mb-10 opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                        
                        <div className="relative z-10 text-center">
                            <AvatarUpload 
                                userId={merchant.user_id}
                                avatarUrl={formData.avatar_url}
                                displayName={formData.owner_name || merchant.business_name}
                                onUpload={(url, err) => {
                                    if (err) { setSaveStatus('error'); setErrorMessage(err); }
                                    else if (url) setFormData(prev => ({ ...prev, avatar_url: url }));
                                }}
                            />
                            <h2 className="text-xl font-black text-slate-900 dark:text-slate-100 truncate mb-1">
                                {formData.owner_name || 'Business Owner'}
                            </h2>
                            <p className="text-blue-600 font-black text-[10px] uppercase tracking-[0.2em] mb-6">
                                Verified Merchant
                            </p>

                            <div className="space-y-3 pt-6 border-t border-slate-100 dark:border-white/10">
                                <div className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5">
                                    <div className="w-8 h-8 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-600">
                                        <ShieldCheck size={16} />
                                    </div>
                                    <div className="text-left">
                                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Status</p>
                                        <p className="text-xs font-black text-slate-900 dark:text-slate-100 capitalize">{merchant.status || 'Active'}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5">
                                    <div className="w-8 h-8 rounded-xl bg-violet-500/10 flex items-center justify-center text-violet-600">
                                        <Briefcase size={16} />
                                    </div>
                                    <div className="text-left">
                                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Joined</p>
                                        <p className="text-xs font-black text-slate-900 dark:text-slate-100">
                                            {merchant.created_at ? new Date(merchant.created_at).toLocaleDateString() : 'Member'}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </motion.div>

                {/* Form Content */}
                <motion.div 
                    initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}
                    className="lg:col-span-8"
                >
                    <form onSubmit={handleSave} className="space-y-6">
                        {/* Business Card */}
                        <div className="bg-white dark:bg-white/[0.03] backdrop-blur-3xl rounded-[2.5rem] border border-slate-100 dark:border-white/10 p-6 sm:p-8 shadow-2xl relative overflow-hidden">
                            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 mb-8 flex items-center gap-2">
                                <Store size={14} className="text-blue-500" />
                                Business Details
                            </h3>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Business Name</label>
                                    <div className="relative group">
                                        <Store className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={18} />
                                        <input 
                                            type="text" required
                                            value={formData.business_name}
                                            onChange={e => setFormData({...formData, business_name: e.target.value})}
                                            placeholder="Trading Name"
                                            className="w-full pl-12 pr-4 py-3.5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/40 text-sm font-bold text-slate-900 dark:text-slate-100 transition-all font-[family-name:var(--font-outfit)]"
                                        />
                                    </div>
                                    <p className="text-[9px] text-slate-400 ml-1">Must not be 'intrust'</p>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">GST Number</label>
                                    <div className="relative group">
                                        <Globe className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={18} />
                                        <input 
                                            type="text"
                                            value={formData.gst_number}
                                            onChange={e => setFormData({...formData, gst_number: e.target.value.toUpperCase()})}
                                            placeholder="GSTIN"
                                            className="w-full pl-12 pr-4 py-3.5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/40 text-sm font-bold text-slate-900 dark:text-slate-100 transition-all uppercase"
                                        />
                                    </div>
                                </div>

                                <div className="sm:col-span-2 space-y-1.5">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Owner / Manager Name</label>
                                    <div className="relative group">
                                        <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={18} />
                                        <input 
                                            type="text" required
                                            value={formData.owner_name}
                                            onChange={e => setFormData({...formData, owner_name: e.target.value})}
                                            placeholder="Full Name"
                                            className="w-full pl-12 pr-4 py-3.5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/40 text-sm font-bold text-slate-900 dark:text-slate-100 transition-all font-[family-name:var(--font-outfit)]"
                                        />
                                    </div>
                                </div>

                                <div className="sm:col-span-2 space-y-1.5">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Business Address</label>
                                    <div className="relative group">
                                        <MapPin className="absolute left-4 top-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={18} />
                                        <textarea 
                                            rows={3} required
                                            value={formData.business_address}
                                            onChange={e => setFormData({...formData, business_address: e.target.value})}
                                            placeholder="Shop / Office Address"
                                            className="w-full pl-12 pr-4 py-3.5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/40 text-sm font-bold text-slate-900 dark:text-slate-100 transition-all resize-none font-[family-name:var(--font-outfit)]"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Contact Card */}
                        <div className="bg-white dark:bg-white/[0.03] backdrop-blur-3xl rounded-[2.5rem] border border-slate-100 dark:border-white/10 p-6 sm:p-8 shadow-2xl">
                            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 mb-8 flex items-center gap-2">
                                <Mail size={14} className="text-violet-500" />
                                Contact Information
                            </h3>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Business Email</label>
                                    <div className="relative group">
                                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={18} />
                                        <input 
                                            type="email" required
                                            value={formData.business_email}
                                            onChange={e => setFormData({...formData, business_email: e.target.value})}
                                            placeholder="email@example.com"
                                            className="w-full pl-12 pr-4 py-3.5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/40 text-sm font-bold text-slate-900 dark:text-slate-100 transition-all"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Business Phone</label>
                                    <div className="relative group">
                                        <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={18} />
                                        <input 
                                            type="tel" required
                                            value={formData.business_phone}
                                            onChange={e => setFormData({...formData, business_phone: e.target.value})}
                                            placeholder="+91"
                                            className="w-full pl-12 pr-4 py-3.5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/40 text-sm font-bold text-slate-900 dark:text-slate-100 transition-all"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Status Messages & Save */}
                        <AnimatePresence>
                            {saveStatus && (
                                <motion.div 
                                    initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                                    className={`p-4 rounded-2xl flex items-center gap-3 border ${
                                        saveStatus === 'success' 
                                        ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-100 dark:border-emerald-500/20 text-emerald-600'
                                        : 'bg-red-50 dark:bg-red-500/10 border-red-100 dark:border-red-500/20 text-red-600'
                                    }`}
                                >
                                    {saveStatus === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
                                    <p className="text-sm font-black">{saveStatus === 'success' ? 'Profile updated successfully!' : errorMessage}</p>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <div className="flex justify-end gap-4 pt-4">
                            <button
                                type="submit"
                                disabled={saving}
                                className="w-full sm:w-auto px-10 py-4 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-2xl shadow-xl shadow-blue-500/20 transition-all disabled:opacity-50 flex items-center justify-center gap-2 active:scale-95"
                            >
                                {saving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                                <span>{saving ? 'Saving...' : 'Save Changes'}</span>
                            </button>
                        </div>
                    </form>
                </motion.div>
            </div>

            <ConfirmModal
                isOpen={showLogoutModal}
                onConfirm={confirmLogout}
                onCancel={() => setShowLogoutModal(false)}
                title="Confirm Logout"
                message="Are you sure you want to log out from your merchant account?"
                confirmLabel="Logout"
                cancelLabel="Cancel"
            />
        </div>
    );
}
