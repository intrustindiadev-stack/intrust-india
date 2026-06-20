'use client';

import { useState, useEffect, Suspense, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { signInWithOTP } from '@/lib/supabase';
import { redirectByRole } from '@/lib/auth';
import { Phone, ArrowRight, Loader2, User, CheckCircle, Eye, EyeOff, MessageCircle } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import { normalizePhone } from '@/lib/phoneUtils';
import AccountLinkingPrompt from '@/components/auth/AccountLinkingPrompt';

function OTPBoxInput({ value, onChange, onComplete, loading }) {
    const refs = useRef([]);
    const submittingRef = useRef(false);

    const fireComplete = (completed) => {
        if (completed.length === 6 && !submittingRef.current) {
            submittingRef.current = true;
            onComplete && onComplete(completed);
        }
    };

    useEffect(() => {
        if (!loading) submittingRef.current = false;
    }, [loading]);

    useEffect(() => {
        if (!value || value.replace(/\s+/g, '').length < 6) submittingRef.current = false;
    }, [value]);

    const handleChange = (e, index) => {
        const char = e.target.value.replace(/[^0-9]/g, '').slice(-1);
        const chars = value.split('');
        if (char) {
            chars[index] = char;
            const newString = chars.join('').padEnd(6, ' ').slice(0, 6);
            const completed = newString.replace(/\s+/g, '');
            onChange(completed);
            if (index < 5) refs.current[index + 1]?.focus();
            else if (completed.length === 6) fireComplete(completed);
        }
    };

    const handleKeyDown = (e, index) => {
        if (e.key === 'Backspace') {
            const chars = value.split('');
            if (value[index]) {
                chars[index] = '';
                onChange(chars.join(''));
            } else if (index > 0) refs.current[index - 1]?.focus();
        }
    };

    const handlePaste = (e) => {
        e.preventDefault();
        const pasted = e.clipboardData.getData('text').replace(/[^0-9]/g, '').slice(0, 6);
        if (pasted) {
            onChange(pasted);
            if (pasted.length === 6) {
                refs.current[5]?.focus();
                fireComplete(pasted);
            } else refs.current[pasted.length]?.focus();
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
                    autoComplete="one-time-code"
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

// Inner component that uses useSearchParams (must be wrapped in Suspense)
function SignupPageInner() {
    const router = useRouter();
    const searchParams = useSearchParams();

    // ─── Shared state ───────────────────────────────────────────────────────────
    const [step, setStep] = useState('email-form'); // 'choice' removed, defaults to 'email-form'
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [otp, setOtp] = useState('');
    const [loading, setLoading] = useState(false);
    const [googleLoading, setGoogleLoading] = useState(false);

    // ─── Email-specific state ───────────────────────────────────────────────────
    const [emailAddress, setEmailAddress] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [conflictProvider, setConflictProvider] = useState('');
    const [resendLoading, setResendLoading] = useState(false);
    const [timer, setTimer] = useState(0);
    const canResend = timer === 0;
    const [otpChannel, setOtpChannel] = useState('sms'); // 'sms' | 'whatsapp'
    const [whatsappLoading, setWhatsappLoading] = useState(false);

    useEffect(() => {
        if (timer > 0) {
            const interval = setInterval(() => {
                setTimer((prev) => prev - 1);
            }, 1000);
            return () => clearInterval(interval);
        }
    }, [timer]);

    const startTimer = (seconds = 60) => {
        setTimer(seconds);
    };

    useEffect(() => {
        sessionStorage.removeItem('intrust_adv_seen');

        // ── Referral attribution via ?ref= URL param ────────────────────────────
        // Persist the referral code to sessionStorage BEFORE any OAuth/OTP
        // redirect so it survives the round-trip back to the onboarding modal.
        const refCode = searchParams.get('ref');
        if (refCode) {
            const normalised = refCode.toUpperCase().trim();
            if (normalised.length > 0) {
                sessionStorage.setItem('intrust_pending_ref', normalised);
            }
        }

        // ── Seamless phone handoff from login ───────────────────────────────────
        const phoneParam = searchParams.get('phone');
        if (phoneParam) {
            const { cleanPhone, isValid } = normalizePhone(phoneParam);
            if (isValid) {
                setPhone(cleanPhone);
                setStep('details');
            }
        }
    }, [searchParams]);

    // ─── Google ─────────────────────────────────────────────────────────────────
    const handleGoogleSignIn = () => {
        setGoogleLoading(true);
        window.location.href = '/api/auth/google';
    };

    // ─── Phone OTP flow ─────────────────────────────────────────────────────────
    const handleContinue = (e) => {
        if (e) e.preventDefault();
        if (name.trim().length < 2) { toast.error('Please enter your full name'); return; }
        setStep('phone');
    };

    const handleSendOTP = async (e, channel = 'sms') => {
        if (e) e.preventDefault();
        const isWhatsApp = channel === 'whatsapp';
        if (isWhatsApp) setWhatsappLoading(true); else setLoading(true);
        const { formattedPhone, isValid } = normalizePhone(phone);
        if (!isValid) {
            toast.error('Please enter a valid 10-digit phone number');
            setLoading(false); setWhatsappLoading(false);
            return;
        }
        const { data: otpData, error: otpError } = await signInWithOTP(formattedPhone, channel);
        if (otpError) {
            const msg = otpError.message.toLowerCase();
            // Handle WHATSAPP_DISABLED gracefully
            if (msg.includes('whatsapp') && msg.includes('not') && msg.includes('available')) {
                toast.error('WhatsApp OTP is not available right now. Please use SMS.');
                setLoading(false); setWhatsappLoading(false);
                return;
            }
            if (otpError.retry_after) {
                toast.error(`Rate limited. Try again in ${otpError.retry_after}s.`);
                setOtpChannel(channel);
                setStep('otp');
                startTimer(otpError.retry_after);
            } else {
                toast.error(otpError.message || 'Failed to send OTP.'); 
            }
            setLoading(false); setWhatsappLoading(false);
            return; 
        }
        setOtpChannel(channel);
        setStep('otp');
        startTimer(60);
        setLoading(false); setWhatsappLoading(false);
    };

    const handleVerifyOTP = async (e, otpOverride) => {
        if (e) e.preventDefault();
        if (loading) return;
        const otpValue = otpOverride || otp;
        if (otpValue.replace(/\s+/g, '').length !== 6) { toast.error('Please enter the 6-digit OTP'); return; }
        setLoading(true);
        try {
            const { formattedPhone } = normalizePhone(phone);
            const res = await fetch('/api/auth/signup-otp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phone: formattedPhone, otp: otpValue, full_name: name })
            });
            const data = await res.json();
            
            if (!res.ok || data.error) {
                toast.error(data.error || 'Invalid OTP.');
                setLoading(false);
                return;
            }
            if (data.outcome === 'account_exists') {
                toast.error('Account already exists. Please log in instead.');
                setLoading(false);
                router.push('/login');
                return;
            }
            
            await redirectByRole(data?.user, data?.role, data?.is_suspended);
            if (data?.is_suspended) {
                setLoading(false);
            }
        } catch (err) {
            console.error('[SIGNUP] Unexpected OTP error:', err);
            toast.error('An unexpected error occurred. Please try again.');
            setLoading(false);
        }
    };

    // ─── Email flow ─────────────────────────────────────────────────────────────
    const handleEmailSignup = async (e) => {
        e.preventDefault();
        if (name.trim().length < 2) { toast.error('Please enter your full name.'); return; }
        
        const { formattedPhone, isValid } = normalizePhone(phone);
        if (!isValid || phone.length !== 10) {
            toast.error('Please enter a valid 10-digit mobile number.');
            return;
        }

        if (!password || password.length < 8) { toast.error('Password must be at least 8 characters.'); return; }
        if (password !== confirmPassword) { toast.error('Passwords do not match.'); return; }

        setLoading(true);
        try {
            // 1. Precheck phone & email
            const precheckRes = await fetch('/api/auth/email/signup/precheck', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: emailAddress, phone: formattedPhone })
            });
            const precheckData = await precheckRes.json();

            if (precheckData.conflict) {
                setConflictProvider(precheckData.provider);
                setStep('email-conflict');
                setLoading(false);
                return;
            }

            if (precheckData.code === 'PHONE_EXISTS') {
                toast.error(precheckData.error || 'Phone number already registered');
                setLoading(false);
                return;
            }

            if (!precheckRes.ok || !precheckData.ok) {
                toast.error(precheckData.error || 'Validation failed. Please try again.');
                setLoading(false);
                return;
            }

            // 2. Dispatch OTP (email signup always uses SMS for the phone verification step)
            const { error: otpError } = await signInWithOTP(formattedPhone);
            if (otpError) {
                if (otpError.retry_after) {
                    toast.error(`Rate limited. Try again in ${otpError.retry_after}s.`);
                    setOtpChannel('sms');
                    setStep('email-otp');
                    startTimer(otpError.retry_after);
                } else {
                    toast.error(otpError.message || 'Failed to send OTP.');
                }
                setLoading(false);
                return;
            }

            setOtpChannel('sms');
            setStep('email-otp');
            startTimer(60);
        } catch (err) {
            console.error('[SIGNUP] Email precheck error:', err);
            toast.error('Network error. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyEmailOTP = async (e, otpOverride) => {
        if (e) e.preventDefault();
        if (loading) return;
        const otpValue = otpOverride || otp;
        if (otpValue.replace(/\s+/g, '').length !== 6) { toast.error('Please enter the 6-digit OTP'); return; }
        
        setLoading(true);
        try {
            const { formattedPhone } = normalizePhone(phone);
            const res = await fetch('/api/auth/email/signup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    email: emailAddress, 
                    password, 
                    full_name: name, 
                    phone: formattedPhone, 
                    otp: otpValue 
                })
            });
            const data = await res.json();

            if (data.conflict) {
                setConflictProvider(data.provider);
                setStep('email-conflict');
                setLoading(false);
                return;
            }

            if (!res.ok) {
                toast.error(data.error || 'Signup failed. Please try again.');
                setLoading(false);
                return;
            }

            setStep('email-pending');
        } catch (err) {
            console.error('[SIGNUP] Email OTP verify error:', err);
            toast.error('An unexpected error occurred. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleResendVerification = async () => {
        setResendLoading(true);
        try {
            const res = await fetch('/api/auth/email/resend-verification', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: emailAddress })
            });
            const data = await res.json();
            if (!res.ok) {
                toast.error(data.error || 'Failed to resend. Please try again.');
            } else {
                toast.success('Verification email resent!');
            }
        } catch (err) {
            toast.error('Network error. Please try again.');
        } finally {
            setResendLoading(false);
        }
    };

    // ─── Shared UI helpers ───────────────────────────────────────────────────────
    // ─── Shared UI helpers ───────────────────────────────────────────────────────
    return (
        <div className="min-h-screen flex items-center justify-center bg-[var(--bg-secondary)] p-4">
            <div className="w-full max-w-md bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-[var(--border-color)] p-8">

                {/* ── EMAIL FORM (New Default Sign Up Screen) ── */}
                {step === 'email-form' && (
                    <div className="animate-fadeIn">
                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#92BCEA] to-[#AFB3F7] flex items-center justify-center mx-auto mb-4">
                            <Image src="/icon.png" alt="INTRUST" width={36} height={36} className="object-contain" priority />
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
                                        required pattern="[0-9]{10}" maxLength={10}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">Password</label>
                                <div className="relative">
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="Min. 8 characters"
                                        className="w-full px-4 py-3 border border-[var(--border-color)] rounded-xl bg-[var(--bg-secondary)] text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:outline-none focus:ring-2 focus:ring-[#92BCEA]/30 focus:border-[#92BCEA] transition-all pr-12"
                                        required
                                        minLength={8}
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

                            <div>
                                <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">Confirm Password</label>
                                <div className="relative">
                                    <input
                                        type={showConfirm ? 'text' : 'password'}
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        placeholder="Re-enter your password"
                                        className="w-full px-4 py-3 border border-[var(--border-color)] rounded-xl bg-[var(--bg-secondary)] text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:outline-none focus:ring-2 focus:ring-[#92BCEA]/30 focus:border-[#92BCEA] transition-all pr-12"
                                        required
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowConfirm(!showConfirm)}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                                    >
                                        {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={loading || !name.trim() || !emailAddress || phone.length !== 10 || !password || !confirmPassword}
                                className="w-full py-3.5 bg-[#1E3A5F] hover:bg-[#152B4D] text-white font-semibold rounded-xl transition-all flex justify-center"
                            >
                                {loading ? <Loader2 className="animate-spin" size={20} /> : 'Create Account'}
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
                                onClick={() => { setStep('details'); }}
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
                            <Image src="/icon.png" alt="INTRUST" width={36} height={36} className="object-contain" priority />
                        </div>
                        <div className="flex items-center gap-3 mb-6 relative">
                            <button onClick={() => { setStep('email-form'); }} className="absolute -left-2 top-0 bottom-0 text-[var(--text-secondary)] hover:text-[#92BCEA] transition-colors p-2">
                                <ArrowRight size={20} className="rotate-180" />
                            </button>
                            <h2 className="text-2xl font-bold text-[var(--text-primary)] w-full text-center">Your Name</h2>
                        </div>
                        <p className="text-sm text-[var(--text-secondary)] text-center mt-1 mb-6">Let&apos;s personalise your account</p>

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
                            <Image src="/icon.png" alt="INTRUST" width={36} height={36} className="object-contain" priority />
                        </div>
                        <div className="flex items-center gap-3 mb-6 relative">
                            <button onClick={() => { setStep('details'); }} className="absolute -left-2 top-0 bottom-0 text-[var(--text-secondary)] hover:text-[#92BCEA] transition-colors p-2">
                                <ArrowRight size={20} className="rotate-180" />
                            </button>
                            <h2 className="text-2xl font-bold text-[var(--text-primary)] w-full text-center">Verify Phone</h2>
                        </div>
                        <p className="text-sm text-[var(--text-secondary)] text-center mt-1 mb-6">
                            Welcome, <span className="font-bold text-[var(--text-primary)]">{name.split(' ')[0]}</span>
                        </p>

                        <form onSubmit={(e) => handleSendOTP(e, 'sms')} className="space-y-5">
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

                            <div className="space-y-3">
                                <button
                                    type="submit"
                                    disabled={loading || whatsappLoading || phone.length !== 10}
                                    className="w-full py-3.5 bg-[#1E3A5F] hover:bg-[#152B4D] text-white font-semibold rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                                >
                                    {loading ? <><Loader2 className="animate-spin" size={20} /> Sending...</> : <>Send code via SMS <ArrowRight size={18} /></>}
                                </button>

                                <button
                                    type="button"
                                    onClick={(e) => handleSendOTP(e, 'whatsapp')}
                                    disabled={loading || whatsappLoading || phone.length !== 10}
                                    className="w-full py-3.5 border border-[#25D366]/30 rounded-xl flex items-center justify-center gap-2 text-[#25D366] font-medium hover:bg-[#25D366]/5 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {whatsappLoading ? <><Loader2 className="animate-spin" size={20} /> Sending...</> : <><MessageCircle size={18} /> Get code on WhatsApp</>}
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                {/* ── OTP ── */}
                {step === 'otp' && (
                    <div className="animate-fadeIn">
                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#92BCEA] to-[#AFB3F7] flex items-center justify-center mx-auto mb-4">
                            <Image src="/icon.png" alt="INTRUST" width={36} height={36} className="object-contain" priority />
                        </div>
                        <h2 className="text-2xl font-bold text-[var(--text-primary)] text-center mt-2">Secure Code</h2>
                        <p className="text-sm text-[var(--text-secondary)] text-center mt-1 mb-1">
                            Enter 6-digit code sent to <br /><span className="font-semibold text-[var(--text-primary)]">+91 {phone}</span>
                        </p>
                        {/* Channel badge */}
                        <p className="text-xs text-center mb-6">
                            {otpChannel === 'whatsapp'
                                ? <span className="inline-flex items-center gap-1 text-[#25D366] font-medium"><MessageCircle size={13} /> via WhatsApp</span>
                                : <span className="inline-flex items-center gap-1 text-[var(--text-secondary)] font-medium"><Phone size={13} /> via SMS</span>
                            }
                        </p>

                        <form onSubmit={(e) => handleVerifyOTP(e, otp)} className="space-y-6">
                            <OTPBoxInput
                                value={otp}
                                onChange={(v) => { setOtp(v); }}
                                onComplete={(completedOtp) => handleVerifyOTP({ preventDefault: () => {} }, completedOtp)}
                                loading={loading}
                            />

                            <button
                                type="submit"
                                disabled={loading || otp.replace(/\s+/g, '').length !== 6}
                                className="w-full py-3.5 bg-[#1E3A5F] hover:bg-[#152B4D] text-white font-semibold rounded-xl flex items-center justify-center transition-all disabled:opacity-50"
                            >
                                {loading ? <Loader2 className="animate-spin" size={20} /> : 'Finalize Signup'}
                            </button>

                            <div className="flex flex-col gap-3 text-center">
                                {/* Same-channel resend */}
                                <button type="button" onClick={(e) => { if (canResend) handleSendOTP(e, otpChannel); }} disabled={loading || !canResend} className="text-sm font-semibold text-[var(--text-secondary)] hover:text-[#92BCEA] transition-colors disabled:opacity-50">
                                    {canResend ? 'Resend Code' : `Resend in ${timer}s`}
                                </button>
                                {/* Cross-channel resend */}
                                {canResend && (
                                    <button
                                        type="button"
                                        onClick={(e) => handleSendOTP(e, otpChannel === 'whatsapp' ? 'sms' : 'whatsapp')}
                                        disabled={loading || whatsappLoading}
                                        className="text-sm font-medium transition-colors disabled:opacity-50"
                                        style={{ color: otpChannel === 'whatsapp' ? 'var(--text-secondary)' : '#25D366' }}
                                    >
                                        {otpChannel === 'whatsapp'
                                            ? <>Resend via SMS instead</>
                                            : <span className="inline-flex items-center justify-center gap-1"><MessageCircle size={14} /> Resend via WhatsApp instead</span>
                                        }
                                    </button>
                                )}
                                <button type="button" onClick={() => setStep('phone')} className="text-sm font-semibold text-[#92BCEA] hover:underline">
                                    Update Number
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                {/* ── EMAIL OTP ── */}
                {step === 'email-otp' && (
                    <div className="animate-fadeIn">
                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#92BCEA] to-[#AFB3F7] flex items-center justify-center mx-auto mb-4">
                            <Image src="/icon.png" alt="INTRUST" width={36} height={36} className="object-contain" priority />
                        </div>
                        <h2 className="text-2xl font-bold text-[var(--text-primary)] text-center mt-2">Verify your mobile</h2>
                        <p className="text-sm text-[var(--text-secondary)] text-center mt-1 mb-1">
                            Enter 6-digit code sent to <br /><span className="font-semibold text-[var(--text-primary)]">+91 {phone}</span>
                        </p>
                        {/* Channel badge */}
                        <p className="text-xs text-center mb-6">
                            {otpChannel === 'whatsapp'
                                ? <span className="inline-flex items-center gap-1 text-[#25D366] font-medium"><MessageCircle size={13} /> via WhatsApp</span>
                                : <span className="inline-flex items-center gap-1 text-[var(--text-secondary)] font-medium"><Phone size={13} /> via SMS</span>
                            }
                        </p>

                        <form onSubmit={(e) => handleVerifyEmailOTP(e, otp)} className="space-y-6">
                            <OTPBoxInput
                                value={otp}
                                onChange={(v) => { setOtp(v); }}
                                onComplete={(completedOtp) => handleVerifyEmailOTP({ preventDefault: () => {} }, completedOtp)}
                                loading={loading}
                            />

                            <button
                                type="submit"
                                disabled={loading || otp.replace(/\s+/g, '').length !== 6}
                                className="w-full py-3.5 bg-[#1E3A5F] hover:bg-[#152B4D] text-white font-semibold rounded-xl flex items-center justify-center transition-all disabled:opacity-50"
                            >
                                {loading ? <Loader2 className="animate-spin" size={20} /> : 'Verify & Create Account'}
                            </button>

                            <div className="flex flex-col gap-3 text-center">
                                {/* Same-channel resend */}
                                <button type="button" onClick={(e) => { if (canResend) handleSendOTP(e, otpChannel); }} disabled={loading || !canResend} className="text-sm font-semibold text-[var(--text-secondary)] hover:text-[#92BCEA] transition-colors disabled:opacity-50">
                                    {canResend ? 'Resend code' : `Resend in ${timer}s`}
                                </button>
                                {/* Cross-channel resend */}
                                {canResend && (
                                    <button
                                        type="button"
                                        onClick={(e) => handleSendOTP(e, otpChannel === 'whatsapp' ? 'sms' : 'whatsapp')}
                                        disabled={loading || whatsappLoading}
                                        className="text-sm font-medium transition-colors disabled:opacity-50"
                                        style={{ color: otpChannel === 'whatsapp' ? 'var(--text-secondary)' : '#25D366' }}
                                    >
                                        {otpChannel === 'whatsapp'
                                            ? <>Resend via SMS instead</>
                                            : <span className="inline-flex items-center justify-center gap-1"><MessageCircle size={14} /> Resend via WhatsApp instead</span>
                                        }
                                    </button>
                                )}
                                <button type="button" onClick={() => setStep('email-form')} className="text-sm font-semibold text-[#92BCEA] hover:underline">
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
                            We&apos;ve sent a verification link to<br />
                            <span className="font-bold text-[var(--text-primary)]">{emailAddress}</span>
                        </p>
                        <p className="text-xs text-[var(--text-secondary)] text-center mb-6">
                            Click the link in the email to activate your account. Check spam if it doesn&apos;t arrive.
                        </p>

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
                        <AccountLinkingPrompt
                            email={emailAddress}
                            provider={conflictProvider}
                            onCancel={() => {
                                setStep('email-form');
                                setPassword('');
                                setConfirmPassword('');
                            }}
                        />
                    </div>
                )}

            </div>
        </div>
    );
}

// Default export wraps in Suspense so useSearchParams works in Next.js App Router
export default function SignupPage() {
    return (
        <Suspense fallback={null}>
            <SignupPageInner />
        </Suspense>
    );
}
