'use client';

import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ShieldCheck, Zap, Lock, ArrowRight, CheckCircle2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

const SESSION_KEY = 'kyc_popup_dismissed';

export default function KYCPopup({ isOpen, onClose, onSubmitSuccess }) {
    const router = useRouter();
    const sheetRef = useRef(null);

    const handleDismiss = () => {
        try {
            sessionStorage.setItem(SESSION_KEY, '1');
            localStorage.setItem('intrust_kyc_popup_dismissed', '1');
        } catch (_) {}
        if (onClose) onClose();
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

    const handleRedirect = () => {
        handleDismiss();
        if (onSubmitSuccess) {
            onSubmitSuccess();
        } else {
            router.push('/profile/kyc');
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        key="kyc-backdrop"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        onClick={handleBackdropClick}
                        className="fixed inset-0 z-[900] bg-black/60 backdrop-blur-sm"
                    />

                    {/* Full-Screen on Mobile, Sleek Centered Modal on Desktop */}
                    <motion.div
                        key="kyc-sheet"
                        ref={sheetRef}
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        transition={{ type: 'spring', stiffness: 320, damping: 28 }}
                        className="fixed inset-0 z-[910] h-[100dvh] w-full bg-white dark:bg-[#0c101c] flex flex-col justify-between overflow-hidden
                                   md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 
                                   md:h-auto md:max-h-[90vh] md:max-w-[460px] md:rounded-3xl md:shadow-2xl md:border md:border-slate-200/90 dark:md:border-white/10"
                    >
                        {/* Top Bar */}
                        <div className="px-5 pt-4 pb-3 flex items-center justify-between shrink-0 border-b border-slate-100 dark:border-white/5 md:border-none">
                            <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-[#0052FF] dark:text-sky-400">
                                    <ShieldCheck size={18} />
                                </div>
                                <div className="text-left">
                                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white leading-tight">
                                        KYC Verification
                                    </h3>
                                    <p className="text-[10px] text-slate-400 leading-none mt-0.5">
                                        Instant • 100% Paperless • UIDAI Aadhaar
                                    </p>
                                </div>
                            </div>
                            {/* Close Button */}
                            <button
                                type="button"
                                onClick={handleDismiss}
                                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/20 flex items-center justify-center text-slate-500 dark:text-slate-300 transition-colors"
                                aria-label="Close modal"
                            >
                                <X size={16} strokeWidth={2.5} />
                            </button>
                        </div>

                        {/* Modal Body: Scrollable & Spacious */}
                        <div className="flex-1 px-5 sm:px-7 py-3 overflow-y-auto no-scrollbar flex flex-col items-center text-center justify-center space-y-3">
                            {/* InTrust KYC Vector Illustration */}
                            <div className="relative my-1 flex items-center justify-center">
                                {/* Ambient Glow */}
                                <div className="absolute w-24 h-24 bg-blue-500/15 dark:bg-blue-500/25 rounded-full blur-2xl pointer-events-none" />
                                
                                <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 p-0.5 shadow-xl shadow-blue-600/25 flex items-center justify-center">
                                    <div className="w-full h-full rounded-[14px] bg-slate-900/40 backdrop-blur-xs flex items-center justify-center text-white">
                                        <ShieldCheck size={32} className="text-white drop-shadow-sm" />
                                    </div>
                                    {/* Gold Verification Star Badge */}
                                    <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-[#D4AF37] border-2 border-white dark:border-[#0c101c] flex items-center justify-center shadow-sm">
                                        <Lock size={11} className="text-slate-950 stroke-[3]" />
                                    </div>
                                </div>
                            </div>

                            {/* Badge */}
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400 text-[10px] font-black uppercase tracking-wider border border-amber-500/20">
                                <span>Action Recommended</span>
                            </span>

                            {/* Title & Description */}
                            <div>
                                <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">
                                    Complete Your KYC Verification
                                </h2>
                                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed max-w-sm mx-auto mt-1">
                                    Unlock unlimited wallet transfers, direct bank withdrawals, and the verified InTrust Gold Shield badge in under 60 seconds.
                                </p>
                            </div>

                            {/* 3 Inline Benefits Pills */}
                            <div className="w-full grid grid-cols-3 gap-2">
                                <div className="p-2.5 rounded-2xl bg-slate-50 dark:bg-white/[0.04] border border-slate-100 dark:border-white/5 flex flex-col items-center text-center">
                                    <ShieldCheck size={18} className="text-[#D4AF37] mb-1" />
                                    <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200 leading-tight">Gold Shield</span>
                                    <span className="text-[9px] text-slate-400 mt-0.5">Verified Profile</span>
                                </div>
                                <div className="p-2.5 rounded-2xl bg-slate-50 dark:bg-white/[0.04] border border-slate-100 dark:border-white/5 flex flex-col items-center text-center">
                                    <Zap size={18} className="text-blue-600 dark:text-sky-400 mb-1" />
                                    <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200 leading-tight">Zero Limits</span>
                                    <span className="text-[9px] text-slate-400 mt-0.5">Full Wallet Access</span>
                                </div>
                                <div className="p-2.5 rounded-2xl bg-slate-50 dark:bg-white/[0.04] border border-slate-100 dark:border-white/5 flex flex-col items-center text-center">
                                    <CheckCircle2 size={18} className="text-emerald-600 dark:text-emerald-400 mb-1" />
                                    <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200 leading-tight">Paperless</span>
                                    <span className="text-[9px] text-slate-400 mt-0.5">Instant Aadhaar</span>
                                </div>
                            </div>

                            {/* 3 Step Quick Timeline */}
                            <div className="w-full p-3 rounded-2xl bg-blue-50/60 dark:bg-blue-950/20 border border-blue-100/80 dark:border-blue-900/30 text-left space-y-1.5">
                                <div className="flex items-center gap-2 text-[11px] text-slate-700 dark:text-slate-300 font-semibold">
                                    <span className="w-4 h-4 rounded-full bg-[#0052FF] text-white text-[9px] font-black flex items-center justify-center shrink-0">1</span>
                                    <span>Enter 12-digit Aadhaar number</span>
                                </div>
                                <div className="flex items-center gap-2 text-[11px] text-slate-700 dark:text-slate-300 font-semibold">
                                    <span className="w-4 h-4 rounded-full bg-[#0052FF] text-white text-[9px] font-black flex items-center justify-center shrink-0">2</span>
                                    <span>Verify instant OTP sent to linked mobile</span>
                                </div>
                                <div className="flex items-center gap-2 text-[11px] text-slate-700 dark:text-slate-300 font-semibold">
                                    <span className="w-4 h-4 rounded-full bg-emerald-600 text-white text-[9px] font-black flex items-center justify-center shrink-0">3</span>
                                    <span>Instantly verified with zero physical paperwork</span>
                                </div>
                            </div>
                        </div>

                        {/* Sticky Bottom Action Bar */}
                        <div className="p-5 pt-3 shrink-0 border-t border-slate-100 dark:border-white/5 bg-white/95 dark:bg-[#0c101c]/95 backdrop-blur-md">
                            {/* Primary Action Button */}
                            <button
                                type="button"
                                onClick={handleRedirect}
                                className="w-full py-3.5 px-4 rounded-2xl bg-[#0052FF] hover:bg-blue-700 active:bg-blue-800 text-white font-black text-sm tracking-wide shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2 transition-all active:scale-[0.98] cursor-pointer"
                            >
                                <span>Verify Account Now</span>
                                <ArrowRight size={15} strokeWidth={2.5} />
                            </button>

                            {/* Dismiss button */}
                            <button
                                type="button"
                                onClick={handleDismiss}
                                className="w-full text-xs font-bold text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 py-2 mt-1 transition-colors cursor-pointer"
                            >
                                Maybe Later
                            </button>

                            {/* Trust Footnote */}
                            <p className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 text-center flex items-center justify-center gap-1 mt-0.5">
                                <Lock size={10} />
                                <span>256-bit encrypted • UIDAI Aadhaar compliant</span>
                            </p>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
