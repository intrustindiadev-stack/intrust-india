'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, X, Gift, Sparkles, ArrowRight, Award, Trophy } from 'lucide-react';
import Confetti from 'react-confetti';
import Link from 'next/link';

/**
 * Pure Vector 3D Isometric Luxury Gift Box (Duolingo / Arcade Aesthetic)
 */
function VectorGiftBox({ state = 'closed' }) {
    // state: 'closed' | 'wobbling' | 'open'
    const isWobbling = state === 'wobbling';
    const isOpen = state === 'open';

    return (
        <div className="relative flex items-center justify-center w-52 h-52 select-none">
            {/* Ambient Backlight Glow */}
            <motion.div
                animate={{
                    scale: isOpen ? [1.1, 1.35, 1.1] : [1, 1.15, 1],
                    opacity: isOpen ? [0.6, 0.9, 0.6] : [0.35, 0.55, 0.35],
                }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                className={`absolute inset-0 rounded-full blur-2xl pointer-events-none transition-colors duration-700 ${
                    isOpen 
                        ? 'bg-gradient-to-tr from-amber-400/50 via-yellow-300/60 to-violet-500/40' 
                        : 'bg-gradient-to-tr from-violet-600/35 via-indigo-500/35 to-amber-400/25'
                }`}
            />

            {/* Light Rays eruption on Open */}
            {isOpen && (
                <motion.svg
                    initial={{ opacity: 0, scale: 0.5, rotate: 0 }}
                    animate={{ opacity: 1, scale: 1.15, rotate: 180 }}
                    transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
                    viewBox="0 0 200 200"
                    className="absolute w-56 h-56 text-amber-300/40 pointer-events-none"
                >
                    {Array.from({ length: 16 }).map((_, i) => (
                        <polygon
                            key={i}
                            points="100,100 96,10 104,10"
                            fill="currentColor"
                            transform={`rotate(${i * 22.5} 100 100)`}
                        />
                    ))}
                </motion.svg>
            )}

            {/* Sparkle Emitters */}
            {[
                { top: '8%', left: '12%', delay: 0 },
                { top: '15%', right: '10%', delay: 0.3 },
                { bottom: '15%', left: '14%', delay: 0.6 },
                { bottom: '20%', right: '14%', delay: 0.9 },
            ].map((pos, idx) => (
                <motion.div
                    key={idx}
                    animate={{
                        scale: [0, 1.3, 0],
                        rotate: [0, 90, 180],
                        opacity: [0, 1, 0]
                    }}
                    transition={{
                        duration: 1.6,
                        repeat: Infinity,
                        delay: pos.delay,
                        ease: "easeInOut"
                    }}
                    style={{ position: 'absolute', ...pos }}
                    className="text-amber-300 pointer-events-none z-20"
                >
                    <Sparkles size={18} />
                </motion.div>
            ))}

            {/* Isometric Gift Box Container */}
            <motion.div
                animate={
                    isWobbling
                        ? {
                            rotate: [-8, 8, -6, 6, -3, 3, 0],
                            scale: [1, 1.07, 0.98, 1.05, 1],
                        }
                        : !isOpen
                        ? {
                            y: [-5, 5, -5],
                        }
                        : {}
                }
                transition={
                    isWobbling
                        ? { repeat: Infinity, duration: 0.65, ease: "easeInOut" }
                        : { repeat: Infinity, duration: 2.2, ease: "easeInOut" }
                }
                className="relative z-10 w-36 h-36 flex items-center justify-center"
            >
                <svg width="140" height="140" viewBox="0 0 140 140" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                        {/* Box Shading Gradients */}
                        <linearGradient id="boxLeft" x1="0" y1="0" x2="1" y2="1">
                            <stop offset="0%" stopColor="#6366F1" />
                            <stop offset="100%" stopColor="#4338CA" />
                        </linearGradient>
                        <linearGradient id="boxRight" x1="0" y1="0" x2="1" y2="1">
                            <stop offset="0%" stopColor="#4F46E5" />
                            <stop offset="100%" stopColor="#312E81" />
                        </linearGradient>
                        <linearGradient id="boxTopInterior" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#FFE066" />
                            <stop offset="60%" stopColor="#F59E0B" />
                            <stop offset="100%" stopColor="#B45309" />
                        </linearGradient>

                        {/* Gold Ribbon Gradients */}
                        <linearGradient id="ribbonGoldH" x1="0" y1="0" x2="1" y2="0">
                            <stop offset="0%" stopColor="#FDE68A" />
                            <stop offset="50%" stopColor="#F59E0B" />
                            <stop offset="100%" stopColor="#D97706" />
                        </linearGradient>
                        <linearGradient id="ribbonGoldV" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#FEF08A" />
                            <stop offset="60%" stopColor="#F59E0B" />
                            <stop offset="100%" stopColor="#B45309" />
                        </linearGradient>

                        {/* Box Shadow */}
                        <radialGradient id="boxGroundShadow" cx="50%" cy="50%" r="50%">
                            <stop offset="0%" stopColor="#020617" stopOpacity="0.45" />
                            <stop offset="100%" stopColor="#020617" stopOpacity="0" />
                        </radialGradient>
                    </defs>

                    {/* Ground Drop Shadow */}
                    <ellipse cx="70" cy="128" rx="46" ry="9" fill="url(#boxGroundShadow)" />

                    {/* BOX BASE */}
                    <g>
                        {/* Left Side Face */}
                        <polygon points="26,62 70,82 70,120 26,100" fill="url(#boxLeft)" />
                        {/* Left Ribbon Vertical Stripe */}
                        <polygon points="44,70 52,74 52,112 44,108" fill="url(#ribbonGoldV)" />

                        {/* Right Side Face */}
                        <polygon points="70,82 114,62 114,100 70,120" fill="url(#boxRight)" />
                        {/* Right Ribbon Vertical Stripe */}
                        <polygon points="88,74 96,70 96,108 88,112" fill="url(#ribbonGoldV)" />

                        {/* If Open: Golden Glow Cavity inside Box */}
                        {isOpen && (
                            <polygon points="26,62 70,42 114,62 70,82" fill="url(#boxTopInterior)" />
                        )}
                    </g>

                    {/* LID & BOW */}
                    {!isOpen ? (
                        /* CLOSED LID */
                        <g>
                            {/* Lid Top Face */}
                            <polygon points="22,54 70,32 118,54 70,76" fill="#818CF8" />
                            {/* Lid Left Lip */}
                            <polygon points="22,54 70,76 70,84 22,62" fill="#6366F1" />
                            {/* Lid Right Lip */}
                            <polygon points="70,76 118,54 118,62 70,84" fill="#4F46E5" />

                            {/* Ribbon Cross Horizontal */}
                            <polygon points="42,45 50,41 98,63 90,67" fill="url(#ribbonGoldH)" />
                            {/* Ribbon Cross Vertical */}
                            <polygon points="44,64 52,60 96,40 88,44" fill="url(#ribbonGoldH)" />

                            {/* Center Golden Bow */}
                            <circle cx="70" cy="54" r="7" fill="#F59E0B" stroke="#FEF08A" strokeWidth="1.5" />
                            {/* Left Bow Loop */}
                            <ellipse cx="60" cy="50" rx="9" ry="5" transform="rotate(-30 60 50)" fill="#FBBF24" stroke="#F59E0B" strokeWidth="1.2" />
                            <ellipse cx="60" cy="50" rx="4" ry="2" transform="rotate(-30 60 50)" fill="#4338CA" />
                            {/* Right Bow Loop */}
                            <ellipse cx="80" cy="50" rx="9" ry="5" transform="rotate(30 80 50)" fill="#FBBF24" stroke="#F59E0B" strokeWidth="1.2" />
                            <ellipse cx="80" cy="50" rx="4" ry="2" transform="rotate(30 80 50)" fill="#4338CA" />
                        </g>
                    ) : (
                        /* OPEN / POPPED OFF LID FLYING UPWARDS */
                        <motion.g
                            initial={{ y: 0, rotate: 0, opacity: 1 }}
                            animate={{ y: -50, rotate: -22, x: -14 }}
                            transition={{ type: "spring", stiffness: 220, damping: 14 }}
                        >
                            {/* Popped Lid Top Face */}
                            <polygon points="22,46 70,24 118,46 70,68" fill="#A5B4FC" />
                            <polygon points="22,46 70,68 70,74 22,52" fill="#818CF8" />
                            <polygon points="70,68 118,46 118,52 70,74" fill="#6366F1" />

                            {/* Flying Bow */}
                            <circle cx="70" cy="46" r="6" fill="#F59E0B" stroke="#FEF08A" strokeWidth="1.5" />
                            <ellipse cx="61" cy="42" rx="8" ry="4" transform="rotate(-30 61 42)" fill="#FBBF24" />
                            <ellipse cx="79" cy="42" rx="8" ry="4" transform="rotate(30 79 42)" fill="#FBBF24" />
                        </motion.g>
                    )}
                </svg>
            </motion.div>
        </div>
    );
}

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
        const t1 = setTimeout(() => setStep(2), 1200); // unwrapping / wobbling
        const t2 = setTimeout(() => setStep(3), 2800); // lid pop off / light burst
        const t3 = setTimeout(() => setStep(4), 4400); // revealed reward card

        return () => {
            clearTimeout(t1);
            clearTimeout(t2);
            clearTimeout(t3);
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
            className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-md cursor-pointer animate-fadeIn"
        >
            {step >= 3 && (
                <Confetti
                    width={windowDimension.width || 360}
                    height={windowDimension.height || 640}
                    recycle={false}
                    numberOfPieces={200}
                    gravity={0.24}
                    colors={['#8B5CF6', '#F59E0B', '#EC4899', '#3B82F6', '#10B981', '#EAB308']}
                />
            )}

            <motion.div
                onClick={(e) => e.stopPropagation()}
                initial={{ opacity: 0, scale: 0.88, y: 24 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.88 }}
                transition={{ type: "spring", stiffness: 320, damping: 26 }}
                className="relative w-full max-w-sm sm:max-w-md bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-7 shadow-2xl border border-slate-200/80 dark:border-slate-800 text-center max-h-[92vh] overflow-y-auto cursor-default"
            >
                <button
                    onClick={onClose}
                    aria-label="Close modal"
                    className="absolute top-3.5 right-3.5 sm:top-4 sm:right-4 p-1.5 sm:p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
                >
                    <X size={18} />
                </button>

                <AnimatePresence mode="wait">
                    {/* Step 1: Floating Closed Gift Box */}
                    {step === 1 && (
                        <motion.div
                            key="step1"
                            initial={{ opacity: 0, scale: 0.92 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="py-5 flex flex-col items-center"
                        >
                            <VectorGiftBox state="closed" />
                            <h3 className="text-xl font-black text-slate-900 dark:text-white mt-3 mb-1">
                                You've Earned a Mystery Gift!
                            </h3>
                            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                                Unlocking your milestone achievement...
                            </p>
                        </motion.div>
                    )}

                    {/* Step 2: Unwrapping / Excited Shake */}
                    {step === 2 && (
                        <motion.div
                            key="step2"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="py-5 flex flex-col items-center"
                        >
                            <VectorGiftBox state="wobbling" />
                            <h3 className="text-xl font-black text-slate-900 dark:text-white mt-3 mb-1">
                                Almost there...
                            </h3>
                            <div className="flex items-center gap-1.5 text-xs font-bold text-violet-600 dark:text-violet-400">
                                <Sparkles size={14} className="animate-spin" />
                                <span>Unwrapping your mystery prize</span>
                            </div>
                        </motion.div>
                    )}

                    {/* Step 3: Open Gift Box with Light Burst */}
                    {step === 3 && (
                        <motion.div
                            key="step3"
                            initial={{ opacity: 0, scale: 0.82 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 1.05 }}
                            transition={{ type: "spring", stiffness: 350, damping: 20 }}
                            className="py-4 flex flex-col items-center"
                        >
                            <VectorGiftBox state="open" />
                            <motion.div
                                initial={{ scale: 0.7, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                transition={{ delay: 0.1, type: "spring", stiffness: 400 }}
                                className="mt-1"
                            >
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                                    <Trophy size={12} /> Milestone Reward
                                </span>
                            </motion.div>

                            <h3 className="text-2xl font-black text-slate-900 dark:text-white mt-2 mb-1 tracking-tight">
                                It's Yours!
                            </h3>
                            <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                                Your milestone reward is revealed!
                            </p>
                        </motion.div>
                    )}

                    {/* Step 4: Revealed Reward Card (Clean Holographic Arcade Card) */}
                    {step >= 4 && (
                        <motion.div
                            key="step4"
                            initial={{ opacity: 0, y: 15 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.3 }}
                            className="py-2 flex flex-col items-center"
                        >
                            {/* Holographic Reward Voucher Card */}
                            <div className="w-full bg-gradient-to-br from-slate-900 via-indigo-950 to-purple-950 text-white rounded-3xl p-5 border border-indigo-500/30 shadow-xl mb-4 text-left relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-4 opacity-15 pointer-events-none">
                                    <Sparkles size={80} />
                                </div>
                                <div className="flex items-center justify-between mb-3">
                                    <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30">
                                        Milestone Reward
                                    </span>
                                    <div className="w-8 h-8 rounded-xl bg-amber-400/20 flex items-center justify-center text-amber-300">
                                        <Gift size={18} />
                                    </div>
                                </div>
                                <h4 className="text-xl font-black tracking-tight mb-1 text-white">
                                    {rewardTitle}
                                </h4>
                                <p className="text-xs text-indigo-200/80 mb-3 line-clamp-2">
                                    {rewardDesc}
                                </p>
                                <div className="flex items-baseline gap-1.5">
                                    <span className="text-3xl font-black text-amber-400 tracking-tight">
                                        ₹{rewardValue}
                                    </span>
                                    <span className="text-[11px] font-bold text-amber-300/80">
                                        Value Unlocked
                                    </span>
                                </div>
                            </div>

                            <div className="flex items-center gap-2 mb-5 px-2">
                                <CheckCircle2 size={18} className="text-emerald-500 shrink-0" />
                                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 text-left">
                                    Saved to your Rewards. Claim physical gifts via Target fulfillment.
                                </span>
                            </div>

                            <div className="w-full flex flex-col gap-2.5">
                                <Link
                                    href="/marketing/targets"
                                    onClick={onClose}
                                    className="w-full py-3 rounded-2xl bg-violet-600 hover:bg-violet-700 text-white font-extrabold text-xs shadow-md shadow-violet-500/20 transition-all text-center flex items-center justify-center gap-1.5 cursor-pointer"
                                >
                                    <span>View My Rewards & Delivery</span>
                                    <ArrowRight size={14} />
                                </Link>
                                <button
                                    onClick={() => {
                                        onClose();
                                        if (onContinue) onContinue();
                                    }}
                                    className="w-full py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs transition-all cursor-pointer"
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
