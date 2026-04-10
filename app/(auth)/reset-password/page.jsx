'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { Eye, EyeOff, Loader2, CheckCircle, ArrowRight, Lock } from 'lucide-react';
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
    const colors = ['bg-red-400', 'bg-orange-400', 'bg-yellow-400', 'bg-lime-400', 'bg-green-500'];
    const labels = ['Very Weak', 'Weak', 'Fair', 'Good', 'Strong'];
    return (
        <div className="mt-2 space-y-2">
            <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className={`h-1 flex-1 rounded-full transition-all duration-300 ${i <= score ? colors[score - 1] : 'bg-gray-200'}`} />
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

export default function ResetPasswordPage() {
    const router = useRouter();

    const [password, setPassword]           = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword]   = useState(false);
    const [showConfirm, setShowConfirm]     = useState(false);
    const [loading, setLoading]             = useState(false);
    const [error, setError]                 = useState('');
    const [tokenValid, setTokenValid]       = useState(null); // null = checking, true, false
    const [success, setSuccess]             = useState(false);

    // ─── Validate the reset token from the URL hash ───────────────────────────
    useEffect(() => {
        // Supabase appends access_token to the URL hash after the user clicks the reset link.
        // exchangeCodeForSession handles the code-based flow; for hash-based (older) flow we
        // rely on the onAuthStateChange PASSWORD_RECOVERY event.
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
            if (event === 'PASSWORD_RECOVERY') {
                setTokenValid(true);
            }
        });

        // Also check if there's already an active session (meaning the token was already consumed)
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (session) {
                setTokenValid(true);
            } else {
                // Wait briefly for the PASSWORD_RECOVERY event
                const timer = setTimeout(() => {
                    setTokenValid((prev) => {
                        if (prev === null) return false;
                        return prev;
                    });
                }, 2500);
                return () => clearTimeout(timer);
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    const handleResetPassword = async (e) => {
        e.preventDefault();
        setError('');

        const { score } = getPasswordStrength(password);
        if (score < 3) { setError('Please choose a stronger password.'); return; }
        if (password !== confirmPassword) { setError('Passwords do not match.'); return; }

        setLoading(true);
        try {
            const { error: updateError } = await supabase.auth.updateUser({ password });
            if (updateError) {
                setError(updateError.message || 'Failed to update password. Please request a new reset link.');
                setLoading(false);
                return;
            }

            // Invalidate all other sessions
            try {
                await fetch('/api/auth/email/invalidate-sessions', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' }
                });
            } catch (e) {
                // Non-fatal if this fails
                console.warn('[RESET-PASSWORD] invalidate-sessions failed (non-fatal):', e);
            }

            setSuccess(true);
            setTimeout(() => {
                window.location.href = '/login?reset=success';
            }, 2500);

        } catch (err) {
            console.error('[RESET-PASSWORD] Unexpected error:', err);
            setError('An unexpected error occurred. Please try again.');
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                {/* Logo */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 mb-4 rounded-2xl bg-gradient-to-br from-[#92BCEA] to-[#AFB3F7] shadow-lg">
                        <Image src="/icon.png" alt="INTRUST" width={40} height={40} className="object-contain" />
                    </div>
                    <h1 className="text-3xl font-bold text-gray-900 font-[family-name:var(--font-outfit)]">INTRUST</h1>
                    <p className="text-gray-600 mt-2">Set a new password</p>
                </div>

                <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8">

                    {/* ── Token invalid / expired ── */}
                    {tokenValid === false && (
                        <div className="text-center py-4">
                            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Lock className="text-red-500" size={32} />
                            </div>
                            <h2 className="text-xl font-bold text-gray-900 mb-2">Link Expired</h2>
                            <p className="text-gray-600 mb-6 text-sm">
                                This password reset link has expired or is invalid. Please request a new one.
                            </p>
                            <Link
                                href="/forgot-password"
                                className="inline-flex items-center justify-center w-full py-3.5 bg-gradient-to-r from-[#92BCEA] to-[#AFB3F7] text-white font-semibold rounded-xl hover:shadow-lg hover:scale-[1.02] transition-all gap-2"
                            >
                                Request New Link <ArrowRight size={18} />
                            </Link>
                        </div>
                    )}

                    {/* ── Checking token ── */}
                    {tokenValid === null && (
                        <div className="text-center py-8 flex flex-col items-center gap-3">
                            <Loader2 className="animate-spin text-[#92BCEA]" size={32} />
                            <p className="text-sm text-gray-500">Verifying your reset link…</p>
                        </div>
                    )}

                    {/* ── Success ── */}
                    {success && (
                        <div className="text-center py-4">
                            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <CheckCircle className="text-green-600" size={32} />
                            </div>
                            <h2 className="text-xl font-bold text-gray-900 mb-2">Password Updated!</h2>
                            <p className="text-gray-600 mb-4 text-sm">Redirecting you to login…</p>
                            <Loader2 className="animate-spin text-[#92BCEA] mx-auto" size={24} />
                        </div>
                    )}

                    {/* ── Reset form ── */}
                    {tokenValid === true && !success && (
                        <>
                            <h2 className="text-2xl font-bold text-gray-900 mb-2 font-[family-name:var(--font-outfit)]">Reset Password</h2>
                            <p className="text-sm text-gray-600 mb-6">Enter your new password below.</p>

                            <form onSubmit={handleResetPassword} className="space-y-5">
                                {/* New Password */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">New Password</label>
                                    <div className="relative">
                                        <input
                                            type={showPassword ? 'text' : 'password'}
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            placeholder="Min 8 characters"
                                            className="w-full pl-4 pr-12 py-3.5 bg-gray-50 border border-gray-300 rounded-xl text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#92BCEA] focus:border-transparent transition-all"
                                            required
                                        />
                                        <button type="button" onClick={() => setShowPassword((p) => !p)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#92BCEA] transition-colors">
                                            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                        </button>
                                    </div>
                                    <PasswordStrengthMeter password={password} />
                                </div>

                                {/* Confirm Password */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Confirm Password</label>
                                    <div className="relative">
                                        <input
                                            type={showConfirm ? 'text' : 'password'}
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            placeholder="Repeat your new password"
                                            className="w-full pl-4 pr-12 py-3.5 bg-gray-50 border border-gray-300 rounded-xl text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#92BCEA] focus:border-transparent transition-all"
                                            required
                                        />
                                        <button type="button" onClick={() => setShowConfirm((p) => !p)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#92BCEA] transition-colors">
                                            {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                                        </button>
                                    </div>
                                    {confirmPassword && password !== confirmPassword && (
                                        <p className="text-xs font-bold text-red-500 mt-1">Passwords do not match</p>
                                    )}
                                </div>

                                {error && (
                                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">{error}</div>
                                )}

                                <button
                                    type="submit"
                                    disabled={loading || !password || !confirmPassword}
                                    className="w-full py-3.5 bg-gradient-to-r from-[#92BCEA] to-[#AFB3F7] text-white font-semibold rounded-xl flex items-center justify-center gap-2 hover:shadow-lg hover:scale-[1.02] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {loading ? <><Loader2 className="animate-spin" size={20} /> Updating...</> : <>Update Password <ArrowRight size={20} /></>}
                                </button>
                            </form>

                            <div className="mt-6 text-center">
                                <Link href="/login" className="text-sm text-gray-500 hover:text-gray-700 transition-colors">
                                    ← Back to Login
                                </Link>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
