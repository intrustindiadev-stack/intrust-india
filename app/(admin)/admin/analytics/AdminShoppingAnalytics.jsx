'use client';

import { useState, useCallback, useEffect } from 'react';
import {
    BarChart,
    Bar,
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
} from 'recharts';
import { createClient } from '@/lib/supabaseClient';
import { ShoppingBag, Package, Clock, Boxes } from 'lucide-react';

const formatCurrency = (paise) => {
    const amount = (paise || 0) / 100;
    if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(2)}Cr`;
    if (amount >= 100000) return `₹${(amount / 100000).toFixed(2)}L`;
    if (amount >= 1000) return `₹${(amount / 1000).toFixed(2)}K`;
    return `₹${amount.toFixed(2)}`;
};

// Custom tooltips
function BarTooltip({ active, payload, label }) {
    if (!active || !payload?.length) return null;
    return (
        <div className="bg-slate-900 border border-slate-700/50 p-3 rounded-2xl shadow-xl">
            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-1">{label}</p>
            <p className="text-white font-extrabold">₹{(payload[0]?.value || 0).toLocaleString('en-IN')}</p>
        </div>
    );
}

function AreaTooltip({ active, payload, label }) {
    if (!active || !payload?.length) return null;
    return (
        <div className="bg-slate-900 border border-slate-700/50 p-3 rounded-2xl shadow-xl">
            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-1">{label}</p>
            <p className="text-white font-extrabold">{payload[0]?.value} orders</p>
        </div>
    );
}

export default function AdminShoppingAnalytics({ initialShoppingStats, initialTop5Products, initialShoppingOrdersChartData }) {
    const [stats, setStats] = useState(initialShoppingStats);
    const [top5Products, setTop5Products] = useState(initialTop5Products || []);
    const [ordersChartData, setOrdersChartData] = useState(initialShoppingOrdersChartData || []);
    const [refreshing, setRefreshing] = useState(false);

    const refresh = useCallback(async () => {
        setRefreshing(true);
        try {
            const res = await fetch('/api/admin/analytics/summary');
            if (!res.ok) throw new Error(`API error: ${res.status}`);
            const data = await res.json();
            if (data.shoppingStats) setStats(data.shoppingStats);
            if (data.top5Products) setTop5Products(data.top5Products);
            if (data.shoppingOrdersChartData) setOrdersChartData(data.shoppingOrdersChartData);
        } catch (err) {
            console.error('[AdminShoppingAnalytics] refresh error:', err);
        } finally {
            setRefreshing(false);
        }
    }, []);

    // Realtime subscription on shopping_order_groups
    useEffect(() => {
        const supabase = createClient();
        const channel = supabase
            .channel('admin-shopping-analytics')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'shopping_order_groups' }, () => refresh())
            .on('postgres_changes', { event: '*', schema: 'public', table: 'shopping_order_items' }, () => refresh())
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [refresh]);

    const statCards = [
        {
            label: 'Shopping Revenue',
            value: formatCurrency(stats?.totalRevenue || 0),
            icon: ShoppingBag,
            color: 'text-amber-600',
            bg: 'bg-amber-50',
            border: 'border-amber-100',
        },
        {
            label: 'Total Orders',
            value: (stats?.totalOrders || 0).toLocaleString('en-IN'),
            icon: Package,
            color: 'text-violet-600',
            bg: 'bg-violet-50',
            border: 'border-violet-100',
        },
        {
            label: 'Pending Dispatch',
            value: (stats?.pendingDispatch || 0).toLocaleString('en-IN'),
            icon: Clock,
            color: 'text-rose-600',
            bg: 'bg-rose-50',
            border: 'border-rose-100',
        },
        {
            label: 'Active Products',
            value: `${(stats?.activeProducts || 0)}/${(stats?.totalProducts || 0)}`,
            icon: Boxes,
            color: 'text-emerald-600',
            bg: 'bg-emerald-50',
            border: 'border-emerald-100',
        },
    ];

    return (
        <section className="mb-8">
            {/* Section Header */}
            <div className="flex items-center justify-between mb-5">
                <div>
                    <h2 className="text-xl font-extrabold text-slate-900 dark:text-white font-[family-name:var(--font-outfit)] tracking-tight">
                        Shopping Analytics
                    </h2>
                    <p className="text-slate-500 text-sm font-medium mt-0.5">
                        Store performance, product revenue &amp; dispatch status
                    </p>
                </div>
                <button
                    onClick={refresh}
                    disabled={refreshing}
                    className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-amber-600 hover:border-amber-200 transition-all shadow-sm disabled:opacity-50"
                >
                    <ShoppingBag size={13} className={refreshing ? 'animate-pulse' : ''} />
                    {refreshing ? 'Refreshing…' : 'Refresh'}
                </button>
            </div>

            {/* Stat Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                {statCards.map((card) => (
                    <div
                        key={card.label}
                        className={`bg-white dark:bg-slate-800/50 rounded-3xl p-5 border ${card.border} dark:border-slate-700 shadow-sm hover:shadow-md transition-all`}
                    >
                        <div className={`w-10 h-10 rounded-2xl ${card.bg} flex items-center justify-center mb-3`}>
                            <card.icon className={`w-5 h-5 ${card.color}`} />
                        </div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">{card.label}</p>
                        <p className="text-2xl font-extrabold text-slate-900 dark:text-white">{card.value}</p>
                    </div>
                ))}
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Top 5 Products by Revenue */}
                <div className="bg-white dark:bg-slate-800/50 rounded-3xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
                    <div className="mb-4">
                        <h3 className="text-base font-extrabold text-slate-900 dark:text-white font-[family-name:var(--font-outfit)]">
                            Top 5 Products by Revenue
                        </h3>
                        <p className="text-slate-400 text-xs font-medium mt-0.5">Ranked by total sales value</p>
                    </div>
                    {top5Products.length > 0 ? (
                        <div className="h-60">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={top5Products} margin={{ top: 5, right: 5, left: -10, bottom: 40 }} barSize={32}>
                                    <defs>
                                        <linearGradient id="shopBarGrad" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor="#f59e0b" stopOpacity={1} />
                                            <stop offset="100%" stopColor="#d97706" stopOpacity={0.8} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#E2E8F0" opacity={0.5} />
                                    <XAxis
                                        dataKey="name"
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fill: '#94A3B8', fontSize: 10, fontWeight: 600 }}
                                        dy={10}
                                        angle={-30}
                                        textAnchor="end"
                                        interval={0}
                                    />
                                    <YAxis
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fill: '#94A3B8', fontSize: 10, fontWeight: 600 }}
                                        tickFormatter={(v) => `₹${v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v}`}
                                        dx={-5}
                                    />
                                    <Tooltip content={<BarTooltip />} cursor={{ fill: '#F1F5F9', opacity: 0.4 }} />
                                    <Bar dataKey="revenue" fill="url(#shopBarGrad)" radius={[6, 6, 3, 3]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    ) : (
                        <div className="h-60 flex items-center justify-center text-slate-400 text-sm font-medium">
                            No product sales data yet
                        </div>
                    )}
                </div>

                {/* Shopping Orders Over Last 14 Days */}
                <div className="bg-white dark:bg-slate-800/50 rounded-3xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
                    <div className="mb-4">
                        <h3 className="text-base font-extrabold text-slate-900 dark:text-white font-[family-name:var(--font-outfit)]">
                            Orders Trend (14 days)
                        </h3>
                        <p className="text-slate-400 text-xs font-medium mt-0.5">Daily shopping order volume</p>
                    </div>
                    <div className="h-60">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={ordersChartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="shopAreaGrad" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4} />
                                        <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#E2E8F0" opacity={0.5} />
                                <XAxis
                                    dataKey="date"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#94A3B8', fontSize: 10, fontWeight: 600 }}
                                    dy={10}
                                />
                                <YAxis
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#94A3B8', fontSize: 10, fontWeight: 600 }}
                                    allowDecimals={false}
                                    dx={-5}
                                />
                                <Tooltip content={<AreaTooltip />} cursor={{ stroke: '#94A3B8', strokeWidth: 1, strokeDasharray: '3 3' }} />
                                <Area
                                    type="monotone"
                                    dataKey="orders"
                                    name="Orders"
                                    stroke="#f59e0b"
                                    strokeWidth={3}
                                    fillOpacity={1}
                                    fill="url(#shopAreaGrad)"
                                    activeDot={{ r: 5, strokeWidth: 0, fill: '#d97706' }}
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </section>
    );
}
