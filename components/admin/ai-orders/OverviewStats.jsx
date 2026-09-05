'use client';

import React from 'react';
import { PackageOpen, Zap, TrendingUp } from 'lucide-react';

export default function OverviewStats({ stats }) {
    const totalOrders = stats?.totalOrders || 0;
    const activeInvestments = stats?.activeInvestments || 0;
    const totalProfitDistributed = stats?.totalProfitDistributed || 0;

    const cards = [
        {
            title: 'Total Orders Fed',
            value: totalOrders.toLocaleString(),
            icon: PackageOpen,
            color: 'text-blue-500',
            bg: 'bg-blue-50 dark:bg-blue-500/10'
        },
        {
            title: 'Active Investments',
            value: `₹${(activeInvestments / 100).toLocaleString('en-IN')}`,
            icon: Zap,
            color: 'text-amber-500',
            bg: 'bg-amber-50 dark:bg-amber-500/10'
        },
        {
            title: 'Profit Distributed',
            value: `₹${(totalProfitDistributed / 100).toLocaleString('en-IN')}`,
            icon: TrendingUp,
            color: 'text-emerald-500',
            bg: 'bg-emerald-50 dark:bg-emerald-500/10'
        }
    ];

    return (
        <div className="grid gap-4 md:grid-cols-3">
            {cards.map((card, i) => (
                <div key={i} className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm">
                    <div className="flex flex-row items-center justify-between pb-2">
                        <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400">
                            {card.title}
                        </h3>
                        <div className={`p-2 rounded-lg ${card.bg}`}>
                            <card.icon className={`h-4 w-4 ${card.color}`} />
                        </div>
                    </div>
                    <div>
                        <div className="text-2xl font-bold text-slate-900 dark:text-white">
                            {card.value}
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}
