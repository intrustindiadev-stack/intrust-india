import React from 'react';

export default function MetricCard({ label, value, subtext, icon: Icon, accentColor = 'emerald' }) {
  const borderAccents = {
    emerald: 'border-t-emerald-500',
    amber: 'border-t-amber-500',
    rose: 'border-t-rose-500',
    blue: 'border-t-blue-500',
    indigo: 'border-t-indigo-500',
    slate: 'border-t-slate-400',
  };

  return (
    <div className={`bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 border-t-2 ${borderAccents[accentColor] || borderAccents.emerald} rounded-xl p-4 sm:p-5 shadow-xs`}>
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{label}</p>
        {Icon && <Icon size={16} className="text-slate-400 dark:text-slate-500" />}
      </div>
      <div className="mt-2 flex items-baseline gap-2">
        <span className="text-2xl sm:text-3xl font-semibold text-slate-900 dark:text-slate-100 font-mono tracking-tight">{value}</span>
        {subtext && <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">{subtext}</span>}
      </div>
    </div>
  );
}
