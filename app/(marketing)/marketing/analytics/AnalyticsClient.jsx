'use client';

import { useState } from 'react';
import { 
    BarChart3, 
    TrendingUp, 
    Share2, 
    MousePointerClick, 
    Users, 
    ShoppingBag, 
    MessageCircle, 
    Instagram, 
    Facebook, 
    Globe,
    Calendar
} from 'lucide-react';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend
} from 'recharts';

import MarketingBreadcrumbs from '@/components/marketing/layout/MarketingBreadcrumbs';

export default function AnalyticsClient({ user, initialStats }) {
    const [range, setRange] = useState('30d');

    const stats = initialStats || {};

    const trendData = [
        { date: '15 Aug', shares: 140, clicks: 420, customers: 18, orders: 12 },
        { date: '22 Aug', shares: 220, clicks: 680, customers: 34, orders: 24 },
        { date: '29 Aug', shares: 310, clicks: 950, customers: 48, orders: 32 },
        { date: '05 Sep', shares: 420, clicks: 1240, customers: 62, orders: 40 },
        { date: '12 Sep', shares: 580, clicks: 1820, customers: 86, orders: 58 },
    ];

    const channels = [
        { name: 'WhatsApp', percent: 62, icon: MessageCircle, color: 'text-emerald-600 bg-emerald-500/10' },
        { name: 'Instagram', percent: 18, icon: Instagram, color: 'text-rose-600 bg-rose-500/10' },
        { name: 'Facebook', percent: 14, icon: Facebook, color: 'text-blue-600 bg-blue-500/10' },
        { name: 'Direct / Others', percent: 6, icon: Globe, color: 'text-purple-600 bg-purple-500/10' },
    ];

    const products = [
        { name: 'Organic Atta (10kg)', shares: 1240, clicks: 5320, customers: 186, orders: 112, cr: '3.5%' },
        { name: 'Premium Basmati Rice', shares: 980, clicks: 3110, customers: 120, orders: 74, cr: '3.8%' },
        { name: 'Cold Pressed Mustard Oil', shares: 640, clicks: 1240, customers: 58, orders: 36, cr: '4.6%' },
        { name: 'Wireless Noise Cancelling Earbuds', shares: 890, clicks: 4200, customers: 92, orders: 60, cr: '2.2%' },
    ];

    return (
        <div className="space-y-6 sm:space-y-8 animate-fadeIn">
            {/* Header with Breadcrumbs & Range Filter */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 dark:border-slate-800 pb-4">
                <MarketingBreadcrumbs
                    customTitle="Marketing Analytics"
                    customSubtitle="Track what's working across your products, channels, and campaigns."
                />

                {/* Range Filter */}
                <div className="flex items-center gap-1.5 bg-white dark:bg-slate-900 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-800">
                    <button
                        onClick={() => setRange('7d')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                            range === '7d' ? 'bg-blue-600 text-white' : 'text-slate-500'
                        }`}
                    >
                        7 Days
                    </button>
                    <button
                        onClick={() => setRange('30d')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                            range === '30d' ? 'bg-blue-600 text-white' : 'text-slate-500'
                        }`}
                    >
                        Last 30 Days
                    </button>
                    <button
                        onClick={() => setRange('90d')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                            range === '90d' ? 'bg-blue-600 text-white' : 'text-slate-500'
                        }`}
                    >
                        90 Days
                    </button>
                </div>
            </div>

            {/* Top 4 KPI Metric Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-2xs">
                    <span className="text-xs font-bold text-slate-500">Total Shares</span>
                    <div className="text-2xl font-black text-slate-900 dark:text-white my-1">
                        {(stats.total_shares || 1248).toLocaleString('en-IN')}
                    </div>
                    <span className="text-xs font-extrabold text-emerald-600">+12%</span>
                </div>

                <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-2xs">
                    <span className="text-xs font-bold text-slate-500">Link Clicks</span>
                    <div className="text-2xl font-black text-slate-900 dark:text-white my-1">
                        {(stats.link_clicks || 8420).toLocaleString('en-IN')}
                    </div>
                    <span className="text-xs font-extrabold text-emerald-600">+18%</span>
                </div>

                <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-2xs">
                    <span className="text-xs font-bold text-slate-500">Customers Acquired</span>
                    <div className="text-2xl font-black text-slate-900 dark:text-white my-1">
                        {(stats.new_customers || 312).toLocaleString('en-IN')}
                    </div>
                    <span className="text-xs font-extrabold text-emerald-600">+22%</span>
                </div>

                <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-2xs">
                    <span className="text-xs font-bold text-slate-500">Orders Generated</span>
                    <div className="text-2xl font-black text-slate-900 dark:text-white my-1">
                        {(stats.orders || 186).toLocaleString('en-IN')}
                    </div>
                    <span className="text-xs font-extrabold text-emerald-600">+16%</span>
                </div>
            </div>

            {/* Performance Trend Chart & Channels Breakdown */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Trend Chart */}
                <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-2xs">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-base font-black text-slate-900 dark:text-white">
                            Performance Trend
                        </h3>
                    </div>

                    <div className="h-72 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={trendData}>
                                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                                <YAxis tick={{ fontSize: 11 }} />
                                <Tooltip 
                                    contentStyle={{ 
                                        borderRadius: '16px', 
                                        backgroundColor: '#0f172a', 
                                        color: '#fff', 
                                        border: 'none',
                                        fontSize: '12px',
                                        fontWeight: 'bold'
                                    }} 
                                />
                                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                                <Line type="monotone" dataKey="shares" name="Shares" stroke="#3b82f6" strokeWidth={2.5} dot={{ r: 3 }} />
                                <Line type="monotone" dataKey="clicks" name="Clicks" stroke="#f59e0b" strokeWidth={2.5} dot={{ r: 3 }} />
                                <Line type="monotone" dataKey="customers" name="Customers" stroke="#10b981" strokeWidth={2.5} dot={{ r: 3 }} />
                                <Line type="monotone" dataKey="orders" name="Orders" stroke="#8b5cf6" strokeWidth={2.5} dot={{ r: 3 }} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Top Channels */}
                <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-2xs flex flex-col justify-between">
                    <div>
                        <h3 className="text-base font-black text-slate-900 dark:text-white mb-4">
                            Top Channels
                        </h3>
                        <div className="space-y-4">
                            {channels.map((ch) => {
                                const Icon = ch.icon;
                                return (
                                    <div key={ch.name} className="space-y-1.5">
                                        <div className="flex items-center justify-between text-xs font-extrabold">
                                            <div className="flex items-center gap-2">
                                                <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${ch.color}`}>
                                                    <Icon size={16} />
                                                </div>
                                                <span className="text-slate-800 dark:text-slate-200">{ch.name}</span>
                                            </div>
                                            <span className="text-slate-900 dark:text-white">{ch.percent}%</span>
                                        </div>
                                        <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                                            <div 
                                                className="h-full rounded-full bg-blue-600"
                                                style={{ width: `${ch.percent}%` }}
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <div className="pt-4 border-t border-slate-100 dark:border-slate-800 mt-4 text-[11px] text-slate-400">
                        WhatsApp delivers 62% of your highest-converting campaign traffic.
                    </div>
                </div>
            </div>

            {/* Product Performance Table */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-2xs">
                <h3 className="text-base font-black text-slate-900 dark:text-white mb-4">
                    Product Conversion Breakdown
                </h3>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                        <thead>
                            <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 uppercase tracking-wider font-extrabold text-[10px]">
                                <th className="pb-3">Product</th>
                                <th className="pb-3 text-right">Shares</th>
                                <th className="pb-3 text-right">Clicks</th>
                                <th className="pb-3 text-right">Acquisitions</th>
                                <th className="pb-3 text-right">Orders</th>
                                <th className="pb-3 text-right">Conversion</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-semibold text-slate-700 dark:text-slate-300">
                            {products.map((p, idx) => (
                                <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                                    <td className="py-3 font-extrabold text-slate-900 dark:text-white">{p.name}</td>
                                    <td className="py-3 text-right">{p.shares.toLocaleString('en-IN')}</td>
                                    <td className="py-3 text-right">{p.clicks.toLocaleString('en-IN')}</td>
                                    <td className="py-3 text-right text-emerald-600">{p.customers}</td>
                                    <td className="py-3 text-right">{p.orders}</td>
                                    <td className="py-3 text-right font-black text-blue-600">{p.cr}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
