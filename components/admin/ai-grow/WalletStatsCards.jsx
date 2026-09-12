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
            className="relative overflow-hidden bg-white rounded-2xl border border-[#EAEFF4] shadow-xs hover:shadow-md transition-all duration-300 hover:-translate-y-0.5 group p-3.5 sm:p-5 flex flex-col justify-between min-h-[112px] sm:min-h-[135px]"
            style={{ animationDelay: `${delay}ms` }}
        >
            {/* Decorative gradient blob */}
            <div className={`absolute -top-3 -right-3 sm:-top-6 sm:-right-6 w-16 h-16 sm:w-28 sm:h-28 rounded-full opacity-10 group-hover:opacity-20 transition-opacity duration-500 pointer-events-none ${glowClass}`} />

            <div className="flex items-start justify-between mb-2 sm:mb-3">
                <div className={`w-8 h-8 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center shrink-0 ${colorClass}`}>
                    <Icon size={18} className="sm:w-5 sm:h-5 opacity-90" />
                </div>
            </div>

            <div>
                <p className="text-base sm:text-xl lg:text-2xl font-bold text-gray-900 tabular-nums tracking-tight mb-0.5 sm:mb-1 truncate" title={value}>
                    {value}
                </p>
                <p className="text-xs sm:text-sm font-medium text-gray-600 line-clamp-1">{label}</p>
                {subtext && (
                    <p className="text-[11px] sm:text-xs text-gray-400 mt-0.5 sm:mt-1 truncate">{subtext}</p>
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
            label: 'Active Wallets',
            value: activeWallets.length.toString(),
            subtext: `${frozenWallets.length} frozen / suspended`,
            colorClass: 'bg-indigo-100 text-indigo-600',
            glowClass: 'bg-indigo-500',
            delay: 0,
        },
        {
            icon: TrendingUp,
            label: 'Capital Pool',
            value: formatCurrency(totalPool),
            subtext: `Avg ${formatCurrency(avgBalance)}`,
            colorClass: 'bg-emerald-100 text-emerald-600',
            glowClass: 'bg-emerald-500',
            delay: 75,
        },
        {
            icon: Activity,
            label: 'Adjustments (30D)',
            value: totalAdjustments30d.toString(),
            subtext: 'Admin-initiated',
            colorClass: 'bg-violet-100 text-violet-600',
            glowClass: 'bg-violet-500',
            delay: 150,
        },
        {
            icon: BarChart3,
            label: 'Avg Balance',
            value: formatCurrency(avgBalance),
            subtext: `${wallets.length} merchants`,
            colorClass: 'bg-amber-100 text-amber-600',
            glowClass: 'bg-amber-500',
            delay: 225,
        },
    ];

    return (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4 lg:gap-5">
            {stats.map((stat) => (
                <StatCard key={stat.label} {...stat} />
            ))}
        </div>
    );
}
