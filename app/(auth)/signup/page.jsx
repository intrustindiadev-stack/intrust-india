'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { signInWithOTP, verifyOTP } from '@/lib/supabase';
import { supabase } from '@/lib/supabaseClient';
import { Phone, ArrowRight, Loader2, ShieldCheck, User, Sparkles, Mail, Eye, EyeOff, CheckCircle } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

// ─── Password Strength Helpers ─────────────────────────────────────────────────
function getPasswordStrength(password) {
    const checks = {
        length:    password.length >= 8,
        uppercase: /[A-Z]/.test(password),
        lowercase: /[a-z]/.test(password),
        number:    /[0-9]/.test(password),
        special:   /[^A-Za-z0-9]/.test(password)
    };
    const passed = Object.values(checks).filter(Boolean).length;
    return { checks, score: passed };
}

function PasswordStrengthMeter({ password }) {
    const { checks, score } = getPasswordStrength(password);
    if (!password) return null;

    const colors  = ['bg-red-400', 'bg-orange-400', 'bg-yellow-400', 'bg-lime-400', 'bg-green-500'];
    const labels  = ['Very Weak', 'Weak', 'Fair', 'Good', 'Strong'];

    return (
        <div className="mt-2 space-y-2">
            <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((i) => (
                    <div
                        key={i}
                        className={`h-1 flex-1 rounded-full transition-all duration-300 ${i <= score ? colors[score - 1] : 'bg-gray-200 dark:bg-gray-700'}`}
                    />
                ))}
            </div>
            <p className={`text-[10px] font-bold uppercase tracking-wider px-1 ${score <= 2 ? 'text-red-500' : score <= 3 ? 'text-yellow-500' : 'text-green-500'}`}>
                {labels[score - 1] || 'Too Weak'}
            </p>
            <ul className="text-[10px] text-gray-400 space-y-0.5 px-1">
                {!checks.length    && <li>• At least 8 characters</li>}
                {!checks.uppercase && <li>• One uppercase letter</li>}
                {!checks.lowercase && <li>• One lowercase letter</li>}
                {!checks.number    && <li>• One number</li>}
                {!checks.special   && <li>• One special character</li>}
            </ul>
        </div>
    );
}

