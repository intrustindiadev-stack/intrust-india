import React from 'react';
import { Calendar } from 'lucide-react';

export default function DateRangeBreakdown({ breakdown }) {
  if (!breakdown) return null;

  return (
    <div className="bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 space-y-2 text-xs">
      <div className="flex items-center justify-between font-medium text-slate-700 dark:text-slate-200">
        <span className="flex items-center gap-1.5">
          <Calendar size={14} className="text-slate-400" /> Total Calendar Days:
        </span>
        <span className="font-mono font-semibold">{breakdown.calendar_days} day(s)</span>
      </div>

      <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
        <span>Weekend Days Excluded:</span>
        <span className="font-mono">{breakdown.weekend_days} day(s)</span>
      </div>

      {breakdown.holiday_days > 0 && (
        <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
          <span>Holidays Excluded:</span>
          <span className="font-mono">{breakdown.holiday_days} day(s)</span>
        </div>
      )}

      {breakdown.holidays && breakdown.holidays.length > 0 && (
        <div className="pt-1 text-[11px] text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 p-2 rounded-lg border border-amber-200 dark:border-amber-800/50">
          <span className="font-semibold">Holidays in range: </span>
          {breakdown.holidays.map(h => `${h.name} (${h.date})`).join(', ')}
        </div>
      )}

      <div className="pt-2 border-t border-slate-200 dark:border-slate-700/60 flex items-center justify-between font-bold text-slate-900 dark:text-slate-100 text-sm">
        <span>Chargeable Leave Days:</span>
        <span className="font-mono text-emerald-600 dark:text-emerald-400">{breakdown.chargeable_days} day(s)</span>
      </div>
    </div>
  );
}
