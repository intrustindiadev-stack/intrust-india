'use client';

import {
    ResponsiveContainer,
    ComposedChart,
    Area,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend
} from 'recharts';

/**
 * Lazy-loaded hourly engagement chart for a sponsorship day.
 *
 * Plots Plays (players who completed the challenge) and Product Clicks
 * per hour (0–23 IST) on a single readable axis pair.
 *
 * @param {{ data: Array<{hour:number, label:string, plays:number, clicks:number, impressions:number}> }} props
 */
export default function SponsorshipAnalyticsChart({ data, hourlyData }) {
    const chartData = data || hourlyData || [];
    const total = chartData.reduce(
        (acc, d) => acc + (d.plays || 0) + (d.clicks || 0),
        0
    );

    if (!chartData.length || total === 0) {
        return (
            <div className="h-[260px] flex flex-col items-center justify-center text-center gap-2">
                <div className="w-10 h-10 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M3 3v18h18" strokeLinecap="round" />
                        <path d="M7 15l4-4 3 3 5-6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                </div>
                <p className="text-xs font-bold text-slate-500 dark:text-slate-400">
                    No engagement recorded yet
                </p>
                <p className="text-[11px] text-slate-400 max-w-[220px]">
                    Hourly plays and product clicks will appear here once players engage with your billboard.
                </p>
            </div>
        );
    }

    return (
        <div className="w-full h-[260px] -ml-2">
            <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                    <defs>
                        <linearGradient id="playsGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.35} />
                            <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.02} />
                        </linearGradient>
                    </defs>

                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.25)" vertical={false} />

                    <XAxis
                        dataKey="label"
                        tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 600 }}
                        tickLine={false}
                        axisLine={false}
                        interval={2}
                    />
                    <YAxis
                        tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 600 }}
                        tickLine={false}
                        axisLine={false}
                        allowDecimals={false}
                        width={40}
                    />

                    <Tooltip
                        contentStyle={{
                            borderRadius: 12,
                            border: '1px solid rgba(226,232,240,0.9)',
                            boxShadow: '0 8px 24px rgba(15,23,42,0.10)',
                            fontSize: 12,
                            fontWeight: 600,
                            padding: '8px 12px'
                        }}
                        labelStyle={{ fontSize: 11, fontWeight: 800, color: '#0f172a' }}
                        formatter={(value, name) => [
                            value,
                            name === 'plays' ? 'Challenge Plays' : 'Product Clicks'
                        ]}
                    />

                    <Legend
                        verticalAlign="top"
                        height={28}
                        iconType="circle"
                        iconSize={8}
                        formatter={(value) => (
                            <span style={{ fontSize: 11, fontWeight: 700, color: '#64748b' }}>
                                {value === 'plays' ? 'Challenge Plays' : 'Product Clicks'}
                            </span>
                        )}
                    />

                    <Area
                        type="monotone"
                        dataKey="plays"
                        stroke="#3b82f6"
                        strokeWidth={2.5}
                        fill="url(#playsGradient)"
                        dot={false}
                        activeDot={{ r: 4, strokeWidth: 2 }}
                    />
                    <Bar
                        dataKey="clicks"
                        fill="#f59e0b"
                        radius={[3, 3, 0, 0]}
                        maxBarSize={14}
                        opacity={0.9}
                    />
                </ComposedChart>
            </ResponsiveContainer>
        </div>
    );
}
