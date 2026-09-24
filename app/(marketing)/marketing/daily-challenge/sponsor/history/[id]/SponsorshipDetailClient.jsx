'use client';

import { useState, useMemo, lazy, Suspense } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import Image from 'next/image';
import { 
    Calendar, 
    ChevronRight, 
    ShoppingBag, 
    Eye, 
    MousePointerClick, 
    Users, 
    FileText, 
    Copy, 
    Check, 
    Receipt, 
    TrendingUp, 
    ExternalLink,
    Store
} from 'lucide-react';
import MarketingBreadcrumbs from '@/components/marketing/layout/MarketingBreadcrumbs';
import GuideInfoButton from '@/components/common/GuideInfoButton';

const SponsorshipAnalyticsChart = lazy(() => import('@/components/marketing/sponsor/SponsorshipAnalyticsChart'));
const SponsorshipGstInvoiceModal = dynamic(() => import('@/components/marketing/sponsor/SponsorshipGstInvoiceModal'), { ssr: false });

function StatCard({ icon: Icon, label, value, color = 'blue', hint }) {
    const colors = {
        blue: 'bg-blue-50 text-blue-600 border-blue-200',
        amber: 'bg-amber-50 text-amber-600 border-amber-200',
        emerald: 'bg-emerald-50 text-emerald-600 border-emerald-200',
        violet: 'bg-violet-50 text-violet-600 border-violet-200',
    };
    return (
        <div className="bg-white dark:bg-slate-900 rounded-xl sm:rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-xs">
            <div className="flex items-center gap-2.5 text-slate-500 dark:text-slate-400 text-xs font-bold uppercase mb-1.5">
                <Icon size={13} />
                <span>{label}</span>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-slate-950 dark:text-white">{value}</div>
            {hint && <div className="text-[10px] text-slate-400 mt-0.5">{hint}</div>}
        </div>
    );
}

function ChartSkeleton() {
    return (
        <div className="h-[260px] flex flex-col items-center justify-center text-center gap-2">
            <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 animate-pulse"></div>
            <p className="text-xs font-bold text-slate-400">Loading analytics...</p>
        </div>
    );
}

