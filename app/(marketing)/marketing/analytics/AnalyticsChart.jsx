'use client';

import { useMemo } from 'react';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
} from 'recharts';

export default function AnalyticsChart({ trendData = [] }) {
    const data = useMemo(() => trendData, [trendData]);
    if (!data.length) {
        return (
            <div className="h-[220px] sm:h-[280px] flex flex-col items-center justify-center text-center gap-2 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-dashed border-slate-200 dark:border-slate-700">
                <p className="text-xs font-black text-slate-700 dark:text-slate-200">No activity in this range yet</p>
                <p className="text-[11px] text-slate-500 max-w-xs">Share a product or play the daily quiz — your curve appears here within seconds.</p>
            </div>
        );
    }
    return (
        <div className="h-[220px] sm:h-[280px] lg:h-[340px] w-full">
            <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" opacity={0.5} />
                    <XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: '#94A3B8' }} />
                    <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: '#94A3B8' }} allowDecimals={false} />
                    <Tooltip
                        contentStyle={{ backgroundColor: '#0F172A', borderRadius: '0.75rem', border: 'none', color: '#fff', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '11px' }}
                        itemStyle={{ color: '#fff' }}
                    />
                    <Line type="monotone" dataKey="clicks" stroke="#2563EB" strokeWidth={2} dot={{ r: 3, strokeWidth: 1.5, fill: '#fff' }} activeDot={{ r: 5 }} name="Link Clicks" />
                    <Line type="monotone" dataKey="orders" stroke="#059669" strokeWidth={2} dot={{ r: 3, strokeWidth: 1.5, fill: '#fff' }} activeDot={{ r: 5 }} name="Orders" />
                    <Line type="monotone" dataKey="shares" stroke="#6366F1" strokeWidth={2} strokeDasharray="5 5" dot={false} activeDot={{ r: 5 }} name="Shares" />
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
}
