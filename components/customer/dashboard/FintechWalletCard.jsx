'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Wallet, Coins, Plus, History, Eye, EyeOff, ShieldCheck, ArrowUpRight, Sparkles } from 'lucide-react';
import Link from 'next/link';

function AnimatedCounter({ targetValue, isVisible, duration = 650 }) {
    const [displayVal, setDisplayVal] = useState(0);

    useEffect(() => {
        if (!isVisible) {
            setDisplayVal(0);
            return;
        }

        let startTime = null;
        let animationFrameId;
        const startVal = 0;
        const endVal = Number(targetValue) || 0;

        const step = (timestamp) => {
            if (!startTime) startTime = timestamp;
            const progress = Math.min((timestamp - startTime) / duration, 1);
            // Ease-out cubic: 1 - (1 - t)^3
            const easeProgress = 1 - Math.pow(1 - progress, 3);
            const current = startVal + (endVal - startVal) * easeProgress;
            setDisplayVal(current);

            if (progress < 1) {
                animationFrameId = requestAnimationFrame(step);
            } else {
                setDisplayVal(endVal);
            }
        };

        animationFrameId = requestAnimationFrame(step);
        return () => {
            if (animationFrameId) cancelAnimationFrame(animationFrameId);
        };
    }, [isVisible, targetValue, duration]);

    if (!isVisible) {
        return <span className="tracking-widest select-none text-on-surface/40">••••••</span>;
    }

    return (
        <span className="tabular-nums">
            ₹{displayVal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
    );
}

function FintechWalletCard({ userData }) {
    const { walletBalance = 0, rewardPoints = 0, totalSavings = 0 } = userData || {};
    // Hidden by default when page opens as requested
    const [isBalanceVisible, setIsBalanceVisible] = useState(false);

    const toggleBalance = () => {
        setIsBalanceVisible((prev) => !prev);
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="w-full h-full bg-surface-container-lowest border border-slate-200/80 dark:border-white/10 rounded-2xl sm:rounded-3xl p-5 sm:p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between relative overflow-hidden"
        >
            {/* Ambient Background Accent */}
            <div className="absolute top-0 right-0 w-44 h-44 bg-primary/5 rounded-full blur-3xl pointer-events-none" />

            <div className="relative z-10">
                {/* Header row inside digital wallet */}
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2.5">
                        <div className="w-10 h-10 rounded-2xl bg-blue-500/10 text-primary flex items-center justify-center font-bold">
                            <Wallet size={20} />
                        </div>
                        <div>
                            <h3 className="font-extrabold text-sm text-on-surface tracking-tight">InTrust Digital Wallet</h3>
                            <div className="flex items-center gap-1 text-[11px] font-semibold text-tertiary">
                                <ShieldCheck size={12} className="text-emerald-500" />
                                <span>RBI Compliant Security</span>
                            </div>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={toggleBalance}
                        aria-label={isBalanceVisible ? 'Hide Balance' : 'Reveal Balance'}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-surface-container-low hover:bg-surface-container text-on-surface-variant hover:text-on-surface transition-all text-xs font-semibold cursor-pointer active:scale-95"
                        title={isBalanceVisible ? 'Hide Balance' : 'Reveal Balance'}
                    >
                        {isBalanceVisible ? <EyeOff size={14} /> : <Eye size={14} />}
                        <span className="text-[11px] hidden sm:inline">{isBalanceVisible ? 'Hide' : 'Reveal'}</span>
                    </button>
                </div>

                {/* Main Digital Balance Display with interactive click-to-reveal */}
                <div className="my-3">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">
                            Available Balance
                        </span>
                        {!isBalanceVisible && (
                            <button
                                type="button"
                                onClick={toggleBalance}
                                className="text-[11px] font-bold text-primary hover:underline flex items-center gap-1"
                            >
                                Tap to reveal
                            </button>
                        )}
                    </div>
                    <div
                        onClick={toggleBalance}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleBalance(); } }}
                        title={isBalanceVisible ? 'Click to hide balance' : 'Click to reveal balance'}
                        className="inline-flex items-baseline gap-2 mt-1 cursor-pointer group select-none"
                    >
                        <h2 className="text-3xl sm:text-4xl font-black text-on-surface tracking-tight">
                            <AnimatedCounter targetValue={walletBalance} isVisible={isBalanceVisible} />
                        </h2>
                    </div>
                </div>

                {/* Sub-balances: InTrust Reward Points & Savings */}
                <div className="grid grid-cols-2 gap-2.5 p-3 rounded-2xl bg-surface-container-low/70 border border-outline-variant/20 my-4">
                    <Link
                        href="/rewards"
                        className="flex flex-col group p-1 hover:opacity-80 transition-opacity"
                    >
                        <div className="flex items-center gap-1.5 text-on-surface-variant text-[11px] font-bold">
                            <Coins size={13} className="text-amber-500" />
                            <span>Reward Coins</span>
                        </div>
                        <span className="text-base font-extrabold text-on-surface mt-0.5 tabular-nums">
                            {Number(rewardPoints).toLocaleString()} <span className="text-[11px] font-bold text-on-surface-variant">pts</span>
                        </span>
                    </Link>

                    <div className="flex flex-col p-1">
                        <div className="flex items-center gap-1.5 text-on-surface-variant text-[11px] font-bold">
                            <Sparkles size={13} className="text-emerald-500" />
                            <span>Total Savings</span>
                        </div>
                        <span className="text-base font-extrabold text-emerald-600 dark:text-emerald-400 mt-0.5 tabular-nums">
                            ₹{Number(totalSavings || 0).toLocaleString('en-IN')}
                        </span>
                    </div>
                </div>

                {/* Quick Actions */}
                <div className="pt-2 flex items-center gap-3">
                    <Link
                        href="/wallet"
                        className="flex-1 py-3 px-4 rounded-2xl bg-primary hover:bg-primary/95 text-on-primary font-bold text-xs flex items-center justify-center gap-2 shadow-sm shadow-primary/20 active:scale-95 transition-all"
                    >
                        <Plus size={16} strokeWidth={2.5} />
                        <span>Add Money</span>
                    </Link>

                    <Link
                        href="/transactions"
                        className="py-3 px-4 rounded-2xl bg-surface-container hover:bg-surface-container-high text-on-surface font-bold text-xs flex items-center justify-center gap-1.5 border border-outline-variant/20 active:scale-95 transition-all"
                    >
                        <History size={15} />
                        <span>Passbook</span>
                    </Link>
                </div>
            </div>
        </motion.div>
    );
}

export default React.memo(FintechWalletCard);
