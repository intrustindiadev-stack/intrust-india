'use client';

import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    BarChart,
    Bar,
    Legend
} from 'recharts';

export default function AdminAnalyticsCharts({ userGrowthData, revenueSourceData }) {

    // Custom Tooltip for Area Chart
    const CustomTooltipArea = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-slate-900 border border-slate-700/50 p-4 shadow-xl rounded-2xl flex flex-col gap-1 z-50">
                    <p className="text-slate-400 font-bold text-xs uppercase tracking-wider mb-1">{label}</p>
                    {payload.map((entry, index) => (
                        <div key={index} className="flex items-center gap-3">
                            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
                            <p className="text-white font-medium text-sm">
                                {entry.name}: <span className="font-extrabold">{entry.value}</span>
                            </p>
                        </div>
                    ))}
                </div>
            );
        }
        return null;
    };

    // Custom Tooltip for Bar Chart
    const CustomTooltipBar = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-slate-900 border border-slate-700/50 p-4 shadow-xl rounded-2xl flex flex-col gap-1 z-50">
                    <p className="text-slate-400 font-bold text-xs uppercase tracking-wider mb-1">{label}</p>
                    {payload.map((entry, index) => (
                        <div key={index} className="flex items-center gap-3">
                            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
                            <p className="text-white font-medium text-sm">
                                Revenue: <span className="font-extrabold">₹{entry.value.toLocaleString('en-IN')}</span>
                            </p>
                        </div>
                    ))}
                </div>
            );
        }
        return null;
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            {/* User Growth Chart */}
            <div className="bg-white dark:bg-slate-800/50 p-6 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700 lg:col-span-2 group">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h3 className="text-xl font-extrabold text-slate-900 dark:text-white font-[family-name:var(--font-outfit)] tracking-tight">
                            User Growth Matrix
                        </h3>
                        <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">New registrations over the past 14 days</p>
                    </div>
                    <span className="hidden sm:inline-flex px-3 py-1 bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold text-xs uppercase tracking-wider rounded-lg border border-blue-100 dark:border-blue-500/20">
                        Daily Metric
                    </span>
                </div>
                <div className="h-[320px] w-full mt-4">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart
                            data={userGrowthData}
                            margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                        >
                            <defs>
                                <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#E2E8F0" opacity={0.5} />
                            <XAxis
                                dataKey="date"
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: '#94A3B8', fontSize: 11, fontWeight: 600 }}
                                dy={15}
                            />
                            <YAxis
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: '#94A3B8', fontSize: 11, fontWeight: 600 }}
                                dx={-5}
                            />
                            <Tooltip content={<CustomTooltipArea />} cursor={{ stroke: '#94A3B8', strokeWidth: 1, strokeDasharray: '3 3' }} />
                            <Area
                                type="monotone"
                                dataKey="users"
                                name="New Users"
                                stroke="#3b82f6"
                                strokeWidth={4}
                                fillOpacity={1}
                                fill="url(#colorUsers)"
                                activeDot={{ r: 6, strokeWidth: 0, fill: '#2563eb' }}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Revenue Stream */}
            <div className="bg-white dark:bg-slate-800/50 p-6 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700 lg:col-span-2 group">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h3 className="text-xl font-extrabold text-slate-900 dark:text-white font-[family-name:var(--font-outfit)] tracking-tight">
                            Platform Revenue Streams
                        </h3>
                        <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Income generation by major product lines</p>
                    </div>
                    <span className="hidden sm:inline-flex px-3 py-1 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold text-xs uppercase tracking-wider rounded-lg border border-emerald-100 dark:border-emerald-500/20">
                        Aggregate
                    </span>
                </div>
                <div className="h-[320px] w-full mt-4">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                            data={revenueSourceData}
                            margin={{ top: 20, right: 10, left: -10, bottom: 5 }}
                            barSize={50}
                        >
                            <defs>
                                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#10b981" stopOpacity={1} />
                                    <stop offset="100%" stopColor="#059669" stopOpacity={0.8} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#E2E8F0" opacity={0.5} />
                            <XAxis
                                dataKey="name"
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: '#94A3B8', fontSize: 12, fontWeight: 700 }}
                                dy={15}
                            />
                            <YAxis
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: '#94A3B8', fontSize: 11, fontWeight: 600 }}
                                tickFormatter={(value) => `₹${value >= 1000 ? (value / 1000) + 'k' : value}`}
                                dx={-5}
                            />
                            <Tooltip
                                content={<CustomTooltipBar />}
                                cursor={{ fill: '#F1F5F9', opacity: 0.4 }}
                            />
                            <Bar
                                dataKey="value"
                                fill="url(#colorRevenue)"
                                radius={[8, 8, 4, 4]}
                                activeBar={{ stroke: '#047857', strokeWidth: 2 }}
                            />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
}
