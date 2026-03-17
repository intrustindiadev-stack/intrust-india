'use client';

import { useState, useRef, useEffect } from 'react';
import { User, Mail, Phone, Calendar, Edit2, Check, X, Loader2, Lock, ShieldCheck, AlertCircle } from 'lucide-react';
import { signInWithOTP } from '@/lib/supabase';

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
        <div className="group flex items-start gap-5 py-5 border-b border-gray-100 dark:border-white/5 last:border-0">
            <div className={`mt-1 flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${readOnly ? 'bg-gray-100 dark:bg-white/5' : 'bg-[#92BCEA]/10 text-[#92BCEA]'}`}>
                <Icon size={18} />
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1.5">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">{label}</p>
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
                            className="flex-1 text-sm bg-gray-50 dark:bg-white/5 border border-[#92BCEA] rounded-xl px-4 py-2 text-gray-900 dark:text-gray-100 outline-none ring-4 ring-[#92BCEA]/10 min-w-0"
                        />
                        <button onClick={handleSave} disabled={saving}
                            className="w-9 h-9 rounded-xl bg-green-500 flex items-center justify-center text-white flex-shrink-0 hover:bg-green-600 transition-all shadow-lg shadow-green-500/20 disabled:opacity-50">
                            {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                        </button>
                        <button onClick={cancel}
                            className="w-9 h-9 rounded-xl bg-gray-100 dark:bg-white/10 flex items-center justify-center text-gray-500 flex-shrink-0 hover:bg-gray-200 transition-all">
                            <X size={16} />
                        </button>
                    </div>
                ) : (
                    <div className="flex items-center gap-2 min-w-0">
                        <span className={`text-sm font-semibold truncate ${value ? 'text-gray-800 dark:text-gray-200' : 'text-gray-400 italic'}`}>
                            {value || (placeholder || 'Not set')}
                        </span>
                        {readOnly && <Lock size={12} className="text-gray-300 dark:text-gray-600 flex-shrink-0" />}
                    </div>
                )}
            </div>
            {!readOnly && !editing && (
                <button
                    onClick={() => setEditing(true)}
                    className="mt-1 w-10 h-10 rounded-xl bg-gray-50 dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 flex items-center justify-center text-[#92BCEA] transition-all flex-shrink-0 border border-transparent hover:border-gray-200 dark:hover:border-white/10 shadow-sm active:scale-95"
                    title={`Edit ${label}`}
                >
                    <Edit2 size={14} />
                </button>
            )}
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
        if (phone.length !== 10) return;
        setError('');
        setLoading(true);

        const formattedPhone = `+91${phone}`;

        try {
            const { data: existingUserId, error: checkError } = await supabase
                .rpc('get_user_id_by_phone', { phone_number: phone });

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
            <div className="group flex items-start gap-5 py-5 border-b border-gray-100 dark:border-white/5 last:border-0">
                <div className="mt-1 flex-shrink-0 w-10 h-10 rounded-xl bg-green-500/10 text-green-500 flex items-center justify-center">
                    <Phone size={18} />
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Contact Number</p>
                        <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-green-500 text-white uppercase tracking-widest shadow-lg shadow-green-500/20">✓ Verified</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">{displayPhone}</span>
                    </div>
                </div>
                <button
                    onClick={() => { setStep('input'); setPhone(displayPhone.replace('+91', '')); }}
                    className="mt-1 w-10 h-10 rounded-xl bg-gray-50 dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 flex items-center justify-center text-[#92BCEA] transition-all flex-shrink-0 active:scale-95"
                >
                    <Edit2 size={14} />
                </button>
            </div>
        );
    }

    if (step === 'idle') {
        return (
            <div className="group flex items-start gap-5 py-5 border-b border-gray-100 dark:border-white/5 last:border-0">
                <div className="mt-1 flex-shrink-0 w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
                    <Phone size={18} />
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Contact Number</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-gray-400 italic">No number linked</span>
                    </div>
                </div>
                <button
                    onClick={() => setStep('input')}
                    className="mt-1 px-4 py-2 bg-[#1a1a1a] text-amber-500 text-[10px] font-black rounded-xl hover:bg-black transition-all border border-amber-500/20 uppercase tracking-widest active:scale-95 shadow-xl"
                >
                    Link Now
                </button>
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

export default function PersonalInfoForm({ user, profile, onSave, onPhoneVerified, showToast, supabase }) {
    return (
        <div className="bg-white dark:bg-gray-900/50 backdrop-blur-xl rounded-[2.5rem] border border-gray-100 dark:border-white/5 p-8 shadow-xl relative overflow-hidden transition-all duration-500">
            <div className="flex items-center gap-4 mb-10">
                <div className="w-11 h-11 rounded-[1.25rem] bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/10">
                    <User size={20} className="text-white" />
                </div>
                <div>
                    <h3 className="text-xl font-black text-gray-900 dark:text-white tracking-tight">Personal Information</h3>
                    <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em]">Legal Identity & Contact Details</p>
                </div>
            </div>

            <div className="divide-y divide-gray-50 dark:divide-white/5">
                <EditableRow label="Full Legal Name" icon={User} value={profile?.full_name} placeholder="Enter your full name" onSave={v => onSave('full_name', v)} />

                <EditableRow label="Direct Email" icon={Mail} value={user.email} readOnly
                    badge={<span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-500 uppercase tracking-widest border border-blue-500/20">Verified Email</span>}
                />

                <PhoneVerification
                    currentPhone={profile?.phone}
                    authPhone={user.phone}
                    userId={user.id}
                    onVerified={onPhoneVerified}
                    showToast={showToast}
                    supabase={supabase}
                />

                <EditableRow label="Date of Birth" icon={Calendar} value={profile?.date_of_birth} placeholder="YYYY-MM-DD" type="date" onSave={v => onSave('date_of_birth', v)} />
            </div>
        </div>
    );
}
