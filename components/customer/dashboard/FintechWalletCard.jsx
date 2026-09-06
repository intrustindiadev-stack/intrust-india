'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Wallet, Coins, Plus, History, Eye, EyeOff, ShieldCheck, ArrowUpRight, Sparkles } from 'lucide-react';
import Link from 'next/link';

export default function FintechWalletCard({ userData }) {
    const { walletBalance = 0, rewardPoints = 0, totalSavings = 0 } = userData || {};
    const [isBalanceVisible, setIsBalanceVisible] = useState(true);

    return (
        <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="w-full bg-surface-container-lowest border border-outline-variant/30 rounded-3xl p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between relative overflow-hidden"
        >
            {/* Ambient Background Accent */}
            <div className="absolute top-0 right-0 w-44 h-44 bg-primary/5 rounded-full blur-3xl pointer-events-none" />

            <div className="relative z-10">
                {/* Header row inside digital wallet */}
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-bold">
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
                        onClick={() => setIsBalanceVisible(!isBalanceVisible)}
                        className="w-8 h-8 rounded-full bg-surface-container-low hover:bg-surface-container flex items-center justify-center text-on-surface-variant transition-colors"
                        title={isBalanceVisible ? 'Hide Balance' : 'Show Balance'}
                    >
                        {isBalanceVisible ? <Eye size={15} /> : <EyeOff size={15} />}
                    </button>
                </div>

                {/* Main Digital Balance Display */}
                <div className="my-3">
                    <span className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">
                        Available Balance
                    </span>
                    <div className="flex items-baseline gap-2 mt-1">
                        <h2 className="text-3xl sm:text-4xl font-black text-on-surface tracking-tight tabular-nums">
                            {isBalanceVisible
                                ? `₹${Number(walletBalance).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                                : '••••••'}
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
