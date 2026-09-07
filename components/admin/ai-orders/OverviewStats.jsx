'use client';

import React from 'react';
import { Clock, CreditCard, CheckSquare, ArrowUp } from 'lucide-react';

export default function OverviewStats({ stats = {} }) {
    const total = stats?.total ?? 0;
    const pending = stats?.pending ?? 0;
    const paymentPending = stats?.paymentPending ?? 0;
    const accepted = stats?.accepted ?? 0;
    const completed = stats?.completed ?? 0;

    const cards = [
        {
            title: 'Total Orders',
            value: total,
            subtext: total > 0 ? `${total} orders live` : 'No orders yet',
            hasGrowth: total > 0,
            iconType: 'logo',
            iconBg: 'bg-blue-50 dark:bg-blue-950/60',
            iconColor: 'text-blue-600 dark:text-blue-400'
        },
        {
            title: 'Pending',
            value: pending,
            subtext: total > 0 ? `${Math.round((pending / total) * 100)}% of total` : '0%',
            hasGrowth: false,
            icon: Clock,
            iconBg: 'bg-amber-50 dark:bg-amber-950/60',
            iconColor: 'text-amber-500'
        },
        {
            title: 'Payment Pending',
            value: paymentPending,
            subtext: total > 0 ? `${Math.round((paymentPending / total) * 100)}% of total` : '0%',
            hasGrowth: false,
            icon: CreditCard,
            iconBg: 'bg-sky-50 dark:bg-sky-950/60',
            iconColor: 'text-sky-500'
        },
        {
            title: 'Accepted',
            value: accepted,
            subtext: total > 0 ? `${Math.round((accepted / total) * 100)}% of total` : '0%',
            hasGrowth: false,
            icon: CheckSquare,
            iconBg: 'bg-emerald-50 dark:bg-emerald-950/60',
            iconColor: 'text-emerald-500'
        },
        {
            title: 'Completed',
            value: completed,
            subtext: total > 0 ? `${Math.round((completed / total) * 100)}% of total` : '0%',
            hasGrowth: false,
            icon: CheckSquare,
            iconBg: 'bg-slate-100 dark:bg-slate-800',
            iconColor: 'text-slate-600 dark:text-slate-300'
        }
    ];

    return (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5 sm:gap-4">
            {cards.map((card, i) => (
                <div 
                    key={i} 
                    className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col justify-between transition-all hover:shadow-md"
                >
                    <div className="flex items-center justify-between pb-2">
                        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                            {card.title}
                        </span>
                        <div className={`w-8 h-8 rounded-xl ${card.iconBg} ${card.iconColor} flex items-center justify-center font-black text-xs shrink-0`}>
                            {card.iconType === 'logo' ? (
                                <span className="text-sm font-black">A</span>
                            ) : (
                                <card.icon size={16} />
                            )}
                        </div>
                    </div>

                    <div className="mt-1">
                        <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                            {card.value.toLocaleString('en-IN')}
                        </div>
                        <div className="mt-1 flex items-center text-xs font-semibold">
                            {card.hasGrowth ? (
                                <span className="inline-flex items-center text-emerald-600 dark:text-emerald-400">
                                    <ArrowUp size={12} className="mr-0.5" />
                                    {card.subtext}
                                </span>
                            ) : (
                                <span className="text-slate-400 dark:text-slate-500">
                                    {card.subtext}
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}
