'use client';

import { useState, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabaseClient';
import { displayEmail } from '@/lib/auth';
import {
    User,
    Mail,
    Camera,
    Save,
    Loader2,
    CheckCircle2,
    AlertCircle,
    Edit2,
    Check,
    X,
    Lock
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

function AvatarUpload({ userId, avatarUrl, displayName, onUpload }) {
    const [uploading, setUploading] = useState(false);
    const fileRef = useRef(null);
    const initial = displayName?.trim()?.charAt(0)?.toUpperCase() || 'C';

    const handleFileChange = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (!file.type.startsWith('image/')) { onUpload(null, 'Please select an image'); return; }
        if (file.size > 2 * 1024 * 1024) { onUpload(null, 'Image must be under 2MB'); return; }

        setUploading(true);
        try {
            const supabase = createClient();
            const ext = file.name.split('.').pop();
            const filePath = `${userId}/crm_avatar.${ext}`;
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
            if (e.target) e.target.value = '';
        }
    };

    return (
        <div className="relative group mx-auto mb-10 w-fit">
            <div
                className="relative w-32 h-32 rounded-[2.5rem] overflow-hidden cursor-pointer shadow-2xl ring-4 ring-white/10 group-hover:ring-indigo-500/50 transition-all duration-500"
                onClick={() => !uploading && fileRef.current?.click()}
            >
                {avatarUrl ? (
                    <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                ) : (
                    <div className="w-full h-full bg-gradient-to-br from-indigo-600/20 to-violet-600/20 flex items-center justify-center text-indigo-600 text-4xl font-black">
                        {initial}
                    </div>
                )}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center backdrop-blur-[2px]">
                    {uploading ? <Loader2 size={24} className="text-white animate-spin" /> : <Camera size={24} className="text-white" />}
                </div>
            </div>
            <div className="absolute -bottom-2 -right-2 w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-xl border-4 border-white dark:border-[#020617] pointer-events-none transition-transform group-hover:scale-110">
                <Camera size={16} />
            </div>
            <input ref={fileRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
        </div>
    );
}

function EditableRow({ label, value, icon: Icon, onSave, placeholder, readOnly = false }) {
    const [editing, setEditing] = useState(false);
    const [draft, setDraft] = useState(value || '');
    const [saving, setSaving] = useState(false);
    const inputRef = useRef(null);

    useEffect(() => { if (editing) inputRef.current?.focus(); }, [editing]);
    useEffect(() => { if (!editing) setDraft(value || ''); }, [value, editing]);

    const handleSave = async (e) => {
        if (e) e.preventDefault();
        if (draft === (value || '')) { setEditing(false); return; }
        setSaving(true);
        const ok = await onSave(draft);
        setSaving(false);
        if (ok) setEditing(false);
    };

    const cancel = () => { setDraft(value || ''); setEditing(false); };

    return (
        <div className="group flex items-start gap-5 py-5 border-b border-slate-100 dark:border-white/5 last:border-0">
            <div className={`mt-1 flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${readOnly ? 'bg-slate-100 dark:bg-white/5 text-slate-500' : 'bg-indigo-500/10 text-indigo-600'}`}>
                <Icon size={18} />
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1.5">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{label}</p>
                </div>
                {editing ? (
                    <div className="flex items-center gap-2">
                        <input
                            ref={inputRef}
                            type="text"
                            value={draft}
                            onChange={e => setDraft(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') cancel(); }}
                            placeholder={placeholder}
                            className="flex-1 text-sm bg-slate-50 dark:bg-white/5 border border-indigo-500 rounded-xl px-4 py-2 text-slate-900 dark:text-slate-100 outline-none ring-4 ring-indigo-500/10 min-w-0"
                        />
                        <button onClick={handleSave} disabled={saving}
                            className="w-9 h-9 rounded-xl bg-green-500 flex items-center justify-center text-white flex-shrink-0 hover:bg-green-600 transition-all shadow-lg shadow-green-500/20 disabled:opacity-50">
                            {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                        </button>
                        <button onClick={cancel}
                            className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-white/10 flex items-center justify-center text-slate-500 flex-shrink-0 hover:bg-slate-200 transition-all">
                            <X size={16} />
                        </button>
                    </div>
                ) : (
                    <div className="flex items-center gap-2 min-w-0">
                        <span className={`text-sm font-semibold truncate ${value ? 'text-slate-800 dark:text-slate-200' : 'text-slate-400 italic'}`}>
                            {value || (placeholder || 'Not set')}
                        </span>
                        {readOnly && <Lock size={12} className="text-slate-300 dark:text-slate-600 flex-shrink-0" />}
                    </div>
                )}
            </div>
            {!readOnly && !editing && (
                <button
                    onClick={(e) => { e.preventDefault(); setEditing(true); }}
                    className="mt-1 w-10 h-10 rounded-xl bg-slate-50 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 flex items-center justify-center text-indigo-600 transition-all flex-shrink-0 border border-transparent hover:border-slate-200 dark:hover:border-white/10 shadow-sm active:scale-95"
                    title={`Edit ${label}`}
                >
                    <Edit2 size={14} />
                </button>
            )}
        </div>
    );
}

export default function CRMProfilePage() {
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState(null);
    const [profile, setProfile] = useState(null);
    const [saveStatus, setSaveStatus] = useState(null);
    const [errorMessage, setErrorMessage] = useState('');

    useEffect(() => {
        const fetchProfile = async () => {
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                setUser(user);
                const { data: profileData } = await supabase
                    .from('user_profiles')
                    .select('*')
                    .eq('id', user.id)
                    .single();
                if (profileData) {
                    setProfile(profileData);
                }
            }
            setLoading(false);
        };
        fetchProfile();
    }, []);

    const handleSaveField = async (field, value) => {
        setSaveStatus(null);
        setErrorMessage('');
        
        try {
            const supabase = createClient();
            const { error } = await supabase
                .from('user_profiles')
                .update({ [field]: value })
                .eq('id', user.id);

            if (error) throw error;

            setProfile(prev => ({ ...prev, [field]: value }));
            setSaveStatus('success');
            setTimeout(() => setSaveStatus(null), 3000);
            return true;
        } catch (error) {
            console.error('Error saving profile:', error);
            setSaveStatus('error');
            setErrorMessage(error.message || 'Failed to update profile');
            return false;
        }
    };

    const handleAvatarUpload = async (url, err) => {
        if (err) {
            setSaveStatus('error');
            setErrorMessage(err);
        } else if (url) {
            const success = await handleSaveField('avatar_url', url);
            if (success) {
                setSaveStatus('success');
                setTimeout(() => setSaveStatus(null), 3000);
            }
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
                <div className="relative w-16 h-16">
                    <div className="absolute inset-0 rounded-full border-4 border-indigo-500/10 border-t-indigo-500 animate-spin" />
                    <div className="absolute inset-2 rounded-full border-4 border-indigo-500/5 border-b-indigo-600 animate-spin-slow" />
                </div>
                <p className="text-slate-400 font-black text-xs uppercase tracking-widest animate-pulse">Loading Profile...</p>
            </div>
        );
    }

    if (!profile) return null;

    const roleDisplay = profile.role ? profile.role.replace(/_/g, ' ') : 'CRM User';

    return (
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
            {/* Header */}
            <motion.div
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 mb-12"
            >
                <div className="space-y-2">
                    <div className="flex items-center gap-3">
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-900/5 text-indigo-600 text-[10px] font-black uppercase tracking-widest">
                            <User size={12} />
                            CRM Account
                        </div>
                    </div>
                    <h1 className="text-4xl sm:text-5xl font-black text-slate-950 dark:text-slate-100 tracking-tight leading-none font-[family-name:var(--font-outfit)]">
                        My <span className="text-indigo-600">Profile</span>
                    </h1>
                    <p className="text-slate-400 dark:text-slate-500 font-medium text-sm max-w-sm">
                        Manage your personal details and account settings.
                    </p>
                </div>
            </motion.div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Profile Hero / Avatar */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                    className="lg:col-span-4"
                >
                    <div className="bg-white dark:bg-white/[0.03] backdrop-blur-3xl rounded-[2.5rem] border border-slate-100 dark:border-white/10 p-8 shadow-2xl relative overflow-hidden group">
                        {/* Decorative Background */}
                        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 blur-[60px] rounded-full -mr-10 -mt-10" />
                        
                        <div className="relative z-10 text-center">
                            <AvatarUpload
                                userId={user.id}
                                avatarUrl={profile.avatar_url}
                                displayName={profile.full_name}
                                onUpload={handleAvatarUpload}
                            />
                            <h2 className="text-xl font-black text-slate-900 dark:text-slate-100 truncate mb-1">
                                {profile.full_name || 'CRM User'}
                            </h2>
                            <p className="text-indigo-600 font-black text-[10px] uppercase tracking-[0.2em] mb-6">
                                {roleDisplay}
                            </p>
                        </div>
                    </div>
                </motion.div>

                {/* Form Content */}
                <motion.div
                    initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}
                    className="lg:col-span-8 space-y-6"
                >
                    <div className="bg-white dark:bg-white/[0.03] backdrop-blur-3xl rounded-[2.5rem] border border-slate-100 dark:border-white/10 p-6 sm:p-8 shadow-2xl relative overflow-hidden">
                        <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 mb-8 flex items-center gap-2">
                            <User size={14} className="text-indigo-500" />
                            Personal Details
                        </h3>

                        <div className="divide-y divide-slate-100 dark:divide-white/5">
                            <EditableRow 
                                label="Full Name" 
                                icon={User} 
                                value={profile.full_name} 
                                placeholder="Enter your full name" 
                                onSave={v => handleSaveField('full_name', v)} 
                            />
                            
                            <EditableRow 
                                label="Email Address" 
                                icon={Mail} 
                                value={displayEmail(profile.email) ?? undefined} 
                                readOnly
                            />
                        </div>
                    </div>

                    {/* Status Messages */}
                    <AnimatePresence>
                        {saveStatus && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                                className={`p-4 rounded-2xl flex items-center gap-3 border ${saveStatus === 'success'
                                        ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-100 dark:border-emerald-500/20 text-emerald-600'
                                        : 'bg-red-50 dark:bg-red-500/10 border-red-100 dark:border-red-500/20 text-red-600'
                                    }`}
                            >
                                {saveStatus === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
                                <p className="text-sm font-black">{saveStatus === 'success' ? 'Profile updated successfully!' : errorMessage}</p>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </motion.div>
            </div>
        </div>
    );
}
