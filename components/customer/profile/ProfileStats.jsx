'use client';

import { motion } from 'framer-motion';
import { Wallet, Clock, CreditCard, ChevronRight } from 'lucide-react';

function StoreCreditCard({ activeCount, totalAmountPaise = 0, onManage }) {
    const amount = totalAmountPaise / 100;
    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            whileHover={{ scale: 1.02, translateY: -5 }}
            whileTap={{ scale: 0.98 }}
            className="bg-white dark:bg-[#0f172a]/40 bg-gradient-to-br from-white via-amber-50/10 to-white dark:from-[#1e293b]/50 dark:via-[#0f172a]/50 dark:to-[#020617]/50 rounded-[2rem] p-6 shadow-xl relative overflow-hidden group cursor-pointer border border-gray-100 dark:border-white/5 backdrop-blur-sm"
            onClick={onManage}
        >
            {/* Background Accent */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-3xl -mr-12 -mt-12 group-hover:bg-amber-500/10 transition-all duration-700" />

            <div className="relative z-10">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/10">
                                <Clock size={18} className="text-white" />
                            </div>
                            <h3 className="text-[10px] font-black text-amber-600 dark:text-amber-500 uppercase tracking-[0.2em]">Store Credits</h3>
                        </div>
                        {activeCount > 0 && (
                            <div className="flex flex-col items-end gap-1">
                                <span className="px-3 py-1 bg-amber-500 text-white dark:text-black rounded-full text-[9px] font-black shadow-lg shadow-amber-500/10 uppercase tracking-widest">
                                    {activeCount} ACTIVE
                                </span>
                                {amount > 0 && (
                                    <span className="text-[10px] font-black text-amber-600/80">
                                        ₹{amount.toLocaleString('en-IN', { minimumFractionDigits: 0 })} DUE
                                    </span>
                                )}
                            </div>
                        )}
                    </div>

                <div className="mb-8">
                    <p className="text-[10px] text-gray-400 dark:text-gray-500 uppercase font-black tracking-[0.2em] mb-1">Available for Use</p>
                    <p className="text-2xl font-black tracking-tight text-gray-900 dark:text-white">
                        {activeCount > 0 ? 'Manage Requests' : 'Get Credit'}
                    </p>
                </div>

                <div className="flex items-center justify-between text-[11px] font-black text-amber-500 mt-2 pt-4 border-t border-white/5 uppercase tracking-widest">
                    <span className="flex items-center gap-2">
                        <CreditCard size={14} />
                        View Statement
                    </span>
                    <motion.div
                        animate={{ x: [0, 5, 0] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                    >
                        <ChevronRight size={16} />
                    </motion.div>
                </div>
            </div>
        </motion.div>
    );
}

function WalletCard({ balancePaise, onManage }) {
    const balance = (balancePaise || 0) / 100;

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            whileHover={{ scale: 1.02, translateY: -5 }}
            whileTap={{ scale: 0.98 }}
            className="bg-white dark:bg-[#0f172a]/40 bg-gradient-to-br from-white via-blue-50/10 to-white dark:from-[#0f172a]/50 dark:via-[#1e293b]/50 dark:to-[#020617]/50 rounded-[2rem] p-6 shadow-xl relative overflow-hidden group border border-gray-100 dark:border-white/5 backdrop-blur-sm"
        >
            {/* Background Accent */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-3xl -mr-12 -mt-12 group-hover:bg-blue-500/10 transition-all duration-700" />

            <div className="relative z-10">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/10">
                            <Wallet size={18} className="text-white" />
                        </div>
                        <h3 className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-[0.2em]">Your Wallet</h3>
                    </div>
                </div>

                <div className="mb-8">
                    <p className="text-[10px] text-gray-400 dark:text-gray-500 uppercase font-black tracking-[0.2em] mb-1">Available Balance</p>
                    <p className="text-3xl font-black tabular-nums tracking-tighter text-gray-900 dark:text-white">
                        ₹{balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </p>
                </div>

                <button
                    onClick={onManage}
                    className="w-full py-3.5 bg-gray-900 dark:bg-white text-white dark:text-black text-[10px] font-black rounded-2xl hover:opacity-90 transition-all flex items-center justify-center gap-2 group/btn uppercase tracking-widest shadow-xl shadow-black/10"
                >
                    Add Credits
                    <ChevronRight size={14} className="group-hover/btn:translate-x-1 transition-transform" />
                </button>
            </div>
        </motion.div>
    );
}

export default function ProfileStats({ walletBalancePaise, activeUdhariCount, activeUdhariPaise = 0, onManageWallet, onManageUdhari }) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <StoreCreditCard 
                activeCount={activeUdhariCount} 
                totalAmountPaise={activeUdhariPaise}
                onManage={onManageUdhari} 
            />
            <WalletCard 
                balancePaise={walletBalancePaise} 
                onManage={onManageWallet} 
            />
        </div>
    );
}
