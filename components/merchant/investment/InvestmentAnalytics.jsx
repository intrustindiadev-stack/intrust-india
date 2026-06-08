'use client';

import { useState, useMemo } from 'react';
import {
    AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { TrendingUp, IndianRupee, BarChart2, PieChart as PieIcon, MapPin } from 'lucide-react';

const PERIOD_OPTIONS = [
    { label: '7D', days: 7 },
    { label: '14D', days: 14 },
    { label: '30D', days: 30 },
    { label: 'All', days: Infinity },
];

const DONUT_COLORS = {
    active: '#10B981',
    pending: '#F59E0B',
    completed: '#3B82F6',
    rejected: '#EF4444',
};

const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
        <div className="bg-white border border-slate-200 p-3 rounded-2xl shadow-2xl shadow-slate-200/50 min-w-[140px]">
            <p className="text-slate-400 font-black text-[9px] uppercase tracking-[0.2em] mb-2">{label}</p>
            {payload.map((p, i) => (
                <div key={i} className="flex items-center justify-between gap-6">
                    <span className="text-[10px] font-bold" style={{ color: p.color }}>{p.name}</span>
                    <span className="font-black text-xs text-slate-900">₹{Number(p.value).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                </div>
            ))}
        </div>
    );
};

export default function InvestmentAnalytics({ orders, investments = [] }) {
    const [activePeriod, setActivePeriod] = useState(14);
    const [activeChart, setActiveChart] = useState('profit');

    // Filter orders by period
    const filteredOrders = useMemo(() => {
        if (activePeriod === Infinity || !orders?.length) return orders || [];
        const cutoff = Date.now() - activePeriod * 24 * 60 * 60 * 1000;
        return orders.filter(o => new Date(o.order_date).getTime() >= cutoff);
    }, [orders, activePeriod]);

    // Profit over time (area chart)
    const profitData = useMemo(() => {
        const daily = {};
        filteredOrders.forEach(o => {
            const date = new Date(o.order_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
            if (!daily[date]) daily[date] = { name: date, Profit: 0, Volume: 0 };
            daily[date].Profit += (o.profit_paise || 0) / 100;
            daily[date].Volume += (o.amount_paise || 0) / 100;
        });
        return Object.values(daily);
    }, [filteredOrders]);

    // Portfolio donut
    const donutData = useMemo(() => {
        const counts = {};
        investments.forEach(inv => {
            counts[inv.status] = (counts[inv.status] || 0) + inv.amount_paise / 100;
        });
        return Object.entries(counts).map(([name, value]) => ({ name, value }));
    }, [investments]);

    // Locations donut
    const locationData = useMemo(() => {
        const counts = {};
        filteredOrders.forEach(o => {
            const loc = o.location ? o.location.split(',')[0].trim() : 'Other';
            counts[loc] = (counts[loc] || 0) + (o.amount_paise || 0) / 100;
        });
        return Object.entries(counts).map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 5); // top 5 locations
    }, [filteredOrders]);

    const totalProfit = filteredOrders.reduce((s, o) => s + (o.profit_paise || 0), 0) / 100;
    const totalVolume = filteredOrders.reduce((s, o) => s + (o.amount_paise || 0), 0) / 100;

    if (!orders?.length && !investments?.length) {
        return (
            <div className="h-64 flex flex-col items-center justify-center gap-4 bg-slate-50 rounded-3xl border border-dashed border-slate-200">
                <BarChart2 size={32} className="text-slate-300" />
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">No data yet — create your first fund</p>
            </div>
        );
    }

    const charts = [
        { id: 'profit', label: 'Profit', icon: TrendingUp },
        { id: 'volume', label: 'Volume', icon: BarChart2 },
        { id: 'location', label: 'Locations', icon: MapPin },
        { id: 'portfolio', label: 'Portfolio', icon: PieIcon },
    ];

    return (
        <div className="space-y-5">
            {/* Chart selector + period filter */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                {/* Chart type tabs */}
                <div className="flex items-center p-1 bg-slate-100 rounded-2xl gap-0.5">
                    {charts.map(c => {
                        const Icon = c.icon;
                        return (
                            <button
                                key={c.id}
                                onClick={() => setActiveChart(c.id)}
                                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all ${activeChart === c.id
                                    ? 'bg-white text-slate-900 shadow-sm'
                                    : 'text-slate-500 hover:text-slate-700'
                                    }`}
                            >
                                <Icon size={12} /> {c.label}
                            </button>
                        );
                    })}
                </div>

                {/* Period filter (only for profit/volume/location charts) */}
                {activeChart !== 'portfolio' && (
                    <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl">
                        {PERIOD_OPTIONS.map(p => (
                            <button
                                key={p.label}
                                onClick={() => setActivePeriod(p.days)}
                                className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${activePeriod === p.days
                                    ? 'bg-white text-slate-900 shadow-sm'
                                    : 'text-slate-500 hover:text-slate-700'
                                    }`}
                            >
                                {p.label}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Summary pills */}
            {activeChart !== 'portfolio' && (
                <div className="flex flex-wrap gap-3">
                    <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 border border-emerald-100 rounded-xl">
                        <TrendingUp size={13} className="text-emerald-500" />
                        <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">Profit</span>
                        <span className="text-sm font-black text-emerald-800">₹{totalProfit.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                    </div>
                    <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 border border-blue-100 rounded-xl">
                        <IndianRupee size={13} className="text-blue-500" />
                        <span className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">Volume</span>
                        <span className="text-sm font-black text-blue-800">₹{totalVolume.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                    </div>
                </div>
            )}

            {/* Chart area */}
            <div className="h-[240px] md:h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    {activeChart === 'profit' ? (
                        <AreaChart data={profitData} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
                            <defs>
                                <linearGradient id="gradProfit" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.15} />
                                    <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                                </linearGradient>
                                <linearGradient id="gradVolume" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#6366F1" stopOpacity={0.08} />
                                    <stop offset="95%" stopColor="#6366F1" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 9, fontWeight: 700 }} dy={8} />
                            <YAxis hide />
                            <Tooltip content={<CustomTooltip />} />
                            <Area type="monotone" dataKey="Profit" name="Profit" stroke="#10B981" strokeWidth={2.5} fill="url(#gradProfit)" activeDot={{ r: 5, fill: '#10B981', stroke: '#fff', strokeWidth: 2 }} />
                            <Area type="monotone" dataKey="Volume" name="Volume" stroke="#6366F1" strokeWidth={1.5} fill="url(#gradVolume)" strokeDasharray="5 5" activeDot={{ r: 4 }} />
                        </AreaChart>
                    ) : activeChart === 'volume' ? (
                        <BarChart data={profitData} margin={{ top: 5, right: 5, bottom: 5, left: 5 }} barSize={20}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 9, fontWeight: 700 }} dy={8} />
                            <YAxis hide />
                            <Tooltip content={<CustomTooltip />} />
                            <Bar dataKey="Volume" name="Trade Volume" fill="#6366F1" radius={[6, 6, 0, 0]} />
                            <Bar dataKey="Profit" name="Profit" fill="#10B981" radius={[6, 6, 0, 0]} />
                        </BarChart>
                    ) : activeChart === 'location' ? (
                        <PieChart>
                            <Pie
                                data={locationData}
                                cx="50%"
                                cy="50%"
                                innerRadius="45%"
                                outerRadius="80%"
                                paddingAngle={2}
                                dataKey="value"
                            >
                                {locationData.map((entry, index) => {
                                    const colors = ['#6366F1', '#8B5CF6', '#EC4899', '#10B981', '#F59E0B', '#94A3B8'];
                                    return <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />;
                                })}
                            </Pie>
                            <Tooltip formatter={(val) => [`₹${val.toLocaleString('en-IN')}`, 'Trade Volume']} />
                            <Legend
                                formatter={(value) => <span className="text-xs font-bold text-slate-600 capitalize">{value}</span>}
                                iconType="circle"
                                iconSize={8}
                                layout="vertical"
                                verticalAlign="middle"
                                align="right"
                            />
                        </PieChart>
                    ) : (
                        <PieChart>
                            <Pie
                                data={donutData}
                                cx="50%"
                                cy="50%"
                                innerRadius="55%"
                                outerRadius="80%"
                                paddingAngle={3}
                                dataKey="value"
                            >
                                {donutData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={DONUT_COLORS[entry.name] || '#94a3b8'} />
                                ))}
                            </Pie>
                            <Tooltip formatter={(val) => [`₹${val.toLocaleString('en-IN')}`, 'Capital']} />
                            <Legend
                                formatter={(value) => <span className="text-xs font-bold text-slate-600 capitalize">{value}</span>}
                                iconType="circle"
                                iconSize={8}
                            />
                        </PieChart>
                    )}
                </ResponsiveContainer>
            </div>
        </div>
    );
}
