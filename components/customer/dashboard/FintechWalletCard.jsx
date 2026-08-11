'use client';

import { motion } from 'framer-motion';
import { Wallet, Coins, TrendingUp, Plus, History, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export default function FintechWalletCard({ userData }) {
    const { walletBalance = 0, rewardPoints = 0, totalSavings = 0 } = userData || {};

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-[#1e3a5f] to-indigo-900 shadow-2xl shadow-indigo-900/40 p-6 sm:p-8 border border-white/10"
        >
            {/* Background elements for depth */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/20 rounded-full blur-[80px] -mr-20 -mt-20 pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-purple-500/20 rounded-full blur-[60px] -ml-10 -mb-10 pointer-events-none" />

            <div className="relative z-10">
                <div className="flex justify-between items-start mb-6">
                    <div>
                        <p className="text-indigo-200 text-sm font-medium tracking-wide mb-1 flex items-center gap-2">
                            <Wallet size={16} /> Wallet Balance
                        </p>
                        <h2 className="text-4xl sm:text-5xl font-black text-white tracking-tight flex items-baseline gap-1">
                            <span className="text-2xl text-indigo-300">₹</span>
                            {Number(walletBalance).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </h2>
                    </div>
                    
                    {/* Secondary Stat: Rewards */}
                    <Link href="/rewards" className="bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-2xl p-3 flex flex-col items-end transition-colors group border border-white/5">
                        <div className="flex items-center gap-1.5 text-amber-300 text-xs font-bold uppercase tracking-wider mb-1">
                            <Coins size={14} className="group-hover:rotate-12 transition-transform" /> Rewards
                        </div>
                        <p className="text-lg font-bold text-white">
                            {Number(rewardPoints).toLocaleString()} <span className="text-xs text-indigo-200">pts</span>
                        </p>
                    </Link>
                </div>

                {/* Savings Banner */}
                {totalSavings > 0 && (
                    <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-2.5 mb-8 flex items-center gap-3 backdrop-blur-sm w-max">
                        <div className="bg-emerald-500 text-white rounded-full p-1 shadow-lg shadow-emerald-500/20">
                            <TrendingUp size={14} strokeWidth={3} />
                        </div>
                        <p className="text-emerald-100 text-sm font-medium">
                            Total Savings <span className="font-bold text-white ml-1">₹{Number(totalSavings).toLocaleString('en-IN')}</span>
                        </p>
                    </div>
                )}
                {!totalSavings && <div className="h-4 mb-8" />}

                {/* Primary Actions Grid */}
                <div className="grid grid-cols-3 gap-3 sm:gap-4">
                    <Link href="/wallet" className="flex flex-col items-center justify-center gap-2 group">
                        <div className="w-12 h-12 sm:w-14 sm:h-14 bg-white text-indigo-900 rounded-2xl flex items-center justify-center shadow-lg shadow-black/20 group-hover:scale-105 transition-transform">
                            <Plus size={24} strokeWidth={2.5} />
                        </div>
                        <span className="text-xs sm:text-sm font-semibold text-indigo-100">Add Money</span>
                    </Link>
                    
                    <Link href="/wallet" className="flex flex-col items-center justify-center gap-2 group">
                        <div className="w-12 h-12 sm:w-14 sm:h-14 bg-white/10 backdrop-blur-md text-white rounded-2xl flex items-center justify-center shadow-lg shadow-black/20 border border-white/10 group-hover:bg-white/20 transition-all group-hover:scale-105">
                            <History size={24} strokeWidth={2} />
                        </div>
                        <span className="text-xs sm:text-sm font-semibold text-indigo-100">History</span>
                    </Link>

                    <Link href="/wallet" className="flex flex-col items-center justify-center gap-2 group">
                        <div className="w-12 h-12 sm:w-14 sm:h-14 bg-white/10 backdrop-blur-md text-white rounded-2xl flex items-center justify-center shadow-lg shadow-black/20 border border-white/10 group-hover:bg-white/20 transition-all group-hover:scale-105">
                            <ArrowRight size={24} strokeWidth={2} className="-rotate-45" />
                        </div>
                        <span className="text-xs sm:text-sm font-semibold text-indigo-100">Transfer</span>
                    </Link>
                </div>
            </div>
        </motion.div>
    );
}
