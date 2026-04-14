'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, CheckCircle, XCircle, Eye, EyeOff } from 'lucide-react';
import Image from 'next/image';

/**
 * /link-complete
 *
 * Displayed after the user completes Google OAuth as part of Flow A
 * (Google account → add email+password login).
 *
 * The user arrives here already authenticated via Google. This page:
 *  1. Optionally prompts for a password if the goal is to add email login.
 *  2. Calls POST /api/auth/email/link-after-google to add the password.
 *  3. Redirects to /dashboard on success.
 */
export default function LinkCompletePage() {
    const router = useRouter();

    const [password, setPassword]         = useState('');
    const [confirmPassword, setConfirm]   = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading]           = useState(false);
    const [error, setError]               = useState('');
    const [done, setDone]                 = useState(false);

    const handleLink = async (e) => {
        e.preventDefault();
        setError('');

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
            const res = await fetch('/api/auth/email/link-after-google', {
                method:  'POST',
                headers: { 'Content-Type': 'application/json' },
                body:    JSON.stringify({ password }),
            });
            const data = await res.json();

            if (!res.ok) {
                setError(data.error || 'Failed to link account. Please try again.');
                setLoading(false);
                return;
            }

            setDone(true);
            // Redirect to dashboard after brief success pause
            setTimeout(() => router.push('/dashboard'), 2000);
        } catch (err) {
            setError('Network error. Please try again.');
            setLoading(false);
        }
    };

    const skipToLogin = () => router.push('/dashboard');

    return (
        <div className="min-h-screen flex items-center justify-center bg-[var(--bg-secondary)] p-4">
            <div className="w-full max-w-md bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-[var(--border-color)] p-8">

                {/* Header */}
                <div className="flex flex-col items-center mb-6">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#92BCEA] to-[#AFB3F7] flex items-center justify-center mx-auto mb-4">
                        <Image src="/icon.png" alt="INTRUST" width={36} height={36} className="object-contain" />
                    </div>
                    <h1 className="text-2xl font-bold text-[var(--text-primary)] text-center">
                        One Last Step
                    </h1>
                    <p className="text-sm text-[var(--text-secondary)] text-center mt-1">
                        Set a password so you can also sign in with email & password.
                    </p>
                </div>

                {done ? (
                    <div className="flex flex-col items-center py-6 gap-4">
                        <CheckCircle size={48} className="text-green-500" />
                        <p className="text-base font-semibold text-green-600 dark:text-green-400 text-center">
                            Accounts linked successfully! Redirecting…
                        </p>
                    </div>
                ) : (
                    <form onSubmit={handleLink} className="space-y-5">
                        {/* Password */}
                        <div>
                            <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">
                                New Password
                            </label>
                            <div className="relative">
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="Min 8 characters"
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

                        {/* Confirm Password */}
                        <div>
                            <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">
                                Confirm Password
                            </label>
                            <input
                                type={showPassword ? 'text' : 'password'}
                                value={confirmPassword}
                                onChange={(e) => setConfirm(e.target.value)}
                                placeholder="Repeat your password"
                                className="w-full px-4 py-3 border border-[var(--border-color)] rounded-xl bg-[var(--bg-secondary)] text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:outline-none focus:ring-2 focus:ring-[#92BCEA]/30 focus:border-[#92BCEA] transition-all"
                                required
                            />
                        </div>

                        {error && (
                            <div className="p-3 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900/20 rounded-xl text-red-600 dark:text-red-400 text-sm flex items-center gap-2">
                                <XCircle size={16} className="shrink-0" />
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading || !password || !confirmPassword}
                            className="w-full py-3.5 bg-[#1E3A5F] hover:bg-[#152B4D] text-white font-semibold rounded-xl transition-all flex justify-center items-center gap-2 disabled:opacity-50"
                        >
                            {loading ? <Loader2 className="animate-spin" size={20} /> : 'Link Accounts'}
                        </button>

                        <button
                            type="button"
                            onClick={skipToLogin}
                            className="w-full py-2.5 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                        >
                            Skip — go to dashboard without setting a password
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
}
