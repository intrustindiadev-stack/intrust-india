'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { signInWithOTP, verifyOTP } from '@/lib/supabase';
import { supabase } from '@/lib/supabaseClient';
import { Phone, ArrowRight, Loader2, ShieldCheck, User, Sparkles, Mail, CheckCircle } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

export default function SignupPage() {
    const router = useRouter();

    // ─── Shared state ───────────────────────────────────────────────────────────
    const [step, setStep]                   = useState('email-form'); // 'choice' removed, defaults to 'email-form'
    const [name, setName]                   = useState('');
    const [phone, setPhone]                 = useState('');
    const [otp, setOtp]                     = useState('');
    const [loading, setLoading]             = useState(false);
    const [googleLoading, setGoogleLoading] = useState(false);
    const [error, setError]                 = useState('');

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

        if (name.trim().length < 2) { setError('Please enter your full name.'); return; }

        setLoading(true);
        try {
            // Generate dummy secure password to satisfy backend since fields are removed from UI
            const dummyPassword = password || Math.random().toString(36).slice(-10) + 'A1!';
            
            const res = await fetch('/api/auth/email/signup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: emailAddress, password: dummyPassword, full_name: name })
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
        <div className="min-h-screen flex items-center justify-center bg-[var(--bg-secondary)] p-4">
            <div className="w-full max-w-md bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-[var(--border-color)] p-8">

                {/* ── EMAIL FORM (New Default Sign Up Screen) ── */}
                {step === 'email-form' && (
                    <div className="animate-fadeIn">
                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#92BCEA] to-[#AFB3F7] flex items-center justify-center mx-auto mb-4">
                            <Image src="/icon.png" alt="INTRUST" width={36} height={36} className="object-contain" />
                        </div>
                        <h1 className="text-2xl font-bold text-[var(--text-primary)] text-center mt-2">Create an account</h1>
                        <p className="text-sm text-[var(--text-secondary)] text-center mt-1 mb-6">Please enter your details to create an account.</p>

                        <form onSubmit={handleEmailSignup} className="space-y-5">
                            <div>
                                <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">Full Name</label>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="Enter your full name"
                                    className="w-full px-4 py-3 border border-[var(--border-color)] rounded-xl bg-[var(--bg-secondary)] text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:outline-none focus:ring-2 focus:ring-[#92BCEA]/30 focus:border-[#92BCEA] transition-all"
                                    required
                                />
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">Email</label>
                                <input
                                    type="email"
                                    value={emailAddress}
                                    onChange={(e) => setEmailAddress(e.target.value)}
                                    placeholder="Enter your Email"
                                    className="w-full px-4 py-3 border border-[var(--border-color)] rounded-xl bg-[var(--bg-secondary)] text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:outline-none focus:ring-2 focus:ring-[#92BCEA]/30 focus:border-[#92BCEA] transition-all"
                                    required
                                />
                            </div>

                            {error && (
                                <div className="p-3 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900/20 rounded-xl text-red-600 dark:text-red-400 text-sm">{error}</div>
                            )}

                            <button
                                type="submit"
                                disabled={loading || !name.trim() || !emailAddress}
                                className="w-full py-3.5 bg-[#1E3A5F] hover:bg-[#152B4D] text-white font-semibold rounded-xl transition-all flex justify-center"
                            >
                                {loading ? <Loader2 className="animate-spin" size={20} /> : 'Send email code'}
                            </button>
                        </form>

                        <div className="flex items-center gap-3 my-4">
                            <div className="flex-1 h-px bg-[var(--border-color)]"></div>
                            <span className="text-xs text-[var(--text-secondary)]">OR</span>
                            <div className="flex-1 h-px bg-[var(--border-color)]"></div>
                        </div>

                        <div className="space-y-3">
                            <button
                                onClick={handleGoogleSignIn}
                                disabled={googleLoading}
                                className="w-full py-3.5 border border-[var(--border-color)] rounded-xl flex items-center justify-center gap-3 text-[var(--text-primary)] font-medium hover:bg-[var(--bg-secondary)] transition-all disabled:opacity-50"
                            >
                                {googleLoading ? (
                                    <Loader2 className="animate-spin" size={20} />
                                ) : (
                                    <>
                                        <svg className="w-5 h-5" viewBox="0 0 24 24">
                                            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                                        </svg>
                                        Continue with Google
                                    </>
                                )}
                            </button>

                            <button
                                onClick={() => { setStep('details'); setError(''); }}
                                className="w-full py-3.5 border border-[var(--border-color)] rounded-xl flex items-center justify-center gap-3 text-[var(--text-primary)] font-medium hover:bg-[var(--bg-secondary)] transition-all"
                            >
                                <Phone size={18} className="text-[#92BCEA]" />
                                Continue with Mobile Number
                            </button>
                        </div>

                        <p className="text-sm text-[var(--text-secondary)] text-center mt-6">
                            Already have an account? <Link href="/login" className="text-[#92BCEA] font-semibold hover:underline">Sign in</Link>
                        </p>
                    </div>
                )}

                {/* ── DETAILS (Phone flow: name) ── */}
                {step === 'details' && (
                    <div className="animate-fadeIn">
                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#92BCEA] to-[#AFB3F7] flex items-center justify-center mx-auto mb-4">
                            <Image src="/icon.png" alt="INTRUST" width={36} height={36} className="object-contain" />
                        </div>
                        <div className="flex items-center gap-3 mb-6 relative">
                            <button onClick={() => { setStep('email-form'); setError(''); }} className="absolute -left-2 top-0 bottom-0 text-[var(--text-secondary)] hover:text-[#92BCEA] transition-colors p-2">
                                <ArrowRight size={20} className="rotate-180" />
                            </button>
                            <h2 className="text-2xl font-bold text-[var(--text-primary)] w-full text-center">Your Name</h2>
                        </div>
                        <p className="text-sm text-[var(--text-secondary)] text-center mt-1 mb-6">Let's personalise your account</p>

                        <form onSubmit={handleContinue} className="space-y-5">
                            <div>
                                <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">Full Name</label>
                                <div className="relative">
                                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" size={20} />
                                    <input
                                        type="text"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        placeholder="e.g. John Doe"
                                        className="w-full pl-12 pr-4 py-3 border border-[var(--border-color)] rounded-xl bg-[var(--bg-secondary)] text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:outline-none focus:ring-2 focus:ring-[#92BCEA]/30 focus:border-[#92BCEA] transition-all"
                                        required
                                    />
                                </div>
                            </div>
                            
                            {error && (
                                <div className="p-3 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900/20 rounded-xl text-red-600 dark:text-red-400 text-sm">{error}</div>
                            )}

                            <button
                                type="submit"
                                disabled={!name.trim()}
                                className="w-full py-3.5 bg-[#1E3A5F] hover:bg-[#152B4D] text-white font-semibold rounded-xl flex justify-center items-center gap-2 transition-all disabled:opacity-50"
                            >
                                Next <ArrowRight size={18} />
                            </button>
                        </form>
                    </div>
                )}

                {/* ── PHONE ── */}
                {step === 'phone' && (
                    <div className="animate-fadeIn">
                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#92BCEA] to-[#AFB3F7] flex items-center justify-center mx-auto mb-4">
                            <Image src="/icon.png" alt="INTRUST" width={36} height={36} className="object-contain" />
                        </div>
                        <div className="flex items-center gap-3 mb-6 relative">
                            <button onClick={() => { setStep('details'); setError(''); }} className="absolute -left-2 top-0 bottom-0 text-[var(--text-secondary)] hover:text-[#92BCEA] transition-colors p-2">
                                <ArrowRight size={20} className="rotate-180" />
                            </button>
                            <h2 className="text-2xl font-bold text-[var(--text-primary)] w-full text-center">Verify Phone</h2>
                        </div>
                        <p className="text-sm text-[var(--text-secondary)] text-center mt-1 mb-6">
                            Welcome, <span className="font-bold text-[var(--text-primary)]">{name.split(' ')[0]}</span>
                        </p>

                        <form onSubmit={handleSendOTP} className="space-y-5">
                            <div>
                                <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">Mobile Number</label>
                                <div className="relative">
                                    <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-2 pr-3 border-r border-[var(--border-color)]">
                                        <span className="text-sm font-semibold text-[var(--text-secondary)]">+91</span>
                                    </div>
                                    <input
                                        type="tel"
                                        value={phone}
                                        onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                                        placeholder="00000 00000"
                                        className="w-full pl-20 pr-4 py-3 border border-[var(--border-color)] rounded-xl bg-[var(--bg-secondary)] text-[var(--text-primary)] text-lg tracking-widest placeholder:text-[var(--text-secondary)] focus:outline-none focus:ring-2 focus:ring-[#92BCEA]/30 focus:border-[#92BCEA] transition-all"
                                        required pattern="[0-9]{10}" maxLength={10} autoFocus
                                    />
                                </div>
                            </div>

                            {error && (
                                <div className="p-3 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900/20 rounded-xl text-red-600 dark:text-red-400 text-sm">{error}</div>
                            )}

                            <button
                                type="submit"
                                disabled={loading || phone.length !== 10}
                                className="w-full py-3.5 bg-[#1E3A5F] hover:bg-[#152B4D] text-white font-semibold rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                            >
                                {loading ? <><Loader2 className="animate-spin" size={20} /> Sending...</> : <>Verify Number <ArrowRight size={18} /></>}
                            </button>
                        </form>
                    </div>
                )}

                {/* ── OTP ── */}
                {step === 'otp' && (
                    <div className="animate-fadeIn">
                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#92BCEA] to-[#AFB3F7] flex items-center justify-center mx-auto mb-4">
                            <Image src="/icon.png" alt="INTRUST" width={36} height={36} className="object-contain" />
                        </div>
                        <h2 className="text-2xl font-bold text-[var(--text-primary)] text-center mt-2">Secure Code</h2>
                        <p className="text-sm text-[var(--text-secondary)] text-center mt-1 mb-6">
                            Enter 6-digit code sent to <br /><span className="font-semibold text-[var(--text-primary)]">+91 {phone}</span>
                        </p>

                        <form onSubmit={handleVerifyOTP} className="space-y-6">
                            <div className="flex justify-center">
                                <input
                                    type="text"
                                    value={otp}
                                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                                    placeholder="••••••"
                                    className="w-full px-4 py-3 border border-[var(--border-color)] rounded-xl bg-[var(--bg-secondary)] text-[var(--text-primary)] text-center text-4xl font-bold tracking-[0.4em] placeholder:text-[var(--text-secondary)] focus:outline-none focus:ring-2 focus:ring-[#92BCEA]/30 focus:border-[#92BCEA] transition-all"
                                    required pattern="[0-9]{6}" maxLength={6} autoComplete="one-time-code" autoFocus
                                />
                            </div>

                            {error && (
                                <div className="p-3 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900/20 rounded-xl text-red-600 dark:text-red-400 text-sm">{error}</div>
                            )}

                            <button
                                type="submit"
                                disabled={loading || otp.length !== 6}
                                className="w-full py-3.5 bg-[#1E3A5F] hover:bg-[#152B4D] text-white font-semibold rounded-xl flex items-center justify-center transition-all disabled:opacity-50"
                            >
                                {loading ? <Loader2 className="animate-spin" size={20} /> : 'Finalize Signup'}
                            </button>
                            
                            <div className="flex flex-col gap-4 text-center">
                                <button type="button" onClick={handleSendOTP} disabled={loading} className="text-sm font-semibold text-[var(--text-secondary)] hover:text-[#92BCEA] transition-colors">
                                    Resend Code
                                </button>
                                <button type="button" onClick={() => setStep('phone')} className="text-sm font-semibold text-[#92BCEA] hover:underline">
                                    Update Number
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                {/* ── EMAIL PENDING VERIFICATION ── */}
                {step === 'email-pending' && (
                    <div className="animate-fadeIn">
                        <div className="w-16 h-16 rounded-2xl bg-green-100 flex items-center justify-center mx-auto mb-4">
                            <CheckCircle className="text-green-600" size={32} />
                        </div>
                        <h2 className="text-2xl font-bold text-[var(--text-primary)] text-center mt-2">Check your email</h2>
                        <p className="text-sm text-[var(--text-secondary)] text-center mt-1 mb-6">
                            We've sent a verification link to<br />
                            <span className="font-bold text-[var(--text-primary)]">{emailAddress}</span>
                        </p>
                        <p className="text-xs text-[var(--text-secondary)] text-center mb-6">
                            Click the link in the email to activate your account. Check spam if it doesn't arrive.
                        </p>

                        {resendSuccess && (
                            <div className="p-3 bg-green-50 border border-green-200 rounded-xl text-green-600 text-sm mb-4 text-center">
                                Verification email resent!
                            </div>
                        )}
                        {error && (
                            <div className="p-3 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900/20 rounded-xl text-red-600 dark:text-red-400 text-sm mb-4">{error}</div>
                        )}

                        <button
                            onClick={handleResendVerification}
                            disabled={resendLoading}
                            className="w-full py-3.5 border border-[var(--border-color)] rounded-xl flex items-center justify-center gap-3 text-[var(--text-primary)] font-medium hover:bg-[var(--bg-secondary)] transition-all disabled:opacity-50 mb-3"
                        >
                            {resendLoading ? <Loader2 className="animate-spin" size={18} /> : 'Resend Verification Email'}
                        </button>
                        
                        <Link
                            href="/login"
                            className="flex items-center justify-center w-full py-3.5 bg-[#1E3A5F] hover:bg-[#152B4D] text-white font-semibold rounded-xl transition-all"
                        >
                            Back to Login
                        </Link>
                    </div>
                )}

                {/* ── EMAIL CONFLICT (account linking prompt) ── */}
                {step === 'email-conflict' && (
                    <div className="animate-fadeIn">
                        <div className="w-16 h-16 rounded-2xl bg-yellow-100 flex items-center justify-center mx-auto mb-4">
                            <ShieldCheck className="text-yellow-600" size={32} />
                        </div>
                        <h2 className="text-2xl font-bold text-[var(--text-primary)] text-center mt-2">Account Already Exists</h2>
                        <p className="text-sm text-[var(--text-secondary)] text-center mt-1 mb-6">
                            This email is already linked to a <span className="font-bold text-[var(--text-primary)]">{providerLabel[conflictProvider] || conflictProvider}</span> account.
                            <br /><br />
                            Would you like to add email &amp; password login to your existing account?
                        </p>
                        <p className="text-xs text-[var(--text-secondary)] text-center mb-6">
                            You'll need to sign in with your existing method first, then link the email provider from your profile.
                        </p>
                        
                        <Link
                            href="/login"
                            className="flex items-center justify-center w-full py-3.5 bg-[#1E3A5F] hover:bg-[#152B4D] text-white font-semibold rounded-xl transition-all mb-3"
                        >
                            Sign in to Link Account
                        </Link>
                        
                        <button
                            onClick={() => { setStep('email-form'); setError(''); }}
                            className="w-full py-3 text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                        >
                            Cancel
                        </button>
                    </div>
                )}

            </div>
        </div>
    );
}
