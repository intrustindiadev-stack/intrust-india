'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { 
    ChevronDown, 
    ArrowUp, 
    ArrowRight, 
    CheckCircle2, 
    Circle, 
    Clock, 
    ExternalLink,
    Store,
    Activity,
    PieChart as PieIcon,
    Package,
    ChevronUp
} from 'lucide-react';
import ProductThumbnail from '@/components/ai-orders/ProductThumbnail';
import { 
    ResponsiveContainer, 
    BarChart, 
    Bar, 
    XAxis, 
    YAxis, 
    Tooltip, 
    PieChart, 
    Pie, 
    Cell 
} from 'recharts';

export default function AdminAnalyticsSidebar({ 
    categoryDistribution = [], 
    performanceData = [],
    topMerchants = [],
    recentActivity = [],
    totalOrdersCount = 0 
}) {
    const [performanceRange, setPerformanceRange] = useState('month');

    // Default palette for categories
    const defaultPalette = ['#2563eb', '#38bdf8', '#6366f1', '#ec4899', '#f59e0b', '#10b981', '#94a3b8'];

    const categoryData = categoryDistribution && categoryDistribution.length > 0
        ? categoryDistribution
        : [];

    const [isMobileOpen, setIsMobileOpen] = useState(false);

    return (
        <div className="space-y-5">
            {/* Mobile Toggle Button */}
            <button 
                onClick={() => setIsMobileOpen(!isMobileOpen)}
                className="w-full xl:hidden flex items-center justify-between p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs text-sm font-bold text-slate-900 dark:text-white"
            >
                <div className="flex items-center gap-2">
                    <Activity size={18} className="text-blue-500" />
                    Analytics & Performance
                </div>
                {isMobileOpen ? <ChevronUp size={18} className="text-slate-400" /> : <ChevronDown size={18} className="text-slate-400" />}
            </button>

            {/* Sidebar Content (Hidden on mobile unless opened) */}
            <div className={`space-y-5 ${isMobileOpen ? 'block' : 'hidden xl:block'}`}>
                {/* 1. Order Performance Card */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs">
                <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">Order Performance</h3>
                    
                    <div className="relative">
                        <select
                            value={performanceRange}
                            onChange={(e) => setPerformanceRange(e.target.value)}
                            aria-label="Order performance timeframe"
                            className="appearance-none bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-[11px] font-semibold py-1 pl-2.5 pr-6 rounded-lg cursor-pointer focus:outline-hidden"
                        >
                            <option value="month">This Month</option>
                            <option value="quarter">This Quarter</option>
                            <option value="year">This Year</option>
                        </select>
                        <ChevronDown size={12} className="absolute right-2 top-2 text-slate-400 pointer-events-none" />
                    </div>
                </div>

                {performanceData && performanceData.length > 0 ? (
                    <>
                        {/* Legend */}
                        <div className="flex items-center gap-3 text-[11px] text-slate-500 mb-2">
                            <span className="flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-xs bg-sky-300" />
                                Created
                            </span>
                            <span className="flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-xs bg-blue-600" />
                                Completed
                            </span>
                        </div>

                        {/* Chart */}
                        <div className="h-40 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={performanceData} margin={{ top: 5, right: 0, left: -25, bottom: 0 }}>
                                    <XAxis 
                                        dataKey="date" 
                                        axisLine={false} 
                                        tickLine={false} 
                                        tick={{ fill: '#94a3b8', fontSize: 10 }} 
                                    />
                                    <YAxis 
                                        axisLine={false} 
                                        tickLine={false} 
                                        tick={{ fill: '#94a3b8', fontSize: 10 }} 
                                    />
                                    <Tooltip 
                                        contentStyle={{ 
                                            backgroundColor: '#0f172a', 
                                            borderRadius: '8px', 
                                            border: 'none', 
                                            fontSize: '11px',
                                            color: '#fff' 
                                        }} 
                                    />
                                    <Bar dataKey="created" fill="#93c5fd" radius={[2, 2, 0, 0]} barSize={8} />
                                    <Bar dataKey="completed" fill="#2563eb" radius={[2, 2, 0, 0]} barSize={8} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </>
                ) : (
                    <div className="h-32 flex flex-col items-center justify-center text-center text-slate-400 text-xs">
                        <Activity size={20} className="text-slate-300 dark:text-slate-700 mb-1" />
                        <span>Performance metrics will update as orders are created.</span>
                    </div>
                )}
            </div>

            {/* 2. Category Distribution Card */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3">Category Distribution</h3>

                {categoryData.length > 0 ? (
                    <div className="flex items-center justify-between gap-3">
                        {/* Donut Chart with center label */}
                        <div className="relative w-36 h-36 shrink-0 flex items-center justify-center">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={categoryData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={44}
                                        outerRadius={64}
                                        paddingAngle={2}
                                        dataKey="value"
                                    >
                                        {categoryData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color || defaultPalette[index % defaultPalette.length]} />
                                        ))}
                                    </Pie>
                                </PieChart>
                            </ResponsiveContainer>
                            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                <span className="text-base font-black text-slate-900 dark:text-white leading-none">
                                    {totalOrdersCount}
                                </span>
                                <span className="text-[9px] text-slate-400 font-semibold mt-0.5">Total Orders</span>
                            </div>
                        </div>

                        {/* Breakdown list */}
                        <div className="space-y-1.5 flex-1 min-w-0">
                            {categoryData.map((cat, i) => (
                                <div key={i} className="flex items-center justify-between text-[11px]">
                                    <div className="flex items-center gap-1.5 truncate">
                                        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: cat.color || defaultPalette[i % defaultPalette.length] }} />
                                        <span className="text-slate-600 dark:text-slate-400 truncate">{cat.name}</span>
                                    </div>
                                    <span className="font-bold text-slate-800 dark:text-slate-200 ml-2">{cat.value}%</span>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className="h-32 flex flex-col items-center justify-center text-center text-slate-400 text-xs">
                        <PieIcon size={20} className="text-slate-300 dark:text-slate-700 mb-1" />
                        <span>Category breakdown will appear when orders are added.</span>
                    </div>
                )}
            </div>

            {/* 3. Top Performing Merchants Card */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs">
                <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">Top Performing Merchants</h3>
                    <Link href="/admin/merchants" className="text-[11px] font-bold text-blue-600 hover:text-blue-700">
                        View All
                    </Link>
                </div>

                {topMerchants.length > 0 ? (
                    <div className="space-y-3">
                        {topMerchants.map((m) => (
                            <div key={m.rank} className="flex items-center justify-between text-xs">
                                <div className="flex items-center gap-2.5 min-w-0">
                                    <span className="text-[11px] font-bold text-slate-400 w-3">{m.rank}</span>
                                    <div className="w-8 h-8 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-xs shrink-0">
                                        {m.initial}
                                    </div>
                                    <div className="truncate">
                                        <div className="font-bold text-slate-900 dark:text-white truncate">{m.name}</div>
                                        <div className="text-[10px] text-slate-400 truncate">{m.store}</div>
                                    </div>
                                </div>

                                <div className="text-right shrink-0">
                                    <div className="text-[11px] text-slate-500">{m.orders} orders</div>
                                    <div className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center justify-end text-[11px]">
                                        <ArrowUp size={10} className="mr-0.5" />
                                        {m.revenue}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="h-24 flex flex-col items-center justify-center text-center text-slate-400 text-xs">
                        <Store size={20} className="text-slate-300 dark:text-slate-700 mb-1" />
                        <span>No merchant orders recorded yet.</span>
                    </div>
                )}
            </div>

            {/* 4. Recent Activity Card */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs">
                <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">Recent Activity</h3>
                    <span className="text-[11px] text-slate-400 font-semibold">Live</span>
                </div>

                {recentActivity.length > 0 ? (
                    <div className="space-y-2.5">
                        {recentActivity.map((act) => (
                            <div key={act.id} className="flex items-center gap-2.5 text-xs p-1 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                                {act.product_image_url || act.category ? (
                                    <ProductThumbnail
                                        src={act.product_image_url}
                                        alt={act.product_name || 'Product'}
                                        category={act.category}
                                        className="w-9 h-9 rounded-lg shrink-0"
                                    />
                                ) : (
                                    <span className={`w-2.5 h-2.5 rounded-full mx-1 shrink-0 ${act.color || 'bg-blue-500'}`} />
                                )}
                                <div className="flex-1 min-w-0">
                                    <p className="text-[11px] font-medium text-slate-800 dark:text-slate-200 leading-tight truncate">
                                        {act.title}
                                    </p>
                                    <span className="text-[10px] text-slate-400 mt-0.5 block">
                                        {act.time}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="h-20 flex items-center justify-center text-center text-slate-400 text-xs">
                        <span>No recent order activity yet.</span>
                    </div>
                )}
            </div>
            </div>
        </div>
    );
}
