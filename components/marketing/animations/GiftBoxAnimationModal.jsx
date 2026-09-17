'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { CheckCircle2, X, Gift, Sparkles, ArrowRight } from 'lucide-react';
import Confetti from 'react-confetti';
import Link from 'next/link';

export default function GiftBoxAnimationModal({ 
    isOpen, 
    onClose, 
    rewardTitle = '₹500 Gift Card', 
    rewardDesc = "Congrats! You've unlocked a special milestone mystery reward.",
    rewardValue = 500,
    onContinue
}) {
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

        // Automatic progression through unboxing sequence
        const t1 = setTimeout(() => setStep(2), 1500); // unwrapping
        const t2 = setTimeout(() => setStep(3), 3200); // it's yours (open box)
        const t3 = setTimeout(() => setStep(4), 5000); // revealed reward card

        return () => {
            clearTimeout(t1);
            clearTimeout(t2);
            clearTimeout(t3);
        };
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-md">
            {step >= 3 && (
                <Confetti
                    width={windowDimension.width}
                    height={windowDimension.height}
                    recycle={false}
                    numberOfPieces={250}
                    gravity={0.25}
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
                    {/* Step 1: Closed Gift Box */}
                    {step === 1 && (
                        <motion.div
                            key="step1"
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0 }}
                            className="py-6 flex flex-col items-center"
                        >
                            <div className="relative w-44 h-44 mb-4 rounded-3xl overflow-hidden shadow-inner">
                                <Image 
                                    src="/marketing/giftbox_closed.jpg" 
                                    alt="Mystery Gift" 
                                    fill 
                                    className="object-contain"
                                    priority
                                />
                            </div>
                            <h3 className="text-xl font-black text-slate-900 dark:text-white mb-1">
                                You've Earned a Gift!
                            </h3>
                            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                                Opening your milestone reward...
                            </p>
                        </motion.div>
                    )}

                    {/* Step 2: Unwrapping */}
                    {step === 2 && (
                        <motion.div
                            key="step2"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="py-6 flex flex-col items-center"
                        >
                            <motion.div 
                                animate={{ rotate: [-3, 3, -3], scale: [1, 1.05, 1] }}
                                transition={{ repeat: Infinity, duration: 0.8 }}
                                className="relative w-44 h-44 mb-4 rounded-3xl overflow-hidden shadow-inner"
                            >
                                <Image 
                                    src="/marketing/giftbox_closed.jpg" 
                                    alt="Unwrapping Gift" 
                                    fill 
                                    className="object-contain"
                                />
                            </motion.div>
                            <h3 className="text-xl font-black text-slate-900 dark:text-white mb-1">
                                Almost there...
                            </h3>
                            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                                Unwrapping your reward...
                            </p>
                        </motion.div>
                    )}

                    {/* Step 3: Open Gift Box with Golden Burst */}
                    {step === 3 && (
                        <motion.div
                            key="step3"
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 1.05 }}
                            className="py-6 flex flex-col items-center"
                        >
                            <motion.div 
                                initial={{ scale: 0.8 }}
                                animate={{ scale: 1.05 }}
                                transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                                className="relative w-48 h-48 mb-4 rounded-3xl overflow-hidden"
                            >
                                <Image 
                                    src="/marketing/giftbox_open.jpg" 
                                    alt="Reward Burst" 
                                    fill 
                                    className="object-contain"
                                />
                            </motion.div>
                            <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-1">
                                It's Yours!
                            </h3>
                            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                                Your mystery reward has unlocked!
                            </p>
                        </motion.div>
                    )}

                    {/* Step 4: Revealed Reward Card */}
                    {step >= 4 && (
                        <motion.div
                            key="step4"
                            initial={{ opacity: 0, y: 15 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="py-4 flex flex-col items-center"
                        >
                            {/* Reward Card Graphic */}
                            <div className="w-full bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950 text-white rounded-2xl p-5 border border-blue-500/30 shadow-xl mb-5 text-left relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-3 opacity-20">
                                    <Sparkles size={60} />
                                </div>
                                <div className="flex items-center justify-between mb-4">
                                    <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-blue-500/30 text-blue-300 border border-blue-400/30">
                                        Mystery Reward
                                    </span>
                                    <Gift size={20} className="text-amber-400" />
                                </div>
                                <h4 className="text-xl font-black tracking-tight mb-1">
                                    {rewardTitle}
                                </h4>
                                <p className="text-xs text-blue-200/80 mb-3">
                                    {rewardDesc}
                                </p>
                                <div className="text-2xl font-black text-amber-400">
                                    ₹{rewardValue}
                                </div>
                            </div>

                            <div className="flex items-center gap-2 mb-6">
                                <CheckCircle2 size={18} className="text-emerald-500" />
                                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                    Reward Added! Added to your account records.
                                </span>
                            </div>

                            <div className="w-full flex flex-col gap-2.5">
                                <Link
                                    href="/marketing/targets"
                                    onClick={onClose}
                                    className="w-full py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs shadow-md shadow-blue-500/20 transition-all text-center"
                                >
                                    View My Rewards & Fulfillment
                                </Link>
                                <button
                                    onClick={() => {
                                        onClose();
                                        if (onContinue) onContinue();
                                    }}
                                    className="w-full py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs transition-all"
                                >
                                    Continue
                                </button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>
        </div>
    );
}
