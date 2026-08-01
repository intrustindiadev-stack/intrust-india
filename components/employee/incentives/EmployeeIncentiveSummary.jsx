'use client';

import { DollarSign, CheckCircle2, Calendar } from 'lucide-react';
import { formatPaiseToINR } from '@/lib/hrm/incentives';

export default function EmployeeIncentiveSummary({ summary }) {
  const paidYTD = summary?.paid_ytd_paise || 0;
  const upcoming = summary?.approved_upcoming_paise || 0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 font-[family-name:var(--font-outfit)]">
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex justify-between items-start">
        <div className="space-y-1">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Paid Bonuses (YTD)</p>
          <p className="text-2xl font-bold text-slate-900 tracking-tight font-mono">
            {formatPaiseToINR(paidYTD)}
          </p>
          <p className="text-xs text-slate-400 font-medium">{new Date().getFullYear()} Calendar Year</p>
        </div>
        <div className="p-2.5 rounded-lg bg-emerald-50 text-emerald-600 shrink-0">
          <DollarSign size={20} />
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex justify-between items-start">
        <div className="space-y-1">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Approved & Upcoming</p>
          <p className="text-2xl font-bold text-slate-900 tracking-tight font-mono">
            {formatPaiseToINR(upcoming)}
          </p>
          <p className="text-xs text-slate-400 font-medium">Included in Next Payroll</p>
        </div>
        <div className="p-2.5 rounded-lg bg-indigo-50 text-indigo-600 shrink-0">
          <CheckCircle2 size={20} />
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex justify-between items-start">
        <div className="space-y-1">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Next Payout Cycle</p>
          <p className="text-xl font-bold text-slate-900 tracking-tight">
            {new Date().toLocaleString('en-IN', { month: 'long', year: 'numeric' })}
          </p>
          <p className="text-xs text-slate-400 font-medium">Standard Payroll Run</p>
        </div>
        <div className="p-2.5 rounded-lg bg-slate-100 text-slate-600 shrink-0">
          <Calendar size={20} />
        </div>
      </div>
    </div>
  );
}