export default function SignupPage() {
    const router = useRouter();

    // ─── Shared state ───────────────────────────────────────────────────────────
    const [step, setStep]               = useState('choice');   // 'choice' | 'details' | 'phone' | 'otp' | 'email-form' | 'email-pending' | 'email-conflict'
    const [name, setName]               = useState('');
    const [phone, setPhone]             = useState('');
    const [otp, setOtp]                 = useState('');
    const [loading, setLoading]         = useState(false);
    const [googleLoading, setGoogleLoading] = useState(false);
    const [error, setError]             = useState('');

    // ─── Email-specific state ───────────────────────────────────────────────────
    const [emailAddress, setEmailAddress]   = useState('');
    const [password, setPassword]           = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword]   = useState(false);
    const [showConfirm, setShowConfirm]     = useState(false);
    const [conflictProvider, setConflictProvider] = useState('');
    const [resendLoading, setResendLoading] = useState(false);
    const [resendSuccess, setResendSuccess] = useState(false);

    useEffect(() => {
        sessionStorage.removeItem('intrust_adv_seen');
    }, []);

    // ─── Google ─────────────────────────────────────────────────────────────────
    const handleGoogleSignIn = async () => {
        setGoogleLoading(true);
        setError('');
        const { error: googleError } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: { redirectTo: `${window.location.origin}/auth/callback` }
        });
        if (googleError) {
            setError(googleError.message || 'Google sign in failed');
            setGoogleLoading(false);
        }
    };

    // ─── Phone OTP flow ─────────────────────────────────────────────────────────
    const handleContinue = (e) => {
        if (e) e.preventDefault();
        if (name.trim().length < 2) { setError('Please enter your full name'); return; }
        setError('');
        setStep('phone');
    };

    const handleSendOTP = async (e) => {
        if (e) e.preventDefault();
        setError('');
        setLoading(true);
        if (phone.length !== 10) {
            setError('Please enter a valid 10-digit phone number');
            setLoading(false);
            return;
        }
        try {
            const { data: userData, error: checkError } = await supabase
                .rpc('get_user_id_by_phone', { phone_number: phone });
            if (!checkError && userData) {
                setError('Account already exists. Please login instead.');
                setLoading(false);
                return;
            }
        } catch (err) {
            console.error('[SIGNUP] Phone check failed:', err);
        }
        const formattedPhone = `+91${phone}`;
        const { error: otpError } = await signInWithOTP(formattedPhone);
        if (otpError) { setError(otpError.message || 'Failed to send OTP.'); setLoading(false); return; }
        setStep('otp');
        setLoading(false);
    };

    const handleVerifyOTP = async (e) => {
        if (e) e.preventDefault();
        setError('');
        if (otp.length !== 6) { setError('Please enter the 6-digit OTP'); return; }
        setLoading(true);
        try {
            const formattedPhone = `+91${phone}`;
            const { data, error: verifyError } = await verifyOTP(formattedPhone, otp, name);
            if (verifyError) { setError(verifyError.message || 'Invalid OTP.'); setLoading(false); return; }
            window.location.href = '/dashboard';
        } catch (err) {
            console.error('[SIGNUP] Unexpected OTP error:', err);
            setError('An unexpected error occurred. Please try again.');
            setLoading(false);
        }
    };

    // ─── Email flow ─────────────────────────────────────────────────────────────
    const handleEmailSignup = async (e) => {
        e.preventDefault();
        setError('');

        const { score } = getPasswordStrength(password);
        if (score < 3) { setError('Please choose a stronger password.'); return; }
        if (password !== confirmPassword) { setError('Passwords do not match.'); return; }
        if (name.trim().length < 2) { setError('Please enter your full name.'); return; }

        setLoading(true);
        try {
            const res = await fetch('/api/auth/email/signup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: emailAddress, password, full_name: name })
            });
            const data = await res.json();

            if (data.conflict) {
                setConflictProvider(data.provider);
                setStep('email-conflict');
                setLoading(false);
                return;
            }

            if (!res.ok) {
                setError(data.error || 'Signup failed. Please try again.');
                setLoading(false);
                return;
            }

            setStep('email-pending');
        } catch (err) {
            console.error('[SIGNUP] Email signup error:', err);
            setError('Network error. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleResendVerification = async () => {
        setResendLoading(true);
        setResendSuccess(false);
        try {
            const res = await fetch('/api/auth/email/resend-verification', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: emailAddress })
            });
            const data = await res.json();
            if (!res.ok) {
                setError(data.error || 'Failed to resend. Please try again.');
            } else {
                setResendSuccess(true);
            }
        } catch (err) {
            setError('Network error. Please try again.');
        } finally {
            setResendLoading(false);
        }
    };

    // ─── Shared UI helpers ───────────────────────────────────────────────────────
    const providerLabel = { google: 'Google', phone_otp: 'Phone', multiple: 'Google/Phone' };

    return (
        <div className="min-h-screen bg-white dark:bg-gray-950 flex flex-col items-center justify-center p-4 transition-colors duration-300">
            <div className="w-full max-w-md">
                {/* Logo & Header */}
                <div className="text-center mb-10 transition-all duration-500 transform scale-100 hover:scale-105">
                    <div className="inline-flex items-center justify-center w-20 h-20 mb-6 rounded-[24px] bg-gradient-to-br from-[#92BCEA] to-[#7aaad6] shadow-2xl shadow-blue-200/50 dark:shadow-none p-4">
                        <Image src="/icon.png" alt="INTRUST" width={48} height={48} className="object-contain filter drop-shadow-md" />
                    </div>
                    <h1 className="text-4xl font-extrabold text-gray-900 dark:text-white font-[family-name:var(--font-outfit)] tracking-tight">
                        INTRUST
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-3 font-medium">Join the premium business circle</p>
                </div>

                {/* Main Card */}
                <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.05)] dark:shadow-none border border-gray-100 dark:border-gray-800 p-8 sm:p-10 relative overflow-hidden transition-all duration-300">
                    <div className="absolute -top-24 -right-24 w-48 h-48 bg-blue-50 dark:bg-blue-900/10 rounded-full blur-3xl opacity-50" />

                    <div className="relative z-10">

                        {/* ── CHOICE (first screen) ── */}
                        {step === 'choice' && (
                            <div className="animate-in fade-in slide-in-from-right-4 duration-500">
                                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2 font-[family-name:var(--font-outfit)]">
                                    Let's get started
                                </h2>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">Choose how you'd like to create your account.</p>

                                {/* Google */}
                                <button
                                    onClick={handleGoogleSignIn}
                                    disabled={googleLoading}
                                    className="w-full py-4 px-6 bg-white dark:bg-gray-800 border-2 border-gray-100 dark:border-gray-700 rounded-2xl text-gray-700 dark:text-gray-200 font-bold flex items-center justify-center gap-4 hover:border-[#92BCEA] dark:hover:border-[#92BCEA] transition-all disabled:opacity-50 active:scale-[0.98] mb-3 shadow-sm"
                                >
                                    {googleLoading ? (
                                        <Loader2 className="animate-spin text-[#92BCEA]" size={22} />
                                    ) : (
                                        <>
                                            <svg className="w-5 h-5" viewBox="0 0 24 24">
                                                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                                            </svg>
                                            <span className="text-sm uppercase tracking-wide">Continue with Google</span>
                                        </>
                                    )}
                                </button>

                                {/* Phone */}
                                <button
                                    onClick={() => { setStep('details'); setError(''); }}
                                    className="w-full py-4 px-6 bg-white dark:bg-gray-800 border-2 border-gray-100 dark:border-gray-700 rounded-2xl text-gray-700 dark:text-gray-200 font-bold flex items-center justify-center gap-4 hover:border-[#92BCEA] dark:hover:border-[#92BCEA] transition-all active:scale-[0.98] mb-3 shadow-sm"
                                >
                                    <Phone size={20} className="text-[#92BCEA]" />
                                    <span className="text-sm uppercase tracking-wide">Continue with Phone</span>
                                </button>

                                {/* Email */}
                                <button
                                    onClick={() => { setStep('email-form'); setError(''); }}
                                    className="w-full py-4 px-6 bg-white dark:bg-gray-800 border-2 border-gray-100 dark:border-gray-700 rounded-2xl text-gray-700 dark:text-gray-200 font-bold flex items-center justify-center gap-4 hover:border-[#92BCEA] dark:hover:border-[#92BCEA] transition-all active:scale-[0.98] shadow-sm"
                                >
                                    <Mail size={20} className="text-[#92BCEA]" />
                                    <span className="text-sm uppercase tracking-wide">Continue with Email</span>
                                </button>

                                {error && <p className="text-xs font-semibold text-red-500 mt-4 px-1 animate-pulse">{error}</p>}
                            </div>
                        )}

                        {/* ── DETAILS (phone flow: name step) ── */}
                        {step === 'details' && (
                            <div className="animate-in fade-in slide-in-from-right-4 duration-500">
                                <div className="flex items-center gap-4 mb-8">
                                    <button onClick={() => setStep('choice')} className="w-10 h-10 flex items-center justify-center rounded-xl bg-gray-50 dark:bg-gray-800 text-gray-400 hover:text-[#92BCEA] transition-all">
                                        <ArrowRight size={18} className="rotate-180" />
                                    </button>
                                    <div>
                                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white font-[family-name:var(--font-outfit)]">Your Name</h2>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">Let's personalise your account</p>
                                    </div>
                                </div>
                                <form onSubmit={handleContinue} className="space-y-6">
                                    <div className="group">
                                        <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-widest px-1">Full Name</label>
                                        <div className="relative transition-all duration-300">
                                            <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-[#92BCEA] transition-colors" size={20} />
                                            <input
                                                type="text"
                                                value={name}
                                                onChange={(e) => setName(e.target.value)}
                                                placeholder="e.g. John Doe"
                                                className="w-full pl-12 pr-4 py-4 bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800 rounded-2xl text-gray-900 dark:text-white placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-[#92BCEA]/20 focus:border-[#92BCEA] dark:focus:border-[#92BCEA] transition-all"
                                                required
                                            />
                                        </div>
                                    </div>
                                    {error && <p className="text-xs font-semibold text-red-500 mt-2 px-1 animate-pulse">{error}</p>}
                                    <button
                                        type="submit"
                                        disabled={!name.trim()}
                                        className="w-full py-4 bg-gradient-to-r from-[#92BCEA] to-[#7aaad6] text-white font-bold rounded-2xl flex items-center justify-center gap-3 hover:shadow-xl hover:shadow-blue-200/40 dark:hover:shadow-none hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 shadow-md uppercase tracking-wider text-sm"
                                    >
                                        Next <ArrowRight size={18} />
                                    </button>
                                </form>
                            </div>
                        )}

                        {/* ── PHONE ── */}
                        {step === 'phone' && (
                            <div className="animate-in fade-in slide-in-from-right-4 duration-500">
                                <div className="flex items-center gap-4 mb-8">
                                    <button onClick={() => setStep('details')} className="w-10 h-10 flex items-center justify-center rounded-xl bg-gray-50 dark:bg-gray-800 text-gray-400 hover:text-[#92BCEA] transition-all">
                                        <ArrowRight size={18} className="rotate-180" />
                                    </button>
                                    <div>
                                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white font-[family-name:var(--font-outfit)]">Verify Phone</h2>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">Welcome, <span className="text-[#92BCEA] font-bold">{name.split(' ')[0]}</span></p>
                                    </div>
                                </div>
                                <form onSubmit={handleSendOTP} className="space-y-6">
                                    <div className="group">
                                        <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-widest px-1">Mobile Number</label>
                                        <div className="relative">
                                            <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-2 pr-3 border-r border-gray-200 dark:border-gray-700">
                                                <span className="text-sm font-bold text-gray-400">+91</span>
                                            </div>
                                            <input
                                                type="tel"
                                                value={phone}
                                                onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                                                placeholder="00000 00000"
                                                className="w-full pl-20 pr-4 py-4 bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800 rounded-2xl text-gray-900 dark:text-white font-mono text-lg tracking-widest focus:outline-none focus:ring-2 focus:ring-[#92BCEA]/20 focus:border-[#92BCEA] transition-all"
                                                required pattern="[0-9]{10}" maxLength={10} autoFocus
                                            />
                                        </div>
                                    </div>
                                    {error && (
                                        <div className="p-4 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/20 rounded-2xl text-red-500 dark:text-red-400 text-xs font-bold animate-in zoom-in-95">
                                            {error}
                                        </div>
                                    )}
                                    <button
                                        type="submit"
                                        disabled={loading || phone.length !== 10}
                                        className="w-full py-4 bg-gradient-to-r from-[#92BCEA] to-[#7aaad6] text-white font-bold rounded-2xl flex items-center justify-center gap-3 hover:shadow-xl hover:shadow-blue-200/40 dark:hover:shadow-none hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 shadow-md uppercase tracking-wider text-sm"
                                    >
                                        {loading ? <><Loader2 className="animate-spin" size={20} /> Sending...</> : <>Verify Number <ArrowRight size={18} /></>}
                                    </button>
                                </form>
                            </div>
                        )}

                        {/* ── OTP ── */}
                        {step === 'otp' && (
                            <div className="animate-in fade-in slide-in-from-right-4 duration-500 text-center">
                                <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
                                    <ShieldCheck size={32} className="text-[#92BCEA] animate-pulse" />
                                </div>
                                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2 font-[family-name:var(--font-outfit)]">Secure Code</h2>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mb-8 px-4">
                                    Enter 6-digit code sent to <br /><span className="text-gray-900 dark:text-white font-bold">+91 {phone}</span>
                                </p>
                                <form onSubmit={handleVerifyOTP} className="space-y-8">
                                    <div className="flex justify-center">
                                        <input
                                            type="text"
                                            value={otp}
                                            onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                                            placeholder="••••••"
                                            className="w-full max-w-[240px] px-4 py-5 bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800 rounded-2xl text-gray-900 dark:text-white text-center text-4xl font-bold tracking-[0.4em] placeholder:text-gray-200 focus:outline-none focus:ring-4 focus:ring-[#92BCEA]/10 focus:border-[#92BCEA] transition-all"
                                            required pattern="[0-9]{6}" maxLength={6} autoComplete="one-time-code" autoFocus
                                        />
                                    </div>
                                    {error && <p className="text-xs font-bold text-red-500 animate-pulse">{error}</p>}
                                    <button
                                        type="submit"
                                        disabled={loading || otp.length !== 6}
                                        className="w-full py-4 bg-gradient-to-r from-[#92BCEA] to-[#7aaad6] text-white font-bold rounded-2xl flex items-center justify-center gap-3 hover:shadow-xl hover:shadow-blue-200/40 dark:hover:shadow-none hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 shadow-md uppercase tracking-wider text-sm"
                                    >
                                        {loading ? <Loader2 className="animate-spin" size={20} /> : 'Finalize Signup'}
                                    </button>
                                    <div className="flex flex-col gap-4">
                                        <button type="button" onClick={handleSendOTP} disabled={loading} className="text-xs font-bold text-gray-400 hover:text-[#92BCEA] transition-colors uppercase tracking-widest">
                                            Resend Code
                                        </button>
                                        <button type="button" onClick={() => setStep('phone')} className="text-xs font-bold text-[#92BCEA] hover:underline uppercase tracking-widest">
                                            Update Number
                                        </button>
                                    </div>
                                </form>
                            </div>
                        )}

                        {/* ── EMAIL FORM ── */}
                        {step === 'email-form' && (
                            <div className="animate-in fade-in slide-in-from-right-4 duration-500">
                                <div className="flex items-center gap-4 mb-8">
                                    <button onClick={() => { setStep('choice'); setError(''); }} className="w-10 h-10 flex items-center justify-center rounded-xl bg-gray-50 dark:bg-gray-800 text-gray-400 hover:text-[#92BCEA] transition-all">
                                        <ArrowRight size={18} className="rotate-180" />
                                    </button>
                                    <div>
                                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white font-[family-name:var(--font-outfit)]">Create Account</h2>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">Sign up with email & password</p>
                                    </div>
                                </div>
                                <form onSubmit={handleEmailSignup} className="space-y-5">
                                    {/* Full Name */}
                                    <div className="group">
                                        <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-widest px-1">Full Name</label>
                                        <div className="relative">
                                            <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-[#92BCEA] transition-colors" size={18} />
                                            <input
                                                type="text"
                                                value={name}
                                                onChange={(e) => setName(e.target.value)}
                                                placeholder="e.g. John Doe"
                                                className="w-full pl-12 pr-4 py-4 bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800 rounded-2xl text-gray-900 dark:text-white placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-[#92BCEA]/20 focus:border-[#92BCEA] transition-all"
                                                required
                                            />
                                        </div>
                                    </div>
                                    {/* Email */}
                                    <div className="group">
                                        <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-widest px-1">Email</label>
                                        <div className="relative">
                                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-[#92BCEA] transition-colors" size={18} />
                                            <input
                                                type="email"
                                                value={emailAddress}
                                                onChange={(e) => setEmailAddress(e.target.value)}
                                                placeholder="john@example.com"
                                                className="w-full pl-12 pr-4 py-4 bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800 rounded-2xl text-gray-900 dark:text-white placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-[#92BCEA]/20 focus:border-[#92BCEA] transition-all"
                                                required
                                            />
                                        </div>
                                    </div>
                                    {/* Password */}
                                    <div className="group">
                                        <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-widest px-1">Password</label>
                                        <div className="relative">
                                            <input
                                                type={showPassword ? 'text' : 'password'}
                                                value={password}
                                                onChange={(e) => setPassword(e.target.value)}
                                                placeholder="Min 8 characters"
                                                className="w-full pl-4 pr-12 py-4 bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800 rounded-2xl text-gray-900 dark:text-white placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-[#92BCEA]/20 focus:border-[#92BCEA] transition-all"
                                                required
                                            />
                                            <button type="button" onClick={() => setShowPassword((p) => !p)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#92BCEA] transition-colors">
                                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                            </button>
                                        </div>
                                        <PasswordStrengthMeter password={password} />
                                    </div>
                                    {/* Confirm Password */}
                                    <div className="group">
                                        <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-widest px-1">Confirm Password</label>
                                        <div className="relative">
                                            <input
                                                type={showConfirm ? 'text' : 'password'}
                                                value={confirmPassword}
                                                onChange={(e) => setConfirmPassword(e.target.value)}
                                                placeholder="Repeat your password"
                                                className="w-full pl-4 pr-12 py-4 bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800 rounded-2xl text-gray-900 dark:text-white placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-[#92BCEA]/20 focus:border-[#92BCEA] transition-all"
                                                required
                                            />
                                            <button type="button" onClick={() => setShowConfirm((p) => !p)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#92BCEA] transition-colors">
                                                {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                                            </button>
                                        </div>
                                        {confirmPassword && password !== confirmPassword && (
                                            <p className="text-[10px] font-bold text-red-500 mt-1 px-1">Passwords do not match</p>
                                        )}
                                    </div>

                                    {error && (
                                        <div className="p-4 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/20 rounded-2xl text-red-500 dark:text-red-400 text-xs font-bold animate-in zoom-in-95">
                                            {error}
                                        </div>
                                    )}

                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="w-full py-4 bg-gradient-to-r from-[#92BCEA] to-[#7aaad6] text-white font-bold rounded-2xl flex items-center justify-center gap-3 hover:shadow-xl hover:shadow-blue-200/40 dark:hover:shadow-none hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 shadow-md uppercase tracking-wider text-sm"
                                    >
                                        {loading ? <><Loader2 className="animate-spin" size={20} /> Creating Account...</> : <>Create Account <ArrowRight size={18} /></>}
                                    </button>
                                </form>
                            </div>
                        )}

                        {/* ── EMAIL PENDING VERIFICATION ── */}
                        {step === 'email-pending' && (
                            <div className="animate-in fade-in zoom-in-95 duration-500 text-center py-4">
                                <div className="w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <CheckCircle className="text-green-600 dark:text-green-400" size={32} />
                                </div>
                                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2 font-[family-name:var(--font-outfit)]">Check your email</h2>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                                    We've sent a verification link to<br />
                                    <span className="font-bold text-gray-900 dark:text-white">{emailAddress}</span>
                                </p>
                                <p className="text-xs text-gray-400 mb-6">Click the link in the email to activate your account. Check spam if it doesn't arrive.</p>

                                {resendSuccess && (
                                    <p className="text-xs font-bold text-green-600 mb-4">Verification email resent!</p>
                                )}
                                {error && <p className="text-xs font-bold text-red-500 mb-4">{error}</p>}

                                <button
                                    onClick={handleResendVerification}
                                    disabled={resendLoading}
                                    className="w-full py-3.5 border-2 border-[#92BCEA] text-[#92BCEA] font-bold rounded-2xl flex items-center justify-center gap-2 hover:bg-[#92BCEA]/5 transition-all disabled:opacity-50 mb-3 text-sm uppercase tracking-wide"
                                >
                                    {resendLoading ? <Loader2 className="animate-spin" size={18} /> : 'Resend Verification Email'}
                                </button>
                                <Link
                                    href="/login"
                                    className="block w-full py-3.5 bg-gradient-to-r from-[#92BCEA] to-[#7aaad6] text-white font-bold rounded-2xl text-center hover:shadow-xl hover:shadow-blue-200/40 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-md text-sm uppercase tracking-wide"
                                >
                                    Back to Login
                                </Link>
                            </div>
                        )}

                        {/* ── EMAIL CONFLICT (account linking prompt) ── */}
                        {step === 'email-conflict' && (
                            <div className="animate-in fade-in zoom-in-95 duration-500 text-center py-4">
                                <div className="w-16 h-16 bg-yellow-100 dark:bg-yellow-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <ShieldCheck className="text-yellow-600 dark:text-yellow-400" size={32} />
                                </div>
                                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2 font-[family-name:var(--font-outfit)]">Account Already Exists</h2>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                                    This email is already linked to a <span className="font-bold text-gray-900 dark:text-white">{providerLabel[conflictProvider] || conflictProvider}</span> account.
                                    <br /><br />
                                    Would you like to add email &amp; password login to your existing account?
                                </p>
                                <p className="text-xs text-gray-400 mb-6">You'll need to sign in with your existing method first, then link the email provider from your profile.</p>
                                <Link
                                    href="/login"
                                    className="block w-full py-3.5 bg-gradient-to-r from-[#92BCEA] to-[#7aaad6] text-white font-bold rounded-2xl text-center hover:shadow-xl hover:shadow-blue-200/40 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-md text-sm uppercase tracking-wide mb-3"
                                >
                                    Sign in to Link Account
                                </Link>
                                <button
                                    onClick={() => { setStep('choice'); setError(''); }}
                                    className="w-full py-3 text-sm font-bold text-gray-400 hover:text-[#92BCEA] transition-colors uppercase tracking-wide"
                                >
                                    Cancel
                                </button>
                            </div>
                        )}

                    </div>
                </div>

                {/* Footer Links */}
                <div className="mt-10 text-center animate-in fade-in slide-in-from-bottom-2 duration-700 delay-300">
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                        Member already?{' '}
                        <Link href="/login" className="text-[#92BCEA] font-bold hover:underline ml-1">Login here</Link>
                    </p>
                    <div className="flex items-center justify-center gap-4 mt-8 opacity-40">
                        <div className="h-px w-8 bg-gray-300 dark:bg-gray-700" />
                        <ShieldCheck size={14} className="text-gray-400" />
                        <div className="h-px w-8 bg-gray-300 dark:bg-gray-700" />
                    </div>
                    <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-6 leading-relaxed max-w-[280px] mx-auto uppercase tracking-tighter">
                        Protected by bank-grade security and <br />
                        <a href="/privacy" className="underline hover:text-gray-600">Privacy Policy</a>
                    </p>
                </div>
            </div>
        </div>
    );
}
