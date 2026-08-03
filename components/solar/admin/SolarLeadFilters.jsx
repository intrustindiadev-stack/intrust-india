'use client';

import { Search, Filter } from 'lucide-react';
import { SOLAR_STATUS_FLOW, SOLAR_STATUSES } from '@/lib/solar/statuses';

export default function SolarLeadFilters({ search, setSearch, filterStatus, setFilterStatus }) {
    return (
        <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
                <Search size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input type="text" placeholder="Search by name, mobile, city, reference..."
                    value={search} onChange={e => setSearch(e.target.value)}
                    className="w-full pl-14 pr-5 py-4 rounded-2xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 font-medium text-sm text-slate-900 dark:text-white transition-all" />
            </div>
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
                <Filter size={14} className="text-slate-400 shrink-0" />
                {['all', ...SOLAR_STATUS_FLOW].map(s => (
                    <button key={s} onClick={() => setFilterStatus(s)}
                        className={`whitespace-nowrap px-4 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all shrink-0 ${filterStatus === s
                            ? 'bg-slate-900 dark:bg-white text-white dark:text-black shadow-lg'
                            : 'bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-500 hover:bg-slate-50'}`}>
                        {s === 'all' ? 'All' : SOLAR_STATUSES[s]?.label || s}
                    </button>
                ))}
            </div>
        </div>
    );
}
