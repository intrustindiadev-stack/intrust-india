'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
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
    Calendar,
    ArrowUpRight,
    Sparkles,
    AlertCircle
} from 'lucide-react';
import MarketingBreadcrumbs from '@/components/marketing/layout/MarketingBreadcrumbs';
import dynamic from 'next/dynamic';
import GuideInfoButton from '@/components/common/GuideInfoButton';

const AnalyticsChart = dynamic(() => import('./AnalyticsChart'), {
    ssr: false,
    loading: () => <div className="h-64 rounded-2xl bg-slate-100 dark:bg-slate-800 animate-pulse" />,
});

export default function AnalyticsClient({
    user,
    initialStats = {},
    userLinks = [],
    trackingEvents = []
}) {
    const [range, setRange] = useState('30d'); // '7d' | '30d' | '90d'

    // Total metrics from RPC or aggregated from links
    const totalShares = Number(initialStats?.total_shares || userLinks.length || 0);
    const totalClicks = Number(initialStats?.link_clicks || userLinks.reduce((acc, l) => acc + (l.clicks_count || 0), 0));
    const totalOrders = Number(initialStats?.orders || userLinks.reduce((acc, l) => acc + (l.orders_count || 0), 0));
    const totalCustomers = Number(initialStats?.new_customers || 0);
    const overallCR = totalClicks > 0 ? ((totalOrders / totalClicks) * 100).toFixed(1) : '0.0';

    // Range days threshold
    const rangeDays = range === '7d' ? 7 : range === '90d' ? 90 : 30;
    const cutoffDate = useMemo(() => {
        const d = new Date();
        d.setDate(d.getDate() - rangeDays);
        return d;
    }, [rangeDays]);

    // 1. Dynamic Trend Data Calculation from trackingEvents & userLinks
    const trendData = useMemo(() => {
        const intervalCount = range === '7d' ? 7 : range === '30d' ? 6 : 9;
        const intervalDays = rangeDays / intervalCount;
        const buckets = [];

        for (let i = 0; i < intervalCount; i++) {
            const bucketStart = new Date(cutoffDate.getTime() + i * intervalDays * 86400000);
            const bucketEnd = new Date(bucketStart.getTime() + intervalDays * 86400000);
            const label = bucketStart.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });

            // Count events in this window
            const eventsInWindow = trackingEvents.filter(e => {
                const ed = new Date(e.created_at);
                return ed >= bucketStart && ed < bucketEnd;
            });

            const linksInWindow = userLinks.filter(l => {
                const ld = new Date(l.created_at);
                return ld >= bucketStart && ld < bucketEnd;
            });

            const clicks = eventsInWindow.filter(e => {
                const t = (e.event_type || '').toLowerCase();
                return t === 'click' || t === 'clicks';
            }).length;
            const orders = eventsInWindow.filter(e => {
                const t = (e.event_type || '').toLowerCase();
                return t === 'order' || t === 'orders';
            }).length;
            const customers = eventsInWindow.filter(e => {
                const t = (e.event_type || '').toLowerCase();
                return t === 'signup' || t === 'register' || t === 'registration';
            }).length;
            const shares = linksInWindow.length;

            buckets.push({
                date: label,
                shares,
                clicks,
                customers,
                orders
            });
        }

        return buckets;
    }, [range, rangeDays, cutoffDate, trackingEvents, userLinks]);

    // 2. Channel Split from userLinks
    const channels = useMemo(() => {
        const counts = { whatsapp: 0, instagram: 0, facebook: 0, other: 0 };
        userLinks.forEach(link => {
            const ch = (link.source || link.channel || '').toLowerCase();
            if (ch.includes('whatsapp')) counts.whatsapp++;
            else if (ch.includes('insta')) counts.instagram++;
            else if (ch.includes('face')) counts.facebook++;
            else counts.other++;
        });

        const totalCh = userLinks.length;
        if (totalCh === 0) {
            return [
                { name: 'WhatsApp', percent: 0, count: 0, icon: MessageCircle, color: 'text-emerald-600 bg-emerald-500/10' },
                { name: 'Instagram', percent: 0, count: 0, icon: Instagram, color: 'text-rose-600 bg-rose-500/10' },
                { name: 'Facebook', percent: 0, count: 0, icon: Facebook, color: 'text-blue-600 bg-blue-500/10' },
                { name: 'Direct / Web', percent: 0, count: 0, icon: Globe, color: 'text-purple-600 bg-purple-500/10' }
            ];
        }

        return [
            {
                name: 'WhatsApp',
                percent: Math.round((counts.whatsapp / totalCh) * 100),
                count: counts.whatsapp,
                icon: MessageCircle,
                color: 'text-emerald-600 bg-emerald-500/10'
            },
            {
                name: 'Instagram',
                percent: Math.round((counts.instagram / totalCh) * 100),
                count: counts.instagram,
                icon: Instagram,
                color: 'text-rose-600 bg-rose-500/10'
            },
            {
                name: 'Facebook',
                percent: Math.round((counts.facebook / totalCh) * 100),
                count: counts.facebook,
                icon: Facebook,
                color: 'text-blue-600 bg-blue-500/10'
            },
            {
                name: 'Direct / Web',
                percent: Math.round((counts.other / totalCh) * 100),
                count: counts.other,
                icon: Globe,
                color: 'text-purple-600 bg-purple-500/10'
            }
        ];
    }, [userLinks]);

    // 3. Products Performance Breakdown from userLinks
    const productsPerformance = useMemo(() => {
        const prodMap = {};
        userLinks.forEach(link => {
            const pId = link.product_id || 'campaign';
            const pName = link.shopping_products?.title || link.products?.name || (link.product_id ? 'InTrust Product' : 'General Platform Campaign');
            if (!prodMap[pId]) {
                prodMap[pId] = {
                    name: pName,
                    shares: 0,
                    clicks: 0,
                    orders: 0
                };
            }
            prodMap[pId].shares += Number(link.shares_count || 1);
            prodMap[pId].clicks += Number(link.clicks_count || 0);
            prodMap[pId].orders += Number(link.orders_count || 0);
        });

        return Object.values(prodMap)
            .map(p => ({
                ...p,
                cr: p.clicks > 0 ? `${((p.orders / p.clicks) * 100).toFixed(1)}%` : '0.0%'
            }))
            .sort((a, b) => b.clicks - a.clicks);
    }, [userLinks]);

    const hasAnyActivity = totalShares > 0 || totalClicks > 0 || totalOrders > 0;

    return (
        <div className="space-y-4 sm:space-y-6 lg:space-y-7 animate-fadeIn">
            {/* Header with Breadcrumbs, guide & Range Filter */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/80 dark:border-slate-800 pb-3 sm:pb-4">
                <div className="flex items-start justify-between gap-3 flex-1 min-w-0">
                    <MarketingBreadcrumbs
                        customTitle="Marketing Analytics"
                        customSubtitle="Track what's working across your products, channels, and campaigns with live telemetry."
                        className="flex-1 min-w-0"
                    />
                    <GuideInfoButton pageKey="/marketing/analytics" scope="marketing" className="mt-1 shrink-0" />
                </div>

                {/* Range Filter */}
                <div className="flex items-center gap-1 bg-white dark:bg-slate-900 p-1 rounded-xl sm:rounded-2xl border border-slate-200 dark:border-slate-800 shrink-0 self-start sm:self-auto">
                    <button
                        onClick={() => setRange('7d')}
                        className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg sm:rounded-xl text-xs font-bold transition-all ${
                            range === '7d' ? 'bg-blue-600 text-white shadow-2xs' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                        }`}
                    >
                        7 Days
                    </button>
                    <button
                        onClick={() => setRange('30d')}
                        className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg sm:rounded-xl text-xs font-bold transition-all ${
                            range === '30d' ? 'bg-blue-600 text-white shadow-2xs' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                        }`}
                    >
                        30 Days
                    </button>
                    <button
                        onClick={() => setRange('90d')}
                        className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg sm:rounded-xl text-xs font-bold transition-all ${
                            range === '90d' ? 'bg-blue-600 text-white shadow-2xs' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                        }`}
                    >
                        90 Days
                    </button>
                </div>
            </div>

            {/* Top 4 KPI Metric Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3.5">
                <div className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl p-3 sm:p-4 border border-slate-200/80 dark:border-slate-800 shadow-2xs">
                    <span className="text-[11px] sm:text-xs font-bold text-slate-500">Total Shares</span>
                    <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white my-0.5 sm:my-1">
                        {totalShares.toLocaleString('en-IN')}
                    </div>
                    <span className="text-[10px] sm:text-[11px] font-bold text-slate-400">
                        {userLinks.length} active links
                    </span>
                </div>

                <div className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl p-3 sm:p-4 border border-slate-200/80 dark:border-slate-800 shadow-2xs">
                    <span className="text-[11px] sm:text-xs font-bold text-slate-500">Link Clicks</span>
                    <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white my-0.5 sm:my-1">
                        {totalClicks.toLocaleString('en-IN')}
                    </div>
                    <span className="text-[10px] sm:text-[11px] font-bold text-emerald-600 flex items-center gap-0.5">
                        <TrendingUp size={11} />
                        <span>Live clicks tracked</span>
                    </span>
                </div>

                <div className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl p-3 sm:p-4 border border-slate-200/80 dark:border-slate-800 shadow-2xs">
                    <span className="text-[11px] sm:text-xs font-bold text-slate-500">New Customers</span>
                    <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white my-0.5 sm:my-1">
                        {totalCustomers.toLocaleString('en-IN')}
                    </div>
                    <span className="text-[10px] sm:text-[11px] font-bold text-slate-400">
                        Attributed signups
                    </span>
                </div>

                <div className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl p-3 sm:p-4 border border-slate-200/80 dark:border-slate-800 shadow-2xs">
                    <span className="text-[11px] sm:text-xs font-bold text-slate-500">Store Orders</span>
                    <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white my-0.5 sm:my-1">
                        {totalOrders.toLocaleString('en-IN')}
                    </div>
                    <span className="text-[10px] sm:text-[11px] font-bold text-blue-600">
                        {overallCR}% conv. rate
                    </span>
                </div>
            </div>

            {/* Main Interactive Recharts Chart */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl p-4 sm:p-6 lg:p-7 border border-slate-200/80 dark:border-slate-800 shadow-2xs">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-4 sm:mb-6">
                    <div>
                        <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                            Performance Curves & Conversion Trends
                        </h3>
                        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                            Telemetry showing shares, clicks, and converted orders over time.
                        </p>
                    </div>

                    <div className="flex items-center gap-3 text-[11px] sm:text-xs font-bold flex-wrap">
                        <div className="flex items-center gap-1.5 text-blue-600">
                            <span className="w-2 h-2 rounded-full bg-blue-600" />
                            <span>Clicks</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-emerald-600">
                            <span className="w-2 h-2 rounded-full bg-emerald-600" />
                            <span>Orders</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-indigo-500">
                            <span className="w-2 h-2 rounded-full bg-indigo-500" />
                            <span>Shares</span>
                        </div>
                    </div>
                </div>

                <AnalyticsChart trendData={trendData} />

                {!hasAnyActivity && (
                    <div className="mt-4 p-4 rounded-2xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200/80 dark:border-blue-800/60 flex items-center gap-3 text-xs text-blue-800 dark:text-blue-300">
                        <Sparkles size={18} className="shrink-0 text-blue-600" />
                        <span>
                            Ready to see live curves? Start sharing your products or challenge links. As customers click and purchase, this chart will update in real time!
                        </span>
                    </div>
                )}
            </div>

            {/* Channels & Products 2-Column Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3.5 sm:gap-5">
                {/* Channels Breakdown Card */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl p-4 sm:p-5 lg:p-6 border border-slate-200/80 dark:border-slate-800 shadow-2xs flex flex-col justify-between">
                    <div>
                        <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                            Traffic by Channel
                        </h3>
                        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-4 sm:mb-5">
                            Where your buyers and clicks are originating.
                        </p>

                        <div className="space-y-3 sm:space-y-3.5">
                            {channels.map((ch, idx) => {
                                const Icon = ch.icon;
                                return (
                                    <div key={idx} className="space-y-1">
                                        <div className="flex items-center justify-between text-xs font-bold">
                                            <div className="flex items-center gap-2">
                                                <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${ch.color}`}>
                                                    <Icon size={13} />
                                                </div>
                                                <span className="text-slate-800 dark:text-slate-200">{ch.name}</span>
                                            </div>
                                            <span className="text-slate-900 dark:text-white font-black">
                                                {ch.percent}%
                                            </span>
                                        </div>
                                        <div className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                                            <div
                                                className="h-full rounded-full bg-blue-600 transition-all duration-300"
                                                style={{ width: `${ch.percent}%` }}
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <div className="pt-4 border-t border-slate-100 dark:border-slate-800 text-[10px] sm:text-[11px] text-slate-400 mt-4">
                        WhatsApp accounts for over 60% of converted sales in India. Keep sharing!
                    </div>
                </div>

                {/* Products Performance Table Card */}
                <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl p-4 sm:p-5 lg:p-6 border border-slate-200/80 dark:border-slate-800 shadow-2xs">
                    <div className="flex items-center justify-between mb-3 sm:mb-4">
                        <div>
                            <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                                Top Performing Products & Links
                            </h3>
                            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                                Detailed breakdown of your campaign links and products.
                            </p>
                        </div>
                        <Link
                            href="/marketing/products"
                            className="text-xs font-black text-blue-600 hover:text-blue-700 flex items-center gap-1 shrink-0"
                        >
                            <span>View All</span>
                            <ArrowUpRight size={12} />
                        </Link>
                    </div>

                    {productsPerformance.length > 0 ? (
                        <div className="overflow-x-auto -mx-3 px-3 sm:mx-0 sm:px-0">
                            <table className="w-full text-left text-xs min-w-[340px]">
                                <thead>
                                    <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 font-extrabold uppercase text-[10px] sm:text-[11px]">
                                        <th className="pb-2.5">Product</th>
                                        <th className="pb-2.5 text-right">Shares</th>
                                        <th className="pb-2.5 text-right">Clicks</th>
                                        <th className="pb-2.5 text-right">Orders</th>
                                        <th className="pb-2.5 text-right">Conv.</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-semibold text-slate-700 dark:text-slate-300">
                                    {productsPerformance.map((prod, idx) => (
                                        <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                                            <td className="py-2.5 sm:py-3 font-bold text-slate-900 dark:text-white max-w-[140px] sm:max-w-[180px] truncate">
                                                {prod.name}
                                            </td>
                                            <td className="py-2.5 sm:py-3 text-right">{prod.shares}</td>
                                            <td className="py-2.5 sm:py-3 text-right text-blue-600 font-bold">{prod.clicks}</td>
                                            <td className="py-2.5 sm:py-3 text-right text-emerald-600 font-bold">{prod.orders}</td>
                                            <td className="py-2.5 sm:py-3 text-right font-black">{prod.cr}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="p-6 sm:p-8 text-center rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 mt-2">
                            <ShoppingBag size={28} className="text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                            <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                No products shared yet
                            </h4>
                            <p className="text-[11px] text-slate-400 max-w-sm mx-auto mt-0.5 mb-3">
                                Browse your catalog or merchant store and tap &ldquo;Share &amp; Earn&rdquo; to generate your first tracked product share link.
                            </p>
                            <Link
                                href="/marketing/products"
                                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black shadow-2xs transition-all"
                            >
                                <Share2 size={12} />
                                <span>Browse Products to Share</span>
                            </Link>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
