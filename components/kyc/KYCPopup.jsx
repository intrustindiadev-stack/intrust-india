'use client';

import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ShieldCheck, Zap, Gift, Store, ChevronRight, CheckCircle2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

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

    // Close on outside tap
    const handleBackdropClick = (e) => {
        if (e.target === e.currentTarget) handleDismiss();
    };

    // Prevent body scroll when open
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

    const features = [
        { icon: ShieldCheck, title: "Verified Member Badge", desc: "Gold verification shield on your InTrust profile." },
        { icon: Zap, title: "Higher Wallet Limits", desc: "Unlock unlimited transactions and monthly spend caps." },
        { icon: Gift, title: "Exclusive Cashbacks & Drops", desc: "Access member-only deals, coins, and reward multipliers." },
        { icon: Store, title: "Merchant Enablement", desc: "Eligible to apply as an official InTrust local seller." }
    ];

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
                        transition={{ duration: 0.25 }}
                        onClick={handleBackdropClick}
                        className="fixed inset-0 z-[900] bg-black/60 backdrop-blur-sm"
                    />

                    {/* Centered modal on desktop, bottom sheet on mobile */}
                    <motion.div
                        key="kyc-sheet"
                        ref={sheetRef}
                        initial={{ y: '100%', opacity: 0, scale: 0.95 }}
                        animate={{ y: 0, opacity: 1, scale: 1 }}
                        exit={{ y: '100%', opacity: 0, scale: 0.95 }}
                        transition={{ type: 'spring', stiffness: 320, damping: 32 }}
                        className="fixed bottom-0 left-0 right-0 z-[910] md:bottom-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:max-w-[460px] md:w-full
                                   bg-white dark:bg-[#0c101c] rounded-t-[2.5rem] md:rounded-3xl shadow-2xl overflow-hidden border border-slate-200/80 dark:border-white/10"
                        style={{ maxHeight: '92vh' }}
                    >
                        {/* Drag handle (mobile) */}
                        <div className="flex justify-center pt-3 pb-1 md:hidden">
                            <div className="w-10 h-1 rounded-full bg-gray-200 dark:bg-white/10" />
                        </div>

                        {/* 3D KYC Illustration Area */}
                        <div className="relative w-full h-48 bg-slate-50 dark:bg-slate-900 overflow-hidden flex items-center justify-center">
                            <Image
                                src="/images/kyc_verified_hero.jpg"
                                alt="Digital KYC Verification"
                                fill
                                priority
                                className="object-cover object-center"
                                sizes="(max-width: 640px) 100vw, 460px"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent" />

                            {/* Verification Chip */}
                            <div className="absolute top-4 left-4 z-10 flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/90 dark:bg-black/70 backdrop-blur-md text-amber-600 dark:text-amber-400 border border-amber-500/20 shadow-sm text-[11px] font-black uppercase tracking-wider">
                                <ShieldCheck size={14} className="text-amber-500" />
                                <span>Verified Member</span>
                            </div>

                            {/* Close Button */}
                            <button
                                type="button"
                                onClick={handleDismiss}
                                className="absolute top-4 right-4 z-20 w-8 h-8 rounded-full bg-black/40 hover:bg-black/60 backdrop-blur-md flex items-center justify-center text-white transition-all active:scale-90"
                                aria-label="Close modal"
                            >
                                <X size={17} strokeWidth={2.5} />
                            </button>

                            {/* Title overlay */}
                            <div className="absolute bottom-3 left-5 right-5 z-10 text-white">
                                <h2 className="text-xl font-black tracking-tight leading-tight">
                                    Complete Your KYC Verification
                                </h2>
                                <p className="text-[11px] text-sky-200 font-medium">Instant paperless verification via Aadhaar / PAN</p>
                            </div>
                        </div>

                        {/* Features List */}
                        <div className="px-6 py-4 space-y-3">
                            {features.map((feat, idx) => (
                                <motion.div 
                                    key={idx}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.12 + (idx * 0.07) }}
                                    className="flex items-start gap-3.5 p-2.5 rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-slate-100 dark:border-white/5"
                                >
                                    <div className="shrink-0 w-9 h-9 rounded-xl bg-blue-600/10 dark:bg-blue-500/20 text-blue-600 dark:text-sky-400 flex items-center justify-center shadow-xs">
                                        <feat.icon size={18} />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <h3 className="text-xs font-bold text-slate-900 dark:text-white leading-tight">{feat.title}</h3>
                                        <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">{feat.desc}</p>
                                    </div>
                                </motion.div>
                            ))}
                        </div>

                        {/* Footer Action */}
                        <div className="px-6 pt-2 pb-6 space-y-2.5">
                            <button
                                type="button"
                                onClick={handleRedirect}
                                className="w-full relative group overflow-hidden bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-black text-sm py-3.5 rounded-2xl transition-all shadow-lg shadow-blue-600/25 flex items-center justify-center gap-2 active:scale-[0.98]"
                            >
                                <span>Verify Identity in 2 Minutes</span>
                                <ChevronRight size={18} className="translate-y-[0.5px] group-hover:translate-x-1 transition-transform" />
                            </button>

                            <button
                                type="button"
                                onClick={handleDismiss}
                                className="w-full py-2 rounded-xl text-xs font-bold text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors text-center"
                            >
                                Remind Me Later
                            </button>

                            <p className="text-center text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center justify-center gap-1">
                                <CheckCircle2 size={12} className="text-emerald-500" />
                                <span>100% Secure • SprintVerify Fast-Track</span>
                            </p>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
