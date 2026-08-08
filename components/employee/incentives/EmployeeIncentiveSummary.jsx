'use client';

import { DollarSign, CheckCircle2, Calendar } from 'lucide-react';
import { formatPaiseToINR } from '@/lib/hrm/incentives';

export default function EmployeeIncentiveSummary({ summary }) {
  const paidYTD = summary?.paid_ytd_paise || 0;
  const upcoming = summary?.approved_upcoming_paise || 0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 font-[family-name:var(--font-outfit)]">
      <div className="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800/60 rounded-3xl p-6 shadow-xl shadow-slate-200/20 dark:shadow-black/20 backdrop-blur-xl relative overflow-hidden flex justify-between items-start group">
        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none" />
        <div className="space-y-1 z-10">
          <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Paid Bonuses (YTD)</p>
          <p className="text-3xl font-black text-slate-900 dark:text-white tracking-tight font-mono">
            {formatPaiseToINR(paidYTD)}
          </p>
          <p className="text-xs text-slate-400 font-semibold">{new Date().getFullYear()} Calendar Year</p>
        </div>
        <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0 flex items-center justify-center border border-emerald-100 dark:border-emerald-500/20 shadow-sm z-10 group-hover:scale-110 transition-transform">
          <DollarSign size={22} />
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800/60 rounded-3xl p-6 shadow-xl shadow-slate-200/20 dark:shadow-black/20 backdrop-blur-xl relative overflow-hidden flex justify-between items-start group">
        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none" />
        <div className="space-y-1 z-10">
          <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Approved & Upcoming</p>
          <p className="text-3xl font-black text-slate-900 dark:text-white tracking-tight font-mono">
            {formatPaiseToINR(upcoming)}
          </p>
          <p className="text-xs text-slate-400 font-semibold">Included in Next Payroll</p>
        </div>
        <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 shrink-0 flex items-center justify-center border border-indigo-100 dark:border-indigo-500/20 shadow-sm z-10 group-hover:scale-110 transition-transform">
          <CheckCircle2 size={22} />
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800/60 rounded-3xl p-6 shadow-xl shadow-slate-200/20 dark:shadow-black/20 backdrop-blur-xl relative overflow-hidden flex justify-between items-start group">
        <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none" />
        <div className="space-y-1 z-10">
          <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Next Payout Cycle</p>
          <p className="text-xl font-black text-slate-900 dark:text-white tracking-tight pt-1">
            {new Date().toLocaleString('en-IN', { month: 'long', year: 'numeric' })}
          </p>
          <p className="text-xs text-slate-400 font-semibold mt-1">Standard Payroll Run</p>
        </div>
        <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 shrink-0 flex items-center justify-center border border-amber-100 dark:border-amber-500/20 shadow-sm z-10 group-hover:scale-110 transition-transform">
          <Calendar size={22} />
        </div>
      </div>
    </div>
  );
}
