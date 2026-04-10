'use client';

import { useState } from 'react';
import { ShieldCheck, Loader2, Eye, EyeOff } from 'lucide-react';
import Link from 'next/link';

/**
 * AccountLinkingPrompt
 *
 * Shown when a user tries to sign up with email but an account already exists.
 * Lets them add email+password to their existing Google/Phone account.
 *
 * Props:
 *   email         – the email address in question
 *   provider      – 'google' | 'phone_otp' | 'multiple'
 *   onCancel      – callback to dismiss this prompt
 */
export default function AccountLinkingPrompt({ email, provider, onCancel }) {
    const [password, setPassword]             = useState('');
    const [showPassword, setShowPassword]     = useState(false);
    const [loading, setLoading]               = useState(false);
    const [error, setError]                   = useState('');
    const [success, setSuccess]               = useState(false);

    const providerLabels = {
        google:    'Google',
        phone_otp: 'Phone',
        multiple:  'Google & Phone'
    };
    const label = providerLabels[provider] || provider;

    const handleLink = async (e) => {
        e.preventDefault();
        setError('');
        if (password.length < 8) {
            setError('Password must be at least 8 characters.');
            return;
        }
        setLoading(true);
        try {
            const res = await fetch('/api/auth/email/link-provider', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });
            const data = await res.json();
            if (!res.ok) {
                setError(data.error || 'Failed to link account. Please try again.');
                setLoading(false);
                return;
            }
            setSuccess(true);
        } catch (err) {
            setError('Network error. Please try again.');
            setLoading(false);
        }
    };

    return (
        <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 p-8 shadow-[0_20px_50px_rgba(0,0,0,0.05)] dark:shadow-none">
            <div className="flex flex-col items-center text-center mb-6">
                <div className="w-14 h-14 bg-yellow-100 dark:bg-yellow-900/20 rounded-full flex items-center justify-center mb-4">
                    <ShieldCheck className="text-yellow-600 dark:text-yellow-400" size={28} />
                </div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1 font-[family-name:var(--font-outfit)]">
                    Account Already Exists
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                    <span className="font-semibold text-gray-900 dark:text-white">{email}</span> is already linked to a{' '}
                    <span className="font-semibold text-[#92BCEA]">{label}</span> account.
                </p>
            </div>

            {success ? (
                <div className="text-center py-4">
                    <p className="text-sm font-semibold text-green-600 dark:text-green-400 mb-4">
                        ✓ Email &amp; password login has been added to your account!
                    </p>
                    <Link
                        href="/login"
                        className="block w-full py-3.5 bg-gradient-to-r from-[#92BCEA] to-[#7aaad6] text-white font-bold rounded-2xl text-center hover:shadow-xl hover:shadow-blue-200/40 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-md text-sm uppercase tracking-wide"
                    >
                        Go to Login
                    </Link>
                </div>
            ) : (
                <>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-6 text-center">
                        You must be signed in with your existing {label} account to link email login.
                        If you're already signed in, enter a password below to add email access.
                    </p>

                    <form onSubmit={handleLink} className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-widest">
                                New Email Password
                            </label>
                            <div className="relative">
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="Min 8 characters"
                                    className="w-full pl-4 pr-12 py-4 bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800 rounded-2xl text-gray-900 dark:text-white placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-[#92BCEA]/20 focus:border-[#92BCEA] transition-all"
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
                            <p className="text-xs font-bold text-red-500 animate-pulse">{error}</p>
                        )}

                        <button
                            type="submit"
                            disabled={loading || !password}
                            className="w-full py-4 bg-gradient-to-r from-[#92BCEA] to-[#7aaad6] text-white font-bold rounded-2xl flex items-center justify-center gap-3 hover:shadow-xl hover:shadow-blue-200/40 dark:hover:shadow-none hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 shadow-md uppercase tracking-wider text-sm"
                        >
                            {loading ? <Loader2 className="animate-spin" size={20} /> : 'Yes, Link Accounts'}
                        </button>

                        <button
                            type="button"
                            onClick={onCancel}
                            className="w-full py-3 text-sm font-bold text-gray-400 hover:text-[#92BCEA] transition-colors uppercase tracking-wide"
                        >
                            Cancel
                        </button>
                    </form>
                </>
            )}
        </div>
    );
}
