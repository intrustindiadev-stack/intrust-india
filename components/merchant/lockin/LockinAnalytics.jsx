'use client';

import { useState, useEffect } from 'react';
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    PieChart,
    Cell,
    Pie
} from 'recharts';
import { ShieldCheck, Info } from 'lucide-react';
import { useTheme } from '@/lib/contexts/ThemeContext';

export default function LockinAnalytics({ balances }) {
    const [mounted, setMounted] = useState(false);
    const { theme } = useTheme();
    const isDark = theme === 'dark';

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!balances || balances.length === 0) return null;

    // Generate projection data for the next 12 months
    const generateProjectionData = () => {
        const data = [];
        const now = new Date();

        for (let i = 0; i <= 12; i++) {
            const date = new Date(now.getFullYear(), now.getMonth() + i, 1);
            const label = date.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });

            let totalPrincipal = 0;
            let projectedValue = 0;

            balances.forEach(b => {
                if (b.status === 'active') {
                    const principal = (b.amount_paise || 0) / 100;
                    const rate = (b.interest_rate || 0) / 100;
                    if (!b.start_date) return;
                    const startDate = new Date(b.start_date);

                    const monthsDiff = (date.getFullYear() - startDate.getFullYear()) * 12 + (date.getMonth() - startDate.getMonth());

                    if (monthsDiff >= 0) {
                        totalPrincipal += principal;
                        const interest = principal * rate * (monthsDiff / 12);
                        projectedValue += principal + interest;
                    }
                }
            });

            data.push({
                name: label,
                Capital: totalPrincipal,
                Projection: projectedValue
            });
        }
        return data;
    };

    const chartData = generateProjectionData();

    // Pie Chart Data: Active vs Matured
    const statusData = [
        { name: 'Active', value: balances.filter(b => b.status === 'active').length, color: '#3b82f6' },
        { name: 'Unlocked', value: balances.filter(b => b.status === 'matured').length, color: '#10b981' },
    ].filter(d => d.value > 0);

    const CustomTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 p-3.5 rounded-2xl shadow-xl shadow-black/5 dark:shadow-black/40">
                    <p className="text-slate-400 dark:text-slate-500 font-black text-[9px] uppercase tracking-[0.2em] mb-2.5">{label}</p>
                    <div className="space-y-2">
                        <div className="flex items-center justify-between gap-6">
                            <span className="text-slate-500 dark:text-slate-400 text-[10px] font-semibold">Partnership Capital</span>
                            <span className="text-slate-900 dark:text-white font-bold text-xs">₹{payload[0]?.value?.toLocaleString('en-IN') || 0}</span>
                        </div>
                        <div className="flex items-center justify-between gap-6">
                            <span className="text-blue-600 dark:text-blue-400 text-[10px] font-semibold">Growth Projection</span>
                            <span className="text-blue-600 dark:text-blue-400 font-bold text-xs">₹{payload[1]?.value?.toLocaleString('en-IN', { maximumFractionDigits: 0 }) || 0}</span>
                        </div>
                    </div>
                </div>
            );
        }
        return null;
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 min-w-0">
            {/* Primary Growth Chart */}
            <div className="lg:col-span-8 space-y-4 min-w-0">
                <div className="h-[220px] sm:h-[260px] md:h-[320px] w-full min-w-0">
                    {mounted ? (
                        <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={220} debounce={50}>
                            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorProjection" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3B82F6" stopOpacity={isDark ? 0.25 : 0.12} />
                                        <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid
                                    strokeDasharray="3 3"
                                    vertical={false}
                                    stroke={isDark ? 'rgba(255, 255, 255, 0.07)' : '#f1f5f9'}
                                />
                                <XAxis
                                    dataKey="name"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: isDark ? '#94a3b8' : '#64748b', fontSize: 9, fontWeight: 700 }}
                                    dy={10}
                                />
                                <YAxis hide />
                                <Tooltip content={<CustomTooltip />} />
                                <Area
                                    type="monotone"
                                    dataKey="Capital"
                                    stroke="#10B981"
                                    strokeWidth={2.5}
                                    fillOpacity={isDark ? 0.08 : 0.05}
                                    fill="#10B981"
                                    activeDot={{ r: 4, fill: '#10B981', stroke: '#fff', strokeWidth: 2 }}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="Projection"
                                    stroke="#3B82F6"
                                    strokeWidth={3}
                                    fillOpacity={1}
                                    fill="url(#colorProjection)"
                                    activeDot={{ r: 6, fill: '#3B82F6', stroke: '#fff', strokeWidth: 3 }}
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="w-full h-full flex items-center justify-center bg-slate-50 dark:bg-slate-800/40 rounded-2xl animate-pulse">
                            <span className="text-xs text-slate-400 font-medium">Loading growth roadmap...</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Distribution/Meta Box */}
            <div className="lg:col-span-4 space-y-6 min-w-0">
                <div className="bg-slate-50/80 dark:bg-slate-900/80 rounded-2xl p-6 border border-slate-200/80 dark:border-slate-800 flex flex-col justify-between h-full min-w-0">
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h4 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">Portfolio Health</h4>
                            <div className="p-1.5 bg-blue-50 dark:bg-blue-500/15 rounded-lg text-blue-500 dark:text-blue-400">
                                <ShieldCheck size={14} />
                            </div>
                        </div>

                        <div className="w-full h-32 relative flex items-center justify-center min-w-0">
                            {mounted && statusData.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={120} debounce={50}>
                                    <PieChart>
                                        <Pie
                                            data={statusData}
                                            innerRadius={35}
                                            outerRadius={45}
                                            paddingAngle={5}
                                            dataKey="value"
                                        >
                                            {statusData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                                            ))}
                                        </Pie>
                                    </PieChart>
                                </ResponsiveContainer>
                            ) : mounted ? (
                                <p className="text-[10px] text-slate-400 dark:text-slate-500 italic">No historical data</p>
                            ) : (
                                <div className="w-20 h-20 rounded-full border-2 border-slate-200 dark:border-slate-700 animate-pulse" />
                            )}
                        </div>

                        <div className="space-y-2">
                            {statusData.map((item, idx) => (
                                <div key={idx} className="flex items-center justify-between text-[10px]">
                                    <div className="flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: item.color }} />
                                        <span className="font-bold text-slate-600 dark:text-slate-300">{item.name} Contracts</span>
                                    </div>
                                    <span className="font-black text-slate-900 dark:text-white">{item.value}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="mt-6 pt-6 border-t border-slate-200/80 dark:border-slate-800">
                        <div className="flex items-start gap-3">
                            <div className="p-1.5 bg-white dark:bg-slate-800 rounded-lg shadow-2xs border border-slate-200/80 dark:border-slate-700">
                                <Info size={12} className="text-slate-400 dark:text-slate-400" />
                            </div>
                            <p className="text-[9px] text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
                                Growth projections reflect operational inventory turnover performance. Values reset upon maturity and reallocation.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

