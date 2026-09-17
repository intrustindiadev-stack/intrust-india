'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { CheckCircle2, X, Wallet, Sparkles, ArrowRight } from 'lucide-react';
import Confetti from 'react-confetti';
import Link from 'next/link';

export default function CashbackAnimationModal({ 
    isOpen, 
    onClose, 
    cashbackAmount = 25, 
    newBalance = 525,
    source = 'Daily Challenge',
    onExplore
}) {
    const [step, setStep] = useState(1);
    const [animatedBalance, setAnimatedBalance] = useState(0);
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

        const t1 = setTimeout(() => setStep(2), 1200); // calculating
        const t2 = setTimeout(() => setStep(3), 2800); // cashback earned
        const t3 = setTimeout(() => setStep(4), 4500); // wallet update view

        return () => {
            clearTimeout(t1);
            clearTimeout(t2);
            clearTimeout(t3);
        };
    }, [isOpen]);

    // Rolling number counter for wallet balance
    useEffect(() => {
        if (step >= 4) {
            const startVal = Math.max(0, newBalance - cashbackAmount);
            const duration = 1000;
            const startTime = performance.now();

            const tick = (now) => {
                const elapsed = now - startTime;
                const progress = Math.min(elapsed / duration, 1);
                setAnimatedBalance(Math.floor(startVal + progress * cashbackAmount));
                if (progress < 1) {
                    requestAnimationFrame(tick);
                } else {
                    setAnimatedBalance(newBalance);
                }
            };
            requestAnimationFrame(tick);
        }
    }, [step, newBalance, cashbackAmount]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-md">
            {step >= 3 && (
                <Confetti
                    width={windowDimension.width}
                    height={windowDimension.height}
                    recycle={false}
                    numberOfPieces={200}
                    gravity={0.3}
                />
            )}

            <motion.div
                initial={{ opacity: 0, scale: 0.85, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.85 }}
                className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-200/80 dark:border-slate-800 text-center overflow-hidden"
            >
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 transition-colors"
                >
                    <X size={18} />
                </button>

                <AnimatePresence mode="wait">
                    {/* Step 1: Processing Cashback... */}
                    {step === 1 && (
                        <motion.div
                            key="step1"
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0 }}
                            className="py-6 flex flex-col items-center"
                        >
                            <div className="relative w-40 h-40 mb-4 rounded-3xl overflow-hidden">
                                <Image 
                                    src="/marketing/cashback_coins_stack.jpg" 
                                    alt="Cashback Coins" 
                                    fill 
                                    className="object-contain"
                                    priority
                                />
                            </div>
                            <h3 className="text-xl font-black text-slate-900 dark:text-white mb-1">
                                Processing Cashback...
                            </h3>
                            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                                Please wait a moment
                            </p>
                        </motion.div>
                    )}

                    {/* Step 2: Calculating reward... */}
                    {step === 2 && (
                        <motion.div
                            key="step2"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="py-6 flex flex-col items-center"
                        >
                            <motion.div
                                animate={{ y: [-5, 5, -5], scale: [1, 1.04, 1] }}
                                transition={{ repeat: Infinity, duration: 1, ease: 'easeInOut' }}
                                className="relative w-44 h-44 mb-4 rounded-3xl overflow-hidden"
                            >
                                <Image 
                                    src="/marketing/cashback_coins_stack.jpg" 
                                    alt="Calculating Coins" 
                                    fill 
                                    className="object-contain"
                                />
                            </motion.div>
                            <h3 className="text-xl font-black text-slate-900 dark:text-white mb-1">
                                Calculating your reward...
                            </h3>
                            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                                Almost there!
                            </p>
                        </motion.div>
                    )}

                    {/* Step 3: Cashback Earned! */}
                    {step === 3 && (
                        <motion.div
                            key="step3"
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 1.05 }}
                            className="py-6 flex flex-col items-center"
                        >
                            <div className="relative w-44 h-44 mb-3 rounded-3xl overflow-hidden">
                                <Image 
                                    src="/marketing/cashback_coins_stack.jpg" 
                                    alt="Cashback Earned" 
                                    fill 
                                    className="object-contain"
                                />
                            </div>
                            <h3 className="text-xl font-black text-slate-900 dark:text-white mb-1">
                                Cashback Earned!
                            </h3>
                            <div className="text-4xl font-black text-emerald-600 dark:text-emerald-400 my-1">
                                ₹{cashbackAmount}
                            </div>
                            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                                has been credited to your InTrust wallet.
                            </p>
                        </motion.div>
                    )}

                    {/* Step 4: Wallet Balance Updated */}
                    {step >= 4 && (
                        <motion.div
                            key="step4"
                            initial={{ opacity: 0, y: 15 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="py-4 flex flex-col items-center"
                        >
                            {/* Wallet Display Box */}
                            <div className="w-full bg-slate-50 dark:bg-slate-800/80 rounded-3xl p-5 border border-slate-200/80 dark:border-slate-700/80 mb-5 text-center relative">
                                <div className="flex items-center justify-center gap-2 mb-2">
                                    <div className="w-8 h-8 rounded-xl bg-blue-600/10 text-blue-600 flex items-center justify-center">
                                        <Wallet size={18} />
                                    </div>
                                    <span className="text-xs font-extrabold uppercase text-slate-500 dark:text-slate-400 tracking-wider">
                                        Total Wallet Balance
                                    </span>
                                </div>
                                
                                <div className="flex items-baseline justify-center gap-2">
                                    <span className="text-3xl font-black text-slate-900 dark:text-white">
                                        ₹{animatedBalance}
                                    </span>
                                    <span className="text-xs font-extrabold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                                        + ₹{cashbackAmount}
                                    </span>
                                </div>
                                <p className="text-[11px] font-bold text-slate-400 mt-1">
                                    Source: {source}
                                </p>
                            </div>

                            <div className="flex items-center gap-2 mb-6">
                                <CheckCircle2 size={18} className="text-emerald-500 shrink-0" />
                                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                    Cashback Added! Keep shopping and sharing to earn more.
                                </span>
                            </div>

                            <div className="w-full flex flex-col gap-2.5">
                                <button
                                    onClick={() => {
                                        onClose();
                                        if (onExplore) onExplore();
                                    }}
                                    className="w-full py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs shadow-md shadow-blue-500/20 transition-all"
                                >
                                    Explore Products
                                </button>
                                <button
                                    onClick={onClose}
                                    className="w-full py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs transition-all"
                                >
                                    Got It
                                </button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>
        </div>
    );
}
