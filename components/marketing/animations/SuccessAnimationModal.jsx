'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, CheckCircle2, TrendingUp, X, Sparkles } from 'lucide-react';
import Confetti from 'react-confetti';
import Link from 'next/link';

export default function SuccessAnimationModal({ isOpen, onClose, productName, sharesCount = 10, onViewProgress }) {
    const [step, setStep] = useState(1);
    const [windowDimension, setWindowDimension] = useState({ width: 0, height: 0 });

    useEffect(() => {
        if (typeof window !== 'undefined') {
            setWindowDimension({ width: window.innerWidth, height: window.innerHeight });
        }
    }, []);

    useEffect(() => {
        if (!isOpen) {
            setStep(1);
            return;
        }

        // Automatic progression from step 1 to step 2 after 1.2s
        const timer1 = setTimeout(() => {
            setStep(2);
        }, 1200);

        // Progression from step 2 to step 3 after another 1.4s
        const timer2 = setTimeout(() => {
            setStep(3);
        }, 2600);

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
                    numberOfPieces={150}
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
                    {/* Step 1: Sharing... */}
                    {step === 1 && (
                        <motion.div
                            key="step1"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="py-6 flex flex-col items-center"
                        >
                            <div className="relative w-24 h-24 rounded-full bg-emerald-500/10 flex items-center justify-center mb-6">
                                <motion.div
                                    animate={{ scale: [1, 1.2, 1], rotate: [0, 10, 0] }}
                                    transition={{ repeat: Infinity, duration: 1.5, ease: 'easeInOut' }}
                                    className="w-16 h-16 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/30"
                                >
                                    <Send size={28} className="translate-x-0.5 -translate-y-0.5" />
                                </motion.div>
                            </div>
                            <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2">
                                Sharing Product...
                            </h3>
                            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                                Generating tracking link & preparing channel dispatch
                            </p>
                        </motion.div>
                    )}

                    {/* Step 2: Success Checkmark */}
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
                                className="w-20 h-20 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-xl shadow-emerald-500/30 mb-6"
                            >
                                <CheckCircle2 size={44} strokeWidth={2.5} />
                            </motion.div>
                            <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-2">
                                Success!
                            </h3>
                            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 max-w-xs">
                                {productName ? `"${productName}" has been shared.` : 'Your campaign share link is live and attributed to you.'}
                            </p>
                        </motion.div>
                    )}

                    {/* Step 3: Great Job & Target Milestone Progress */}
                    {step === 3 && (
                        <motion.div
                            key="step3"
                            initial={{ opacity: 0, y: 15 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="py-4 flex flex-col items-center"
                        >
                            <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-4 border border-emerald-500/20">
                                <TrendingUp size={30} />
                            </div>
                            <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-1">
                                Great Job!
                            </h3>
                            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-6">
                                You are one step closer to unlocking your next target reward.
                            </p>

                            {/* Summary Card */}
                            <div className="w-full bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-700/80 mb-6 flex items-center justify-around">
                                <div className="text-left">
                                    <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">
                                        Milestone Progress
                                    </span>
                                    <div className="text-base font-black text-emerald-600 dark:text-emerald-400">
                                        +1 Product Shared
                                    </div>
                                </div>
                                <div className="h-8 w-px bg-slate-200 dark:bg-slate-700" />
                                <div className="text-left">
                                    <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">
                                        Total Shares
                                    </span>
                                    <div className="text-base font-black text-blue-600 dark:text-blue-400">
                                        +{sharesCount} Reach
                                    </div>
                                </div>
                            </div>

                            <div className="w-full flex flex-col gap-2.5">
                                <Link
                                    href="/marketing/targets"
                                    onClick={onClose}
                                    className="w-full py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs shadow-md shadow-blue-500/20 transition-all text-center"
                                >
                                    View Progress
                                </Link>
                                <button
                                    onClick={onClose}
                                    className="w-full py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs transition-all"
                                >
                                    Share Another Product
                                </button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>
        </div>
    );
}
