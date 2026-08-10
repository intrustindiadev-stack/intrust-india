'use client';

export default function IncentiveMetricCard({ label, value, subtext, icon: Icon, bgClass = 'bg-gradient-to-br from-gray-500 to-gray-600' }) {
  return (
    <div className={`rounded-3xl p-5 text-white shadow-lg ${bgClass.includes('bg-gradient') ? bgClass : 'bg-gradient-to-br ' + bgClass}`}>
      <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center mb-3">
        {Icon && <Icon size={20} />}
      </div>
      <p className="text-white/70 text-xs font-bold uppercase tracking-widest">{label}</p>
      <p className="text-3xl font-black mt-1 font-mono">{value}</p>
      {subtext && <p className="text-white/70 text-xs font-medium mt-1">{subtext}</p>}
    </div>
  );
}
