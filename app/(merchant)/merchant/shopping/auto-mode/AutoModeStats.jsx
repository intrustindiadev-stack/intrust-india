import { Package, TrendingUp, BarChart2, Clock } from 'lucide-react';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function AutoModeStats({ autoStats, chartData }) {
    if (!autoStats || chartData.length === 0) return null;

    return (
        <div className="w-full max-w-sm mx-auto mt-4 space-y-4 pb-10">
            {/* Stat Cards */}
            <div className="grid grid-cols-2 gap-3">
                {[
                    { label: "Today's Orders", value: autoStats.todayCount, icon: Package, cls: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' },
                    { label: 'Monthly Revenue', value: `₹${(autoStats.monthRevenue / 100).toLocaleString('en-IN')}`, icon: TrendingUp, cls: 'bg-blue-500/10 border-blue-500/20 text-blue-400' },
                    { label: 'Total Orders', value: autoStats.totalOrders, icon: BarChart2, cls: 'bg-violet-500/10 border-violet-500/20 text-violet-400' },
                    { label: 'System Status', value: 'ONLINE', icon: Clock, cls: 'bg-amber-500/10 border-amber-500/20 text-amber-400' },
                ].map(stat => {
                    const Icon = stat.icon;
                    return (
                        <div key={stat.label} className={`rounded-2xl border p-4 ${stat.cls} backdrop-blur-sm bg-[#0f111a]/80`}>
                            <div className="flex items-center justify-between mb-2">
                                <p className="text-[9px] font-black uppercase tracking-wider opacity-70">{stat.label}</p>
                                <Icon size={14} />
                            </div>
                            <p className="text-lg font-black tracking-tight">{stat.value}</p>
                        </div>
                    );
                })}
            </div>

            {/* 7-day Order Trend */}
            <div className="bg-[#0f111a]/90 border border-emerald-500/20 rounded-2xl p-4">
                <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <TrendingUp size={12} /> 7-Day Order Trend
                </p>
                <ResponsiveContainer width="100%" height={120}>
                    <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                        <defs>
                            <linearGradient id="emeraldGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                        <XAxis dataKey="day" tick={{ fontSize: 8, fill: '#6b7280' }} tickLine={false} axisLine={false} />
                        <YAxis tick={{ fontSize: 8, fill: '#6b7280' }} tickLine={false} axisLine={false} allowDecimals={false} />
                        <Tooltip
                            contentStyle={{ background: '#1f2937', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 12, fontSize: 11 }}
                            labelStyle={{ color: '#10b981' }}
                            itemStyle={{ color: '#d1fae5' }}
                        />
                        <Area type="monotone" dataKey="orders" stroke="#10b981" strokeWidth={2} fill="url(#emeraldGrad)" dot={{ fill: '#10b981', strokeWidth: 0, r: 3 }} />
                    </AreaChart>
                </ResponsiveContainer>
            </div>

            {/* Weekly Revenue Bar Chart */}
            <div className="bg-[#0f111a]/90 border border-blue-500/20 rounded-2xl p-4">
                <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <BarChart2 size={12} /> Weekly Revenue (₹)
                </p>
                <ResponsiveContainer width="100%" height={100}>
                    <BarChart data={chartData} margin={{ top: 4, right: 4, left: -24, bottom: 0 }} barSize={18}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                        <XAxis dataKey="day" tick={{ fontSize: 8, fill: '#6b7280' }} tickLine={false} axisLine={false} />
                        <YAxis tick={{ fontSize: 8, fill: '#6b7280' }} tickLine={false} axisLine={false} />
                        <Tooltip
                            contentStyle={{ background: '#1f2937', border: '1px solid rgba(59,130,246,0.2)', borderRadius: 12, fontSize: 11 }}
                            labelStyle={{ color: '#60a5fa' }}
                            itemStyle={{ color: '#bfdbfe' }}
                            formatter={(v) => [`₹${v.toLocaleString('en-IN')}`, 'Revenue']}
                        />
                        <Bar dataKey="revenue" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
