'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { signInWithOTP, verifyOTP } from '@/lib/supabase';
import { supabase } from '@/lib/supabaseClient';
import { Phone, ArrowRight, Loader2, ShieldCheck, User, Sparkles } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

export default function SignupPage() {
    const router = useRouter();
    const [step, setStep] = useState('details'); // 'details', 'phone', or 'otp'
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [otp, setOtp] = useState('');
    const [loading, setLoading] = useState(false);
    const [googleLoading, setGoogleLoading] = useState(false);
    const [error, setError] = useState('');

    const handleContinue = (e) => {
        if (e) e.preventDefault();
        if (name.trim().length < 2) {
            setError('Please enter your full name');
            return;
        }
        setError('');
        setStep('phone');
    };

    const handleSendOTP = async (e) => {
        if (e) e.preventDefault();
        setError('');
        setLoading(true);

        // 1. Validate Phone
        if (phone.length !== 10) {
            setError('Please enter a valid 10-digit phone number');
            setLoading(false);
            return;
        }

        // 2. Check if user already exists
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

        if (otpError) {
            setError(otpError.message || 'Failed to send OTP. Please try again.');
            setLoading(false);
            return;
        }

        setStep('otp');
        setLoading(false);
    };

    const handleVerifyOTP = async (e) => {
        if (e) e.preventDefault();
        setError('');

        if (otp.length !== 6) {
            setError('Please enter the 6-digit OTP');
            return;
        }

        setLoading(true);

        try {
            const formattedPhone = `+91${phone}`;
            console.log('[SIGNUP] Verifying OTP for:', formattedPhone);

            const { data, error: verifyError } = await verifyOTP(formattedPhone, otp, name);

            if (verifyError) {
                setError(verifyError.message || 'Invalid OTP. Please check and try again.');
                setLoading(false);
                return;
            }

            // Successfully verified & logged in
            console.log('[SIGNUP] Account created. Redirecting to dashboard...');
            window.location.href = '/dashboard';

        } catch (err) {
            console.error('[SIGNUP] Unexpected error:', err);
            setError('An unexpected error occurred. Please try again.');
            setLoading(false);
        }
    };

    const handleGoogleSignIn = async () => {
        setGoogleLoading(true);
        setError('');

        const { error: googleError } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: `${window.location.origin}/auth/callback`
            }
        });

        if (googleError) {
            setError(googleError.message || 'Google sign in failed');
            setGoogleLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-white dark:bg-gray-950 flex flex-col items-center justify-center p-4 transition-colors duration-300">
            <div className="w-full max-w-md">
                {/* Logo & Header */}
                <div className="text-center mb-10 transition-all duration-500 transform scale-100 hover:scale-105">
                    <div className="inline-flex items-center justify-center w-20 h-20 mb-6 rounded-[24px] bg-gradient-to-br from-[#92BCEA] to-[#7aaad6] shadow-2xl shadow-blue-200/50 dark:shadow-none p-4">
                        <Image src="/icons/intrustLogo.png" alt="INTRUST" width={48} height={48} className="object-contain filter drop-shadow-md" />
                    </div>
                    <h1 className="text-4xl font-extrabold text-gray-900 dark:text-white font-[family-name:var(--font-outfit)] tracking-tight">
                        INTRUST
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-3 font-medium">Join the premium business circle</p>
                </div>

                {/* Main Card */}
                <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.05)] dark:shadow-none border border-gray-100 dark:border-gray-800 p-8 sm:p-10 relative overflow-hidden transition-all duration-300">
                    {/* Background decoration */}
                    <div className="absolute -top-24 -right-24 w-48 h-48 bg-blue-50 dark:bg-blue-900/10 rounded-full blur-3xl opacity-50" />

                    <div className="relative z-10">
                        {step === 'details' && (
                            <div className="animate-in fade-in slide-in-from-right-4 duration-500">
                                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2 font-[family-name:var(--font-outfit)]">
                                    Let's get started
                                </h2>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">Tell us your name to begin your journey.</p>

                                <button
                                    onClick={handleGoogleSignIn}
                                    disabled={googleLoading}
                                    className="w-full py-4 px-6 bg-white dark:bg-gray-800 border-2 border-gray-100 dark:border-gray-700 rounded-2xl text-gray-700 dark:text-gray-200 font-bold flex items-center justify-center gap-4 hover:border-[#92BCEA] dark:hover:border-[#92BCEA] transition-all disabled:opacity-50 active:scale-[0.98] mb-8 shadow-sm"
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

                                <div className="relative mb-8">
                                    <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-100 dark:border-gray-800" /></div>
                                    <div className="relative flex justify-center"><span className="px-4 bg-white dark:bg-gray-900 text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em]">or signup with phone</span></div>
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
                                        Next
                                        <ArrowRight size={18} />
                                    </button>
                                </form>
                            </div>
                        )}

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
                                                required
                                                pattern="[0-9]{10}"
                                                maxLength={10}
                                                autoFocus
                                            />
                                        </div>
                                        <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider mt-3 px-1">Account security via 2FA verification</p>
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
                                        {loading ? (
                                            <>
                                                <Loader2 className="animate-spin" size={20} />
                                                Sending secure OTP...
                                            </>
                                        ) : (
                                            <>
                                                Verify Number
                                                <ArrowRight size={18} />
                                            </>
                                        )}
                                    </button>
                                </form>
                            </div>
                        )}

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
                                            required
                                            pattern="[0-9]{6}"
                                            maxLength={6}
                                            autoFocus
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
                                        <button
                                            type="button"
                                            onClick={handleSendOTP}
                                            disabled={loading}
                                            className="text-xs font-bold text-gray-400 hover:text-[#92BCEA] transition-colors uppercase tracking-widest"
                                        >
                                            Resend Code
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setStep('phone')}
                                            className="text-xs font-bold text-[#92BCEA] hover:underline uppercase tracking-widest"
                                        >
                                            Update Number
                                        </button>
                                    </div>
                                </form>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer Links */}
                <div className="mt-10 text-center animate-in fade-in slide-in-from-bottom-2 duration-700 delay-300">
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                        Member already?{' '}
                        <Link href="/login" className="text-[#92BCEA] font-bold hover:underline ml-1">
                            Login here
                        </Link>
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
