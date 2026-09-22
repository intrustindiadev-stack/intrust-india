'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, X, Wallet, Sparkles, ArrowRight, Coins } from 'lucide-react';
import Confetti from 'react-confetti';

/**
 * Pure SVG 3D Animated Rupee Coin Stack (Duolingo / Arcade Style)
 */
function VectorCoinStack({ animated = false, scale = 1 }) {
    return (
        <div className="relative flex items-center justify-center w-48 h-48 select-none">
            {/* Ambient Radial Glow */}
            <motion.div
                animate={{
                    scale: [1, 1.25, 1],
                    opacity: [0.35, 0.65, 0.35],
                }}
                transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                className="absolute inset-0 rounded-full bg-gradient-to-tr from-amber-500/30 via-yellow-400/40 to-emerald-400/20 blur-2xl pointer-events-none"
            />

            {/* Rotating Sunburst Rays */}
            <motion.svg
                animate={{ rotate: 360 }}
                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                viewBox="0 0 200 200"
                className="absolute w-44 h-44 text-amber-400/25 pointer-events-none"
            >
                {Array.from({ length: 12 }).map((_, i) => (
                    <line
                        key={i}
                        x1="100"
                        y1="10"
                        x2="100"
                        y2="36"
                        stroke="currentColor"
                        strokeWidth="5"
                        strokeLinecap="round"
                        transform={`rotate(${i * 30} 100 100)`}
                    />
                ))}
            </motion.svg>

            {/* Floating Sparkle Stars */}
            {[
                { top: '10%', left: '15%', delay: 0 },
                { top: '22%', right: '12%', delay: 0.4 },
                { bottom: '18%', left: '18%', delay: 0.8 },
                { bottom: '26%', right: '16%', delay: 1.2 },
            ].map((pos, idx) => (
                <motion.div
                    key={idx}
                    animate={{
                        scale: [0, 1.2, 0],
                        rotate: [0, 90, 180],
                        opacity: [0, 1, 0]
                    }}
                    transition={{
                        duration: 1.8,
                        repeat: Infinity,
                        delay: pos.delay,
                        ease: "easeInOut"
                    }}
                    style={{ position: 'absolute', ...pos }}
                    className="text-amber-400 pointer-events-none"
                >
                    <Sparkles size={18} />
                </motion.div>
            ))}

            {/* Vector Coins Isometric Stack */}
            <motion.div
                animate={animated ? {
                    y: [-6, 6, -6],
                    rotate: [-1.5, 1.5, -1.5],
                } : {}}
                transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
                className="relative z-10 flex flex-col items-center"
            >
                <svg width="130" height="130" viewBox="0 0 130 130" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                        {/* Gold Face Gradient */}
                        <linearGradient id="coinGoldFace" x1="20" y1="15" x2="110" y2="105" gradientUnits="userSpaceOnUse">
                            <stop offset="0%" stopColor="#FFF275" />
                            <stop offset="35%" stopColor="#FFD422" />
                            <stop offset="70%" stopColor="#F59E0B" />
                            <stop offset="100%" stopColor="#D97706" />
                        </linearGradient>

                        {/* Gold Edge Gradient (3D Rim) */}
                        <linearGradient id="coinGoldEdge" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#B45309" />
                            <stop offset="50%" stopColor="#92400E" />
                            <stop offset="100%" stopColor="#78350F" />
                        </linearGradient>

                        {/* Inner Shadow / Specular Glow */}
                        <radialGradient id="coinShine" cx="35%" cy="30%" r="65%">
                            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.8" />
                            <stop offset="40%" stopColor="#FFE066" stopOpacity="0.3" />
                            <stop offset="100%" stopColor="#D97706" stopOpacity="0" />
                        </radialGradient>

                        {/* Drop Shadow Filter */}
                        <filter id="shadow3D" x="-10%" y="-10%" width="125%" height="135%" filterUnits="userSpaceOnUse">
                            <feDropShadow dx="0" dy="6" stdDeviation="4" floodColor="#78350F" floodOpacity="0.45" />
                        </filter>
                    </defs>

                    {/* Bottom Ground Shadow */}
                    <ellipse cx="65" cy="116" rx="46" ry="10" fill="#0F172A" fillOpacity="0.25" />

                    {/* Base Coin (Bottom) */}
                    <g filter="url(#shadow3D)">
                        {/* 3D Edge Cylinder */}
                        <path d="M22 96 C22 103 41 109 65 109 C89 109 108 103 108 96 V103 C108 110 89 116 65 116 C41 116 22 110 22 103 Z" fill="url(#coinGoldEdge)" />
                        {/* Face */}
                        <ellipse cx="65" cy="96" rx="43" ry="13" fill="url(#coinGoldFace)" />
                        <ellipse cx="65" cy="96" rx="39" ry="11" fill="none" stroke="#FDE68A" strokeWidth="1.5" strokeDasharray="3 2" />
                    </g>

                    {/* Middle Coin */}
                    <g filter="url(#shadow3D)">
                        <path d="M22 81 C22 88 41 94 65 94 C89 94 108 88 108 81 V88 C108 95 89 101 65 101 C41 101 22 95 22 88 Z" fill="url(#coinGoldEdge)" />
                        <ellipse cx="65" cy="81" rx="43" ry="13" fill="url(#coinGoldFace)" />
                        <ellipse cx="65" cy="81" rx="39" ry="11" fill="none" stroke="#FDE68A" strokeWidth="1.5" strokeDasharray="3 2" />
                    </g>

                    {/* Top Prominent Coin */}
                    <g filter="url(#shadow3D)">
                        {/* 3D Rim Base */}
                        <path d="M20 54 C20 63 40 71 65 71 C90 71 110 63 110 54 V62 C110 71 90 79 65 79 C40 79 20 71 20 62 Z" fill="url(#coinGoldEdge)" />
                        
                        {/* Top Face */}
                        <ellipse cx="65" cy="54" rx="45" ry="17" fill="url(#coinGoldFace)" />
                        <ellipse cx="65" cy="54" rx="45" ry="17" fill="url(#coinShine)" />

                        {/* Inner Decorative Ridge */}
                        <ellipse cx="65" cy="54" rx="39" ry="14" fill="none" stroke="#FEF08A" strokeWidth="1.8" strokeDasharray="4 2.5" />

                        {/* Rupee Symbol Embossed in Center */}
                        <text
                            x="65"
                            y="60"
                            textAnchor="middle"
                            fill="#78350F"
                            fontSize="23"
                            fontWeight="900"
                            fontFamily="system-ui, -apple-system, sans-serif"
                            opacity="0.9"
                        >
                            ₹
                        </text>
                        {/* Highlight Layer */}
                        <text
                            x="64"
                            y="59"
                            textAnchor="middle"
                            fill="#FFFFFF"
                            fontSize="23"
                            fontWeight="900"
                            fontFamily="system-ui, -apple-system, sans-serif"
                            opacity="0.75"
                        >
                            ₹
                        </text>
                    </g>
                </svg>
            </motion.div>
        </div>
    );
}

