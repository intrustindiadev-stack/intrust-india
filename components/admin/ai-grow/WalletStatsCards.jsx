'use client';

import { Wallet, TrendingUp, Activity, BarChart3 } from 'lucide-react';

function formatCurrency(amount) {
    if (amount === null || amount === undefined) return '₹0.00';
    return `₹${Number(amount).toLocaleString('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    })}`;
}

function StatCard({ icon: Icon, label, value, subtext, colorClass, glowClass, delay = 0 }) {
    return (
        <div
            className="relative overflow-hidden bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5 group"
            style={{ animationDelay: `${delay}ms` }}
        >
            {/* Decorative gradient blob */}
            <div className={`absolute -top-6 -right-6 w-28 h-28 rounded-full opacity-10 group-hover:opacity-20 transition-opacity duration-500 ${glowClass}`} />

            <div className="relative p-6">
                <div className="flex items-start justify-between mb-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${colorClass}`}>
                        <Icon size={22} className="opacity-90" />
                    </div>
                </div>

                <p className="text-2xl font-bold text-gray-900 font-mono tabular-nums tracking-tight mb-1">
                    {value}
                </p>
                <p className="text-sm font-medium text-gray-500">{label}</p>
                {subtext && (
                    <p className="text-xs text-gray-400 mt-1">{subtext}</p>
                )}
            </div>
        </div>
    );
}

export default function WalletStatsCards({ wallets = [], totalAdjustments30d = 0 }) {
    const activeWallets = wallets.filter(w => w.status === 'active');
    const frozenWallets = wallets.filter(w => w.status === 'frozen' || w.status === 'suspended');
    const totalPool = wallets.reduce((sum, w) => sum + (parseFloat(w.balance) || 0), 0);
    const avgBalance = activeWallets.length > 0 ? totalPool / activeWallets.length : 0;

    const stats = [
        {
            icon: Wallet,
            label: 'Total Active Wallets',
            value: activeWallets.length.toString(),
            subtext: `${frozenWallets.length} frozen / suspended`,
            colorClass: 'bg-indigo-100 text-indigo-600',
            glowClass: 'bg-indigo-500',
            delay: 0,
        },
        {
            icon: TrendingUp,
            label: 'Total Investment Pool',
            value: formatCurrency(totalPool),
            subtext: `Avg ${formatCurrency(avgBalance)} per wallet`,
            colorClass: 'bg-emerald-100 text-emerald-600',
            glowClass: 'bg-emerald-500',
            delay: 75,
        },
        {
            icon: Activity,
            label: 'Manual Adjustments (30D)',
            value: totalAdjustments30d.toString(),
            subtext: 'Admin-initiated entries',
            colorClass: 'bg-violet-100 text-violet-600',
            glowClass: 'bg-violet-500',
            delay: 150,
        },
        {
            icon: BarChart3,
            label: 'Avg Wallet Balance',
            value: formatCurrency(avgBalance),
            subtext: `Across ${wallets.length} merchants`,
            colorClass: 'bg-amber-100 text-amber-600',
            glowClass: 'bg-amber-500',
            delay: 225,
        },
    ];

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
            {stats.map((stat) => (
                <StatCard key={stat.label} {...stat} />
            ))}
        </div>
    );
}
