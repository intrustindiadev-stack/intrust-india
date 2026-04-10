'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { signInWithOTP, verifyOTP } from '@/lib/supabase';
import { supabase } from '@/lib/supabaseClient';
import { Phone, ArrowRight, Loader2, ShieldCheck, Mail, Eye, EyeOff, CheckCircle } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

export default function LoginPage() {
    const router = useRouter();
    const searchParams = useSearchParams();

    // ─── Shared ─────────────────────────────────────────────────────────────────
    const [step, setStep]               = useState('choice'); // 'choice' | 'phone' | 'otp' | 'email-form'
    const [phone, setPhone]             = useState('');
    const [otp, setOtp]                 = useState('');
    const [loading, setLoading]         = useState(false);
    const [googleLoading, setGoogleLoading] = useState(false);
    const [error, setError]             = useState('');

    // ─── Email-specific ──────────────────────────────────────────────────────────
    const [emailAddress, setEmailAddress] = useState('');
    const [password, setPassword]         = useState('');
    const [showPassword, setShowPassword] = useState(false);

    // ─── Query-param notices ─────────────────────────────────────────────────────
    const verified  = searchParams?.get('verified')  === 'true';
    const resetDone = searchParams?.get('reset')      === 'success';

    useEffect(() => {
        sessionStorage.removeItem('intrust_adv_seen');
    }, []);

    // ─── Role-based redirect helper ──────────────────────────────────────────────
    const redirectByRole = async (user) => {
        const { data: profile } = await supabase
            .from('user_profiles')
            .select('role')
            .eq('id', user.id)
            .single();

        const role = profile?.role;
        if (role === 'merchant') {
            window.location.href = '/merchant/dashboard';
        } else if (role === 'admin') {
            window.location.href = '/admin';
        } else {
            window.location.href = '/dashboard';
        }
    };

    // ─── Google ──────────────────────────────────────────────────────────────────
    const handleGoogleSignIn = () => {
        setGoogleLoading(true);
        setError('');
        window.location.href = '/api/auth/google';
    };

    // ─── Phone OTP ──────────────────────────────────────────────────────────────
    const handleSendOTP = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const { data: userId, error: checkError } = await supabase
                .rpc('get_user_id_by_phone', { phone_number: phone });
            if (checkError) {
                setError('Something went wrong, please try again.');
                setLoading(false);
                return;
            }
            if (!userId) {
                setError('No account found with this phone number. Redirecting to signup...');
                setTimeout(() => router.push('/signup'), 1500);
                return;
            }
        } catch (err) {
            setError('Something went wrong, please try again.');
            setLoading(false);
            return;
        }
        const formattedPhone = phone.startsWith('+91') ? phone : `+91${phone}`;
        const { error: otpError } = await signInWithOTP(formattedPhone);
        if (otpError) {
            setError(otpError.message || 'Failed to send OTP');
            setLoading(false);
            return;
        }
        setStep('otp');
        setLoading(false);
    };

    const handleVerifyOTP = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const formattedPhone = phone.startsWith('+91') ? phone : `+91${phone}`;
            const { data, error: verifyError } = await verifyOTP(formattedPhone, otp);
            if (verifyError) {
                setError(verifyError.message || 'Invalid OTP');
                setLoading(false);
                return;
            }
            const user = data?.user;
            if (user) {
                await redirectByRole(user);
            } else {
                setError('Login failed. Please try again.');
                setLoading(false);
            }
        } catch (err) {
            setError('An unexpected error occurred. Please try again.');
            setLoading(false);
        }
    };

    // ─── Email sign-in ────────────────────────────────────────────────────────────
    const handleEmailSignIn = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const res = await fetch('/api/auth/email/signin', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: emailAddress, password })
            });
            const data = await res.json();

            if (!res.ok) {
                setError(data.error || 'Invalid email or password.');
                setLoading(false);
                return;
            }

            const user = data.user;
            if (user) {
                await redirectByRole(user);
            } else {
                setError('Login failed. Please try again.');
                setLoading(false);
            }
        } catch (err) {
            console.error('[LOGIN] Email signin error:', err);
            setError('Network error. Please try again.');
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-950 dark:to-gray-900 flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                {/* Logo */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 mb-4 rounded-2xl bg-gradient-to-br from-[#92BCEA] to-[#AFB3F7] shadow-lg">
                        <Image src="/icon.png" alt="INTRUST" width={40} height={40} className="object-contain" />
                    </div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white font-[family-name:var(--font-outfit)]">
                        INTRUST
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400 mt-2">Welcome back! Please login to continue</p>
                </div>

                {/* Notification banners */}
                {verified && (
                    <div className="mb-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-2xl flex items-center gap-3">
                        <CheckCircle size={20} className="text-green-600 dark:text-green-400 shrink-0" />
                        <p className="text-sm font-semibold text-green-700 dark:text-green-400">Email verified! You can now log in.</p>
                    </div>
                )}
                {resetDone && (
                    <div className="mb-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-2xl flex items-center gap-3">
                        <CheckCircle size={20} className="text-green-600 dark:text-green-400 shrink-0" />
                        <p className="text-sm font-semibold text-green-700 dark:text-green-400">Password reset successful! Please log in with your new password.</p>
                    </div>
                )}

                {/* Card */}
                <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl dark:shadow-none border border-gray-100 dark:border-gray-800 p-6 sm:p-8">

                    {/* ── CHOICE ── */}
                    {step === 'choice' && (
                        <>
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 font-[family-name:var(--font-outfit)]">Login</h2>

                            {/* Google */}
                            <button
                                onClick={handleGoogleSignIn}
                                disabled={googleLoading}
                                className="w-full py-3.5 px-4 bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-700 rounded-xl text-gray-700 dark:text-gray-200 font-semibold flex items-center justify-center gap-3 hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-gray-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed mb-3"
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

                            {/* Phone */}
                            <button
                                onClick={() => { setStep('phone'); setError(''); }}
                                className="w-full py-3.5 px-4 bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-700 rounded-xl text-gray-700 dark:text-gray-200 font-semibold flex items-center justify-center gap-3 hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-gray-400 transition-all mb-3"
                            >
                                <Phone size={18} className="text-[#92BCEA]" />
                                Continue with Phone
                            </button>

                            {/* Email */}
                            <button
                                onClick={() => { setStep('email-form'); setError(''); }}
                                className="w-full py-3.5 px-4 bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-700 rounded-xl text-gray-700 dark:text-gray-200 font-semibold flex items-center justify-center gap-3 hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-gray-400 transition-all"
                            >
                                <Mail size={18} className="text-[#92BCEA]" />
                                Continue with Email
                            </button>

                            {error && (
                                <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900/20 rounded-lg text-red-600 dark:text-red-400 text-sm">
                                    {error}
                                </div>
                            )}
                        </>
                    )}

                    {/* ── PHONE ── */}
                    {step === 'phone' && (
                        <>
                            <div className="flex items-center gap-3 mb-6">
                                <button onClick={() => { setStep('choice'); setError(''); }} className="text-gray-400 hover:text-[#92BCEA] transition-colors">
                                    <ArrowRight size={20} className="rotate-180" />
                                </button>
                                <h2 className="text-2xl font-bold text-gray-900 dark:text-white font-[family-name:var(--font-outfit)]">Phone Login</h2>
                            </div>
                            <form onSubmit={handleSendOTP} className="space-y-5">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Phone Number</label>
                                    <div className="relative">
                                        <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                                        <input
                                            type="tel"
                                            value={phone}
                                            onChange={(e) => setPhone(e.target.value)}
                                            placeholder="9876543210"
                                            className="w-full pl-12 pr-4 py-3.5 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#92BCEA] focus:border-transparent transition-all"
                                            required pattern="[0-9]{10}" maxLength={10}
                                        />
                                    </div>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">We'll send you an OTP via SMS</p>
                                </div>
                                {error && (
                                    <div className="p-3 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900/20 rounded-lg text-red-600 dark:text-red-400 text-sm">{error}</div>
                                )}
                                <button
                                    type="submit"
                                    disabled={loading || phone.length !== 10}
                                    className="w-full py-3.5 bg-[#1E3A5F] hover:bg-[#152B4D] text-white font-semibold rounded-xl flex items-center justify-center gap-2 hover:shadow-lg hover:scale-[1.02] transition-all disabled:bg-[#4A6FA5] disabled:opacity-100 disabled:hover:scale-100 disabled:cursor-not-allowed"
                                >
                                    {loading ? <><Loader2 className="animate-spin" size={20} /> Sending OTP...</> : <>Continue <ArrowRight size={20} /></>}
                                </button>
                            </form>
                        </>
                    )}

                    {/* ── OTP ── */}
                    {step === 'otp' && (
                        <>
                            <div className="text-center mb-6">
                                <div className="inline-flex items-center justify-center w-16 h-16 bg-[#92BCEA]/10 rounded-full mb-4">
                                    <ShieldCheck className="text-[#92BCEA]" size={32} />
                                </div>
                                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2 font-[family-name:var(--font-outfit)]">Enter OTP</h2>
                                <p className="text-gray-600 dark:text-gray-400">
                                    Sent to <span className="text-gray-900 dark:text-white font-semibold">+91 {phone}</span>
                                </p>
                                <button type="button" onClick={() => setStep('phone')} className="text-[#92BCEA] text-sm mt-2 hover:underline font-medium">
                                    Change number
                                </button>
                            </div>
                            <form onSubmit={handleVerifyOTP} className="space-y-5">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 text-center">6-Digit OTP</label>
                                    <input
                                        type="text"
                                        value={otp}
                                        onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                                        placeholder="000000"
                                        className="w-full px-4 py-3.5 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white text-center text-2xl tracking-widest placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#92BCEA] focus:border-transparent transition-all"
                                        required pattern="[0-9]{6}" maxLength={6} autoComplete="one-time-code" autoFocus
                                    />
                                </div>
                                {error && (
                                    <div className="p-3 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900/20 rounded-lg text-red-600 dark:text-red-400 text-sm">{error}</div>
                                )}
                                <button
                                    type="submit"
                                    disabled={loading || otp.length !== 6}
                                    className="w-full py-3.5 bg-[#1E3A5F] hover:bg-[#152B4D] text-white font-semibold rounded-xl flex items-center justify-center gap-2 hover:shadow-lg hover:scale-[1.02] transition-all disabled:bg-[#4A6FA5] disabled:opacity-100 disabled:hover:scale-100 disabled:cursor-not-allowed"
                                >
                                    {loading ? <><Loader2 className="animate-spin" size={20} /> Verifying...</> : <>Verify &amp; Login <ShieldCheck size={20} /></>}
                                </button>
                                <button
                                    type="button"
                                    onClick={handleSendOTP}
                                    disabled={loading}
                                    className="w-full text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 text-sm transition-colors"
                                >
                                    Didn't receive OTP? <span className="underline font-semibold">Resend</span>
                                </button>
                            </form>
                        </>
                    )}

                    {/* ── EMAIL FORM ── */}
                    {step === 'email-form' && (
                        <>
                            <div className="flex items-center gap-3 mb-6">
                                <button onClick={() => { setStep('choice'); setError(''); }} className="text-gray-400 hover:text-[#92BCEA] transition-colors">
                                    <ArrowRight size={20} className="rotate-180" />
                                </button>
                                <h2 className="text-2xl font-bold text-gray-900 dark:text-white font-[family-name:var(--font-outfit)]">Email Login</h2>
                            </div>
                            <form onSubmit={handleEmailSignIn} className="space-y-5">
                                {/* Email */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Email Address</label>
                                    <div className="relative">
                                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                                        <input
                                            type="email"
                                            value={emailAddress}
                                            onChange={(e) => setEmailAddress(e.target.value)}
                                            placeholder="john@example.com"
                                            className="w-full pl-12 pr-4 py-3.5 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#92BCEA] focus:border-transparent transition-all"
                                            required
                                        />
                                    </div>
                                </div>
                                {/* Password */}
                                <div>
                                    <div className="flex items-center justify-between mb-2">
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Password</label>
                                        <Link href="/forgot-password" className="text-xs text-[#92BCEA] hover:underline font-medium">
                                            Forgot Password?
                                        </Link>
                                    </div>
                                    <div className="relative">
                                        <input
                                            type={showPassword ? 'text' : 'password'}
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            placeholder="Your password"
                                            className="w-full pl-4 pr-12 py-3.5 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#92BCEA] focus:border-transparent transition-all"
                                            required
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword((p) => !p)}
                                            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#92BCEA] transition-colors"
                                        >
                                            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                        </button>
                                    </div>
                                </div>

                                {error && (
                                    <div className="p-3 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900/20 rounded-lg text-red-600 dark:text-red-400 text-sm">{error}</div>
                                )}

                                <button
                                    type="submit"
                                    disabled={loading || !emailAddress || !password}
                                    className="w-full py-3.5 bg-[#1E3A5F] hover:bg-[#152B4D] text-white font-semibold rounded-xl flex items-center justify-center gap-2 hover:shadow-lg hover:scale-[1.02] transition-all disabled:bg-[#4A6FA5] disabled:opacity-100 disabled:hover:scale-100 disabled:cursor-not-allowed"
                                >
                                    {loading ? <><Loader2 className="animate-spin" size={20} /> Signing in...</> : <>Sign in <ArrowRight size={20} /></>}
                                </button>
                            </form>
                        </>
                    )}

                    {/* Footer */}
                    {(step === 'choice' || step === 'phone' || step === 'email-form') && (
                        <div className="mt-6 text-center">
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                Don't have an account?{' '}
                                <Link href="/signup" className="text-[#92BCEA] font-semibold hover:underline">Sign up</Link>
                            </p>
                        </div>
                    )}
                </div>

                {/* Terms */}
                <p className="text-center text-gray-500 text-xs mt-6">
                    By continuing, you agree to our{' '}
                    <a href="/terms" className="underline hover:text-gray-700">Terms of Service</a>
                    {' '}and{' '}
                    <a href="/privacy" className="underline hover:text-gray-700">Privacy Policy</a>
                </p>
            </div>
        </div>
    );
}
