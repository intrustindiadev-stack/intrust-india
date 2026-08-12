'use client';

import { useState, useRef, useEffect } from 'react';
import { User, Mail, Phone, Calendar, Edit2, Check, X, Loader2, Lock, ShieldCheck, AlertCircle, Key, Eye, EyeOff, Chrome } from 'lucide-react';
import { signInWithOTP } from '@/lib/supabase';
import { displayEmail } from '@/lib/auth';
import { normalizePhone } from '@/lib/phoneUtils';

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
        <div className="group flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6 py-4 border-b border-gray-100 dark:border-white/5 last:border-0">
            <div className="flex items-center gap-3 sm:w-1/3">
                <Icon size={16} className="text-gray-400" />
                <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                    {label} {badge}
                </p>
            </div>
            <div className="flex-1 min-w-0 w-full flex items-center justify-between gap-4">
                {editing ? (
                    <div className="flex items-center gap-2 w-full">
                        <input
                            ref={inputRef}
                            type={type}
                            value={draft}
                            onChange={e => setDraft(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') cancel(); }}
                            placeholder={placeholder}
                            className="flex-1 text-sm bg-gray-50 dark:bg-white/5 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-gray-900 dark:text-gray-100 outline-none focus:border-blue-500 transition-colors min-w-0"
                        />
                        <button onClick={handleSave} disabled={saving}
                            className="w-8 h-8 rounded-lg bg-gray-900 dark:bg-white flex items-center justify-center text-white dark:text-gray-900 flex-shrink-0 disabled:opacity-50">
                            {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                        </button>
                        <button onClick={cancel}
                            className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-white/10 flex items-center justify-center text-gray-500 flex-shrink-0">
                            <X size={14} />
                        </button>
                    </div>
                ) : (
                    <>
                        <div className="flex items-center gap-2 min-w-0">
                            <span className={`text-sm font-medium truncate ${value ? 'text-gray-900 dark:text-white' : 'text-gray-400 italic'}`}>
                                {value || (placeholder || 'Not set')}
                            </span>
                            {readOnly && <Lock size={12} className="text-gray-300 dark:text-gray-600 flex-shrink-0" />}
                        </div>
                        {!readOnly && (
                            <button
                                onClick={() => setEditing(true)}
                                className="opacity-0 group-hover:opacity-100 p-2 rounded-md hover:bg-gray-100 dark:hover:bg-white/10 text-gray-400 hover:text-gray-900 dark:hover:text-white transition-all flex-shrink-0"
                                title={`Edit ${label}`}
                            >
                                <Edit2 size={14} />
                            </button>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}

function PhoneVerification({ currentPhone, authPhone, userId, onVerified, showToast, supabase }) {
    const [step, setStep] = useState('idle');
    const [phone, setPhone] = useState('');
    const [otp, setOtp] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [justVerified, setJustVerified] = useState(false);
    const otpRef = useRef(null);

    const isFullyLinked = authPhone && currentPhone && authPhone.replace('+91', '') === currentPhone.replace('+91', '');
    const isVerified = justVerified || !!currentPhone;
    const displayPhone = currentPhone || authPhone || '';

    useEffect(() => {
        if (step === 'otp_sent') otpRef.current?.focus();
    }, [step]);

    const handleSendOTP = async () => {
        const { cleanPhone, formattedPhone, isValid } = normalizePhone(phone);
        if (!isValid) return;
        setError('');
        setLoading(true);

        try {
            const { data: existingUserId, error: checkError } = await supabase
                .rpc('get_user_id_by_phone', { phone_number: cleanPhone });

            if (checkError) {
                console.error('Phone check error:', checkError);
            } else if (existingUserId && existingUserId !== userId) {
                setError('This number belongs to another elite account.');
                setLoading(false);
                return;
            }
        } catch (err) {
            console.error('Phone check failed:', err);
        }

        const { error: otpError } = await signInWithOTP(formattedPhone);

        if (otpError) {
            setError(otpError.message || 'OTP Delivery Failed');
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
            const response = await fetch('/api/auth/verify-phone', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phone, otp, userId }),
            });

            const data = await response.json();

            if (!response.ok) {
                setError(data.error || 'Identity Verification Failed');
                setLoading(false);
                return;
            }

            showToast('Identity linked successfully!');
            setJustVerified(true);
            onVerified(data.phone || `+91${phone}`);
            setStep('idle');
            setOtp('');
            setPhone('');
        } catch (err) {
            setError('Verification failed. Try again.');
        } finally {
            setLoading(false);
        }
    };

    if (isVerified && step === 'idle') {
        return (
            <div className="group flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6 py-4 border-b border-gray-100 dark:border-white/5 last:border-0">
                <div className="flex items-center gap-3 sm:w-1/3">
                    <Phone size={16} className="text-gray-400" />
                    <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Contact Number</p>
                </div>
                <div className="flex-1 min-w-0 w-full flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                        <span className="text-sm font-medium text-gray-900 dark:text-white truncate">{displayPhone}</span>
                        <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-green-500/10 text-green-600 uppercase tracking-widest">✓ Verified</span>
                    </div>
                    <button
                        onClick={() => { setStep('input'); setPhone(displayPhone.replace('+91', '')); }}
                        className="opacity-0 group-hover:opacity-100 p-2 rounded-md hover:bg-gray-100 dark:hover:bg-white/10 text-gray-400 hover:text-gray-900 dark:hover:text-white transition-all flex-shrink-0"
                    >
                        <Edit2 size={14} />
                    </button>
                </div>
            </div>
        );
    }

    if (step === 'idle') {
        return (
            <div className="group flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6 py-4 border-b border-gray-100 dark:border-white/5 last:border-0">
                <div className="flex items-center gap-3 sm:w-1/3">
                    <Phone size={16} className="text-gray-400" />
                    <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Contact Number</p>
                </div>
                <div className="flex-1 min-w-0 w-full flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                        <span className="text-sm font-medium text-gray-400 italic">No number linked</span>
                    </div>
                    <button
                        onClick={() => setStep('input')}
                        className="px-4 py-1.5 bg-blue-500/10 text-blue-600 dark:text-blue-400 text-[10px] font-bold rounded-lg hover:bg-blue-500/20 transition-all uppercase tracking-widest flex-shrink-0"
                    >
                        Link Now
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="py-6 border-b border-gray-100 dark:border-white/5 last:border-0">
            <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center">
                    <ShieldCheck size={20} />
                </div>
                <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Contact Verification</p>
                    <p className="text-sm font-bold text-gray-700 dark:text-gray-300">{step === 'otp_sent' ? 'Enter OTP' : 'Link Phone Number'}</p>
                </div>
            </div>

            {step === 'input' && (
                <div className="space-y-4">
                    <div className="flex items-center gap-3">
                        <span className="text-sm font-black text-gray-400">+91</span>
                        <input
                            type="tel"
                            value={phone}
                            onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                            placeholder="Mobile Number"
                            className="flex-1 text-sm bg-gray-50 dark:bg-white/5 border border-transparent focus:border-[#92BCEA] rounded-2xl px-5 py-3.5 text-gray-900 dark:text-gray-100 outline-none transition-all shadow-inner"
                            maxLength={10}
                        />
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={handleSendOTP}
                            disabled={loading || phone.length !== 10}
                            className="flex-1 py-3.5 bg-black text-white text-[11px] font-black rounded-2xl disabled:opacity-50 flex items-center justify-center gap-2 hover:bg-gray-900 transition-all uppercase tracking-[0.15em] shadow-2xl"
                        >
                            {loading ? <Loader2 size={16} className="animate-spin" /> : <ShieldCheck size={16} />}
                            Request OTP
                        </button>
                        <button onClick={() => { setStep('idle'); setError(''); }}
                            className="px-6 py-3.5 bg-gray-100 dark:bg-white/5 text-gray-500 text-[11px] font-black rounded-2xl transition-all uppercase tracking-widest">
                            Cancel
                        </button>
                    </div>
                </div>
            )}

            {step === 'otp_sent' && (
                <div className="space-y-4">
                    <p className="text-[11px] text-gray-500 font-bold uppercase tracking-widest">Sent to +91 {phone}</p>
                    <input
                        ref={otpRef} type="text" value={otp}
                        onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        placeholder="••••••"
                        className="w-full text-2xl font-black bg-gray-50 dark:bg-white/5 border border-transparent focus:border-[#92BCEA] rounded-2xl px-5 py-4 text-gray-900 dark:text-gray-100 outline-none text-center tracking-[0.5em] transition-all shadow-inner"
                        maxLength={6}
                    />
                    <div className="flex gap-3">
                        <button
                            onClick={handleVerifyOTP}
                            disabled={loading || otp.length !== 6}
                            className="flex-1 py-3.5 bg-green-500 text-white text-[11px] font-black rounded-2xl disabled:opacity-50 flex items-center justify-center gap-2 hover:bg-green-600 transition-all uppercase tracking-[0.15em] shadow-lg shadow-green-500/20"
                        >
                            {loading ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                            Confirm
                        </button>
                        <button onClick={() => { setStep('input'); setOtp(''); setError(''); }}
                            className="px-6 py-3.5 bg-gray-100 dark:bg-white/5 text-gray-500 text-[11px] font-black rounded-2xl transition-all uppercase tracking-widest">
                            Back
                        </button>
                    </div>
                </div>
            )}

            {error && (
                <div className="mt-4 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-500 text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                    <AlertCircle size={14} /> {error}
                </div>
            )}
        </div>
    );
}

/**
 * Login Methods / Security block.
 *
 * Shows which authentication methods are active for the account:
 *   • Phone OTP (always active for phone-based accounts)
 *   • Email + Password
 *   • Google
 *
 * For phone-only users (no real email): shows an email + password form.
 * For users who already have a real email: shows a password-change-only form.
 */
function PasswordInput({ id, value, onChange, placeholder, onKeyDown }) {
    const [show, setShow] = useState(false);
    return (
        <div className="relative">
            <input
                id={id}
                type={show ? 'text' : 'password'}
                value={value}
                onChange={onChange}
                onKeyDown={onKeyDown}
                placeholder={placeholder}
                className="w-full text-sm bg-gray-50 dark:bg-white/5 border border-transparent focus:border-[#92BCEA] rounded-2xl px-5 py-3.5 pr-12 text-gray-900 dark:text-gray-100 outline-none transition-all shadow-inner"
            />
            <button
                type="button"
                onClick={() => setShow(s => !s)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                tabIndex={-1}
            >
                {show ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
        </div>
    );
}

function LoginMethodsSection({ user, safeEmail, showToast, refreshUser }) {
    const [formOpen, setFormOpen] = useState(false);
    const [email, setEmail] = useState(safeEmail || '');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Derive active providers from app_metadata
    const providers = Array.isArray(user?.app_metadata?.providers)
        ? user.app_metadata.providers
        : (user?.app_metadata?.provider ? [user.app_metadata.provider] : []);

    const hasPhone = providers.includes('phone') || !!user?.phone;
    const hasEmailPw = !!safeEmail && (providers.includes('email') || user?.app_metadata?.auth_provider === 'multiple');
    const hasGoogle = providers.includes('google');

    const handleSubmit = async () => {
        setError('');

        // Client-side validation
        const targetEmail = safeEmail || email;
        if (!safeEmail && !targetEmail.includes('@')) {
            setError('Enter a valid email address.');
            return;
        }
        if (password.length < 8) {
            setError('Password must be at least 8 characters.');
            return;
        }
        if (password !== confirmPassword) {
            setError('Passwords do not match.');
            return;
        }

        setLoading(true);
        try {
            const res = await fetch('/api/auth/email/link-to-phone-user', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: targetEmail,
                    password,
                    confirmPassword,
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                if (res.status === 409) {
                    setError('That email is already in use by another account.');
                } else {
                    setError(data.error || 'Something went wrong. Please try again.');
                }
                return;
            }

            showToast?.('Email linked! You can now also log in with email + password.');
            setFormOpen(false);
            setPassword('');
            setConfirmPassword('');
            if (refreshUser) await refreshUser();
        } catch (err) {
            setError('Network error. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const MethodRow = ({ icon: Icon, label, active, iconColor }) => (
        <div className="flex items-center justify-between py-2.5 text-sm">
            <div className="flex items-center gap-3">
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${active ? iconColor || 'bg-green-500/10 text-green-500' : 'bg-gray-100 dark:bg-white/5 text-gray-400'}`}>
                    <Icon size={14} />
                </div>
                <span className="font-semibold text-gray-700 dark:text-gray-300">{label}</span>
            </div>
            {active ? (
                <span className="text-[10px] font-black text-green-500 uppercase tracking-widest">✓ Active</span>
            ) : (
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">✗ Not set</span>
            )}
        </div>
    );

    return (
        <div className="py-5 border-b border-gray-100 dark:border-white/5 last:border-0">
            {/* Section header */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#92BCEA]/10 text-[#92BCEA] flex items-center justify-center flex-shrink-0">
                        <Key size={18} />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Login Methods</p>
                        <p className="text-sm font-bold text-gray-700 dark:text-gray-200">Security</p>
                    </div>
                </div>
                {!formOpen && (
                    <button
                        onClick={() => setFormOpen(true)}
                        className="px-4 py-2 bg-[#1a1a1a] text-[#92BCEA] text-[10px] font-black rounded-xl hover:bg-black transition-all border border-[#92BCEA]/20 uppercase tracking-widest active:scale-95 shadow-xl"
                    >
                        {safeEmail ? 'Change Password' : 'Link Email'}
                    </button>
                )}
            </div>

            {/* Method status rows */}
            <div className="bg-gray-50 dark:bg-white/[0.03] rounded-2xl px-4 py-1 mb-4 divide-y divide-gray-100 dark:divide-white/5">
                <MethodRow icon={Phone} label="Phone OTP" active={hasPhone} iconColor="bg-green-500/10 text-green-500" />
                <MethodRow icon={Mail}  label="Email + Password" active={hasEmailPw} iconColor="bg-blue-500/10 text-blue-500" />
                <MethodRow icon={Chrome} label="Google" active={hasGoogle} iconColor="bg-red-500/10 text-red-500" />
            </div>

            {/* Form */}
            {formOpen && (
                <div className="space-y-3 mt-2">
                    {/* Email field — hidden if user already has a real email */}
                    {!safeEmail && (
                        <input
                            id="link-email"
                            type="email"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            placeholder="your@email.com"
                            className="w-full text-sm bg-gray-50 dark:bg-white/5 border border-transparent focus:border-[#92BCEA] rounded-2xl px-5 py-3.5 text-gray-900 dark:text-gray-100 outline-none transition-all shadow-inner"
                        />
                    )}
                    {safeEmail && (
                        <div className="flex items-center gap-3 px-5 py-3.5 bg-blue-500/5 border border-blue-500/20 rounded-2xl">
                            <Mail size={15} className="text-blue-500 flex-shrink-0" />
                            <span className="text-sm font-semibold text-gray-700 dark:text-gray-200 truncate">{safeEmail}</span>
                            <span className="ml-auto text-[9px] font-black text-blue-500 uppercase tracking-widest bg-blue-500/10 px-2 py-0.5 rounded-full border border-blue-500/20">Confirmed</span>
                        </div>
                    )}
                    <PasswordInput
                        id="link-password"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        placeholder="Password (min 8 chars)"
                        onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                    />
                    <PasswordInput
                        id="link-confirm-password"
                        value={confirmPassword}
                        onChange={e => setConfirmPassword(e.target.value)}
                        placeholder="Confirm password"
                        onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                    />

                    {error && (
                        <div className="p-3.5 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-500 text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                            <AlertCircle size={14} /> {error}
                        </div>
                    )}

                    <div className="flex gap-3">
                        <button
                            id="link-email-submit"
                            onClick={handleSubmit}
                            disabled={loading}
                            className="flex-1 py-3.5 bg-[#1E3A5F] text-white text-[11px] font-black rounded-2xl disabled:opacity-50 flex items-center justify-center gap-2 hover:bg-[#16304f] transition-all uppercase tracking-[0.15em] shadow-2xl shadow-blue-900/20"
                        >
                            {loading ? <Loader2 size={16} className="animate-spin" /> : <Key size={16} />}
                            {safeEmail ? 'Update Password' : 'Link Email + Password'}
                        </button>
                        <button
                            onClick={() => { setFormOpen(false); setError(''); setPassword(''); setConfirmPassword(''); }}
                            className="px-6 py-3.5 bg-gray-100 dark:bg-white/5 text-gray-500 text-[11px] font-black rounded-2xl transition-all uppercase tracking-widest"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

export default function PersonalInfoForm({ user, profile, onSave, onPhoneVerified, showToast, supabase, refreshUser }) {
    // Mask pseudo-emails — phone-only users must never see their internal identifier
    const safeEmail = displayEmail(user?.email);

    return (
        <div id="personal-info-form" className="space-y-8">
            {/* Personal Information Section */}
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm overflow-hidden transition-all duration-500">
                <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-white/5">
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Personal Details</h3>
                </div>

                <div className="p-6 divide-y divide-gray-100 dark:divide-gray-800">
                    <EditableRow label="Full Legal Name" icon={User} value={profile?.full_name} placeholder="Enter your full name" onSave={v => onSave('full_name', v)} />
                    <EditableRow label="Date of Birth" icon={Calendar} value={profile?.date_of_birth} placeholder="YYYY-MM-DD" type="date" onSave={v => onSave('date_of_birth', v)} />
                </div>
            </div>

            {/* Contact & Security Section */}
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm overflow-hidden transition-all duration-500">
                <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-white/5">
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Contact & Security</h3>
                </div>

                <div className="p-6 divide-y divide-gray-100 dark:divide-gray-800">
                    <PhoneVerification
                        currentPhone={profile?.phone}
                        authPhone={user.phone}
                        userId={user.id}
                        onVerified={onPhoneVerified}
                        showToast={showToast}
                        supabase={supabase}
                    />

                    <LoginMethodsSection
                        user={user}
                        safeEmail={safeEmail}
                        showToast={showToast}
                        refreshUser={refreshUser}
                    />
                </div>
            </div>
        </div>
    );
}

