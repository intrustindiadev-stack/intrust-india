'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { signInWithOTP, verifyOTP } from '@/lib/supabase';
import { redirectByRole } from '@/lib/auth';
import { Phone, ArrowRight, Loader2, ShieldCheck, Mail, Eye, EyeOff, CheckCircle } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { toast } from 'react-hot-toast';

function OTPBoxInput({ value, onChange, onComplete }) {
    const refs = useRef([]);

    const handleChange = (e, index) => {
        const char = e.target.value.replace(/[^0-9]/g, '').slice(-1);
        const chars = value.split('');
        if (char) {
            chars[index] = char;
            const newString = chars.join('').padEnd(6, ' ').slice(0, 6);
            const completed = newString.replace(/\s+/g, '');
            onChange(completed);
            if (index < 5) {
                refs.current[index + 1]?.focus();
            } else if (completed.length === 6) {
                onComplete && onComplete(completed);
            }
        }
    };

    const handleKeyDown = (e, index) => {
        if (e.key === 'Backspace') {
            const chars = value.split('');
            if (value[index]) {
                chars[index] = '';
                onChange(chars.join(''));
            } else if (index > 0) {
                refs.current[index - 1]?.focus();
            }
        }
    };

    const handlePaste = (e) => {
        e.preventDefault();
        const pasted = e.clipboardData.getData('text').replace(/[^0-9]/g, '').slice(0, 6);
        if (pasted) {
            onChange(pasted);
            if (pasted.length === 6) {
                refs.current[5]?.focus();
                onComplete && onComplete(pasted);
            } else {
                refs.current[pasted.length]?.focus();
            }
        }
    };

    return (
        <div className="flex justify-center gap-2">
            {[0, 1, 2, 3, 4, 5].map((i) => (
                <input
                    key={i}
                    ref={(el) => (refs.current[i] = el)}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={value[i] || ''}
                    onChange={(e) => handleChange(e, i)}
                    onKeyDown={(e) => handleKeyDown(e, i)}
                    onPaste={i === 0 ? handlePaste : undefined}
                    className="w-10 h-10 sm:w-12 sm:h-12 text-center text-xl font-bold border border-[var(--border-color)] rounded-xl focus:border-[#92BCEA] focus:ring-2 focus:ring-[#92BCEA]/20 outline-none transition-all"
                />
            ))}
        </div>
    );
}

