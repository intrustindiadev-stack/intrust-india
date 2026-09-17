'use client';

import Link from 'next/link';
import { 
    Megaphone, 
    Share2, 
    TrendingUp, 
    ArrowUpRight, 
    ChevronRight, 
    Sparkles, 
    Calendar,
    Target,
    Zap
} from 'lucide-react';

export default function MerchantMarketingKpiSection({
    marketingStats = {
        totalShares: 0,
        linkClicks: 0,
        ordersCount: 0,
        activeSponsorships: 0,
        isSponsoringToday: false,
        campaignRevenue: 0,
        completedTargets: 0
    }
}) {
    const shares = Number(marketingStats?.totalShares || 0);
    const clicks = Number(marketingStats?.linkClicks || 0);
    const orders = Number(marketingStats?.ordersCount || 0);
    const sponsorships = Number(marketingStats?.activeSponsorships || 0);
    const isSponsoringToday = !!marketingStats?.isSponsoringToday;
    const revenue = Number(marketingStats?.campaignRevenue || 0);
    const targets = Number(marketingStats?.completedTargets || 0);

    return (
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900/[0.02] via-blue-900/[0.03] to-slate-900/[0.02] dark:from-white/[0.03] dark:via-blue-500/[0.02] dark:to-white/[0.01] p-4 sm:p-6 border border-slate-200/80 dark:border-white/10 shadow-xs space-y-4">
            {/* Header with Title, Live Badge & Link to Marketing Hub */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/60 dark:border-white/5 pb-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-blue-500/25 shrink-0">
                        <Megaphone size={19} />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h3 className="text-base font-black text-slate-900 dark:text-white tracking-tight">
                                Marketing & Growth Engine
                            </h3>
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                Live Attribution
                            </span>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                            Real-time tracking for deal promotions, quiz sponsorships, verified sales & physical gift milestones.
                        </p>
                    </div>
                </div>

                <Link
                    href="/marketing"
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-white dark:bg-white/10 hover:bg-slate-50 dark:hover:bg-white/15 text-slate-900 dark:text-white text-xs font-black border border-slate-200 dark:border-white/10 shadow-2xs hover:shadow-xs transition-all group self-start sm:self-auto active:scale-95"
                >
                    <span>Marketing Command</span>
                    <ArrowUpRight size={14} className="text-blue-500 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                </Link>
            </div>

            {/* 4 Responsive Clean KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                {/* 1. Product Link Shares & Traffic */}
                <Link
                    href="/marketing/products"
                    className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-[#13161f] border border-slate-200/80 dark:border-white/5 hover:border-blue-500/50 hover:shadow-sm transition-all flex flex-col justify-between group cursor-pointer"
                >
                    <div className="flex items-center justify-between mb-2 sm:mb-3">
                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                            Deal Shares
                        </span>
                        <div className="w-7 h-7 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                            <Share2 size={13} />
                        </div>
                    </div>
                    <div className="space-y-1">
                        <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                            {shares}
                        </div>
                        <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-white/5 text-[10px] font-bold">
                            <span className="text-slate-400 truncate max-w-[95px] sm:max-w-none">
                                {clicks} visits · {orders} orders
                            </span>
                            <span className="text-blue-600 dark:text-blue-400 flex items-center group-hover:translate-x-0.5 transition-transform shrink-0">
                                Promote <ChevronRight size={10} />
                            </span>
                        </div>
                    </div>
                </Link>

                {/* 2. Daily Quiz Sponsorship Status */}
                <Link
                    href="/marketing/sponsorships"
                    className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-[#13161f] border border-slate-200/80 dark:border-white/5 hover:border-amber-500/50 hover:shadow-sm transition-all flex flex-col justify-between group cursor-pointer"
                >
                    <div className="flex items-center justify-between mb-2 sm:mb-3">
                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                            Quiz Sponsor
                        </span>
                        <div className="w-7 h-7 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                            <Calendar size={13} />
                        </div>
                    </div>
                    <div className="space-y-1">
                        <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-1.5">
                            {isSponsoringToday ? (
                                <>
                                    <span>Live Today</span>
                                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                </>
                            ) : sponsorships > 0 ? (
                                <>
                                    <span>{sponsorships} Booked</span>
                                    <span className="w-2 h-2 rounded-full bg-amber-500" />
                                </>
                            ) : (
                                <span className="text-slate-600 dark:text-slate-300">Available</span>
                            )}
                        </div>
                        <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-white/5 text-[10px] font-bold">
                            <span className={isSponsoringToday ? 'text-emerald-600 dark:text-emerald-400' : (sponsorships > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-400')}>
                                {isSponsoringToday ? 'Live on Quiz 🔥' : (sponsorships > 0 ? `${sponsorships} dates active` : 'Book ₹999/day')}
                            </span>
                            <span className="text-amber-600 dark:text-amber-400 flex items-center group-hover:translate-x-0.5 transition-transform shrink-0">
                                {sponsorships > 0 ? 'Manage' : 'Book'} <ChevronRight size={10} />
                            </span>
                        </div>
                    </div>
                </Link>

                {/* 3. Campaign Promotion Sales */}
                <Link
                    href="/marketing/analytics"
                    className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-[#13161f] border border-slate-200/80 dark:border-white/5 hover:border-emerald-500/50 hover:shadow-sm transition-all flex flex-col justify-between group cursor-pointer"
                >
                    <div className="flex items-center justify-between mb-2 sm:mb-3">
                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                            Marketing Cashback
                        </span>
                        <div className="w-7 h-7 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                            <TrendingUp size={13} />
                        </div>
                    </div>
                    <div className="space-y-1">
                        <div className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight">
                            ₹{revenue.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                        </div>
                        <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-white/5 text-[10px] font-bold">
                            <span className="text-slate-400 truncate max-w-[95px] sm:max-w-none">
                                {revenue > 0 ? 'Direct wallet cashback' : 'Attributed earnings'}
                            </span>
                            <span className="text-emerald-600 dark:text-emerald-400 flex items-center group-hover:translate-x-0.5 transition-transform shrink-0">
                                Analytics <ChevronRight size={10} />
                            </span>
                        </div>
                    </div>
                </Link>

                {/* 4. Mystery Target Milestones */}
                <Link
                    href="/marketing/targets"
                    className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-[#13161f] border border-slate-200/80 dark:border-white/5 hover:border-purple-500/50 hover:shadow-sm transition-all flex flex-col justify-between group cursor-pointer"
                >
                    <div className="flex items-center justify-between mb-2 sm:mb-3">
                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                            Mystery Gifts
                        </span>
                        <div className="w-7 h-7 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                            <Target size={13} />
                        </div>
                    </div>
                    <div className="space-y-1">
                        <div className="text-xl sm:text-2xl font-black text-purple-600 dark:text-purple-400 tracking-tight">
                            {targets} Claimed
                        </div>
                        <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-white/5 text-[10px] font-bold">
                            <span className="text-slate-400 truncate max-w-[95px] sm:max-w-none">
                                {targets > 0 ? 'Physical gift milestone' : 'Tech gear & kits'}
                            </span>
                            <span className="text-purple-600 dark:text-purple-400 flex items-center group-hover:translate-x-0.5 transition-transform shrink-0">
                                Claim <ChevronRight size={10} />
                            </span>
                        </div>
                    </div>
                </Link>
            </div>
        </section>
    );
}
