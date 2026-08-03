'use client';

import { Sun, Sparkles, Clock, TrendingUp } from 'lucide-react';

export default function SolarStats({ stats }) {
    const statCards = [
        { label: 'Total Leads', value: stats.total, icon: Sun, color: 'text-amber-500', bg: 'bg-amber-500/10' },
        { label: 'New Today', value: stats.today, icon: Sparkles, color: 'text-blue-500', bg: 'bg-blue-500/10' },
        { label: 'Pending', value: stats.new, icon: Clock, color: 'text-orange-500', bg: 'bg-orange-500/10' },
        { label: 'Converted', value: stats.converted, icon: TrendingUp, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
    ];

    return (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {statCards.map((s, i) => (
                <div key={i} className="bg-white dark:bg-white/[0.03] rounded-[2rem] border border-slate-200 dark:border-white/5 p-6 shadow-sm">
                    <div className={`w-10 h-10 ${s.bg} rounded-2xl flex items-center justify-center mb-4`}>
                        <s.icon size={20} className={s.color} />
                    </div>
                    <p className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter">{s.value}</p>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">{s.label}</p>
                </div>
            ))}
        </div>
    );
}
