'use client';

export default function IncentiveMetricCard({ label, value, subtext, icon: Icon, iconBg = 'bg-slate-100 text-slate-600' }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex justify-between items-start">
      <div className="space-y-1">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{label}</p>
        <p className="text-2xl font-semibold text-slate-900 tracking-tight font-mono tabular-nums">
          {value}
        </p>
        {subtext && <p className="text-xs text-slate-400 font-medium">{subtext}</p>}
      </div>
      {Icon && (
        <div className={`p-2.5 rounded-lg ${iconBg} shrink-0`}>
          <Icon size={18} />
        </div>
      )}
    </div>
  );
}
