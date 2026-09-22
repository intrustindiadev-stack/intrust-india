'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { 
    TrendingUp, 
    Share2, 
    MousePointerClick, 
    Users, 
    ShoppingBag, 
    Wallet, 
    Trophy, 
    Gift, 
    ArrowRight, 
    Send, 
    BarChart3, 
    Sparkles, 
    Clock, 
    CheckCircle2, 
    Plus,
    ExternalLink,
    ChevronRight,
    ArrowUpRight
} from 'lucide-react';
import MarketingBreadcrumbs from '@/components/marketing/layout/MarketingBreadcrumbs';
import RocketGrowthVector from '@/components/marketing/graphics/RocketGrowthVector';
import dynamic from 'next/dynamic';
import GuideInfoButton from '@/components/common/GuideInfoButton';

const ShareModal = dynamic(() => import('@/components/marketing/ShareModal'), { ssr: false });
const ExclusivePrizesShowcase = dynamic(() => import('@/components/marketing/rewards/ExclusivePrizesShowcase'), {
    ssr: false,
    loading: () => <div className="rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-slate-800 p-5 sm:p-7 bg-white dark:bg-slate-900 animate-pulse h-44" />,
});

export default function MarketingOverviewClient({
    user,
    profile,
    merchant,
    isMerchant,
    initialStats,
    initialStreak,
    initialPrimaryTarget,
    initialTransactions,
    initialTopProducts,
    showcasePrizes = []
}) {
    const [selectedShareProduct, setSelectedShareProduct] = useState(null);

    const firstName = profile?.full_name?.split(' ')[0] || merchant?.business_name?.split(' ')[0] || 'Partner';
    const stats = initialStats || { total_shares: 0, link_clicks: 0, new_customers: 0, orders: 0, cashback_earned_paise: 0 };
    const streak = initialStreak?.current_streak || 0;
    const rewardsConfig = stats.rewards_config || {
        daily_challenge_reward_paise: 2500,
        campaign_share_bonus_paise: 5000,
        product_promo_default_cashback_paise: 10000,
        sponsorship_fee_paise: 99900
    };

    const dailyRewardRupees = (rewardsConfig.daily_challenge_reward_paise || 2500) / 100;
    const cashbackEarnedRupees = ((stats.cashback_earned_paise || 0) / 100).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 });

    const primaryTarget = initialPrimaryTarget || {
        title: 'Share 5 InTrust Deals',
        current_value: stats.total_shares || 0,
        target_value: 5,
        percent: Math.min(100, Math.round(((stats.total_shares || 0) / 5) * 100))
    };

    const topProducts = initialTopProducts || [];

    return (
        <div className="space-y-4 sm:space-y-6 lg:space-y-7 animate-fadeIn">
            {/* Breadcrumb Navigation + fullscreen guide */}
            <div className="flex items-start justify-between gap-3">
                <MarketingBreadcrumbs className="flex-1 min-w-0" />
                <GuideInfoButton pageKey="/marketing" scope="marketing" className="mt-1 shrink-0" />
            </div>

            {/* 1. HERO BANNER WITH CULTURAL MONUMENT ARTWORK */}
            <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-r from-blue-50 via-indigo-50/70 to-sky-100/90 dark:from-slate-900 dark:via-blue-950/40 dark:to-slate-900 border border-blue-100/80 dark:border-slate-800 p-4 sm:p-6 lg:p-7 shadow-2xs">
                <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 sm:gap-6">
                    {/* Left text column with right-side mobile image */}
                    <div className="flex items-center justify-between gap-3 sm:gap-4 max-w-xl">
                        <div className="flex-1 min-w-0">
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full bg-blue-600/10 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 text-[10px] sm:text-xs font-black uppercase tracking-wider mb-2 border border-blue-600/20">
                                <Sparkles size={12} />
                                <span>InTrust Marketing Workspace</span>
                            </div>
                            <h1 className="text-xl sm:text-2xl lg:text-3xl font-black text-slate-950 dark:text-white tracking-tight leading-tight">
                                {greeting}, {firstName}!
                            </h1>
                            <p className="text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-300 mt-0.5 sm:mt-1">
                                Share. Inspire. Grow together.
                            </p>
                            <div className="flex items-center gap-2 mt-2.5 flex-wrap">
                                <span className="text-[10px] sm:text-[11px] font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1.5 bg-white/80 dark:bg-slate-800/80 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full border border-slate-200/60 dark:border-slate-700">
                                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                                    Live Ledger
                                </span>
                                {streak > 0 && (
                                    <span className="text-[10px] sm:text-[11px] font-black text-amber-600 dark:text-amber-400 flex items-center gap-1 bg-amber-500/10 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full border border-amber-500/20">
                                        <span>🔥 {streak} Day Streak</span>
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Right-side mobile image thumbnail */}
                        <div className="lg:hidden relative w-16 h-16 sm:w-20 sm:h-20 rounded-xl sm:rounded-2xl overflow-hidden shadow-2xs shrink-0 border border-blue-200/80 dark:border-slate-700">
                            <Image 
                                src="/marketing/hero_banner_art.jpg" 
                                alt="Indian Heritage" 
                                fill 
                                sizes="(max-width: 640px) 64px, 80px"
                                className="object-cover object-center" 
                                priority
                            />
                        </div>
                    </div>

                    {/* Center Desktop 3D Vector */}
                    <div className="hidden lg:flex items-center justify-center shrink-0 -my-4">
                        <RocketGrowthVector animated={true} className="w-32 h-32 xl:w-36 xl:h-36" />
                    </div>

                    {/* Right Current Target Card Teaser */}
                    <div className="w-full lg:w-72 bg-white/95 dark:bg-slate-900/90 backdrop-blur-md rounded-xl sm:rounded-2xl p-3.5 sm:p-4 border border-slate-200/80 dark:border-slate-800 shadow-2xs">
                        <div className="flex items-center justify-between mb-1.5">
                            <span className="text-[10px] font-extrabold uppercase text-slate-400 dark:text-slate-500 tracking-wider">
                                Current Target
                            </span>
                            <Gift size={16} className="text-rose-500" />
                        </div>
                        <h3 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white mb-2 truncate">
                            {primaryTarget.title}
                        </h3>
                        {/* Progress bar */}
                        <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden mb-2">
                            <div 
                                className="h-full rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 transition-all duration-500" 
                                style={{ width: `${primaryTarget.percent || 0}%` }}
                            />
                        </div>
                        <div className="flex items-center justify-between text-[10px] sm:text-[11px] font-bold">
                            <span className="text-slate-500 dark:text-slate-400 truncate pr-2">
                                {primaryTarget.current_value || 0} / {primaryTarget.target_value || 1} Done
                            </span>
                            <Link href="/marketing/targets" className="text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-0.5 shrink-0">
                                <span>View All</span>
                                <ArrowRight size={10} />
                            </Link>
                        </div>
                    </div>
                </div>

                {/* Background Heritage Architectural Illustration */}
                <div className="absolute right-0 top-0 bottom-0 w-1/2 opacity-25 dark:opacity-15 pointer-events-none hidden lg:block overflow-hidden">
                    <Image 
                        src="/marketing/hero_banner_art.jpg" 
                        alt="Indian Heritage" 
                        fill 
                        sizes="50vw"
                        className="object-cover object-center mix-blend-multiply dark:mix-blend-luminosity" 
                        priority
                    />
                </div>
            </div>

            {/* 2. TOP 5 KPI SUMMARY CARDS */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-2.5 sm:gap-3.5 stagger">
                {/* Total Shares */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl p-3 sm:p-4 border border-slate-200/80 dark:border-slate-800 shadow-2xs flex flex-col justify-between hover:border-blue-500/40 hover:shadow-xs transition-all group">
                    <div>
                        <div className="flex items-center justify-between mb-1.5">
                            <span className="text-[11px] sm:text-xs font-bold text-slate-500 dark:text-slate-400">Total Shares</span>
                            <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg sm:rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 flex items-center justify-center shrink-0">
                                <Share2 size={13} />
                            </div>
                        </div>
                        <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                            {(stats.total_shares || 0).toLocaleString('en-IN')}
                        </div>
                        <div className="mt-0.5 flex items-center gap-1 text-[10px] sm:text-[11px] font-extrabold text-blue-600 dark:text-blue-400">
                            <span>Attributed links</span>
                        </div>
                    </div>
                    <Link
                        href="/marketing/products"
                        className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[10px] sm:text-[11px] font-black text-blue-600 dark:text-blue-400 group-hover:translate-x-0.5 transition-transform"
                    >
                        <span>Share Catalog</span>
                        <ChevronRight size={12} />
                    </Link>
                </div>

                {/* Link Clicks */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl p-3 sm:p-4 border border-slate-200/80 dark:border-slate-800 shadow-2xs flex flex-col justify-between hover:border-amber-500/40 hover:shadow-xs transition-all group">
                    <div>
                        <div className="flex items-center justify-between mb-1.5">
                            <span className="text-[11px] sm:text-xs font-bold text-slate-500 dark:text-slate-400">Link Clicks</span>
                            <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg sm:rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 flex items-center justify-center shrink-0">
                                <MousePointerClick size={13} />
                            </div>
                        </div>
                        <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                            {(stats.link_clicks || 0).toLocaleString('en-IN')}
                        </div>
                        <div className="mt-0.5 flex items-center gap-1 text-[10px] sm:text-[11px] font-extrabold text-amber-600 dark:text-amber-400">
                            <span>Unique visitors</span>
                        </div>
                    </div>
                    <Link
                        href="/marketing/analytics"
                        className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[10px] sm:text-[11px] font-black text-amber-600 dark:text-amber-400 group-hover:translate-x-0.5 transition-transform"
                    >
                        <span>View Trends</span>
                        <ChevronRight size={12} />
                    </Link>
                </div>

                {/* New Customers */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl p-3 sm:p-4 border border-slate-200/80 dark:border-slate-800 shadow-2xs flex flex-col justify-between hover:border-emerald-500/40 hover:shadow-xs transition-all group">
                    <div>
                        <div className="flex items-center justify-between mb-1.5">
                            <span className="text-[11px] sm:text-xs font-bold text-slate-500 dark:text-slate-400">New Customers</span>
                            <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg sm:rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center shrink-0">
                                <Users size={13} />
                            </div>
                        </div>
                        <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                            {(stats.new_customers || 0).toLocaleString('en-IN')}
                        </div>
                        <div className="mt-0.5 flex items-center gap-1 text-[10px] sm:text-[11px] font-extrabold text-emerald-600 dark:text-emerald-400">
                            <span>Sign-up conversions</span>
                        </div>
                    </div>
                    <button
                        onClick={() => setSelectedShareProduct({
                            id: 'primary-campaign',
                            title: isMerchant ? (merchant?.business_name || 'My InTrust Store') : 'InTrust Shopping Pass & Campaign',
                            price: 0,
                            share_cashback_paise: rewardsConfig.campaign_share_bonus_paise || 5000
                        })}
                        className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between w-full text-left text-[10px] sm:text-[11px] font-black text-emerald-600 dark:text-emerald-400 group-hover:translate-x-0.5 transition-transform"
                    >
                        <span>Share Campaign</span>
                        <ChevronRight size={12} />
                    </button>
                </div>

                {/* Orders */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl p-3 sm:p-4 border border-slate-200/80 dark:border-slate-800 shadow-2xs flex flex-col justify-between hover:border-purple-500/40 hover:shadow-xs transition-all group">
                    <div>
                        <div className="flex items-center justify-between mb-1.5">
                            <span className="text-[11px] sm:text-xs font-bold text-slate-500 dark:text-slate-400">Orders</span>
                            <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg sm:rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 flex items-center justify-center shrink-0">
                                <ShoppingBag size={13} />
                            </div>
                        </div>
                        <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                            {(stats.orders || 0).toLocaleString('en-IN')}
                        </div>
                        <div className="mt-0.5 flex items-center gap-1 text-[10px] sm:text-[11px] font-extrabold text-purple-600 dark:text-purple-400">
                            <span>Verified purchases</span>
                        </div>
                    </div>
                    <Link
                        href="/marketing/targets"
                        className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[10px] sm:text-[11px] font-black text-purple-600 dark:text-purple-400 group-hover:translate-x-0.5 transition-transform"
                    >
                        <span>Check Targets</span>
                        <ChevronRight size={12} />
                    </Link>
                </div>

                {/* Cashback Earned */}
                <div className="col-span-2 lg:col-span-1 bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl p-3 sm:p-4 border border-slate-200/80 dark:border-slate-800 shadow-2xs flex flex-col justify-between hover:border-teal-500/40 hover:shadow-xs transition-all group">
                    <div>
                        <div className="flex items-center justify-between mb-1.5">
                            <span className="text-[11px] sm:text-xs font-bold text-slate-500 dark:text-slate-400">Cashback Earned</span>
                            <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg sm:rounded-xl bg-teal-50 dark:bg-teal-950/60 text-teal-600 flex items-center justify-center shrink-0">
                                <Wallet size={13} />
                            </div>
                        </div>
                        <div className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 truncate">
                            ₹{cashbackEarnedRupees}
                        </div>
                        <div className="mt-0.5 flex items-center gap-1 text-[10px] sm:text-[11px] font-extrabold text-emerald-600 dark:text-emerald-400">
                            <span>Credited to wallet</span>
                        </div>
                    </div>
                    <Link
                        href="/marketing/transactions"
                        className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[10px] sm:text-[11px] font-black text-teal-600 dark:text-teal-400 group-hover:translate-x-0.5 transition-transform"
                    >
                        <span>Wallet Ledger</span>
                        <ChevronRight size={12} />
                    </Link>
                </div>
            </div>

            {/* 3. QUICK ACTION CARDS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 sm:gap-3.5">
                <Link
                    href="/marketing/products"
                    className="flex items-center gap-3 p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs hover:shadow-xs hover:border-emerald-500/40 transition-all group"
                >
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-200 dark:border-emerald-800 group-hover:scale-105 transition-transform shrink-0">
                        <Send size={18} />
                    </div>
                    <div className="min-w-0">
                        <h4 className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white truncate">
                            {isMerchant ? 'Share a Product' : 'Share InTrust Products'}
                        </h4>
                        <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                            Attributed links & social reach
                        </p>
                    </div>
                </Link>

                {isMerchant ? (
                    <Link
                        href="/marketing/daily-challenge"
                        className="flex items-center gap-3 p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs hover:shadow-xs hover:border-amber-500/40 transition-all group"
                    >
                        <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-200 dark:border-amber-800 group-hover:scale-105 transition-transform shrink-0">
                            <Trophy size={18} />
                        </div>
                        <div className="min-w-0">
                            <h4 className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white truncate">
                                Sponsor a Daily Challenge
                            </h4>
                            <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                                Select date & 4 store products
                            </p>
                        </div>
                    </Link>
                ) : (
                    <Link
                        href="/marketing/daily-challenge"
                        className="flex items-center gap-3 p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs hover:shadow-xs hover:border-amber-500/40 transition-all group"
                    >
                        <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-200 dark:border-amber-800 group-hover:scale-105 transition-transform shrink-0">
                            <Trophy size={18} />
                        </div>
                        <div className="min-w-0">
                            <h4 className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white truncate">
                                Play Daily Challenge
                            </h4>
                            <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                                10 questions, instant ₹{dailyRewardRupees} cashback
                            </p>
                        </div>
                    </Link>
                )}

                <Link
                    href="/marketing/analytics"
                    className="flex items-center gap-3 p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs hover:shadow-xs hover:border-purple-500/40 transition-all group sm:col-span-2 md:col-span-1"
                >
                    <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 flex items-center justify-center border border-purple-200 dark:border-purple-800 group-hover:scale-105 transition-transform shrink-0">
                        <BarChart3 size={18} />
                    </div>
                    <div className="min-w-0">
                        <h4 className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white truncate">
                            View Analytics
                        </h4>
                        <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                            Conversion rates, reach & trends
                        </p>
                    </div>
                </Link>
            </div>

            {/* 3.5. WHAT YOU CAN WIN — EXCLUSIVE PRIZES & PHYSICAL REWARDS */}
            <ExclusivePrizesShowcase isMerchant={isMerchant} targets={showcasePrizes} />

            {/* 4. THREE-COLUMN SECTION: CHALLENGE, TOP PRODUCTS, TRANSACTIONS */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-5">
                {/* Column 1: Today's Daily Challenge Preview */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl p-4 sm:p-5 border border-slate-200/80 dark:border-slate-800 shadow-2xs flex flex-col justify-between">
                    <div>
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-extrabold uppercase text-slate-400 tracking-wider">
                                    Daily Challenge
                                </span>
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 text-[10px] font-black border border-emerald-200 dark:border-emerald-800">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                    Live Today
                                </span>
                            </div>
                        </div>

                        <div className="flex items-center gap-4 mb-4">
                            <div className="relative w-20 h-20 rounded-2xl overflow-hidden shadow-xs shrink-0">
                                <Image 
                                    src="/marketing/challenge_trophy.jpg" 
                                    alt="Daily Challenge Trophy" 
                                    fill 
                                    className="object-contain"
                                />
                            </div>
                            <div>
                                <h4 className="text-base font-black text-slate-900 dark:text-white leading-snug">
                                    Test Your Knowledge. Earn Rewards.
                                </h4>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                    10 questions across Indian Mythology, GK, Tech, and more.
                                </p>
                            </div>
                        </div>

                        <div className="bg-amber-50/80 dark:bg-amber-950/30 rounded-2xl p-3 border border-amber-200/80 dark:border-amber-800/60 mb-5 flex items-center justify-between">
                            <div>
                                <span className="text-[10px] font-extrabold uppercase text-amber-700 dark:text-amber-400 block">
                                    Today&apos;s Prize
                                </span>
                                <span className="text-base font-black text-amber-900 dark:text-amber-300">
                                    Fixed ₹{dailyRewardRupees} Cashback
                                </span>
                            </div>
                            <span className="text-[11px] font-bold text-amber-700 dark:text-amber-400">
                                1 Play / Day
                            </span>
                        </div>
                    </div>

                    <div>
                        <Link
                            href="/marketing/daily-challenge"
                            className="w-full py-3 rounded-2xl bg-slate-950 hover:bg-slate-900 dark:bg-blue-600 dark:hover:bg-blue-700 text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-sm transition-all"
                        >
                            <span>Play Challenge</span>
                            <ArrowRight size={14} />
                        </Link>

                        {/* Sponsor pill */}
                        <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500">
                            <div className="flex items-center gap-1.5 truncate">
                                <span className="text-slate-400">Sponsored by</span>
                                <span className="font-extrabold text-slate-800 dark:text-slate-200">
                                    {stats.today_sponsor?.merchant_name || "Nature's Basket"}
                                </span>
                            </div>
                            <Link href="/marketing/daily-challenge" className="text-blue-600 dark:text-blue-400 font-bold hover:underline shrink-0">
                                View Products →
                            </Link>
                        </div>
                    </div>
                </div>

                {/* Column 2: Top Performing Products */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl p-4 sm:p-5 border border-slate-200/80 dark:border-slate-800 shadow-2xs flex flex-col justify-between">
                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-[11px] sm:text-xs font-extrabold uppercase text-slate-400 tracking-wider">
                                Top Products
                            </span>
                            <Link href="/marketing/products" className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline">
                                View All →
                            </Link>
                        </div>

                        <div className="space-y-2.5">
                            {topProducts.length > 0 ? (
                                topProducts.map((prod, idx) => (
                                    <div 
                                        key={prod.id || idx}
                                        className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 hover:bg-slate-100/80 transition-colors"
                                    >
                                        <div className="flex items-center gap-2.5 min-w-0">
                                            <div className="w-6 h-6 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-center font-black text-[11px] text-slate-700 dark:text-slate-300 shrink-0">
                                                {idx + 1}
                                            </div>
                                            <div className="min-w-0">
                                                <h5 className="text-xs font-extrabold text-slate-900 dark:text-white truncate">
                                                    {prod.title || prod.name}
                                                </h5>
                                                <p className="text-[10px] text-slate-500 dark:text-slate-400">
                                                    {prod.clicks || 0} clicks • {prod.orders || 0} orders
                                                </p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => setSelectedShareProduct(prod)}
                                            className="px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 text-[11px] font-black hover:bg-blue-100 transition-all shrink-0"
                                        >
                                            Share
                                        </button>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-6 px-3 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
                                    <p className="text-xs font-bold text-slate-500">No shared products yet</p>
                                    <Link href="/marketing/products" className="text-xs font-black text-blue-600 hover:underline mt-1 block">
                                        Browse Products to Share →
                                    </Link>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="pt-3 border-t border-slate-100 dark:border-slate-800 mt-3">
                        <Link
                            href="/marketing/products"
                            className="text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-blue-600 flex items-center justify-between"
                        >
                            <span>Share new products to boost reach</span>
                            <ArrowRight size={13} />
                        </Link>
                    </div>
                </div>

                {/* Column 3: Recent Transactions */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl p-4 sm:p-5 border border-slate-200/80 dark:border-slate-800 shadow-2xs flex flex-col justify-between md:col-span-2 lg:col-span-1">
                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-[11px] sm:text-xs font-extrabold uppercase text-slate-400 tracking-wider">
                                Recent Transactions
                            </span>
                            <Link href="/marketing/transactions" className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline">
                                View All →
                            </Link>
                        </div>

                        <div className="space-y-2.5">
                            {initialTransactions?.length > 0 ? (
                                initialTransactions.slice(0, 4).map((tx) => (
                                    <div 
                                        key={tx.id}
                                        className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60"
                                    >
                                        <div className="min-w-0 pr-2">
                                            <h5 className="text-xs font-extrabold text-slate-900 dark:text-white truncate">
                                                {tx.description}
                                            </h5>
                                            <p className="text-[10px] text-slate-400">
                                                {new Date(tx.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                            </p>
                                        </div>
                                        <span className={`text-xs font-black shrink-0 ${tx.type === 'CREDIT' ? 'text-emerald-600' : 'text-slate-900 dark:text-white'}`}>
                                            {tx.type === 'CREDIT' ? '+' : '-'} ₹{((tx.amount_paise || 0) / 100).toFixed(0)}
                                        </span>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-6 px-3 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 space-y-2">
                                    <div className="w-8 h-8 rounded-xl bg-teal-50 dark:bg-teal-950/60 text-teal-600 flex items-center justify-center mx-auto">
                                        <Wallet size={15} />
                                    </div>
                                    <h5 className="text-xs font-black text-slate-800 dark:text-slate-200">No Transactions Yet</h5>
                                    <p className="text-[11px] text-slate-400">Play daily challenge or share product links to earn real wallet rewards.</p>
                                    <Link href="/marketing/daily-challenge" className="inline-block text-[11px] font-black text-blue-600 dark:text-blue-400 hover:underline pt-1">
                                        Play Challenge for ₹{dailyRewardRupees} →
                                    </Link>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="pt-3 border-t border-slate-100 dark:border-slate-800 mt-3">
                        <span className="text-[10px] sm:text-[11px] text-slate-400 block truncate">
                            Directly synchronized with your InTrust Wallet ledger.
                        </span>
                    </div>
                </div>
            </div>

            {/* 5. BOTTOM CALL-TO-ACTION BANNER */}
            <div className="rounded-2xl sm:rounded-3xl bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 text-white p-4 sm:p-6 lg:p-7 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sm:gap-6 shadow-sm border border-slate-800">
                <div>
                    <h3 className="text-lg sm:text-xl lg:text-2xl font-black tracking-tight">
                        Grow Your Business with InTrust
                    </h3>
                    <p className="text-xs sm:text-sm text-blue-200/80 mt-0.5 sm:mt-1 max-w-xl">
                        Share amazing products across India. Earn guaranteed cashbacks and unlock exclusive physical mystery rewards.
                    </p>
                </div>
                <Link
                    href="/marketing/products"
                    className="py-2.5 sm:py-3 px-5 sm:px-6 rounded-xl sm:rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs shadow-md shadow-blue-500/25 shrink-0 transition-all active:scale-95"
                >
                    Start Sharing Now →
                </Link>
            </div>

            {/* Share Modal Trigger */}
            {selectedShareProduct && (
                <ShareModal
                    isOpen={!!selectedShareProduct}
                    onClose={() => setSelectedShareProduct(null)}
                    product={selectedShareProduct}
                    user={user}
                    merchant={merchant}
                    rewardsConfig={rewardsConfig}
                />
            )}
        </div>
    );
}
