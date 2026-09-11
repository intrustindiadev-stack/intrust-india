'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { AlertTriangle, RotateCcw, LayoutDashboard, Headphones } from 'lucide-react';

export default function MerchantErrorBoundary({ error, reset }) {
    useEffect(() => {
        // Log client or server error securely
        console.error('[Merchant Panel Error Boundary caught]:', error);
    }, [error]);

    return (
        <div className="min-h-[70vh] flex flex-col items-center justify-center p-4 sm:p-6 text-center animate-in fade-in duration-300">
            <div className="max-w-md w-full bg-white dark:bg-[#11131a] rounded-[2.5rem] border border-slate-100 dark:border-white/10 p-8 sm:p-10 shadow-2xl shadow-slate-200/50 dark:shadow-none relative overflow-hidden">
                {/* Decorative background glow */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 dark:bg-[#D4AF37]/10 rounded-full blur-2xl pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-32 h-32 bg-red-500/10 rounded-full blur-2xl pointer-events-none" />

                {/* Warning Icon Badge */}
                <div className="w-16 h-16 rounded-2xl bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-[#D4AF37] flex items-center justify-center mx-auto mb-6 border border-amber-500/20 shadow-inner">
                    <AlertTriangle size={32} />
                </div>

                <span className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400 dark:text-slate-500 mb-2 block">
                    InTrust Merchant Pro
                </span>

                <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight mb-3">
                    Something went wrong
                </h2>

                <p className="text-sm text-slate-500 dark:text-slate-400 font-medium leading-relaxed mb-8">
                    We encountered an unexpected issue while loading this page. Your store data, wallet balance, and orders remain completely safe.
                </p>

                <div className="flex flex-col sm:flex-row gap-3">
                    <button
                        onClick={() => reset()}
                        className="flex-1 py-3.5 px-5 rounded-2xl bg-gradient-to-r from-amber-500 via-[#D4AF37] to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-black text-xs uppercase tracking-wider transition-all shadow-lg shadow-amber-500/20 active:scale-[0.98] flex items-center justify-center gap-2"
                    >
                        <RotateCcw size={15} />
                        Try Again
                    </button>

                    <Link
                        href="/merchant/dashboard"
                        className="flex-1 py-3.5 px-5 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-700 dark:text-slate-200 font-black text-xs uppercase tracking-wider transition-all border border-slate-200 dark:border-white/10 flex items-center justify-center gap-2"
                    >
                        <LayoutDashboard size={15} />
                        Dashboard
                    </Link>
                </div>

                <div className="mt-8 pt-6 border-t border-slate-100 dark:border-white/5">
                    <Link
                        href="/contact"
                        className="inline-flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                    >
                        <Headphones size={14} />
                        Need assistance? Contact Support
                    </Link>
                </div>
            </div>
        </div>
    );
}