export default function SponsorshipDetailClient({
    user, profile, merchant, booking, invoice, events = [], plays = [], todayIST
}) {
    const [copiedInvoice, setCopiedInvoice] = useState(false);
    const [showInvoiceModal, setShowInvoiceModal] = useState(false);

    // Build hourly bucket (0-23 IST) for plays + clicks
    const hourlyData = useMemo(() => {
        const buckets = Array.from({ length: 24 }, (_, h) => ({
            hour: h, label: `${String(h).padStart(2, '0')}:00`, plays: 0, clicks: 0, impressions: 0
        }));
        (plays || []).forEach(play => {
            if (play.completed_at) {
                const d = new Date(play.completed_at);
                const istH = parseInt(d.toLocaleString('en-US', { timeZone: 'Asia/Kolkata', hour: 'numeric', hour12: false }));
                if (!isNaN(istH) && buckets[istH]) buckets[istH].plays += 1;
            }
        });
        (events || []).forEach(ev => {
            if (ev.created_at) {
                const d = new Date(ev.created_at);
                const istH = parseInt(d.toLocaleString('en-US', { timeZone: 'Asia/Kolkata', hour: 'numeric', hour12: false }));
                if (!isNaN(istH) && buckets[istH]) {
                    if (ev.event_type === 'IMPRESSION') buckets[istH].impressions += 1;
                    if (ev.event_type === 'PRODUCT_CLICK') buckets[istH].clicks += 1;
                }
            }
        });
        return buckets;
    }, [events, plays]);

    const totalPlayers = plays.length;
    const uniqueVisitors = useMemo(() => new Set((events || []).map(e => e.visitor_id).filter(Boolean)).size, [events]);
    const totalImpressions = useMemo(() => (events || []).filter(e => e.event_type === 'IMPRESSION').length, [events]);
    const totalClicks = useMemo(() => (events || []).filter(e => e.event_type === 'PRODUCT_CLICK').length, [events]);
    const productClickCounts = useMemo(() => {
        const m = {};
        (events || []).filter(e => e.event_type === 'PRODUCT_CLICK').forEach(e => {
            const pid = e.product_id;
            if (pid) m[pid] = (m[pid] || 0) + 1;
        });
        return m;
    }, [events]);
    const clickRate = totalImpressions > 0 ? ((totalClicks / totalImpressions) * 100).toFixed(1) : '0.0';
    
    const copyInvoice = () => {
        navigator.clipboard.writeText(invoice.invoiceNumber);
        setCopiedInvoice(true);
        setTimeout(() => setCopiedInvoice(false), 1500);
    };

    const sponsorStatus = booking.sponsorDate === todayIST ? 'live' : booking.sponsorDate > todayIST ? 'upcoming' : 'completed';

    // Hydrate all products for the click breakdown table
    const displayedProducts = useMemo(() => {
        const list = (booking.products || []).map((prod, idx) => ({
            ...prod,
            position: idx + 1,
            clicks: productClickCounts[prod.id] || 0
        }));

        // In case there are clicks on products not in booking.products
        Object.entries(productClickCounts).forEach(([pid, clicks]) => {
            if (!list.some(p => p.id === pid)) {
                list.push({
                    id: pid,
                    position: list.length + 1,
                    title: `Product ID: ${pid.slice(0, 8)}...`,
                    price: null,
                    image: '/icons/intrustLogo.png',
                    clicks
                });
            }
        });

        return list.sort((a, b) => b.clicks - a.clicks);
    }, [booking.products, productClickCounts]);

    return (
        <div className="space-y-5 sm:space-y-6 lg:space-y-7 animate-fadeIn">
            {/* Top Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/80 dark:border-slate-800 pb-3 sm:pb-4">
                <div className="flex items-start justify-between gap-3 flex-1 min-w-0">
                    <MarketingBreadcrumbs
                        customTitle="Sponsorship Analytics"
                        customSubtitle={`Detailed performance report for ${invoice.merchantName}. Bill Date: ${new Date(booking.sponsorDate + 'T00:00:00+05:30').toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`}
                    />
                    <GuideInfoButton pageKey="/marketing/daily-challenge" scope="marketing" className="mt-1 shrink-0" />
                </div>
                <div className="flex items-center gap-2 self-start sm:self-auto">
                    {sponsorStatus === 'live' && (
                        <Link
                            href="/marketing/daily-challenge"
                            className="px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-black flex items-center gap-1.5"
                        >
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                            <span>Live Billboard</span>
                        </Link>
                    )}
                    <Link
                        href="/marketing/daily-challenge/sponsor/history"
                        className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl text-xs font-bold text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors flex items-center gap-1.5 cursor-pointer shrink-0"
                    >
                        <ChevronRight size={14} className="rotate-180" />
                        Back to History
                    </Link>
                </div>
            </div>

            {/* KPI Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                <StatCard icon={Users} label="Players" value={totalPlayers} color="violet" hint={`${uniqueVisitors} unique visitors`} />
                <StatCard icon={Eye} label="Impressions" value={totalImpressions} color="amber" hint="times seen" />
                <StatCard icon={MousePointerClick} label="Clicks" value={totalClicks} color="blue" hint={`${clickRate}% CTR`} />
                <StatCard icon={ShoppingBag} label="Products" value={displayedProducts.length} color="emerald" hint="featured on billboard" />
            </div>

            {/* Chart */}
            <div className="bg-white dark:bg-slate-900 rounded-xl sm:rounded-2xl p-4 sm:p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs">
                <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <TrendingUp size={16} className="text-amber-600" /> Hourly Performance (IST)
                    </h3>
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Plays · Impressions · Clicks</span>
                </div>
                <Suspense fallback={<ChartSkeleton />}>
                    <SponsorshipAnalyticsChart hourlyData={hourlyData} />
                </Suspense>
            </div>

            {/* Product Performance Table */}
            <div className="bg-white dark:bg-slate-900 rounded-xl sm:rounded-2xl p-4 sm:p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs">
                <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <ShoppingBag size={16} className="text-emerald-600" /> Featured Catalog Engagement
                    </h3>
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Per product breakdown</span>
                </div>
                {displayedProducts.length === 0 ? (
                    <div className="text-center py-6 text-slate-400 text-sm">No products configured for this date.</div>
                ) : (
                    <div className="space-y-2.5">
                        {displayedProducts.map((prod) => {
                            const pct = totalClicks > 0 ? Math.round((prod.clicks / totalClicks) * 100) : 0;
                            return (
                                <div key={prod.id} className="p-3 rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 flex items-center justify-between gap-3">
                                    <div className="flex items-center gap-3 min-w-0 flex-1">
                                        <div className="relative w-10 h-10 rounded-xl overflow-hidden bg-white shrink-0 border border-slate-200">
                                            <Image
                                                src={prod.image || '/icons/intrustLogo.png'}
                                                alt={prod.title || 'Product'}
                                                fill
                                                sizes="40px"
                                                className="object-cover"
                                            />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-1.5">
                                                <span className="text-[9px] font-black text-amber-700 bg-amber-100 px-1 py-0.2 rounded">
                                                    #{prod.position}
                                                </span>
                                                <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate block">
                                                    {prod.title}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                {prod.price && (
                                                    <span className="text-[11px] font-black text-emerald-600">
                                                        ₹{prod.price}
                                                    </span>
                                                )}
                                                {totalClicks > 0 && (
                                                    <span className="text-[10px] text-slate-400 font-medium">
                                                        ({pct}% of clicks)
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-right shrink-0">
                                        <span className="text-xs sm:text-sm font-black text-slate-900 dark:text-white px-2 py-0.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700">
                                            {prod.clicks} {prod.clicks === 1 ? 'click' : 'clicks'}
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Official GST Invoice Card */}
            <div className="bg-[#fffdf7] dark:bg-slate-900 rounded-xl sm:rounded-2xl p-4 sm:p-5 border border-amber-200/60 dark:border-slate-800 shadow-xs">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
                        <Receipt size={14} /> Official GST Tax Invoice
                    </div>
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-300">
                        18% GST Compliant
                    </span>
                </div>
                <div className="text-lg font-black text-slate-900 dark:text-white">{invoice.invoiceNumber}</div>
                <div className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                    Billed to: <span className="font-semibold text-slate-700 dark:text-slate-200">{invoice.merchantName}</span> · Base Fee: ₹{invoice.baseFeeRupees?.toFixed(2)} + 18% GST (CGST 9% + SGST 9%)
                </div>
                <div className="mt-3.5 flex flex-wrap items-center gap-2">
                    <button
                        type="button"
                        onClick={() => setShowInvoiceModal(true)}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer active:scale-95"
                    >
                        <Receipt size={13} /> View Tax Invoice
                    </button>
                    <button
                        type="button"
                        onClick={copyInvoice}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                    >
                        {copiedInvoice ? <><Check size={13} /> Copied</> : <><Copy size={13} /> Copy Invoice #</>}
                    </button>
                    <a
                        href={`/api/marketing/sponsor/invoice/${encodeURIComponent(booking?.id || '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition-colors"
                    >
                        <FileText size={13} /> Printable HTML
                    </a>
                </div>
            </div>

            {/* Interactive GST Tax Invoice Modal */}
            {showInvoiceModal && (
                <SponsorshipGstInvoiceModal
                    invoice={invoice}
                    merchant={merchant}
                    onClose={() => setShowInvoiceModal(false)}
                />
            )}
        </div>
    );
}