function LoginContent() {
    const router = useRouter();
    const searchParams = useSearchParams();

    // ─── Shared ─────────────────────────────────────────────────────────────────
    const [step, setStep] = useState('email'); // 'email' | 'google-conflict' | 'email-otp' | 'phone' | 'otp'
    const [phone, setPhone] = useState('');
    const [otp, setOtp] = useState('');
    const [loading, setLoading] = useState(false);
    const [googleLoading, setGoogleLoading] = useState(false);
    const [timer, setTimer] = useState(0);
    const [canResend, setCanResend] = useState(true);

    useEffect(() => {
        let interval;
        if (timer > 0) {
            interval = setInterval(() => {
                setTimer((prev) => prev - 1);
            }, 1000);
        } else {
            setCanResend(true);
            clearInterval(interval);
        }
        return () => clearInterval(interval);
    }, [timer]);

    const startTimer = () => {
        setTimer(60);
        setCanResend(false);
    };

    // ─── Email-specific ──────────────────────────────────────────────────────────
    const [emailAddress, setEmailAddress] = useState('');
    const [password, setPassword] = useState('');
    const [conflictEmail, setConflictEmail] = useState(''); // email returned by 409 conflict
    const [showPassword, setShowPassword] = useState(false);

    // ─── Query-param notices ─────────────────────────────────────────────────────
    const verified = searchParams?.get('verified') === 'true';
    const resetDone = searchParams?.get('reset') === 'success';
    const merged = searchParams?.get('merged') === 'true';
    const confirmed = searchParams?.get('confirmed') === 'true';

    useEffect(() => {
        sessionStorage.removeItem('intrust_adv_seen');

        if (verified) toast.success('Email verified! You can now log in.');
        if (resetDone) toast.success('Password reset successful! Please log in.');
        if (merged) toast.success('Your accounts have been linked! Please log in.');
        if (confirmed) toast.success('Email confirmed! You can now log in.');
    }, [verified, resetDone, merged, confirmed]);

    // ─── Role-based redirect helper ──────────────────────────────────────────────
    // redirectByRole is imported from @/lib/auth — uses server-returned values,
    // no client-side DB round-trip.

    // ─── Google ──────────────────────────────────────────────────────────────────
    const handleGoogleSignIn = () => {
        setGoogleLoading(true);
        window.location.href = '/api/auth/google';
    };

    const handleGoogleLink = () => {
        setGoogleLoading(true);
        const url = `/api/auth/google?link_mode=email&pending_email=${encodeURIComponent(conflictEmail)}`;
        window.location.href = url;
    };

    // ─── Phone OTP ──────────────────────────────────────────────────────────────
    const handleSendOTP = async (e) => {
        if (e) e.preventDefault();
        setLoading(true);
        try {
            const { data: userId, error: checkError } = await supabase
                .rpc('get_user_id_by_phone', { phone_number: phone });
            if (checkError) {
                toast.error('Something went wrong, please try again.');
                setLoading(false);
                return;
            }
            if (!userId) {
                toast.error('No account found with this phone number. Redirecting to signup...');
                setTimeout(() => router.push('/signup'), 1500);
                return;
            }
        } catch (err) {
            toast.error('Something went wrong, please try again.');
            setLoading(false);
            return;
        }
        const formattedPhone = phone.startsWith('+91') ? phone : `+91${phone}`;
        const { error: otpError } = await signInWithOTP(formattedPhone);
        if (otpError) {
            toast.error(otpError.message || 'Failed to send OTP');
            setLoading(false);
            return;
        }
        setStep('otp');
        startTimer();
        setLoading(false);
    };

    const handleVerifyOTP = async (e, otpOverride) => {
        if (e) e.preventDefault();
        if (loading) return; // block duplicate in-flight submissions
        const otpValue = otpOverride || otp;
        if (otpValue.replace(/\s+/g, '').length !== 6) return; // strict 6-digit guard
        try {
            const formattedPhone = phone.startsWith('+91') ? phone : `+91${phone}`;
            const { data, error: verifyError } = await verifyOTP(formattedPhone, otpValue);
            if (verifyError) {
                toast.error(verifyError.message || 'Invalid OTP');
                setLoading(false);
                return;
            }
            const user = data?.user;
            if (user) {
                await redirectByRole(user, data.role, data.is_suspended);
            } else {
                toast.error('Login failed. Please try again.');
                setLoading(false);
            }
        } catch (err) {
            toast.error('An unexpected error occurred. Please try again.');
            setLoading(false);
        }
    };

    // ─── Email sign-in ────────────────────────────────────────────────────────────
    const handleEmailSignIn = async (e) => {
        if (e) e.preventDefault();
        setLoading(true);
        try {
            const res = await fetch('/api/auth/email/signin', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: emailAddress, password })
            });
            const data = await res.json();

            // 409 = account exists with a different provider (e.g. Google)
            if (res.status === 409 && data.conflict) {
                setConflictEmail(data.email || emailAddress);
                setStep('google-conflict');
                setLoading(false);
                return;
            }

            if (!res.ok) {
                toast.error(data.error || 'Invalid email or password.');
                setLoading(false);
                return;
            }

            const user = data.user;
            if (user) {
                await redirectByRole(user, data.role, data.is_suspended);
            } else {
                toast.error('Login failed. Please try again.');
                setLoading(false);
            }
        } catch (err) {
            console.error('[LOGIN] Email signin error:', err);
            toast.error('Network error. Please try again.');
            setLoading(false);
        }
    };

    const handleEmailOTPSend = async (e) => {
        if (e) e.preventDefault();
        if (!emailAddress) {
            toast.error('Please enter your email address');
            return;
        }
        setLoading(true);

        // shouldCreateUser: false → Supabase will NOT auto-register unknown emails
        const { error } = await supabase.auth.signInWithOtp({
            email: emailAddress,
            options: { shouldCreateUser: false }
        });

        if (error) {
            // Supabase returns a 422 / "Signups not allowed" when the email
            // doesn't exist and shouldCreateUser is false — redirect to signup.
            const msg = error.message?.toLowerCase() ?? '';
            const isUnknownUser =
                error.status === 422 ||
                msg.includes('signup') ||
                msg.includes('not found') ||
                msg.includes('not registered');

            if (isUnknownUser) {
                toast.error('No account found with this email. Redirecting to signup...');
                setTimeout(() => router.push('/signup'), 2000);
            } else {
                toast.error(error.message);
            }
            setLoading(false);
            return;
        }

        setStep('email-otp');
        startTimer();
        setLoading(false);
    };

    // Helper for auto-verify on OTP completion — receives the completed value directly
    const callVerifyOTP = (completedOtp) => {
        handleVerifyOTP({ preventDefault: () => { } }, completedOtp);
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-[var(--bg-secondary)] p-4">
            <div className="w-full max-w-md bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-[var(--border-color)] p-8">

                {/* ── EMAIL (default login) ── */}
                {step === 'email' && (
                    <div className="animate-fadeIn">
                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#92BCEA] to-[#AFB3F7] flex items-center justify-center mx-auto mb-4">
                            <Image src="/icon.png" alt="INTRUST" width={36} height={36} className="object-contain" priority />
                        </div>
                        <h1 className="text-2xl font-bold text-[var(--text-primary)] text-center mt-2">Login</h1>
                        <p className="text-sm text-[var(--text-secondary)] text-center mt-1 mb-6">Enter your details to login.</p>

                        <form onSubmit={handleEmailSignIn} className="space-y-5">
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

                            <div>
                                <div className="flex items-center justify-between mb-1.5">
                                    <label className="block text-sm font-medium text-[var(--text-primary)]">Password</label>
                                    <Link href="/forgot-password" className="text-xs text-[#92BCEA] hover:underline font-medium">
                                        Forgot password?
                                    </Link>
                                </div>
                                <div className="relative">
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="Enter your password"
                                        className="w-full px-4 py-3 border border-[var(--border-color)] rounded-xl bg-[var(--bg-secondary)] text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:outline-none focus:ring-2 focus:ring-[#92BCEA]/30 focus:border-[#92BCEA] transition-all pr-12"
                                        required
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                                    >
                                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={loading || !emailAddress || !password}
                                className="w-full py-3.5 bg-[#1E3A5F] hover:bg-[#152B4D] text-white font-semibold rounded-xl transition-all flex justify-center"
                            >
                                {loading ? <Loader2 className="animate-spin" size={20} /> : 'Login'}
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
                                onClick={() => { setStep('phone'); }}
                                className="w-full py-3.5 border border-[var(--border-color)] rounded-xl flex items-center justify-center gap-3 text-[var(--text-primary)] font-medium hover:bg-[var(--bg-secondary)] transition-all"
                            >
                                <Phone size={18} className="text-[#92BCEA]" />
                                Continue with Mobile Number
                            </button>
                        </div>

                        <p className="text-sm text-[var(--text-secondary)] text-center mt-6">
                            Don't have an account? <Link href="/signup" className="text-[#92BCEA] font-semibold hover:underline">Sign up</Link>
                        </p>
                    </div>
                )}

                {/* ── GOOGLE CONFLICT (Flow A: Link Your Accounts) ── */}
                {step === 'google-conflict' && (
                    <div className="animate-fadeIn">
                        {/* Icon */}
                        <div className="w-14 h-14 bg-yellow-100 dark:bg-yellow-900/20 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl select-none">
                            🔗
                        </div>

                        <h1 className="text-xl font-bold text-[var(--text-primary)] text-center mb-2">
                            Link Your Accounts
                        </h1>

                        <p className="text-sm text-[var(--text-secondary)] text-center mb-1">
                            <span className="inline-block bg-[var(--bg-secondary)] rounded-lg px-3 py-1 text-sm font-semibold text-[var(--text-primary)] mb-1">
                                {conflictEmail}
                            </span>
                        </p>
                        <p className="text-sm text-[var(--text-secondary)] text-center mb-5">
                            is already registered via <strong className="text-[var(--text-primary)]">Google</strong>.
                        </p>

                        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/50 rounded-xl px-4 py-3 text-xs text-blue-700 dark:text-blue-300 mb-5 leading-relaxed">
                            ✓ Verify with Google to add email &amp; password login to your existing account.
                            Your data stays intact.
                        </div>

                        <button
                            id="google-verify-btn"
                            onClick={handleGoogleLink}
                            disabled={googleLoading}
                            className="w-full py-3.5 border border-[var(--border-color)] rounded-xl flex items-center justify-center gap-3 text-[var(--text-primary)] font-semibold hover:bg-[var(--bg-secondary)] transition-all disabled:opacity-50 mb-3"
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
                                    Continue with Google to Link
                                </>
                            )}
                        </button>

                        <button
                            id="cancel-btn"
                            type="button"
                            onClick={() => { setStep('email'); setGoogleLoading(false); }}
                            className="w-full py-2.5 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                        >
                            Cancel — go back to login
                        </button>
                    </div>
                )}

                {/* ── EMAIL OTP ── */}
                {step === 'email-otp' && (
                    <div className="animate-fadeIn">
                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#92BCEA] to-[#AFB3F7] flex items-center justify-center mx-auto mb-4">
                            <Image src="/icon.png" alt="INTRUST" width={36} height={36} className="object-contain" priority />
                        </div>
                        <h1 className="text-2xl font-bold text-[var(--text-primary)] text-center mt-2">Check your email</h1>
                        <p className="text-sm text-[var(--text-secondary)] text-center mt-1 mb-6">
                            Enter the code sent to <span className="font-bold text-[var(--text-primary)]">{emailAddress}</span>
                        </p>

                        <OTPBoxInput
                            value={otp}
                            onChange={(v) => { setOtp(v); }}
                            onComplete={callVerifyOTP}
                        />

                        <p className="text-xs text-[var(--text-secondary)] text-center mt-3 mb-6">
                            Can't find the email? Check your spam folder.
                        </p>

                        <div className="space-y-3">
                            <button
                                onClick={(e) => { if (canResend) handleSendOTP(e); }}
                                disabled={loading || !canResend}
                                className="w-full py-3.5 border border-[var(--border-color)] rounded-xl flex items-center justify-center gap-3 text-[var(--text-primary)] font-medium hover:bg-[var(--bg-secondary)] transition-all disabled:opacity-50"
                            >
                                {loading ? <Loader2 className="animate-spin" size={20} /> : canResend ? 'Resend code' : `Resend in ${timer}s`}
                            </button>
                            <button
                                onClick={handleVerifyOTP}
                                disabled={loading || otp.length !== 6}
                                className="w-full py-3.5 bg-[#1E3A5F] hover:bg-[#152B4D] text-white font-semibold rounded-xl transition-all flex justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loading ? <Loader2 className="animate-spin" size={20} /> : 'Verify'}
                            </button>
                        </div>
                    </div>
                )}

                {/* ── PHONE ── */}
                {step === 'phone' && (
                    <div className="animate-fadeIn">
                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#92BCEA] to-[#AFB3F7] flex items-center justify-center mx-auto mb-4">
                            <Image src="/icon.png" alt="INTRUST" width={36} height={36} className="object-contain" priority />
                        </div>
                        <div className="flex items-center gap-3 mb-6 relative">
                            <button onClick={() => { setStep('email'); }} className="absolute -left-2 top-0 bottom-0 text-[var(--text-secondary)] hover:text-[#92BCEA] transition-colors p-2">
                                <ArrowRight size={20} className="rotate-180" />
                            </button>
                            <h2 className="text-2xl font-bold text-[var(--text-primary)] w-full text-center">Phone Login</h2>
                        </div>

                        <form onSubmit={handleSendOTP} className="space-y-5">
                            <div>
                                <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">Phone Number</label>
                                <div className="relative">
                                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" size={20} />
                                    <input
                                        type="tel"
                                        value={phone}
                                        onChange={(e) => setPhone(e.target.value)}
                                        placeholder="9876543210"
                                        className="w-full pl-12 pr-4 py-3 border border-[var(--border-color)] rounded-xl bg-[var(--bg-secondary)] text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:outline-none focus:ring-2 focus:ring-[#92BCEA]/30 focus:border-[#92BCEA] transition-all"
                                        required pattern="[0-9]{10}" maxLength={10}
                                    />
                                </div>
                                <p className="text-xs text-[var(--text-secondary)] mt-2">We'll send you an OTP via SMS</p>
                            </div>

                            <button
                                type="submit"
                                disabled={loading || phone.length !== 10}
                                className="w-full py-3.5 bg-[#1E3A5F] hover:bg-[#152B4D] text-white font-semibold rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loading ? <><Loader2 className="animate-spin" size={20} /> Sending...</> : <>Continue <ArrowRight size={18} /></>}
                            </button>
                        </form>
                    </div>
                )}

                {/* ── PHONE OTP ── */}
                {step === 'otp' && (
                    <div className="animate-fadeIn">
                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#92BCEA] to-[#AFB3F7] flex items-center justify-center mx-auto mb-4">
                            <Image src="/icon.png" alt="INTRUST" width={36} height={36} className="object-contain" priority />
                        </div>
                        <h2 className="text-2xl font-bold text-[var(--text-primary)] text-center mt-2">Enter OTP</h2>
                        <p className="text-sm text-[var(--text-secondary)] text-center mt-1 mb-2">
                            Sent to <span className="font-semibold text-[var(--text-primary)]">+91 {phone}</span>
                        </p>
                        <div className="text-center mb-6">
                            <button type="button" onClick={() => { setStep('phone'); }} className="text-[#92BCEA] text-sm hover:underline font-medium">
                                Change number
                            </button>
                        </div>

                        <OTPBoxInput
                            value={otp}
                            onChange={(v) => { setOtp(v); }}
                            onComplete={callVerifyOTP}
                        />

                        <div className="mt-6 space-y-4">
                            <button
                                onClick={handleVerifyOTP}
                                disabled={loading || otp.length !== 6}
                                className="w-full py-3.5 bg-[#1E3A5F] hover:bg-[#152B4D] text-white font-semibold rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loading ? <><Loader2 className="animate-spin" size={20} /> Verifying...</> : <>Verify &amp; Login <ShieldCheck size={18} /></>}
                            </button>

                            <button
                                type="button"
                                onClick={(e) => { if (canResend) handleSendOTP(e); }}
                                disabled={loading || !canResend}
                                className="w-full text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-sm transition-colors disabled:opacity-50"
                            >
                                Didn't receive OTP? <span className="underline font-semibold">{canResend ? 'Resend' : `Resend in ${timer}s`}</span>
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default function LoginPage() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-[var(--bg-secondary)]"><Loader2 className="animate-spin text-[#92BCEA]" size={32} /></div>}>
            <LoginContent />
        </Suspense>
    );
}
