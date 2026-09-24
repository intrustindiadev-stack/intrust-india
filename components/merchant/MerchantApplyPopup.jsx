'use client';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Store, TrendingUp, ShieldCheck, ArrowRight, Sparkles, CheckCircle2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

const SESSION_KEY = 'merchant_apply_popup_dismissed';

export default function MerchantApplyPopup({ isOpen, onClose }) {
    const router = useRouter();
    const sheetRef = useRef(null);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

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

    if (!isOpen || !mounted || typeof document === 'undefined') return null;

    const popupContent = (
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
                        className="fixed inset-0 z-[9998] bg-black/65 backdrop-blur-sm"
                    />

                    {/* Full-Screen on Mobile, Sleek Centered Modal on Desktop */}
                    <motion.div
                        key="merchant-sheet"
                        ref={sheetRef}
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        transition={{ type: 'spring', stiffness: 320, damping: 28 }}
                        className="fixed inset-0 z-[9999] h-[100dvh] w-full bg-white dark:bg-[#0c101c] flex flex-col justify-between overflow-hidden
                                   md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 
                                   md:h-auto md:max-h-[90vh] md:max-w-[460px] md:rounded-3xl md:shadow-2xl md:border md:border-slate-200/90 dark:md:border-white/10"
                    >
                        {/* Top Bar */}
                        <div className="px-5 pt-4 pb-3 flex items-center justify-between shrink-0 border-b border-slate-100 dark:border-white/5 md:border-none">
                            <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-[#0052FF] dark:text-sky-400">
                                    <Store size={18} />
                                </div>
                                <div className="text-left">
                                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white leading-tight">
                                        Merchant Partner
                                    </h3>
                                    <p className="text-[10px] text-slate-400 leading-none mt-0.5">
                                        InTrust Dukaan Network • 0% Commission
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
                            {/* InTrust Merchant Partner Vector Graphic */}
                            <div className="relative my-1 flex items-center justify-center">
                                {/* Ambient Glow */}
                                <div className="absolute w-24 h-24 bg-blue-500/15 dark:bg-blue-500/25 rounded-full blur-2xl pointer-events-none" />
                                
                                <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-sky-500 p-0.5 shadow-xl shadow-blue-600/25 flex items-center justify-center">
                                    <div className="w-full h-full rounded-[14px] bg-slate-900/40 backdrop-blur-xs flex items-center justify-center text-white">
                                        <Store size={30} className="text-white drop-shadow-sm" />
                                    </div>
                                    {/* Upward Growth Sparkle Badge */}
                                    <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-emerald-500 border-2 border-white dark:border-[#0c101c] flex items-center justify-center shadow-sm">
                                        <TrendingUp size={11} className="text-white stroke-[3]" />
                                    </div>
                                </div>
                            </div>

                            {/* Badge */}
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-700 dark:text-sky-400 text-[10px] font-black uppercase tracking-wider border border-blue-500/20">
                                <Sparkles size={11} className="text-[#0052FF]" />
                                <span>Merchant Partner Network</span>
                            </span>

                            {/* Title & Subtitle */}
                            <div>
                                <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">
                                    Grow Your Business with InTrust
                                </h2>
                                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed max-w-sm mx-auto mt-1">
                                    Connect with local shoppers in your city, receive direct store pickup orders, and keep 100% of your earnings with zero commissions.
                                </p>
                            </div>

                            {/* 3 Inline Benefit Pills */}
                            <div className="w-full grid grid-cols-3 gap-2">
                                <div className="p-2.5 rounded-2xl bg-slate-50 dark:bg-white/[0.04] border border-slate-100 dark:border-white/5 flex flex-col items-center text-center">
                                    <TrendingUp size={18} className="text-[#0052FF] dark:text-sky-400 mb-1" />
                                    <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200 leading-tight">0% Fees</span>
                                    <span className="text-[9px] text-slate-400 mt-0.5">Keep 100% Sales</span>
                                </div>
                                <div className="p-2.5 rounded-2xl bg-slate-50 dark:bg-white/[0.04] border border-slate-100 dark:border-white/5 flex flex-col items-center text-center">
                                    <ShieldCheck size={18} className="text-emerald-600 dark:text-emerald-400 mb-1" />
                                    <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200 leading-tight">Daily UPI</span>
                                    <span className="text-[9px] text-slate-400 mt-0.5">Direct Payouts</span>
                                </div>
                                <div className="p-2.5 rounded-2xl bg-slate-50 dark:bg-white/[0.04] border border-slate-100 dark:border-white/5 flex flex-col items-center text-center">
                                    <Store size={18} className="text-indigo-600 dark:text-indigo-400 mb-1" />
                                    <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200 leading-tight">Same Day</span>
                                    <span className="text-[9px] text-slate-400 mt-0.5">Live In 24 Hrs</span>
                                </div>
                            </div>

                            {/* 3 Step Quick Blueprint */}
                            <div className="w-full p-3 rounded-2xl bg-blue-50/60 dark:bg-blue-950/20 border border-blue-100/80 dark:border-blue-900/30 text-left space-y-1.5">
                                <div className="flex items-center gap-2 text-[11px] text-slate-700 dark:text-slate-300 font-semibold">
                                    <span className="w-4 h-4 rounded-full bg-[#0052FF] text-white text-[9px] font-black flex items-center justify-center shrink-0">1</span>
                                    <span>Submit your business & store details online</span>
                                </div>
                                <div className="flex items-center gap-2 text-[11px] text-slate-700 dark:text-slate-300 font-semibold">
                                    <span className="w-4 h-4 rounded-full bg-[#0052FF] text-white text-[9px] font-black flex items-center justify-center shrink-0">2</span>
                                    <span>List products or accept direct walk-in UPI payments</span>
                                </div>
                                <div className="flex items-center gap-2 text-[11px] text-slate-700 dark:text-slate-300 font-semibold">
                                    <span className="w-4 h-4 rounded-full bg-emerald-600 text-white text-[9px] font-black flex items-center justify-center shrink-0">3</span>
                                    <span>Grow revenue with InTrust loyalty & daily challenge sponsors</span>
                                </div>
                            </div>
                        </div>

                        {/* Sticky Bottom Action Bar */}
                        <div className="p-5 pt-3 shrink-0 border-t border-slate-100 dark:border-white/5 bg-white/95 dark:bg-[#0c101c]/95 backdrop-blur-md">
                            {/* Primary Action Button */}
                            <button
                                type="button"
                                onClick={handleApply}
                                className="w-full py-3.5 px-4 rounded-2xl bg-[#0052FF] hover:bg-blue-700 active:bg-blue-800 text-white font-black text-sm tracking-wide shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2 transition-all active:scale-[0.98] cursor-pointer"
                            >
                                <span>Apply as Merchant</span>
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
                                <CheckCircle2 size={11} className="text-emerald-500" />
                                <span>Fast 24-hr verification • 100% paperless registration</span>
                            </p>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );

    return createPortal(popupContent, document.body);
}
