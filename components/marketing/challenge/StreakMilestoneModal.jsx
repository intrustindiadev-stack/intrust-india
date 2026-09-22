'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Flame, Sparkles, CheckCircle2, Share2, ArrowRight, X, Coins } from 'lucide-react';
import Confetti from 'react-confetti';

/**
 * @param {{
 *   isOpen: boolean;
 *   onClose: () => void;
 *   streak: number;
 *   baseRewardPaise: number;
 *   milestoneBonusPaise: number;
 *   badge?: string;
 *   freezeUsed?: boolean;
 *   onShare?: () => void;
 * }} props
 */
export default function StreakMilestoneModal({
    isOpen,
    onClose,
    streak = 1,
    baseRewardPaise = 2500,
    milestoneBonusPaise = 0,
    badge = null,
    freezeUsed = false,
    onShare
}) {
    const [windowDimension, setWindowDimension] = React.useState({ width: 0, height: 0 });

    React.useEffect(() => {
        if (typeof window !== 'undefined') {
            setWindowDimension({ width: window.innerWidth, height: window.innerHeight });
            const handleResize = () => {
                setWindowDimension({ width: window.innerWidth, height: window.innerHeight });
            };
            window.addEventListener('resize', handleResize);
            return () => window.removeEventListener('resize', handleResize);
        }
    }, []);

    // Close on Escape key
    React.useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') onClose();
        };
        if (isOpen) {
            window.addEventListener('keydown', handleKeyDown);
            return () => window.removeEventListener('keydown', handleKeyDown);
        }
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const totalRewardRupees = ((baseRewardPaise + milestoneBonusPaise) / 100).toFixed(0);
    const hasMilestone = milestoneBonusPaise > 0;

    return (
        <AnimatePresence>
            <div 
                onClick={onClose}
                className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-md animate-fadeIn cursor-pointer"
            >
                {windowDimension.width > 0 && (
                    <div className="fixed inset-0 pointer-events-none z-[60]">
                        <Confetti
                            width={windowDimension.width}
                            height={windowDimension.height}
                            recycle={false}
                            numberOfPieces={hasMilestone ? 140 : 60}
                            gravity={0.25}
                        />
                    </div>
                )}

                <motion.div
                    onClick={(e) => e.stopPropagation()}
                    initial={{ scale: 0.9, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.9, opacity: 0, y: 20 }}
                    className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl p-4 sm:p-6 lg:p-7 border border-slate-200 dark:border-slate-800 shadow-2xl relative overflow-hidden text-center space-y-4 sm:space-y-5 z-10 max-h-[92vh] overflow-y-auto cursor-default"
                >
                    {/* Background glow */}
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-64 bg-gradient-to-b from-amber-500/20 to-orange-500/0 rounded-full blur-2xl pointer-events-none" />

                    {/* Close button */}
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 flex items-center justify-center transition-colors z-20 cursor-pointer"
                    >
                        <X size={16} />
                    </button>

                    {/* Trophy / Flame Icon Badge */}
                    <div className="relative mx-auto w-24 h-24">
                        <motion.div
                            animate={{ rotate: [0, 5, -5, 0] }}
                            transition={{ repeat: Infinity, duration: 3 }}
                            className={`w-24 h-24 rounded-3xl flex items-center justify-center shadow-xl ${
                                hasMilestone
                                    ? 'bg-gradient-to-tr from-amber-500 via-orange-500 to-rose-500 text-white shadow-orange-500/30'
                                    : 'bg-emerald-500/15 text-emerald-600 border border-emerald-500/30'
                            }`}
                        >
                            {hasMilestone ? <Trophy size={48} className="animate-bounce" /> : <Flame size={48} className="fill-orange-500 text-orange-500" />}
                        </motion.div>
                        {hasMilestone && (
                            <div className="absolute -bottom-2 -right-2 px-2 py-0.5 rounded-full bg-yellow-400 text-slate-950 text-[10px] font-black uppercase tracking-wider shadow-sm flex items-center gap-0.5">
                                <Sparkles size={10} /> Bonus
                            </div>
                        )}
                    </div>

                    {/* Header Details */}
                    <div>
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-500/10 text-orange-600 dark:text-orange-400 text-xs font-black uppercase tracking-wider mb-2 border border-orange-500/20">
                            <Flame size={14} className="fill-orange-500" />
                            <span>{streak}-Day Challenge Streak!</span>
                        </div>
                        <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                            {hasMilestone ? 'Streak Milestone Unlocked!' : 'Streak Extended!'}
                        </h2>
                        {badge && (
                            <p className="text-sm font-extrabold text-amber-600 dark:text-amber-400 mt-1">
                                Awarded: {badge}
                            </p>
                        )}
                        {freezeUsed && (
                            <p className="text-xs font-bold text-blue-600 dark:text-blue-400 mt-1">
                                ❄️ Streak freeze was automatically applied to save your streak!
                            </p>
                        )}
                    </div>

                    {/* Reward Breakdown Card */}
                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 space-y-2 text-left">
                        <div className="flex items-center justify-between text-xs font-bold text-slate-600 dark:text-slate-300">
                            <span>Base Quiz Cashback</span>
                            <span>₹{(baseRewardPaise / 100).toFixed(0)}</span>
                        </div>
                        {hasMilestone && (
                            <div className="flex items-center justify-between text-xs font-black text-orange-600 dark:text-orange-400">
                                <span className="flex items-center gap-1">
                                    <Sparkles size={13} /> {streak}-Day Streak Bonus
                                </span>
                                <span>+₹{(milestoneBonusPaise / 100).toFixed(0)}</span>
                            </div>
                        )}
                        <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between font-black text-sm text-slate-900 dark:text-white">
                            <span>Total Added to Wallet</span>
                            <span className="text-emerald-600 dark:text-emerald-400 text-base">₹{totalRewardRupees}</span>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-col sm:flex-row items-center gap-2.5 pt-2">
                        {onShare && (
                            <button
                                onClick={onShare}
                                className="w-full py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black flex items-center justify-center gap-2 shadow-md shadow-emerald-600/20 active:scale-95 transition-all cursor-pointer"
                            >
                                <Share2 size={16} />
                                <span>Share on WhatsApp</span>
                            </button>
                        )}
                        <button
                            onClick={onClose}
                            className="w-full py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-black transition-all cursor-pointer"
                        >
                            Continue
                        </button>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