function MiniGoldCoin({ size = 26 }) {
    return (
        <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className="drop-shadow-sm">
            <circle cx="16" cy="16" r="14" fill="url(#miniCoinGrad)" />
            <circle cx="16" cy="16" r="11" fill="none" stroke="#FEF08A" strokeWidth="1.2" strokeDasharray="3 1.5" />
            <text x="16" y="21" textAnchor="middle" fill="#78350F" fontSize="14" fontWeight="900" fontFamily="system-ui, sans-serif">₹</text>
            <text x="15.5" y="20.5" textAnchor="middle" fill="#FFF" fontSize="14" fontWeight="900" opacity="0.6" fontFamily="system-ui, sans-serif">₹</text>
            <defs>
                <linearGradient id="miniCoinGrad" x1="4" y1="4" x2="28" y2="28" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor="#FFF275" />
                    <stop offset="45%" stopColor="#F59E0B" />
                    <stop offset="100%" stopColor="#B45309" />
                </linearGradient>
            </defs>
        </svg>
    );
}

export default function CashbackAnimationModal({ 
    isOpen, 
    onClose, 
    cashbackAmount = 25, 
    newBalance = 525,
    source = 'Daily Challenge',
    onExplore
}) {
    // stage: 1 = win splash celebration (0-1.1s), 2 = coins flying & counting into wallet
    const [stage, setStage] = useState(1);
    const [countingDone, setCountingDone] = useState(false);
    const [wasOpen, setWasOpen] = useState(isOpen);
    const [windowDimension, setWindowDimension] = useState({ width: 0, height: 0 });

    const prevBalance = Math.max(0, Math.round(newBalance - cashbackAmount));
    const targetBalance = Math.round(newBalance);
    const [displayBalance, setDisplayBalance] = useState(prevBalance);

    // Adjust state during render on open/close transitions (React-recommended pattern)
    if (wasOpen !== isOpen) {
        setWasOpen(isOpen);
        setStage(1);
        setCountingDone(false);
        setDisplayBalance(prevBalance);
    }

    useEffect(() => {
        if (typeof window === 'undefined') return;
        const raf = requestAnimationFrame(() => {
            setWindowDimension({ width: window.innerWidth, height: window.innerHeight });
        });
        const handleResize = () => {
            setWindowDimension({ width: window.innerWidth, height: window.innerHeight });
        };
        window.addEventListener('resize', handleResize);
        return () => {
            cancelAnimationFrame(raf);
            window.removeEventListener('resize', handleResize);
        };
    }, []);

    // Sequence stages
    useEffect(() => {
        if (!isOpen) return;

        const timer = setTimeout(() => {
            setStage(2);
        }, 1100);

        return () => clearTimeout(timer);
    }, [isOpen, prevBalance]);

    // Ultra-smooth odometer counting from prevBalance -> targetBalance
    useEffect(() => {
        if (stage >= 2 && isOpen) {
            const duration = 1200; // ms
            const startTime = performance.now();
            let frameId;

            const tick = (now) => {
                const elapsed = now - startTime;
                const progress = Math.min(elapsed / duration, 1);
                // Ease out cubic for silky fluid deceleration
                const ease = 1 - Math.pow(1 - progress, 3);
                const currentVal = Math.round(prevBalance + ease * (targetBalance - prevBalance));
                setDisplayBalance(currentVal);

                if (progress < 1) {
                    frameId = requestAnimationFrame(tick);
                } else {
                    setDisplayBalance(targetBalance);
                    setCountingDone(true);
                }
            };

            frameId = requestAnimationFrame(tick);
            return () => cancelAnimationFrame(frameId);
        }
    }, [stage, isOpen, prevBalance, targetBalance]);

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
            className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md cursor-pointer animate-fadeIn"
        >
            <Confetti
                width={windowDimension.width || 360}
                height={windowDimension.height || 640}
                recycle={false}
                numberOfPieces={stage === 1 ? 140 : 60}
                gravity={0.24}
                colors={['#F59E0B', '#10B981', '#3B82F6', '#EC4899', '#EAB308', '#8B5CF6']}
            />

            <motion.div
                onClick={(e) => e.stopPropagation()}
                initial={{ opacity: 0, scale: 0.88, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.88 }}
                transition={{ type: "spring", stiffness: 350, damping: 25 }}
                className="relative w-full max-w-sm sm:max-w-md bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-7 shadow-2xl border border-slate-200/80 dark:border-slate-800 text-center max-h-[92vh] overflow-y-auto cursor-default space-y-4"
            >
                {/* Close Button */}
                <button
                    onClick={onClose}
                    aria-label="Close modal"
                    className="absolute top-3.5 right-3.5 sm:top-4 sm:right-4 p-1.5 sm:p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer z-20"
                >
                    <X size={18} />
                </button>

                {/* Hero 3D Coin Stack Header */}
                <div className="relative flex flex-col items-center justify-center pt-2">
                    <VectorCoinStack animated={stage === 1} />

                    {/* Flying Coins Stream during Stage 2 */}
                    <AnimatePresence>
                        {stage === 2 && !countingDone && (
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                {[
                                    { xOffset: -30, delay: 0 },
                                    { xOffset: 25, delay: 0.12 },
                                    { xOffset: -12, delay: 0.24 },
                                    { xOffset: 18, delay: 0.36 },
                                    { xOffset: -22, delay: 0.48 },
                                    { xOffset: 8, delay: 0.60 },
                                ].map((coin, i) => (
                                    <motion.div
                                        key={i}
                                        initial={{ opacity: 0, y: -20, x: 0, scale: 0.7, rotate: 0 }}
                                        animate={{
                                            opacity: [0, 1, 1, 0],
                                            y: [-20, 110],
                                            x: [0, coin.xOffset, 0],
                                            scale: [0.7, 1.15, 0.6],
                                            rotate: [0, 180 + i * 60]
                                        }}
                                        transition={{
                                            duration: 0.65,
                                            delay: coin.delay,
                                            ease: "easeInOut"
                                        }}
                                        className="absolute z-30"
                                    >
                                        <MiniGoldCoin size={24} />
                                    </motion.div>
                                ))}
                            </div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Header Text & Earned Amount Pill */}
                <div className="space-y-1">
                    <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ type: "spring", stiffness: 400 }}
                    >
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 shadow-xs">
                            <Sparkles size={13} className="text-emerald-500" />
                            <span>Cashback Unlocked</span>
                        </span>
                    </motion.div>

                    <div className="flex items-center justify-center gap-1">
                        <motion.span
                            initial={{ scale: 0.6, y: 10 }}
                            animate={{ scale: 1, y: 0 }}
                            transition={{ type: "spring", stiffness: 450, damping: 18 }}
                            className="text-4xl sm:text-5xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight drop-shadow-xs"
                        >
                            +₹{cashbackAmount}
                        </motion.span>
                    </div>

                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                        {stage === 1 ? 'Quiz verified! Crediting cash to your InTrust Wallet...' : 'Deposited directly into your InTrust Wallet balance!'}
                    </p>
                </div>

                {/* Interactive InTrust Wallet Credit Box (Stage 2) */}
                <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35 }}
                    className={`relative rounded-3xl p-4 sm:p-5 border transition-all duration-500 overflow-hidden ${
                        countingDone
                            ? 'bg-gradient-to-br from-emerald-50/90 via-white to-emerald-50/50 dark:from-emerald-950/30 dark:via-slate-900 dark:to-slate-900 border-emerald-300 dark:border-emerald-800 shadow-lg shadow-emerald-500/10'
                            : 'bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800/90 dark:to-slate-900/90 border-blue-200/80 dark:border-blue-900/60 shadow-inner'
                    }`}
                >
                    {/* Glowing ripple background during counting */}
                    {stage === 2 && !countingDone && (
                        <motion.div
                            animate={{ opacity: [0.3, 0.7, 0.3], scale: [0.98, 1.02, 0.98] }}
                            transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
                            className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 via-amber-500/10 to-blue-500/10 pointer-events-none"
                        />
                    )}

                    <div className="relative z-10 flex items-center justify-between pb-2 border-b border-slate-200/70 dark:border-slate-800/80 mb-3">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-xl bg-blue-600/10 text-blue-600 dark:text-blue-400 flex items-center justify-center font-black">
                                <Wallet size={16} />
                            </div>
                            <div className="text-left">
                                <span className="text-[11px] font-black uppercase text-slate-700 dark:text-slate-300 tracking-wider block">
                                    InTrust Cash Wallet
                                </span>
                                <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 block">
                                    {source} • Instant Credit
                                </span>
                            </div>
                        </div>

                        {countingDone ? (
                            <motion.span
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ type: "spring", stiffness: 450 }}
                                className="inline-flex items-center gap-1 text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-500 text-white shadow-xs"
                            >
                                <CheckCircle2 size={11} /> Credited
                            </motion.span>
                        ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-500 animate-pulse">
                                <Sparkles size={11} /> Adding cash...
                            </span>
                        )}
                    </div>

                    {/* Big Live Counting Number */}
                    <div className="relative z-10 py-1">
                        <div className="flex items-baseline justify-center gap-2">
                            <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase">
                                Balance:
                            </span>
                            <motion.span 
                                key={countingDone ? 'done' : 'counting'}
                                animate={countingDone ? { scale: [1, 1.08, 1] } : {}}
                                transition={{ duration: 0.35 }}
                                className={`text-3xl sm:text-4xl font-black tracking-tight transition-colors ${
                                    countingDone 
                                        ? 'text-emerald-600 dark:text-emerald-400' 
                                        : 'text-slate-900 dark:text-white'
                                }`}
                            >
                                ₹{displayBalance}
                            </motion.span>

                            <motion.span
                                initial={{ scale: 0.5, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                className="text-xs font-black px-2 py-0.5 rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                            >
                                +₹{cashbackAmount}
                            </motion.span>
                        </div>

                        {/* Breakdown Timeline */}
                        <div className="flex items-center justify-center gap-3 text-[11px] font-bold text-slate-400 dark:text-slate-500 mt-2">
                            <span>Prev: ₹{prevBalance}</span>
                            <span>➔</span>
                            <span className="text-slate-700 dark:text-slate-300 font-black">
                                Updated: ₹{targetBalance}
                            </span>
                        </div>
                    </div>
                </motion.div>

                {/* Ready to spend notice */}
                <div className="flex items-center justify-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-300">
                    <CheckCircle2 size={15} className="text-emerald-500 shrink-0" />
                    <span>Active instantly! Use for discounts on all verified products.</span>
                </div>

                {/* Modal Action Buttons */}
                <div className="w-full flex flex-col gap-2 pt-1">
                    <button
                        onClick={onClose}
                        className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-black text-xs shadow-md shadow-blue-500/25 active:scale-98 transition-all cursor-pointer flex items-center justify-center gap-1.5"
                    >
                        <span>Continue to Daily Streak 🔥</span>
                        <ArrowRight size={14} />
                    </button>

                    {onExplore && (
                        <button
                            onClick={() => {
                                onClose();
                                onExplore();
                            }}
                            className="w-full py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs transition-all cursor-pointer"
                        >
                            Explore Store & Use Cashback →
                        </button>
                    )}
                </div>
            </motion.div>
        </div>
    );
}

