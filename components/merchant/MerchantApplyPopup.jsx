'use client';

import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Store, TrendingUp, ShieldCheck, ArrowRight, Sparkles, CheckCircle2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

const SESSION_KEY = 'merchant_apply_popup_dismissed';

export default function MerchantApplyPopup({ isOpen, onClose }) {
    const router = useRouter();
    const sheetRef = useRef(null);

    const handleDismiss = () => {
        try {
            sessionStorage.setItem(SESSION_KEY, '1');
            localStorage.setItem('intrust_merchant_popup_dismissed', '1');
        } catch (_) {}
        if (typeof onClose === 'function') onClose();
    };

    const handleBackdropClick = (e) => {
        if (e.target === e.currentTarget) handleDismiss();
    };

    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => { document.body.style.overflow = ''; };
    }, [isOpen]);

    const handleApply = () => {
        handleDismiss();
        router.push('/merchant-apply');
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        key="merchant-backdrop"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        onClick={handleBackdropClick}
                        className="fixed inset-0 z-[900] bg-black/60 backdrop-blur-sm"
                    />

                    {/* Half-Screen Bottom Sheet on Mobile, Compact Centered Modal on Desktop */}
                    <motion.div
                        key="merchant-sheet"
                        ref={sheetRef}
                        initial={{ y: '100%', opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: '100%', opacity: 0 }}
                        transition={{ type: 'spring', stiffness: 340, damping: 32 }}
                        className="fixed bottom-0 left-0 right-0 z-[910] md:bottom-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 
                                   max-h-[52vh] md:max-h-none md:max-w-[420px] md:w-full
                                   bg-white dark:bg-[#0c101c] rounded-t-[2rem] md:rounded-3xl shadow-2xl overflow-hidden border border-slate-200/90 dark:border-white/10 flex flex-col"
                    >
                        {/* Drag handle (Mobile) */}
                        <div className="flex justify-center pt-2.5 pb-1 md:hidden shrink-0">
                            <div className="w-10 h-1 rounded-full bg-slate-300 dark:bg-white/15" />
                        </div>

                        {/* Close Button */}
                        <button
                            type="button"
                            onClick={handleDismiss}
                            className="absolute top-3.5 right-3.5 z-20 w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/20 flex items-center justify-center text-slate-500 dark:text-slate-300 transition-colors"
                            aria-label="Close modal"
                        >
                            <X size={15} strokeWidth={2.5} />
                        </button>

                        {/* Modal Body: Compact & Minimal */}
                        <div className="p-5 sm:p-6 flex flex-col items-center text-center overflow-y-auto no-scrollbar">
                            
                            {/* InTrust Merchant Partner Vector Graphic */}
                            <div className="relative mb-3 flex items-center justify-center">
                                {/* Ambient Glow */}
                                <div className="absolute w-20 h-20 bg-blue-500/15 dark:bg-blue-500/25 rounded-full blur-xl pointer-events-none" />
                                
                                <div className="relative w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-sky-500 p-0.5 shadow-lg shadow-blue-600/25 flex items-center justify-center">
                                    <div className="w-full h-full rounded-[14px] bg-slate-900/40 backdrop-blur-xs flex items-center justify-center text-white">
                                        <Store size={26} className="text-white drop-shadow-sm" />
                                    </div>
                                    {/* Upward Growth Sparkle Badge */}
                                    <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 border-2 border-white dark:border-[#0c101c] flex items-center justify-center shadow-xs">
                                        <TrendingUp size={10} className="text-white stroke-[3]" />
                                    </div>
                                </div>
                            </div>

                            {/* Badge */}
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-700 dark:text-sky-400 text-[10px] font-black uppercase tracking-wider mb-2 border border-blue-500/20">
                                <Sparkles size={11} className="text-blue-500" />
                                <span>Merchant Partner Network</span>
                            </span>

                            {/* Title */}
                            <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight leading-tight mb-1">
                                Grow Your Business with InTrust
                            </h2>

                            {/* Description */}
                            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed max-w-xs mb-3.5">
                                Connect with local shoppers, receive direct store pickup orders, and pay zero payment gateway commissions.
                            </p>

                            {/* 3 Inline Minimal Benefit Pills */}
                            <div className="w-full grid grid-cols-3 gap-1.5 mb-4">
                                <div className="p-2 rounded-xl bg-slate-50 dark:bg-white/[0.04] border border-slate-100 dark:border-white/5 flex flex-col items-center text-center">
                                    <TrendingUp size={14} className="text-blue-600 dark:text-sky-400 mb-1" />
                                    <span className="text-[10px] font-bold text-slate-800 dark:text-slate-200 leading-tight">0% Fees</span>
                                </div>
                                <div className="p-2 rounded-xl bg-slate-50 dark:bg-white/[0.04] border border-slate-100 dark:border-white/5 flex flex-col items-center text-center">
                                    <ShieldCheck size={14} className="text-emerald-600 dark:text-emerald-400 mb-1" />
                                    <span className="text-[10px] font-bold text-slate-800 dark:text-slate-200 leading-tight">Daily UPI</span>
                                </div>
                                <div className="p-2 rounded-xl bg-slate-50 dark:bg-white/[0.04] border border-slate-100 dark:border-white/5 flex flex-col items-center text-center">
                                    <Store size={14} className="text-indigo-600 dark:text-indigo-400 mb-1" />
                                    <span className="text-[10px] font-bold text-slate-800 dark:text-slate-200 leading-tight">Same Day</span>
                                </div>
                            </div>

                            {/* Primary Action Button */}
                            <button
                                type="button"
                                onClick={handleApply}
                                className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-black text-xs sm:text-sm tracking-wide shadow-md shadow-blue-600/25 flex items-center justify-center gap-1.5 transition-all active:scale-[0.98] mb-2"
                            >
                                <span>Apply as Merchant</span>
                                <ArrowRight size={14} strokeWidth={2.5} />
                            </button>

                            {/* Dismiss button */}
                            <button
                                type="button"
                                onClick={handleDismiss}
                                className="text-xs font-bold text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 py-1 transition-colors"
                            >
                                Maybe Later
                            </button>

                            {/* Trust Footnote */}
                            <p className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 mt-2 flex items-center gap-1">
                                <CheckCircle2 size={10} className="text-emerald-500" />
                                <span>Fast 24-hr verification • 100% paperless registration</span>
                            </p>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
