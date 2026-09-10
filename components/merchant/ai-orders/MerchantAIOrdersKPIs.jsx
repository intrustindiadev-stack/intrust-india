'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { 
    Zap, 
    Clock, 
    ShieldCheck, 
    CheckCircle2, 
    Wallet, 
    ArrowUpRight, 
    ArrowRight,
    Coins
} from 'lucide-react';

export default function MerchantAIOrdersKPIs({ 
    counts = {}, 
    activeTab = 'ALL', 
    onSelectTab, 
    vault = null,
    onOpenWithdraw
}) {
    const total = counts?.total ?? 0;
    const pending = counts?.pending ?? 0;
    const inProgress = counts?.inProgress ?? 0;
    const completed = counts?.completed ?? 0;
    const availableBalance = (vault?.balance_paise != null ? vault.balance_paise / 100 : 0);
    const totalProfit = (vault?.total_profit_paise != null ? vault.total_profit_paise / 100 : 0);

    const kpiCards = [
        {
            key: 'ALL',
            title: 'Total AI Orders',
            value: total,
            subtext: total > 0 ? `${total} allocated to store` : 'No allocations yet',
            badge: null,
            icon: Zap,
            iconBg: 'bg-blue-50 dark:bg-blue-950/60 border border-blue-200/60 dark:border-blue-800/40',
            iconColor: 'text-blue-600 dark:text-blue-400',
            activeRing: 'ring-2 ring-blue-600 dark:ring-blue-400',
            actionType: 'tab',
            actionTarget: 'ALL'
        },
        {
            key: 'PENDING',
            title: 'Pending Acceptance',
            value: pending,
            subtext: pending > 0 ? 'Accept to fulfill demand' : 'All caught up',
            badge: pending > 0 ? `${pending} Action Required` : null,
            badgeType: 'urgent',
            icon: Clock,
            iconBg: 'bg-amber-50 dark:bg-amber-950/60 border border-amber-200/60 dark:border-amber-800/40',
            iconColor: 'text-amber-600 dark:text-amber-400',
            activeRing: 'ring-2 ring-amber-500 dark:ring-amber-400',
            actionType: 'tab',
            actionTarget: 'PENDING'
        },
        {
            key: 'IN_PROGRESS',
            title: 'In Progress / Escrow',
            value: inProgress,
            subtext: inProgress > 0 ? 'Active in delivery loop' : 'None in fulfillment',
            badge: null,
            icon: ShieldCheck,
            iconBg: 'bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200/60 dark:border-indigo-800/40',
            iconColor: 'text-indigo-600 dark:text-indigo-400',
            activeRing: 'ring-2 ring-indigo-500 dark:ring-indigo-400',
            actionType: 'tab',
            actionTarget: 'IN_PROGRESS'
        },
        {
            key: 'COMPLETED',
            title: 'Completed & Settled',
            value: completed,
            subtext: completed > 0 ? 'Profits paid to vault' : 'No completed orders',
            badge: null,
            icon: CheckCircle2,
            iconBg: 'bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200/60 dark:border-emerald-800/40',
            iconColor: 'text-emerald-600 dark:text-emerald-400',
            activeRing: 'ring-2 ring-emerald-500 dark:ring-emerald-400',
            actionType: 'tab',
            actionTarget: 'COMPLETED'
        },
        {
            key: 'VAULT',
            title: 'Vault Available Balance',
            value: `₹${Math.round(availableBalance).toLocaleString('en-IN')}`,
            subtext: `Total Profit: ₹${Math.round(totalProfit).toLocaleString('en-IN')}`,
            badge: 'Ready to Withdraw',
            badgeType: 'success',
            icon: Wallet,
            iconBg: 'bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200/60 dark:border-emerald-800/40',
            iconColor: 'text-emerald-600 dark:text-emerald-400',
            activeRing: 'ring-2 ring-emerald-500 dark:ring-emerald-400',
            actionType: 'link',
            actionTarget: '/merchant/vault/ai-orders'
        }
    ];

    const handleCardClick = (card) => {
        if (card.actionType === 'tab') {
            if (onSelectTab) {
                onSelectTab(card.actionTarget);
            }
        }
    };

    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                    <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500" />
                    </span>
                    <h2 className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        AI Orders Performance
                    </h2>
                </div>
                <Link
                    href="/merchant/vault/ai-orders"
                    className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                >
                    <span>Open AI Vault</span>
                    <ArrowUpRight size={13} />
                </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
                {kpiCards.map((card) => {
                    const isTabActive = card.actionType === 'tab' && activeTab === card.actionTarget;
                    const CardIcon = card.icon;

                    if (card.actionType === 'link') {
                        return (
                            <Link 
                                key={card.key}
                                href={card.actionTarget}
                                className="block outline-none"
                            >
                                <motion.div
                                    whileHover={{ y: -2 }}
                                    className={`relative h-full overflow-hidden rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-4 sm:p-5 shadow-xs transition-all hover:shadow-md cursor-pointer group flex flex-col justify-between`}
                                >
                                    <div>
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                                                {card.title}
                                            </span>
                                            <div className={`w-8 h-8 rounded-xl ${card.iconBg} ${card.iconColor} flex items-center justify-center transition-transform group-hover:scale-110`}>
                                                <CardIcon size={16} />
                                            </div>
                                        </div>

                                        <div className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                                            {card.value}
                                        </div>

                                        <div className="mt-1 flex items-center gap-1.5 text-[11px] font-medium text-slate-500 dark:text-slate-400">
                                            <span>{card.subtext}</span>
                                        </div>
                                    </div>

                                    <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                                        {onOpenWithdraw ? (
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    onOpenWithdraw();
                                                }}
                                                className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline inline-flex items-center gap-1"
                                            >
                                                <Wallet size={11} /> Withdraw
                                            </button>
                                        ) : (
                                            <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full">
                                                Active
                                            </span>
                                        )}
                                        <span className="text-[11px] font-bold text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200 inline-flex items-center gap-0.5 transition-colors">
                                            Vault <ArrowUpRight size={12} />
                                        </span>
                                    </div>
                                </motion.div>
                            </Link>
                        );
                    }

                    return (
                        <div
                            key={card.key}
                            onClick={() => handleCardClick(card)}
                            className="block outline-none"
                        >
                            <motion.div
                                whileHover={{ y: -2 }}
                                className={`relative h-full overflow-hidden rounded-2xl bg-white dark:bg-slate-900 border ${
                                    isTabActive 
                                        ? 'border-blue-500 dark:border-blue-400 shadow-sm ' + card.activeRing
                                        : 'border-slate-200/80 dark:border-slate-800'
                                } p-4 sm:p-5 shadow-xs transition-all hover:shadow-md cursor-pointer group flex flex-col justify-between select-none`}
                            >
                                <div>
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                                            {card.title}
                                        </span>
                                        <div className={`w-8 h-8 rounded-xl ${card.iconBg} ${card.iconColor} flex items-center justify-center transition-transform group-hover:scale-110`}>
                                            <CardIcon size={16} />
                                        </div>
                                    </div>

                                    <div className="flex items-baseline gap-2">
                                        <span className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                                            {card.value}
                                        </span>
                                        {card.badge && (
                                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60 animate-pulse">
                                                {card.badge}
                                            </span>
                                        )}
                                    </div>

                                    <div className="mt-1 text-[11px] font-medium text-slate-500 dark:text-slate-400">
                                        {card.subtext}
                                    </div>
                                </div>

                                <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px]">
                                    <span className={`font-bold transition-colors ${
                                        isTabActive 
                                            ? 'text-blue-600 dark:text-blue-400' 
                                            : 'text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-300'
                                    }`}>
                                        {isTabActive ? 'Currently Viewing' : 'Click to View'}
                                    </span>
                                    <ArrowRight 
                                        size={13} 
                                        className={`transition-transform duration-200 group-hover:translate-x-0.5 ${
                                            isTabActive ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400'
                                        }`} 
                                    />
                                </div>
                            </motion.div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
