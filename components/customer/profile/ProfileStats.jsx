'use client';

import { Wallet, IndianRupee, Gift, ChevronRight } from 'lucide-react';
import { useRouter } from 'next/navigation';

function StatItem({ icon: Icon, title, value, subtitle, highlight, onClick, iconColorClass }) {
    return (
        <div 
            onClick={onClick}
            className="p-6 flex flex-col group cursor-pointer hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors"
        >
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <Icon size={16} className={iconColorClass} />
                    <h3 className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                        {title}
                    </h3>
                </div>
                <ChevronRight size={14} className="text-gray-300 dark:text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity transform group-hover:translate-x-1" />
            </div>
            
            <div className="flex flex-col gap-1 mt-auto">
                <p className="text-2xl font-bold tabular-nums tracking-tight text-gray-900 dark:text-white">
                    {value}
                </p>
                <div className="flex items-center gap-2">
                    <p className="text-[11px] font-medium text-gray-400 dark:text-gray-500">{subtitle}</p>
                    {highlight && (
                        <span className="text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-300">
                            {highlight}
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
}

export default function ProfileStats({ walletBalance, udhariBalance, rewardsBalance, onWalletClick, onUdhariClick, onRewardsClick }) {
    const totalBalance = ((walletBalance || 0) + (udhariBalance || 0)) / 100;
    const wBalance = (walletBalance || 0) / 100;
    const uBalance = (udhariBalance || 0) / 100;

    return (
        <section className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm overflow-hidden mb-8 w-full">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-white/5">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Account Overview</h3>
            </div>
            
            <div className="p-6 md:p-8">
                <div className="text-center mb-8 pb-8 border-b border-gray-200 dark:border-gray-800">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Total Value</p>
                    <h4 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white">
                        ₹{totalBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </h4>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
                    <div 
                        onClick={onWalletClick}
                        className="p-4 rounded-lg hover:bg-gray-50 dark:hover:bg-white/5 transition-colors cursor-pointer"
                    >
                        <div className="w-12 h-12 mx-auto bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center mb-3">
                            <Wallet size={24} />
                        </div>
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Wallet</p>
                        <p className="text-xl font-bold text-gray-900 dark:text-white">
                            ₹{wBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </p>
                        <p className="text-[10px] text-gray-500 mt-1">Available Balance</p>
                    </div>

                    <div 
                        onClick={onUdhariClick}
                        className="p-4 rounded-lg hover:bg-gray-50 dark:hover:bg-white/5 transition-colors border-t md:border-t-0 md:border-l border-gray-200 dark:border-gray-800 cursor-pointer"
                    >
                        <div className="w-12 h-12 mx-auto bg-amber-500/10 text-amber-600 dark:text-amber-500 rounded-full flex items-center justify-center mb-3">
                            <IndianRupee size={24} />
                        </div>
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Store Credit</p>
                        <p className="text-xl font-bold text-gray-900 dark:text-white">
                            ₹{uBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </p>
                        <span className="text-[10px] text-amber-600 dark:text-amber-500 font-semibold mt-1 inline-block hover:underline">Get Credit</span>
                    </div>

                    <div 
                        onClick={onRewardsClick}
                        className="p-4 rounded-lg hover:bg-gray-50 dark:hover:bg-white/5 transition-colors border-t md:border-t-0 md:border-l border-gray-200 dark:border-gray-800 cursor-pointer"
                    >
                        <div className="w-12 h-12 mx-auto bg-emerald-500/10 text-emerald-600 dark:text-emerald-500 rounded-full flex items-center justify-center mb-3">
                            <Gift size={24} />
                        </div>
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Rewards</p>
                        <p className="text-xl font-bold text-gray-900 dark:text-white">
                            {rewardsBalance ? rewardsBalance.toLocaleString('en-IN') : '0'}
                        </p>
                        <span className="text-[10px] text-emerald-600 dark:text-emerald-500 font-semibold mt-1 inline-block hover:underline">View Balance</span>
                    </div>
                </div>
            </div>
        </section>
    );
}
