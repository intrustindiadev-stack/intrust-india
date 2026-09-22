'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, CheckCircle2, TrendingUp, X, Sparkles, MousePointerClick, Users, ShoppingBag, Copy, Check, ExternalLink } from 'lucide-react';
import Confetti from 'react-confetti';
import Link from 'next/link';

export default function SuccessAnimationModal({ 
    isOpen, 
    onClose, 
    productName, 
    shortCode,
    shareUrl,
    metrics = { shares: 1, clicks: 0, registrations: 0, orders: 0 }, 
    onViewProgress 
}) {
    const [step, setStep] = useState(1);
    const [copied, setCopied] = useState(false);
    const [wasOpen, setWasOpen] = useState(isOpen);
    const [windowDimension, setWindowDimension] = useState({ width: 0, height: 0 });

    // Adjust state during render on open transitions (React-recommended pattern, no effect setState)
    if (wasOpen !== isOpen) {
        setWasOpen(isOpen);
        setStep(1);
        setCopied(false);
    }

    useEffect(() => {
        if (typeof window === 'undefined') return;
        const raf = requestAnimationFrame(() => {
            setWindowDimension({ width: window.innerWidth, height: window.innerHeight });
        });
        return () => cancelAnimationFrame(raf);
    }, []);

    useEffect(() => {
        if (!isOpen) return;

        // Automatic progression from step 1 to step 2 after 1.1s
        const timer1 = setTimeout(() => {
            setStep(2);
        }, 1100);

        // Progression from step 2 to step 3 after another 1.2s
        const timer2 = setTimeout(() => {
            setStep(3);
        }, 2300);

        return () => {
            clearTimeout(timer1);
            clearTimeout(timer2);
        };
    }, [isOpen]);

    // Close on Escape key
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') onClose();
        };
        if (isOpen) {
            window.addEventListener('keydown', handleKeyDown);
            return () => window.removeEventListener('keydown', handleKeyDown);
        }
    }, [isOpen, onClose]);

    const handleCopy = () => {
        if (!shareUrl || typeof navigator === 'undefined') return;
        navigator.clipboard.writeText(shareUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    if (!isOpen) return null;

    return (
        <div 
            onClick={onClose}
            className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm cursor-pointer"
        >
            {step >= 2 && (
                <Confetti
                    width={windowDimension.width}
                    height={windowDimension.height}
                    recycle={false}
                    numberOfPieces={120}
                    gravity={0.3}
                />
            )}

            <motion.div
                onClick={(e) => e.stopPropagation()}
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl p-4 sm:p-6 lg:p-7 shadow-2xl border border-slate-200/80 dark:border-slate-800 text-center max-h-[92vh] overflow-y-auto cursor-default"
            >
                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-3 right-3 sm:top-4 sm:right-4 p-1.5 sm:p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                >
                    <X size={18} />
                </button>

                <AnimatePresence mode="wait">
                    {/* Step 1: Dispatching & Attributing */}
                    {step === 1 && (
                        <motion.div
                            key="step1"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="py-6 flex flex-col items-center"
                        >
                            <div className="relative w-20 h-20 rounded-full bg-blue-500/10 flex items-center justify-center mb-5">
                                <motion.div
                                    animate={{ scale: [1, 1.15, 1], rotate: [0, 8, 0] }}
                                    transition={{ repeat: Infinity, duration: 1.3, ease: 'easeInOut' }}
                                    className="w-14 h-14 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-500/30"
                                >
                                    <Send size={24} className="translate-x-0.5 -translate-y-0.5" />
                                </motion.div>
                            </div>
                            <h3 className="text-xl font-black text-slate-900 dark:text-white mb-1.5">
                                Dispatching Tracking Link
                            </h3>
                            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                                Connecting live telemetry to code {shortCode ? `"${shortCode}"` : '...'}
                            </p>
                        </motion.div>
                    )}

                    {/* Step 2: Link Live Confirmation */}
                    {step === 2 && (
                        <motion.div
                            key="step2"
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 1.1 }}
                            className="py-6 flex flex-col items-center"
                        >
                            <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                                className="w-18 h-18 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-xl shadow-emerald-500/30 mb-5"
                            >
                                <CheckCircle2 size={40} strokeWidth={2.5} />
                            </motion.div>
                            <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-1.5">
                                Link is Live!
                            </h3>
                            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 max-w-xs">
                                {productName ? `"${productName}" is ready.` : 'Your deal link is fully active.'}
                            </p>
                        </motion.div>
                    )}

                    {/* Step 3: Real Telemetry & Next Steps */}
                    {step === 3 && (
                        <motion.div
                            key="step3"
                            initial={{ opacity: 0, y: 15 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="py-3 flex flex-col items-center"
                        >
                            <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-3 border border-emerald-500/20">
                                <TrendingUp size={28} />
                            </div>
                            <h3 className="text-xl font-black text-slate-900 dark:text-white mb-1">
                                Tracking Active
                            </h3>
                            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-4 max-w-xs">
                                When friends visit or buy via your link, rewards & milestone progress update in real time.
                            </p>

                            {/* Live Link Stats Grid */}
                            <div className="w-full grid grid-cols-3 gap-2 bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-3 border border-slate-200/80 dark:border-slate-700/80 mb-4">
                                <div className="text-center">
                                    <div className="flex items-center justify-center gap-1 text-[10px] font-extrabold uppercase text-slate-400 mb-0.5">
                                        <MousePointerClick size={11} className="text-amber-500" />
                                        <span>Visits</span>
                                    </div>
                                    <div className="text-base font-black text-slate-900 dark:text-white">
                                        {metrics.clicks ?? 0}
                                    </div>
                                </div>
                                <div className="text-center border-x border-slate-200 dark:border-slate-700">
                                    <div className="flex items-center justify-center gap-1 text-[10px] font-extrabold uppercase text-slate-400 mb-0.5">
                                        <Users size={11} className="text-blue-500" />
                                        <span>Joined</span>
                                    </div>
                                    <div className="text-base font-black text-blue-600 dark:text-blue-400">
                                        {metrics.registrations ?? 0}
                                    </div>
                                </div>
                                <div className="text-center">
                                    <div className="flex items-center justify-center gap-1 text-[10px] font-extrabold uppercase text-slate-400 mb-0.5">
                                        <ShoppingBag size={11} className="text-emerald-500" />
                                        <span>Orders</span>
                                    </div>
                                    <div className="text-base font-black text-emerald-600 dark:text-emerald-400">
                                        {metrics.orders ?? 0}
                                    </div>
                                </div>
                            </div>

                            {/* Quick Link Copy Pill */}
                            {shareUrl && (
                                <div className="w-full flex items-center gap-2 mb-4 p-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-left">
                                    <span className="flex-1 text-[11px] font-mono text-slate-600 dark:text-slate-300 truncate pl-1">
                                        {shareUrl}
                                    </span>
                                    <button
                                        onClick={handleCopy}
                                        className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold flex items-center gap-1 shrink-0 transition-colors"
                                    >
                                        {copied ? <Check size={12} strokeWidth={3} /> : <Copy size={12} />}
                                        <span>{copied ? 'Copied' : 'Copy'}</span>
                                    </button>
                                </div>
                            )}

                            <div className="w-full flex flex-col gap-2">
                                <Link
                                    href="/marketing/targets"
                                    onClick={onClose}
                                    className="w-full py-2.5 rounded-xl sm:rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs shadow-md shadow-blue-500/20 transition-all text-center"
                                >
                                    View Target Milestones →
                                </Link>
                                <button
                                    onClick={onClose}
                                    className="w-full py-2.5 rounded-xl sm:rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs transition-all"
                                >
                                    Done
                                </button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>
        </div>
    );
}
