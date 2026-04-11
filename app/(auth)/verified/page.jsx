'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle, ArrowRight, Loader2 } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

export default function VerifiedPage() {
    const router = useRouter();
    const [seconds, setSeconds] = useState(3);

    useEffect(() => {
        const timer = setInterval(() => {
            setSeconds((prev) => {
                if (prev <= 1) {
                    clearInterval(timer);
                    router.push('/dashboard');
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [router]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-[var(--bg-secondary)] p-4">
            <div className="w-full max-w-md bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-[var(--border-color)] p-8 text-center animate-fadeIn relative overflow-hidden">
                {/* Background decorative blob */}
                <div className="absolute -top-16 -right-16 w-32 h-32 bg-green-400/10 rounded-full blur-3xl pointer-events-none"></div>
                <div className="absolute -bottom-16 -left-16 w-32 h-32 bg-green-400/10 rounded-full blur-3xl pointer-events-none"></div>
                
                <div className="relative z-10">
                    <div className="w-20 h-20 mx-auto bg-green-50 dark:bg-green-900/20 text-green-500 rounded-full flex items-center justify-center mb-6 shadow-sm border border-green-100 dark:border-green-900/30">
                        <CheckCircle size={40} className="animate-pulse" />
                    </div>

                    <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-2">
                        Email Verified!
                    </h1>
                    <p className="text-[var(--text-secondary)] mb-8 leading-relaxed">
                        Your email address has been successfully verified. Your account is now fully active and ready to use.
                    </p>

                    <div className="space-y-4">
                        <Link
                            href="/dashboard"
                            className="w-full py-3.5 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-xl flex items-center justify-center gap-2 transition-all group shadow-md hover:shadow-lg"
                        >
                            Continue to Dashboard
                            <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                        </Link>
                        
                        <p className="text-sm text-[var(--text-secondary)] animate-pulse">
                            Redirecting automatically in {seconds}s...
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
