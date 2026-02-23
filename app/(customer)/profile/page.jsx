'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Navbar from '@/components/layout/Navbar';
import {
    User, Mail, Phone, MapPin, Calendar, Edit2, Check, X,
    ShieldCheck, Package, LayoutDashboard, Camera, Loader2, Lock, Link2, AlertCircle, Star,
    Wallet, ChevronRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import GoldBadge from '@/components/ui/GoldBadge';
import KYCStatus from '@/components/kyc/KYCStatus';
import Breadcrumbs from '@/components/giftcards/Breadcrumbs';
import CustomerBottomNav from '@/components/layout/customer/CustomerBottomNav';
import { createClient } from '@/lib/supabaseClient';
import { signInWithOTP, linkGoogleAccount } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/contexts/AuthContext';

const supabase = createClient();

// ─── Skeleton ─────────────────────────────────────────────────────────────────
function ProfileSkeleton() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
            <Navbar />
            <div style={{ paddingTop: '15vh' }} className="pb-12 px-4 sm:px-6">
                <div className="max-w-5xl mx-auto animate-pulse">
                    <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded mb-8" />
                    <div className="h-8 w-44 bg-gray-200 dark:bg-gray-700 rounded mb-2" />
                    <div className="h-4 w-60 bg-gray-150 dark:bg-gray-800 rounded mb-8" />
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="space-y-5">
                            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 h-64 border border-gray-100 dark:border-gray-700" />
                            <div className="rounded-2xl h-40 bg-gray-200 dark:bg-gray-700" />
                        </div>
                        <div className="lg:col-span-2 space-y-5">
                            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 h-52 border border-gray-100 dark:border-gray-700" />
                            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 h-44 border border-gray-100 dark:border-gray-700" />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ─── Toast ────────────────────────────────────────────────────────────────────
function Toast({ msg, type }) {
    if (!msg) return null;
    return (
        <div className={`fixed top-24 right-4 z-50 px-5 py-2.5 rounded-xl shadow-xl text-white text-sm font-medium flex items-center gap-2 ${type === 'error' ? 'bg-red-500' : 'bg-green-600'
            }`}>
            {type === 'error' ? <X size={14} /> : <Check size={14} />}
            {msg}
        </div>
    );
}

// ─── Avatar Upload ────────────────────────────────────────────────────────────
function AvatarUpload({ userId, avatarUrl, displayName, onUpload }) {
    const [uploading, setUploading] = useState(false);
    const fileRef = useRef(null);
    const initial = displayName?.trim()?.charAt(0)?.toUpperCase() || 'U';

    const handleFileChange = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (!file.type.startsWith('image/')) { onUpload(null, 'Please select an image'); return; }
        if (file.size > 5 * 1024 * 1024) { onUpload(null, 'Image must be under 5MB'); return; }

        setUploading(true);
        try {
            const ext = file.name.split('.').pop();
            const filePath = `${userId}/avatar.${ext}`;
            const { error } = await supabase.storage
                .from('avatars')
                .upload(filePath, file, { upsert: true });
            if (error) throw error;
            const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
            onUpload(`${data.publicUrl}?t=${Date.now()}`, null);
        } catch (err) {
            console.error('Avatar upload error:', err);
            onUpload(null, 'Upload failed. Is the avatars bucket created + public?');
        } finally {
            setUploading(false);
            e.target.value = '';
        }
    };

    return (
        <div
            className="relative w-24 h-24 mx-auto mb-4 cursor-pointer group"
            onClick={() => !uploading && fileRef.current?.click()}
        >
            {avatarUrl ? (
                <img
                    src={avatarUrl}
                    alt="Avatar"
                    className="w-24 h-24 rounded-full object-cover shadow-md ring-4 ring-white dark:ring-gray-700 group-hover:ring-[#92BCEA] transition-all duration-300"
                />
            ) : (
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[#92BCEA] to-[#AFB3F7] flex items-center justify-center text-white text-3xl font-bold shadow-md ring-4 ring-white dark:ring-gray-700 group-hover:ring-[#92BCEA] transition-all duration-300">
                    {initial}
                </div>
            )}
            <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
                {uploading
                    ? <Loader2 size={22} className="text-white animate-spin" />
                    : <Camera size={22} className="text-white" />
                }
            </div>
            <div className="absolute bottom-0.5 right-0.5 w-7 h-7 rounded-full bg-white dark:bg-gray-700 border-2 border-gray-100 dark:border-gray-600 flex items-center justify-center shadow-sm pointer-events-none">
                <Camera size={12} className="text-gray-500 dark:text-gray-300" />
            </div>
            <input ref={fileRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
        </div>
    );
}

// ─── Inline Editable Row ──────────────────────────────────────────────────────
function EditableRow({ label, value, icon: Icon, onSave, type = 'text', placeholder, readOnly = false, badge }) {
    const [editing, setEditing] = useState(false);
    const [draft, setDraft] = useState(value || '');
    const [saving, setSaving] = useState(false);
    const inputRef = useRef(null);

    useEffect(() => { if (editing) inputRef.current?.focus(); }, [editing]);
    useEffect(() => { if (!editing) setDraft(value || ''); }, [value, editing]);

    const handleSave = async () => {
        if (draft === (value || '')) { setEditing(false); return; }
        setSaving(true);
        const ok = await onSave(draft);
        setSaving(false);
        if (ok) setEditing(false);
    };

    const cancel = () => { setDraft(value || ''); setEditing(false); };

    return (
        <div className="group flex items-start gap-3.5 py-3.5 border-b border-gray-50 dark:border-gray-700/60 last:border-0">
            <div className="mt-0.5 flex-shrink-0">
                <Icon size={16} className="text-[#92BCEA]" />
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                    <p className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest">{label}</p>
                    {badge}
                </div>
                {editing ? (
                    <div className="flex items-center gap-2">
                        <input
                            ref={inputRef}
                            type={type}
                            value={draft}
                            onChange={e => setDraft(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') cancel(); }}
                            placeholder={placeholder}
                            className="flex-1 text-sm bg-gray-50 dark:bg-gray-700 border border-[#92BCEA] rounded-lg px-3 py-1.5 text-gray-900 dark:text-gray-100 outline-none ring-2 ring-[#92BCEA]/20 min-w-0"
                        />
                        <button onClick={handleSave} disabled={saving}
                            className="w-7 h-7 rounded-full bg-green-500 flex items-center justify-center text-white flex-shrink-0 hover:bg-green-600 transition-colors disabled:opacity-50">
                            {saving ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                        </button>
                        <button onClick={cancel}
                            className="w-7 h-7 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-400 flex-shrink-0 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
                            <X size={12} />
                        </button>
                    </div>
                ) : (
                    <div className="flex items-center gap-2 min-w-0">
                        <span className={`text-sm truncate ${value ? 'text-gray-800 dark:text-gray-100' : 'text-gray-400 italic'}`}>
                            {value || (placeholder || 'Not set')}
                        </span>
                        {readOnly && <Lock size={11} className="text-gray-300 flex-shrink-0" />}
                    </div>
                )}
            </div>
            {!readOnly && !editing && (
                <button
                    onClick={() => setEditing(true)}
                    className="mt-0.5 w-10 h-10 rounded-xl bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center justify-center text-[#92BCEA] transition-all flex-shrink-0 border border-gray-100 dark:border-gray-600 shadow-sm active:scale-95"
                    title={`Edit ${label}`}
                >
                    <Edit2 size={14} />
                </button>
            )}
        </div>
    );
}

// ─── Phone Verification Component ─────────────────────────────────────────────
function PhoneVerification({ currentPhone, authPhone, userId, onVerified, showToast }) {
    const [step, setStep] = useState('idle'); // idle | input | otp_sent | verifying
    const [phone, setPhone] = useState('');
    const [otp, setOtp] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [justVerified, setJustVerified] = useState(false);
    const otpRef = useRef(null);

    // Verified if:
    // 1. authUser.phone matches profile.phone (normal case), OR
    // 2. We just verified it in this session (instant UI update)
    // 1. Fully Linked = Phone is in auth.users and matches profile (Can Login with Phone)
    const isFullyLinked = authPhone && currentPhone && authPhone.replace('+91', '') === currentPhone.replace('+91', '');

    // 2. Verified = Phone is in profile (Successfully went through our OTP flow)
    const isVerified = justVerified || !!currentPhone;

    const displayPhone = currentPhone || authPhone || '';

    useEffect(() => {
        if (step === 'otp_sent') otpRef.current?.focus();
    }, [step]);

    const handleSendOTP = async () => {
        if (phone.length !== 10) return;
        setError('');
        setLoading(true);

        const formattedPhone = `+91${phone}`;

        // Check if this phone belongs to another account
        try {
            const { data: existingUserId, error: checkError } = await supabase
                .rpc('get_user_id_by_phone', { phone_number: phone });

            if (checkError) {
                console.error('Phone check error:', checkError);
            } else if (existingUserId && existingUserId !== userId) {
                setError('This phone number is already linked to another account. Please use a different number.');
                setLoading(false);
                return;
            }
        } catch (err) {
            console.error('Phone check failed:', err);
        }

        const { error: otpError } = await signInWithOTP(formattedPhone);

        if (otpError) {
            setError(otpError.message || 'Failed to send OTP');
            setLoading(false);
            return;
        }
        setStep('otp_sent');
        setLoading(false);
    };

    const handleVerifyOTP = async () => {
        if (otp.length !== 6) return;
        setError('');
        setLoading(true);

        try {
            // Use dedicated profile verify-phone endpoint (NOT the login verifyOTP)
            // This links the phone to the current user without creating a new session
            const response = await fetch('/api/auth/verify-phone', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phone, otp, userId }),
            });

            const data = await response.json();

            if (!response.ok) {
                setError(data.error || 'Verification failed');
                setLoading(false);
                return;
            }

            showToast('Phone verified successfully!');
            setJustVerified(true);
            onVerified(data.phone || `+91${phone}`);
            setStep('idle');
            setOtp('');
            setPhone('');
        } catch (err) {
            setError('Verification failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    // Already verified state
    if (isVerified && step === 'idle') {
        return (
            <div className="group flex items-start gap-3.5 py-3.5 border-b border-gray-50 dark:border-gray-700/60">
                <div className="mt-0.5 flex-shrink-0"><Phone size={16} className="text-[#92BCEA]" /></div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                        <p className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Phone Number</p>
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-green-50 dark:bg-green-900/30 text-green-600 uppercase tracking-wide">✓ Verified</span>
                        {isFullyLinked && (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-600 uppercase tracking-wide">Identity Linked</span>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-800 dark:text-gray-100">{displayPhone}</span>
                        {!isVerified && !justVerified && (
                            <button
                                onClick={() => { setStep('input'); setPhone(displayPhone.replace('+91', '')); }}
                                className="text-[11px] bg-[#92BCEA]/10 text-[#92BCEA] px-2 py-0.5 rounded-md font-bold hover:bg-[#92BCEA]/20 transition-all border border-[#92BCEA]/20"
                            >
                                Link Account
                            </button>
                        )}
                    </div>
                </div>
                <button
                    onClick={() => { setStep('input'); setPhone(displayPhone.replace('+91', '')); }}
                    className="mt-0.5 w-10 h-10 rounded-xl bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center justify-center text-[#92BCEA] transition-all flex-shrink-0 border border-gray-100 dark:border-gray-600 shadow-sm active:scale-95"
                    title="Change phone"
                >
                    <Edit2 size={14} />
                </button>
            </div>
        );
    }

    // Idle & not verified
    if (step === 'idle') {
        return (
            <div className="group flex items-start gap-3.5 py-3.5 border-b border-gray-50 dark:border-gray-700/60">
                <div className="mt-0.5 flex-shrink-0"><Phone size={16} className="text-[#92BCEA]" /></div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                        <p className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Phone Number</p>
                        {displayPhone && (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-amber-50 dark:bg-amber-900/20 text-amber-600 uppercase tracking-wide">Unverified</span>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        <span className={`text-sm ${displayPhone ? 'text-gray-800 dark:text-gray-100' : 'text-gray-400 italic'}`}>
                            {displayPhone || 'No phone added'}
                        </span>
                    </div>
                </div>
                <button
                    onClick={() => { setStep('input'); setPhone(displayPhone.replace('+91', '')); }}
                    className="mt-0.5 px-3 py-1.5 bg-[#92BCEA] text-white text-xs font-bold rounded-lg hover:bg-[#7aaad6] transition-all shadow-sm shadow-blue-200 dark:shadow-none flex items-center gap-1.5 active:scale-95"
                >
                    <ShieldCheck size={14} />
                    {displayPhone ? 'Verify Now' : 'Add & Verify'}
                </button>
            </div>
        );
    }

    // Input & OTP flow
    return (
        <div className="py-3.5 border-b border-gray-50 dark:border-gray-700/60">
            <div className="flex items-center gap-2 mb-3">
                <Phone size={16} className="text-[#92BCEA]" />
                <p className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest">
                    {step === 'otp_sent' ? 'Enter OTP' : 'Verify Phone Number'}
                </p>
            </div>

            {step === 'input' && (
                <div className="ml-6 space-y-3">
                    <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-500 font-medium">+91</span>
                        <input
                            type="tel"
                            value={phone}
                            onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                            placeholder="9876543210"
                            className="flex-1 text-sm bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 focus:border-[#92BCEA] focus:ring-2 focus:ring-[#92BCEA]/20 rounded-xl px-3 py-2.5 text-gray-900 dark:text-gray-100 outline-none transition-all"
                            maxLength={10}
                        />
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={handleSendOTP}
                            disabled={loading || phone.length !== 10}
                            className="flex-1 py-2.5 bg-gradient-to-r from-[#92BCEA] to-[#AFB3F7] text-white text-sm font-bold rounded-xl disabled:opacity-50 flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
                        >
                            {loading ? <Loader2 size={14} className="animate-spin" /> : <ShieldCheck size={14} />}
                            Send OTP
                        </button>
                        <button onClick={() => { setStep('idle'); setError(''); }}
                            className="px-4 py-2.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-sm font-semibold rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
                            Cancel
                        </button>
                    </div>
                </div>
            )}

            {step === 'otp_sent' && (
                <div className="ml-6 space-y-3">
                    <p className="text-xs text-gray-500">OTP sent to <span className="font-semibold text-gray-700 dark:text-gray-300">+91 {phone}</span></p>
                    <input
                        ref={otpRef}
                        type="text"
                        value={otp}
                        onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        placeholder="000000"
                        className="w-full text-sm bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 focus:border-[#92BCEA] focus:ring-2 focus:ring-[#92BCEA]/20 rounded-xl px-3 py-2.5 text-gray-900 dark:text-gray-100 outline-none text-center text-lg tracking-widest transition-all"
                        maxLength={6}
                    />
                    <div className="flex gap-2">
                        <button
                            onClick={handleVerifyOTP}
                            disabled={loading || otp.length !== 6}
                            className="flex-1 py-2.5 bg-gradient-to-r from-[#92BCEA] to-[#AFB3F7] text-white text-sm font-bold rounded-xl disabled:opacity-50 flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
                        >
                            {loading ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                            Verify
                        </button>
                        <button onClick={() => { setStep('input'); setOtp(''); setError(''); }}
                            className="px-4 py-2.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-sm font-semibold rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
                            Back
                        </button>
                    </div>
                    <button onClick={handleSendOTP} disabled={loading} className="text-xs text-gray-500 hover:text-[#92BCEA] transition-colors">
                        Didn't receive? <span className="underline font-semibold">Resend</span>
                    </button>
                </div>
            )}

            {error && (
                <div className="ml-6 mt-2 p-2.5 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-600 text-xs flex items-center gap-2">
                    <AlertCircle size={12} /> {error}
                </div>
            )}
        </div>
    );
}

// ─── Link Google Account ──────────────────────────────────────────────────────
function LinkGoogleCard({ authUser, showToast }) {
    const [linking, setLinking] = useState(false);

    const providers = authUser?.app_metadata?.providers || [];
    const hasGoogle = providers.includes('google');
    const googleIdentity = authUser?.identities?.find(i => i.provider === 'google');
    const googleEmail = googleIdentity?.identity_data?.email;

    if (hasGoogle) {
        return null;
    }

    const handleLink = async () => {
        console.log('[GOOGLE-LINK] Initiating link identity...');
        setLinking(true);
        try {
            if (!supabase.auth.linkIdentity) {
                console.error('[GOOGLE-LINK] linkIdentity function is missing from Supabase client!');
                showToast('Google linking is not supported in this version.', 'error');
                setLinking(false);
                return;
            }

            const { data, error } = await linkGoogleAccount();
            console.log('[GOOGLE-LINK] Result:', { data, error });

            if (error) {
                const msg = error.message?.toLowerCase().includes('already')
                    ? 'This Google account is already linked to another user. Please use a different Google account.'
                    : (error.message || 'Failed to link Google account');
                showToast(msg, 'error');
                setLinking(false);
            }
            // If no error, the page will redirect to Google OAuth
        } catch (err) {
            console.error('[GOOGLE-LINK] Unexpected error:', err);
            showToast('An unexpected error occurred during linking', 'error');
            setLinking(false);
        }
    };

    return (
        <div className="flex items-start gap-3.5 py-3.5 border-b border-gray-50 dark:border-gray-700/60">
            <div className="mt-0.5 flex-shrink-0">
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1">Google Account</p>
                <span className="text-sm text-gray-400 italic">Not linked</span>
            </div>
            <button
                onClick={handleLink}
                disabled={linking}
                className="mt-0.5 px-3 py-1.5 bg-white dark:bg-gray-700/50 text-[#92BCEA] text-xs font-bold rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-all border border-gray-100 dark:border-gray-600 shadow-sm flex items-center gap-1.5 active:scale-95 disabled:opacity-50"
            >
                {linking ? <Loader2 size={12} className="animate-spin" /> : <Link2 size={12} />}
                Link Google
            </button>
        </div>
    );
}

// ─── Wallet Section ──────────────────────────────────────────────────────────
function WalletCard({ balancePaise, onManage }) {
    const balance = (balancePaise || 0) / 100;

    return (
        <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-black rounded-2xl p-5 text-white shadow-xl shadow-gray-900/40 relative overflow-hidden group">
            {/* Background Accent */}
            <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full blur-2xl -mr-8 -mt-8" />

            <div className="relative z-10">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                            <Wallet size={16} className="text-[#92BCEA]" />
                        </div>
                        <h3 className="text-xs font-bold text-gray-300 uppercase tracking-widest">Your Wallet</h3>
                    </div>
                </div>

                <div className="mb-6">
                    <p className="text-[10px] text-gray-400 uppercase font-bold tracking-[0.2em] mb-1">Available Balance</p>
                    <p className="text-3xl font-black tabular-nums">
                        ₹{balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </p>
                </div>

                <button
                    onClick={onManage}
                    className="w-full py-2.5 bg-white text-black text-xs font-black rounded-xl hover:bg-gray-100 transition-all flex items-center justify-center gap-2"
                >
                    Manage Wallet
                    <ChevronRight size={14} />
                </button>
            </div>
        </div>
    );
}

// ─── Address Section ──────────────────────────────────────────────────────────
function AddressCard({ address, onSave }) {
    const [editing, setEditing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [fields, setFields] = useState({ line1: '', area: '', city: '', state: '', pincode: '' });

    useEffect(() => {
        if (editing) return;
        if (address) {
            const p = address.split(',').map(s => s.trim());
            setFields({ line1: p[0] || '', area: p[1] || '', city: p[2] || '', state: p[3] || '', pincode: p[4] || '' });
        } else {
            setFields({ line1: '', area: '', city: '', state: '', pincode: '' });
        }
    }, [address, editing]);

    const fullAddress = [fields.line1, fields.area, fields.city, fields.state, fields.pincode].filter(Boolean).join(', ');

    const handleSave = async () => {
        if (!fields.line1.trim()) return;
        setSaving(true);
        const ok = await onSave(fullAddress || null);
        setSaving(false);
        if (ok) setEditing(false);
    };

    const inputCls = "w-full text-sm bg-gray-50 dark:bg-gray-700/60 border border-gray-200 dark:border-gray-600 focus:border-[#92BCEA] focus:ring-2 focus:ring-[#92BCEA]/20 rounded-xl px-3 py-2.5 text-gray-900 dark:text-gray-100 outline-none transition-all placeholder:text-gray-300 dark:placeholder:text-gray-500";

    return (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 pt-5 pb-1">
                <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#92BCEA] to-[#AFB3F7] flex items-center justify-center">
                        <MapPin size={14} className="text-white" />
                    </div>
                    <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100">Delivery Address</h3>
                </div>
                {!editing && (
                    <button onClick={() => setEditing(true)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-[#92BCEA]/10 text-[#92BCEA] text-xs font-bold rounded-lg hover:bg-[#92BCEA]/20 transition-all border border-[#92BCEA]/20 active:scale-95">
                        <Edit2 size={13} />
                        {address ? 'Edit Address' : 'Add Address'}
                    </button>
                )}
            </div>

            {!editing ? (
                <div className="px-5 py-4">
                    {address ? (
                        <div className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{address}</div>
                    ) : (
                        <p className="text-sm text-gray-400 italic">No address added yet</p>
                    )}
                </div>
            ) : (
                <div className="px-5 pb-5 pt-3 space-y-3">
                    <div>
                        <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest block mb-1.5">Flat / House No. & Building</label>
                        <input type="text" value={fields.line1} onChange={e => setFields(f => ({ ...f, line1: e.target.value }))} placeholder="e.g. Flat 4B, Prestige Tower" className={inputCls} />
                    </div>
                    <div>
                        <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest block mb-1.5">Area / Locality / Street</label>
                        <input type="text" value={fields.area} onChange={e => setFields(f => ({ ...f, area: e.target.value }))} placeholder="e.g. Koramangala, 5th Block" className={inputCls} />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest block mb-1.5">City</label>
                            <input type="text" value={fields.city} onChange={e => setFields(f => ({ ...f, city: e.target.value }))} placeholder="Bengaluru" className={inputCls} />
                        </div>
                        <div>
                            <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest block mb-1.5">State</label>
                            <input type="text" value={fields.state} onChange={e => setFields(f => ({ ...f, state: e.target.value }))} placeholder="Karnataka" className={inputCls} />
                        </div>
                    </div>
                    <div>
                        <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest block mb-1.5">PIN Code</label>
                        <input type="text" inputMode="numeric" maxLength={6} value={fields.pincode} onChange={e => setFields(f => ({ ...f, pincode: e.target.value.replace(/\D/g, '') }))} placeholder="560034" className={inputCls} />
                    </div>
                    <div className="flex gap-2 pt-1">
                        <button onClick={handleSave} disabled={saving || !fields.line1.trim()}
                            className="flex-1 py-2.5 bg-gradient-to-r from-[#92BCEA] to-[#AFB3F7] text-white text-sm font-bold rounded-xl disabled:opacity-50 flex items-center justify-center gap-2 hover:opacity-90 transition-opacity">
                            {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                            Save Address
                        </button>
                        <button onClick={() => setEditing(false)}
                            className="px-5 py-2.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-sm font-semibold rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
                            Cancel
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function CustomerProfilePage() {
    const router = useRouter();
    const { user: authUser, loading: authLoading, refreshProfile, refreshUser } = useAuth();

    const [profile, setProfile] = useState(null);
    const [wallet, setWallet] = useState(null);
    const [profileLoading, setProfileLoading] = useState(true);
    const [toast, setToast] = useState({ msg: '', type: 'success' });

    const showToast = useCallback((msg, type = 'success') => {
        setToast({ msg, type });
        setTimeout(() => setToast({ msg: '', type: 'success' }), 3500);
    }, []);

    // ── Direct fetch (fixes the "needs refresh on first load" bug) ─────────────
    useEffect(() => {
        if (authLoading) return;
        if (!authUser) { setProfileLoading(false); return; }

        let cancelled = false;
        (async () => {
            setProfileLoading(true);

            try {
                // Fetch Profile & Wallet defensively using allSettled to prevent single() errors from crashing the page load
                const results = await Promise.allSettled([
                    supabase.from('user_profiles').select('*').eq('id', authUser.id).single(),
                    supabase.from('customer_wallets').select('*').eq('user_id', authUser.id).single()
                ]);

                if (!cancelled) {
                    const profileResult = results[0];
                    const walletResult = results[1];

                    if (profileResult.status === 'fulfilled' && profileResult.value.data) {
                        setProfile(profileResult.value.data);
                    }
                    if (walletResult.status === 'fulfilled' && walletResult.value.data) {
                        setWallet(walletResult.value.data);
                    } else if (walletResult.status === 'rejected' || walletResult.value?.error) {
                        // Auto-create wallet if missing (PGRST116) or throwing 403 due to RLS + no row
                        console.log('[PROFILE] Wallet not found. Attempting auto-creation...');
                        const { data: newWallet } = await supabase.from('customer_wallets')
                            .insert([{ user_id: authUser.id }])
                            .select('*')
                            .single();
                        if (newWallet) {
                            setWallet(newWallet);
                        }
                    }
                }
            } catch (error) {
                console.error('Error fetching profile data:', error);
            } finally {
                if (!cancelled) {
                    setProfileLoading(false);
                }
            }
        })();

        return () => { cancelled = true; };
    }, [authUser, authLoading]);

    const saveField = useCallback(async (field, value) => {
        if (!authUser) return false;
        if (field === 'full_name' && !value?.trim()) {
            showToast('Full name cannot be empty', 'error'); return false;
        }
        const { error } = await supabase
            .from('user_profiles')
            .update({ [field]: value || null, updated_at: new Date().toISOString() })
            .eq('id', authUser.id);

        if (error) { showToast("Couldn't save", 'error'); return false; }
        setProfile(prev => ({ ...prev, [field]: value }));
        refreshProfile();
        showToast('Saved!');
        return true;
    }, [authUser, refreshProfile, showToast]);

    const handleAvatarUpload = useCallback(async (url, err) => {
        if (err) { showToast(err, 'error'); return; }
        if (!url) return;
        await saveField('avatar_url', url);
    }, [saveField, showToast]);

    const handlePhoneVerified = useCallback(async (phone) => {
        setProfile(prev => ({ ...prev, phone }));
        refreshProfile();
        // Refresh auth user so authUser.phone updates (fixes verified badge)
        await refreshUser();
    }, [refreshProfile, refreshUser]);

    // ── Guards ─────────────────────────────────────────────────────────────────
    if (authLoading || profileLoading) return <ProfileSkeleton />;
    if (!authUser) { router.push('/login'); return null; }

    const displayName = profile?.full_name || authUser.email?.split('@')[0] || 'User';
    const joinYear = new Date(profile?.created_at || authUser.created_at).getFullYear();
    const isGold = !!profile?.is_gold_verified;
    const kycStatus = profile?.kyc_status || 'not_started';

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 transition-colors duration-500">
            <Navbar />
            <Toast msg={toast.msg} type={toast.type} />

            <div style={{ paddingTop: '15vh' }} className="pb-24 px-4 sm:px-6">
                <div className="max-w-5xl mx-auto">
                    <Breadcrumbs items={[{ label: 'Profile' }]} />

                    {/* Page Title */}
                    <div className="mb-7 flex items-center justify-between">
                        <div>
                            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-gray-100 mb-1.5 font-[family-name:var(--font-outfit)] flex items-center gap-3">
                                My Profile
                                {isGold && <GoldBadge size="md" />}
                            </h1>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                Manage your account, linked identities, and personal info
                            </p>
                        </div>
                        {isGold && (
                            <div className="hidden sm:flex items-center gap-2 px-4 py-2 bg-amber-500/10 border border-amber-500/20 rounded-full">
                                <Star size={14} className="text-amber-500 fill-amber-500" />
                                <span className="text-xs font-bold text-amber-500 uppercase tracking-wider">Premium Member</span>
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

                        {/* ══ LEFT SIDEBAR ══════════════════════════════════════ */}
                        <div className="lg:col-span-1 space-y-5">

                            {/* Identity Card */}
                            <motion.div
                                initial={isGold ? { boxShadow: "0 0 0px rgba(212, 175, 55, 0)" } : {}}
                                animate={isGold ? { boxShadow: "0 0 30px rgba(212, 175, 55, 0.3)" } : {}}
                                className={`
                                    relative overflow-hidden rounded-3xl border p-6 transition-all duration-500 
                                    ${isGold
                                        ? 'bg-gradient-to-br from-[#1a1600] to-[#000000] border-amber-500/40 text-white'
                                        : 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700'
                                    }
                                `}
                            >
                                {isGold && (
                                    <>
                                        {/* Premium Texture Overlay */}
                                        <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]" />
                                        {/* Golden Glows */}
                                        <div className="absolute -top-10 -right-10 w-32 h-32 bg-amber-500/20 blur-3xl rounded-full" />
                                        <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-yellow-500/10 blur-3xl rounded-full" />
                                    </>
                                )}
                                <AvatarUpload
                                    userId={authUser.id}
                                    avatarUrl={profile?.avatar_url}
                                    displayName={displayName}
                                    onUpload={handleAvatarUpload}
                                />

                                <div className={`text-center mb-5 pb-5 border-b ${isGold ? 'border-amber-500/20' : 'border-gray-50 dark:border-gray-700'}`}>
                                    <h2 className={`text-xl font-black truncate px-2 flex items-center justify-center gap-2 ${isGold ? 'text-amber-100' : 'text-gray-900 dark:text-gray-100'}`}>
                                        {displayName}
                                        {isGold && <GoldBadge size="md" />}
                                    </h2>
                                    <p className={`text-xs mt-1 font-medium ${isGold ? 'text-amber-500/60' : 'text-gray-400 dark:text-gray-500'}`}>Member since {joinYear}</p>
                                    <div className="flex flex-wrap items-center justify-center gap-2 mt-2">
                                        <span className={`inline-block text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wide ${kycStatus === 'verified'
                                            ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600'
                                            : 'bg-amber-50 dark:bg-amber-900/20 text-amber-600'
                                            }`}>
                                            {kycStatus === 'verified' ? '✓ KYC Verified' : 'KYC Pending'}
                                        </span>
                                        {isGold && (
                                            <span className="inline-block text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest bg-gradient-to-r from-[#FFD700] to-[#FDB931] text-black shadow-lg shadow-amber-500/20">
                                                Elite Gold
                                            </span>
                                        )}
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div className="flex items-center gap-3 text-sm">
                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isGold ? 'bg-amber-500/10' : 'bg-[#92BCEA]/10'}`}>
                                            <Mail size={14} className={isGold ? 'text-amber-400' : 'text-[#92BCEA]'} />
                                        </div>
                                        <span className={`text-xs font-medium ${isGold ? 'text-amber-100/80' : 'text-gray-600 dark:text-gray-400'} truncate`}>{authUser.email || 'No email'}</span>
                                    </div>
                                    <div className="flex items-center gap-3 text-sm">
                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isGold ? 'bg-amber-500/10' : 'bg-[#92BCEA]/10'}`}>
                                            <Phone size={14} className={isGold ? 'text-amber-400' : 'text-[#92BCEA]'} />
                                        </div>
                                        <span className={`text-xs font-medium ${isGold ? 'text-amber-100/80' : 'text-gray-600 dark:text-gray-400'}`}>
                                            {profile?.phone || authUser.phone || <span className="italic text-gray-500">No phone</span>}
                                        </span>
                                    </div>
                                </div>
                            </motion.div>

                            {/* Wallet Card */}
                            <WalletCard
                                balancePaise={wallet?.balance_paise || 0}
                                onManage={() => router.push('/wallet')}
                            />

                            {/* Gradient Stats Card */}
                            <div className={`${isGold
                                ? 'bg-gradient-to-br from-amber-600 via-yellow-500 to-amber-700'
                                : 'bg-gradient-to-br from-[#92BCEA] to-[#AFB3F7]'
                                } rounded-2xl p-5 text-white shadow-lg shadow-amber-900/20`}>
                                <h3 className="text-sm font-bold mb-4 opacity-90 flex items-center gap-2">
                                    {isGold && <Star size={16} className="fill-white" />}
                                    Your Premium Activity
                                </h3>
                                <div className="space-y-3.5">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2 text-sm opacity-90">
                                            <Package size={16} />
                                            <span>Total Purchases</span>
                                        </div>
                                        <span className="font-bold text-lg">0</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2 text-sm opacity-90">
                                            <ShieldCheck size={16} />
                                            <span>Total Saved</span>
                                        </div>
                                        <span className="font-bold text-lg">₹0</span>
                                    </div>
                                </div>
                                <button
                                    onClick={() => router.push('/dashboard')}
                                    className="w-full mt-5 py-2.5 bg-white/20 hover:bg-white/30 border border-white/30 text-white font-semibold rounded-xl transition-all text-sm flex items-center justify-center gap-2"
                                >
                                    <LayoutDashboard size={15} />
                                    Dashboard
                                </button>
                            </div>
                        </div>

                        {/* ══ RIGHT MAIN ════════════════════════════════════════ */}
                        <div className="lg:col-span-2 space-y-5">

                            {/* Personal Info Card */}
                            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5 shadow-sm">
                                <div className="flex items-center gap-2 mb-1">
                                    <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#92BCEA] to-[#AFB3F7] flex items-center justify-center">
                                        <User size={14} className="text-white" />
                                    </div>
                                    <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100">Personal Information</h3>
                                </div>
                                <p className="text-xs text-gray-400 mb-4 ml-9">Manage your name, contact, and linked accounts</p>

                                <EditableRow label="Full Name" icon={User} value={profile?.full_name} placeholder="Add your full name" onSave={v => saveField('full_name', v)} />
                                <EditableRow label="Email Address" icon={Mail} value={authUser.email} readOnly
                                    badge={authUser.email && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-green-50 dark:bg-green-900/30 text-green-600 uppercase tracking-wide">✓ Verified</span>}
                                />

                                {/* Phone Verification (replaces plain EditableRow) */}
                                <PhoneVerification
                                    currentPhone={profile?.phone}
                                    authPhone={authUser.phone}
                                    userId={authUser.id}
                                    onVerified={handlePhoneVerified}
                                    showToast={showToast}
                                />

                                {/* Google Account Linking */}
                                <LinkGoogleCard authUser={authUser} showToast={showToast} />

                                <EditableRow label="Date of Birth" icon={Calendar} value={profile?.date_of_birth} placeholder="YYYY-MM-DD" type="date" onSave={v => saveField('date_of_birth', v)} />
                            </div>

                            {/* Address Card */}
                            <AddressCard address={profile?.address} onSave={v => saveField('address', v)} />

                            {/* KYC */}
                            <KYCStatus status={kycStatus} onStartKYC={() => router.push('/profile/kyc')} />
                        </div>
                    </div>
                </div>
            </div>

            <CustomerBottomNav />
        </div>
    );
}
