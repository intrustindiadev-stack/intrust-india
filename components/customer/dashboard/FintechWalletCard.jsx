'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Wallet, Coins, TrendingUp, Plus, History, Eye, EyeOff } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

export default function FintechWalletCard({ userData }) {
    const { walletBalance = 0, rewardPoints = 0, totalSavings = 0 } = userData || {};
    const [isBalanceVisible, setIsBalanceVisible] = useState(false);

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="relative overflow-hidden rounded-[2.5rem] bg-indigo-600 p-6 sm:p-8 shadow-[0_20px_50px_rgba(79,70,229,0.4)] flex flex-col"
        >
            {/* Background elements for depth */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-600 rounded-full blur-3xl -ml-20 -mb-20 pointer-events-none" />

            <div className="relative z-10 flex flex-col flex-1">
                <div className="flex justify-between items-start mb-8">
                    <div>
                        <p className="text-indigo-100/80 text-sm font-medium tracking-wide mb-1 flex items-center gap-2">
                            Total Balance 
                            <button onClick={() => setIsBalanceVisible(!isBalanceVisible)} className="cursor-pointer hover:text-white transition-colors focus:outline-none">
                                {isBalanceVisible ? <Eye size={14} /> : <EyeOff size={14} />}
                            </button>
                        </p>
                        <h2 
                            onClick={() => setIsBalanceVisible(!isBalanceVisible)}
                            className="text-4xl sm:text-5xl font-black text-white tracking-tight cursor-pointer select-none"
                        >
                            ₹{isBalanceVisible ? Number(walletBalance).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '••••'}
                        </h2>
                    </div>
                    
                    <Link href="/wallet" className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-white/20 backdrop-blur-md border border-white/20 shadow-lg flex items-center justify-center shrink-0 hover:scale-105 transition-transform group">
                        <Wallet size={24} className="text-white group-hover:rotate-12 transition-transform" />
                    </Link>
                </div>

                <div className="flex items-center gap-4 mb-8">
                    {rewardPoints > 0 && (
                        <Link href="/rewards" className="flex items-center gap-1.5 bg-white/10 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/20 hover:bg-white/20 transition-colors">
                            <Coins size={14} className="text-amber-300" />
                            <span className="text-sm font-bold text-white">{Number(rewardPoints).toLocaleString()} pts</span>
                        </Link>
                    )}
                    {totalSavings > 0 && (
                        <div className="flex items-center gap-1.5 bg-emerald-500/20 backdrop-blur-md px-3 py-1.5 rounded-full border border-emerald-500/30">
                            <TrendingUp size={14} className="text-emerald-300" />
                            <span className="text-sm font-bold text-emerald-50">₹{Number(totalSavings).toLocaleString()} saved</span>
                        </div>
                    )}
                </div>

                <div className="flex gap-3 mt-auto">
                    <Link href="/wallet?action=add" className="flex-1 bg-white text-indigo-600 font-black py-3.5 rounded-2xl flex items-center justify-center gap-2 hover:scale-[1.02] transition-transform shadow-lg">
                        <Plus size={18} strokeWidth={3} />
                        Add Money
                    </Link>
                    <Link href="/wallet" className="w-14 bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl flex items-center justify-center hover:bg-white/20 transition-colors text-white">
                        <History size={20} />
                    </Link>
                </div>
            </div>
        </motion.div>
    );
}
