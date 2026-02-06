'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { resetPassword } from '@/lib/supabase';
import { Mail, ArrowRight, Loader2, CheckCircle } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

export default function ForgotPasswordPage() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    const handleResetPassword = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        const { error: resetError } = await resetPassword(email);

        if (resetError) {
            setError(resetError.message || 'Failed to send reset link');
            setLoading(false);
            return;
        }

        setSuccess(true);
        setLoading(false);
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                {/* Logo */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 mb-4 rounded-2xl bg-gradient-to-br from-[#92BCEA] to-[#AFB3F7] shadow-lg">
                        <Image src="/icons/intrustLogo.png" alt="INTRUST" width={40} height={40} className="object-contain" />
                    </div>
                    <h1 className="text-3xl font-bold text-gray-900 font-[family-name:var(--font-outfit)]">
                        INTRUST
                    </h1>
                    <p className="text-gray-600 mt-2">Recover your account</p>
                </div>

                {/* Card */}
                <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8">
                    {success ? (
                        <div className="text-center py-4">
                            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <CheckCircle className="text-green-600" size={32} />
                            </div>
                            <h2 className="text-xl font-bold text-gray-900 mb-2">Check your email</h2>
                            <p className="text-gray-600 mb-6">
                                We've sent a password reset link to <span className="font-semibold">{email}</span>
                            </p>
                            <Link
                                href="/login"
                                className="inline-flex items-center justify-center w-full py-3.5 bg-gradient-to-r from-[#92BCEA] to-[#AFB3F7] text-white font-semibold rounded-xl hover:shadow-lg hover:scale-[1.02] transition-all"
                            >
                                Back to Login
                            </Link>
                        </div>
                    ) : (
                        <>
                            <h2 className="text-2xl font-bold text-gray-900 mb-6 font-[family-name:var(--font-outfit)]">
                                Forgot Password
                            </h2>
                            <p className="text-sm text-gray-600 mb-6">
                                Enter your email address and we'll send you a link to reset your password.
                            </p>

                            <form onSubmit={handleResetPassword} className="space-y-5">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Email Address
                                    </label>
                                    <div className="relative">
                                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                                        <input
                                            type="email"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            placeholder="john@example.com"
                                            className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border border-gray-300 rounded-xl text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#92BCEA] focus:border-transparent transition-all"
                                            required
                                        />
                                    </div>
                                </div>

                                {error && (
                                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                                        {error}
                                    </div>
                                )}

                                <button
                                    type="submit"
                                    disabled={loading || !email}
                                    className="w-full py-3.5 bg-gradient-to-r from-[#92BCEA] to-[#AFB3F7] text-white font-semibold rounded-xl flex items-center justify-center gap-2 hover:shadow-lg hover:scale-[1.02] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {loading ? (
                                        <>
                                            <Loader2 className="animate-spin" size={20} />
                                            Sending...
                                        </>
                                    ) : (
                                        <>
                                            Send Reset Link
                                            <ArrowRight size={20} />
                                        </>
                                    )}
                                </button>
                            </form>

                            {/* Footer */}
                            <div className="mt-6 text-center">
                                <Link
                                    href="/login"
                                    className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
                                >
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
