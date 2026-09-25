'use client';

import { useState, useEffect, useMemo } from 'react';
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
    ArrowUpRight,
    Flame,
    Check,
    Store,
    ShieldCheck,
    Zap
} from 'lucide-react';
import MarketingBreadcrumbs from '@/components/marketing/layout/MarketingBreadcrumbs';
import RocketGrowthVector from '@/components/marketing/graphics/RocketGrowthVector';
import dynamic from 'next/dynamic';
import GuideInfoButton from '@/components/common/GuideInfoButton';
import { useMarketingWallet } from '@/components/marketing/layout/MarketingWalletContext';

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
    const [greeting, setGreeting] = useState('Welcome');
    const { balancePaise, walletHref } = useMarketingWallet();

    useEffect(() => {
        const hour = new Date().getHours();
        if (hour < 12) setGreeting('Good morning');
        else if (hour < 17) setGreeting('Good afternoon');
        else setGreeting('Good evening');
    }, []);

    const firstName = profile?.full_name?.split(' ')[0] || merchant?.business_name?.split(' ')[0] || 'Partner';
    const stats = initialStats || { total_shares: 0, link_clicks: 0, new_customers: 0, orders: 0, cashback_earned_paise: 0 };
    const streak = initialStreak?.current_streak || initialStreak?.streak || 0;
    const rewardsConfig = stats.rewards_config || {
        daily_challenge_reward_paise: 2500,
        campaign_share_bonus_paise: 5000,
        product_promo_default_cashback_paise: 10000,
        sponsorship_fee_paise: 99900
    };

    const dailyRewardRupees = (rewardsConfig.daily_challenge_reward_paise || 2500) / 100;
    const liveWalletRupees = (balancePaise / 100).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
    const cashbackEarnedRupees = ((stats.cashback_earned_paise || 0) / 100).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 });

    const primaryTarget = initialPrimaryTarget || {
        title: 'Share 5 InTrust Deals',
        current_value: stats.total_shares || 0,
        target_value: 5,
        percent: Math.min(100, Math.round(((stats.total_shares || 0) / 5) * 100))
    };

    const topProducts = initialTopProducts || [];

    // 7-day streak calculation
    const dayNames = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
    const todayIndex = (new Date().getDay() + 6) % 7; // Monday = 0
    const streakDays = Math.min(streak, 7);

    return (
        <div className="space-y-4 sm:space-y-6 lg:space-y-8 animate-fadeIn">
            {/* Breadcrumb Navigation + fullscreen guide */}
            <div className="flex items-start justify-between gap-3">
                <MarketingBreadcrumbs className="flex-1 min-w-0" />
                <GuideInfoButton pageKey="/marketing" scope="marketing" className="mt-1 shrink-0" />
            </div>

            {/* 1. VISUAL HERO BANNER WITH WALLET BALANCE & QUICK ACTIONS */}
            <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-br from-slate-950 via-blue-950 to-indigo-950 text-white border border-blue-900/40 p-5 sm:p-7 lg:p-8 shadow-xl">
                {/* Decorative mesh glows */}
                <div className="absolute top-0 right-1/4 w-96 h-96 bg-blue-500/15 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute -bottom-10 left-10 w-80 h-80 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />

                <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 sm:gap-8">
                    {/* Left column: Greeting, Wallet Balance, and Primary CTAs */}
                    <div className="flex-1 max-w-2xl min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-3">
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 text-xs font-extrabold uppercase tracking-wider border border-blue-400/30">
                                <Sparkles size={13} className="text-blue-300" />
                                <span>InTrust Growth Workspace</span>
                            </span>
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-extrabold border border-emerald-400/30">
                                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                                <span>Wallet Active</span>
                            </span>
                            {streak > 0 && (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 text-xs font-black border border-amber-400/30">
                                    <Flame size={13} className="text-amber-400 fill-amber-400" />
                                    <span>{streak} Day Streak</span>
                                </span>
                            )}
                        </div>

                        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight leading-tight">
                            {greeting}, {firstName}!
                        </h1>
                        <p className="text-sm sm:text-base text-blue-100/90 font-medium mt-1.5 max-w-xl leading-relaxed">
                            Share high-margin verified deals, play the daily knowledge quiz, and unlock doorstep mystery gifts.
                        </p>

                        {/* Live Balance & Quick Wallet Actions Bar */}
                        <div className="mt-5 p-3.5 sm:p-4 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 flex flex-col sm:flex-row sm:items-center justify-between gap-3 max-w-lg">
                            <div className="flex items-center gap-3">
                                <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-white flex items-center justify-center shrink-0 shadow-md">
                                    <Wallet size={20} className="stroke-[2.5]" />
                                </div>
                                <div>
                                    <div className="text-xs font-bold text-blue-200 uppercase tracking-wider">
                                        Live Wallet Balance
                                    </div>
                                    <div className="text-2xl sm:text-3xl font-black text-white tabular-nums tracking-tight">
                                        ₹{liveWalletRupees}
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                <Link
                                    href={walletHref}
                                    className="px-3.5 py-2 rounded-xl bg-white text-slate-950 font-black text-xs sm:text-sm hover:bg-blue-50 transition-all flex items-center gap-1.5 shadow-sm active:scale-95 shrink-0"
                                >
                                    <span>Open Passbook</span>
                                    <ArrowRight size={13} />
                                </Link>
                            </div>
                        </div>

                        {/* Dual Primary CTAs */}
                        <div className="flex items-center gap-3 mt-5 flex-wrap">
                            <Link
                                href="/marketing/daily-challenge"
                                className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-xs sm:text-sm shadow-lg shadow-amber-500/25 active:scale-95 transition-all"
                            >
                                <Trophy size={16} className="text-slate-950" />
                                <span>Play Today&apos;s Quiz (Win ₹{dailyRewardRupees})</span>
                                <ArrowRight size={14} />
                            </Link>
                            <Link
                                href="/marketing/products"
                                className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-extrabold text-xs sm:text-sm border border-white/20 active:scale-95 transition-all"
                            >
                                <ShoppingBag size={16} className="text-emerald-300" />
                                <span>Browse Deals & Share</span>
                            </Link>
                        </div>
                    </div>

                    {/* Right column: Target Progress Teaser Card */}
                    <div className="w-full lg:w-80 bg-white/10 backdrop-blur-md rounded-2xl sm:rounded-3xl p-4 sm:p-5 border border-white/15 shadow-lg shrink-0">
                        <div className="flex items-center justify-between mb-2.5">
                            <span className="text-xs font-black uppercase text-blue-200 tracking-wider">
                                Milestone Goal
                            </span>
                            <div className="w-8 h-8 rounded-xl bg-rose-500/20 text-rose-300 flex items-center justify-center border border-rose-400/30">
                                <Gift size={16} />
                            </div>
                        </div>

                        <h3 className="text-sm sm:text-base font-black text-white mb-2 leading-snug line-clamp-2">
                            {primaryTarget.title}
                        </h3>

                        {/* Progress Bar */}
                        <div className="space-y-1.5 my-3">
                            <div className="flex items-center justify-between text-xs font-bold">
                                <span className="text-blue-200">
                                    {primaryTarget.current_value || 0} / {primaryTarget.target_value || 1} Completed
                                </span>
                                <span className="text-emerald-300 font-black">
                                    {primaryTarget.percent || 0}%
                                </span>
                            </div>
                            <div className="w-full h-2.5 rounded-full bg-white/15 overflow-hidden">
                                <div 
                                    className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-teal-400 transition-all duration-700" 
                                    style={{ width: `${primaryTarget.percent || 0}%` }}
                                />
                            </div>
                        </div>

                        <div className="pt-2.5 border-t border-white/10 flex items-center justify-between text-xs font-bold">
                            <span className="text-blue-200">Physical Gifts & Cash</span>
                            <Link href="/marketing/targets" className="text-white hover:text-blue-200 font-black flex items-center gap-1">
                                <span>View Targets</span>
                                <ChevronRight size={14} />
                            </Link>
                        </div>
                    </div>
                </div>
            </div>

            {/* 1.5. GAMIFIED 7-DAY STREAK TRACKER */}
            <div className="rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-4 sm:p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 text-white flex items-center justify-center shrink-0 shadow-md shadow-orange-500/20">
                        <Flame size={24} className="fill-white animate-pulse" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                                {streak > 0 ? `${streak}-Day Quiz Streak!` : 'Start Your 7-Day Quiz Streak'}
                            </h3>
                            <span className="px-2.5 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 text-xs font-black uppercase">
                                Daily Cash
                            </span>
                        </div>
                        <p className="text-xs sm:text-sm font-semibold text-slate-500 dark:text-slate-400 mt-0.5">
                            Play today&apos;s 2-minute quiz to earn ₹{dailyRewardRupees} and protect your multiplier.
                        </p>
                    </div>
                </div>

                {/* 7-day milestone horizontal strip */}
                <div className="flex items-center gap-1.5 sm:gap-2 self-start md:self-auto overflow-x-auto max-w-full pb-1 md:pb-0">
                    {dayNames.map((d, i) => {
                        const daysSinceToday = todayIndex - i;
                        const isActive = daysSinceToday >= 0 && daysSinceToday < streakDays;
                        const isToday = i === todayIndex;
                        const isWeekend = i >= 5;

                        return (
                            <div key={i} className="flex flex-col items-center gap-1 shrink-0">
                                <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center text-xs sm:text-sm font-black border-2 transition-all ${
                                    isToday
                                        ? 'bg-amber-500 border-amber-400 text-white shadow-md ring-2 ring-amber-400/40'
                                        : isActive
                                        ? 'bg-emerald-50 border-emerald-300 text-emerald-700 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-300'
                                        : isWeekend
                                        ? 'bg-purple-50 dark:bg-purple-950/40 border-purple-200 dark:border-purple-800 text-purple-600 dark:text-purple-300'
                                        : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400'
                                }`}>
                                    {isActive ? (isToday ? '🔥' : '✓') : isWeekend ? '🎁' : d}
                                </div>
                                <span className={`text-xs font-black ${
                                    isToday ? 'text-amber-600 dark:text-amber-400' : isActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'
                                }`}>
                                    {d}
                                </span>
                            </div>
                        );
                    })}
                    <Link
                        href="/marketing/daily-challenge"
                        className="ml-2 px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-black shadow-xs shrink-0 active:scale-95 transition-all"
                    >
                        Play Now
                    </Link>
                </div>
            </div>

            {/* 2. MOBBIN-STYLE VISUAL ACTION GRID (4 RICH INTERACTIVE CARDS) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4 lg:gap-5">
                {/* 1. Daily Cash Quiz */}
                <Link
                    href="/marketing/daily-challenge"
                    className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs hover:shadow-lg hover:border-amber-500/60 transition-all p-4 sm:p-5 flex flex-col justify-between group cursor-pointer min-h-[170px]"
                >
                    <div className="flex items-start justify-between gap-3">
                        <div>
                            <span className="inline-block px-2.5 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 text-xs font-black uppercase tracking-wider mb-2">
                                Live Quiz
                            </span>
                            <h4 className="text-base sm:text-lg font-black text-slate-900 dark:text-white leading-snug group-hover:text-amber-600 transition-colors">
                                Daily Cash Quiz
                            </h4>
                            <p className="text-xs sm:text-sm font-semibold text-slate-500 dark:text-slate-400 mt-1">
                                10 questions • Win ₹{dailyRewardRupees}
                            </p>
                        </div>

                        <div className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-2xl overflow-hidden shadow-xs shrink-0 bg-amber-50 dark:bg-slate-800 border border-amber-200/60 dark:border-slate-700">
                            <Image 
                                src="/marketing/challenge_trophy.jpg" 
                                alt="Daily Quiz Trophy" 
                                fill 
                                sizes="64px"
                                className="object-contain p-1 group-hover:scale-110 transition-transform duration-300"
                            />
                        </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs sm:text-sm font-black text-amber-600 dark:text-amber-400">
                        <span>Play & Claim Cashback</span>
                        <ChevronRight size={15} className="group-hover:translate-x-1 transition-transform" />
                    </div>
                </Link>

                {/* 2. Top Earning Products */}
                <Link
                    href="/marketing/products"
                    className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs hover:shadow-lg hover:border-emerald-500/60 transition-all p-4 sm:p-5 flex flex-col justify-between group cursor-pointer min-h-[170px]"
                >
                    <div className="flex items-start justify-between gap-3">
                        <div>
                            <span className="inline-block px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-black uppercase tracking-wider mb-2">
                                High Cashback
                            </span>
                            <h4 className="text-base sm:text-lg font-black text-slate-900 dark:text-white leading-snug group-hover:text-emerald-600 transition-colors">
                                Top Deals & Products
                            </h4>
                            <p className="text-xs sm:text-sm font-semibold text-slate-500 dark:text-slate-400 mt-1">
                                Earn up to ₹250 per order
                            </p>
                        </div>

                        <div className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-2xl overflow-hidden shadow-xs shrink-0 bg-emerald-50 dark:bg-slate-800 border border-emerald-200/60 dark:border-slate-700">
                            <Image 
                                src="/marketing/cashback_coins_stack.jpg" 
                                alt="Cashback Coins" 
                                fill 
                                sizes="64px"
                                className="object-cover group-hover:scale-110 transition-transform duration-300"
                            />
                        </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs sm:text-sm font-black text-emerald-600 dark:text-emerald-400">
                        <span>Share on WhatsApp</span>
                        <ChevronRight size={15} className="group-hover:translate-x-1 transition-transform" />
                    </div>
                </Link>

                {/* 3. Mystery Physical Gifts */}
                <Link
                    href="/marketing/targets"
                    className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs hover:shadow-lg hover:border-purple-500/60 transition-all p-4 sm:p-5 flex flex-col justify-between group cursor-pointer min-h-[170px]"
                >
                    <div className="flex items-start justify-between gap-3">
                        <div>
                            <span className="inline-block px-2.5 py-0.5 rounded-full bg-purple-50 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-300 text-xs font-black uppercase tracking-wider mb-2">
                                Free Delivery
                            </span>
                            <h4 className="text-base sm:text-lg font-black text-slate-900 dark:text-white leading-snug group-hover:text-purple-600 transition-colors">
                                Mystery Gifts
                            </h4>
                            <p className="text-xs sm:text-sm font-semibold text-slate-500 dark:text-slate-400 mt-1">
                                Smartwatch, Earbuds & Gold
                            </p>
                        </div>

                        <div className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-2xl overflow-hidden shadow-xs shrink-0 bg-purple-50 dark:bg-slate-800 border border-purple-200/60 dark:border-slate-700">
                            <Image 
                                src="/marketing/giftbox_closed.jpg" 
                                alt="Mystery Gift Box" 
                                fill 
                                sizes="64px"
                                className="object-cover group-hover:scale-110 transition-transform duration-300"
                            />
                        </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs sm:text-sm font-black text-purple-600 dark:text-purple-400">
                        <span>Check Milestones</span>
                        <ChevronRight size={15} className="group-hover:translate-x-1 transition-transform" />
                    </div>
                </Link>

                {/* 4. Brand Sponsor Billboard or Analytics */}
                {isMerchant ? (
                    <Link
                        href="/marketing/daily-challenge/sponsor"
                        className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs hover:shadow-lg hover:border-blue-500/60 transition-all p-4 sm:p-5 flex flex-col justify-between group cursor-pointer min-h-[170px]"
                    >
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <span className="inline-block px-2.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 text-xs font-black uppercase tracking-wider mb-2">
                                    Merchant Prime
                                </span>
                                <h4 className="text-base sm:text-lg font-black text-slate-900 dark:text-white leading-snug group-hover:text-blue-600 transition-colors">
                                    Sponsor Billboard
                                </h4>
                                <p className="text-xs sm:text-sm font-semibold text-slate-500 dark:text-slate-400 mt-1">
                                    Feature store to daily players
                                </p>
                            </div>

                            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 flex items-center justify-center border border-blue-200 dark:border-blue-800 group-hover:scale-110 transition-transform shrink-0">
                                <Store size={26} />
                            </div>
                        </div>

                        <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs sm:text-sm font-black text-blue-600 dark:text-blue-400">
                            <span>Book 24h Prime Slot</span>
                            <ChevronRight size={15} className="group-hover:translate-x-1 transition-transform" />
                        </div>
                    </Link>
                ) : (
                    <Link
                        href="/marketing/analytics"
                        className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs hover:shadow-lg hover:border-sky-500/60 transition-all p-4 sm:p-5 flex flex-col justify-between group cursor-pointer min-h-[170px]"
                    >
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <span className="inline-block px-2.5 py-0.5 rounded-full bg-sky-50 dark:bg-sky-950/60 border border-sky-200 dark:border-sky-800 text-sky-700 dark:text-sky-300 text-xs font-black uppercase tracking-wider mb-2">
                                    Growth Insights
                                </span>
                                <h4 className="text-base sm:text-lg font-black text-slate-900 dark:text-white leading-snug group-hover:text-sky-600 transition-colors">
                                    Conversion Trends
                                </h4>
                                <p className="text-xs sm:text-sm font-semibold text-slate-500 dark:text-slate-400 mt-1">
                                    Real-time clicks & order rates
                                </p>
                            </div>

                            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-sky-50 dark:bg-sky-950/60 text-sky-600 flex items-center justify-center border border-sky-200 dark:border-sky-800 group-hover:scale-110 transition-transform shrink-0">
                                <BarChart3 size={26} />
                            </div>
                        </div>

                        <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs sm:text-sm font-black text-sky-600 dark:text-sky-400">
                            <span>View Full Analytics</span>
                            <ChevronRight size={15} className="group-hover:translate-x-1 transition-transform" />
                        </div>
                    </Link>
                )}
            </div>

            {/* 3. VISUAL PERFORMANCE BENTO: 5 CORE METRICS */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
                {/* Total Shares */}
                <Link
                    href="/marketing/products"
                    className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl p-4 sm:p-5 border border-slate-200/80 dark:border-slate-800 shadow-2xs flex flex-col justify-between hover:border-blue-500/50 hover:shadow-md transition-all group cursor-pointer"
                >
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-xs sm:text-sm font-bold text-slate-500 dark:text-slate-400">Total Shares</span>
                            <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                                <Share2 size={16} />
                            </div>
                        </div>
                        <div className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 dark:text-white tabular-nums tracking-tight">
                            {(stats.total_shares || 0).toLocaleString('en-IN')}
                        </div>
                        <div className="mt-1 text-xs font-bold text-blue-600 dark:text-blue-400">
                            Shared Deal Links
                        </div>
                    </div>
                    <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs font-black text-blue-600 dark:text-blue-400 group-hover:translate-x-0.5 transition-transform">
                        <span>Share Deals</span>
                        <ChevronRight size={14} />
                    </div>
                </Link>

                {/* Link Clicks */}
                <Link
                    href="/marketing/analytics"
                    className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl p-4 sm:p-5 border border-slate-200/80 dark:border-slate-800 shadow-2xs flex flex-col justify-between hover:border-amber-500/50 hover:shadow-md transition-all group cursor-pointer"
                >
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-xs sm:text-sm font-bold text-slate-500 dark:text-slate-400">Store Visits</span>
                            <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                                <MousePointerClick size={16} />
                            </div>
                        </div>
                        <div className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 dark:text-white tabular-nums tracking-tight">
                            {(stats.link_clicks || 0).toLocaleString('en-IN')}
                        </div>
                        <div className="mt-1 text-xs font-bold text-amber-600 dark:text-amber-400">
                            Verified Link Clicks
                        </div>
                    </div>
                    <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs font-black text-amber-600 dark:text-amber-400 group-hover:translate-x-0.5 transition-transform">
                        <span>View Trends</span>
                        <ChevronRight size={14} />
                    </div>
                </Link>

                {/* New Customers */}
                <button
                    type="button"
                    onClick={() => setSelectedShareProduct({
                        id: 'primary-campaign',
                        title: isMerchant ? (merchant?.business_name || 'My InTrust Store') : 'InTrust Shopping Pass & Campaign',
                        price: 0,
                        share_cashback_paise: rewardsConfig.campaign_share_bonus_paise || 5000
                    })}
                    className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl p-4 sm:p-5 border border-slate-200/80 dark:border-slate-800 shadow-2xs flex flex-col justify-between hover:border-emerald-500/50 hover:shadow-md transition-all group text-left cursor-pointer"
                >
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-xs sm:text-sm font-bold text-slate-500 dark:text-slate-400">New Customers</span>
                            <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                                <Users size={16} />
                            </div>
                        </div>
                        <div className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 dark:text-white tabular-nums tracking-tight">
                            {(stats.new_customers || 0).toLocaleString('en-IN')}
                        </div>
                        <div className="mt-1 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                            Direct Referrals
                        </div>
                    </div>
                    <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between w-full text-xs font-black text-emerald-600 dark:text-emerald-400 group-hover:translate-x-0.5 transition-transform">
                        <span>Share Pass</span>
                        <ChevronRight size={14} />
                    </div>
                </button>

                {/* Orders */}
                <Link
                    href="/marketing/targets"
                    className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl p-4 sm:p-5 border border-slate-200/80 dark:border-slate-800 shadow-2xs flex flex-col justify-between hover:border-purple-500/50 hover:shadow-md transition-all group cursor-pointer"
                >
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-xs sm:text-sm font-bold text-slate-500 dark:text-slate-400">Customer Orders</span>
                            <div className="w-8 h-8 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                                <ShoppingBag size={16} />
                            </div>
                        </div>
                        <div className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 dark:text-white tabular-nums tracking-tight">
                            {(stats.orders || 0).toLocaleString('en-IN')}
                        </div>
                        <div className="mt-1 text-xs font-bold text-purple-600 dark:text-purple-400">
                            Successful Purchases
                        </div>
                    </div>
                    <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs font-black text-purple-600 dark:text-purple-400 group-hover:translate-x-0.5 transition-transform">
                        <span>Check Milestones</span>
                        <ChevronRight size={14} />
                    </div>
                </Link>

                {/* Total Cashback Earned */}
                <Link
                    href="/marketing/transactions"
                    className="col-span-2 lg:col-span-1 bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl p-4 sm:p-5 border border-slate-200/80 dark:border-slate-800 shadow-2xs flex flex-col justify-between hover:border-teal-500/50 hover:shadow-md transition-all group cursor-pointer"
                >
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-xs sm:text-sm font-bold text-slate-500 dark:text-slate-400">Total Cashback</span>
                            <div className="w-8 h-8 rounded-xl bg-teal-50 dark:bg-teal-950/60 text-teal-600 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                                <Wallet size={16} />
                            </div>
                        </div>
                        <div className="text-2xl sm:text-3xl lg:text-4xl font-black text-emerald-600 dark:text-emerald-400 truncate tabular-nums tracking-tight">
                            ₹{cashbackEarnedRupees}
                        </div>
                        <div className="mt-1 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                            Earned & Credited
                        </div>
                    </div>
                    <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs font-black text-teal-600 dark:text-teal-400 group-hover:translate-x-0.5 transition-transform">
                        <span>View Passbook</span>
                        <ChevronRight size={14} />
                    </div>
                </Link>
            </div>

            {/* 3.5. WHAT YOU CAN WIN — EXCLUSIVE PRIZES & PHYSICAL REWARDS */}
            <ExclusivePrizesShowcase isMerchant={isMerchant} targets={showcasePrizes} />

            {/* 4. THREE-COLUMN SECTION: CHALLENGE, TOP PRODUCTS, TRANSACTIONS */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
                {/* Column 1: Today's Daily Challenge Preview */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-2xs flex flex-col justify-between">
                    <div>
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-black uppercase text-slate-400 tracking-wider">
                                    Daily Challenge
                                </span>
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-xs font-black border border-emerald-200 dark:border-emerald-800">
                                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                    Live Today
                                </span>
                            </div>
                        </div>

                        <div className="flex items-center gap-4 mb-4">
                            <div className="relative w-20 h-20 rounded-2xl overflow-hidden shadow-xs shrink-0 bg-amber-50 dark:bg-slate-800 border border-amber-200/60 dark:border-slate-700">
                                <Image 
                                    src="/marketing/challenge_trophy.jpg" 
                                    alt="Daily Challenge Trophy" 
                                    fill 
                                    className="object-contain p-1"
                                />
                            </div>
                            <div>
                                <h4 className="text-base sm:text-lg font-black text-slate-900 dark:text-white leading-snug">
                                    Test Your Knowledge. Earn Real Cash.
                                </h4>
                                <p className="text-xs sm:text-sm font-semibold text-slate-500 dark:text-slate-400 mt-1">
                                    10 quick trivia questions • Takes under 2 mins.
                                </p>
                            </div>
                        </div>

                        <div className="bg-amber-50/90 dark:bg-amber-950/40 rounded-2xl p-3.5 border border-amber-200/80 dark:border-amber-800/60 mb-5 flex items-center justify-between">
                            <div>
                                <span className="text-xs font-black uppercase text-amber-700 dark:text-amber-400 block">
                                    Today&apos;s Guaranteed Prize
                                </span>
                                <span className="text-base sm:text-lg font-black text-amber-950 dark:text-amber-300">
                                    Fixed ₹{dailyRewardRupees} Cashback
                                </span>
                            </div>
                            <span className="text-xs font-black px-2.5 py-1 rounded-xl bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200">
                                1 Play / Day
                            </span>
                        </div>
                    </div>

                    <div>
                        <Link
                            href="/marketing/daily-challenge"
                            className="w-full py-3.5 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-black text-sm flex items-center justify-center gap-2 shadow-md shadow-blue-500/25 active:scale-95 transition-all"
                        >
                            <span>Play Daily Quiz Now</span>
                            <ArrowRight size={15} />
                        </Link>

                        {/* Sponsor pill */}
                        <div className="mt-3.5 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs font-bold text-slate-500">
                            <div className="flex items-center gap-1.5 truncate">
                                <span className="text-slate-400">Sponsored by</span>
                                <span className="font-black text-slate-900 dark:text-slate-100">
                                    {stats.today_sponsor?.merchant_name || "Nature's Basket"}
                                </span>
                            </div>
                            <Link href="/marketing/daily-challenge" className="text-blue-600 dark:text-blue-400 font-black hover:underline shrink-0">
                                View Deals →
                            </Link>
                        </div>
                    </div>
                </div>

                {/* Column 2: Top Performing Products */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-2xs flex flex-col justify-between">
                    <div>
                        <div className="flex items-center justify-between mb-3.5">
                            <span className="text-xs font-black uppercase text-slate-400 tracking-wider">
                                Top Cashback Deals
                            </span>
                            <Link href="/marketing/products" className="text-xs font-black text-blue-600 dark:text-blue-400 hover:underline">
                                View Catalog →
                            </Link>
                        </div>

                        <div className="space-y-2.5">
                            {topProducts.length > 0 ? (
                                topProducts.map((prod, idx) => (
                                    <div 
                                        key={prod.id || idx}
                                        className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 hover:bg-slate-100/80 transition-colors"
                                    >
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className="w-7 h-7 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-center font-black text-xs text-slate-700 dark:text-slate-300 shrink-0">
                                                {idx + 1}
                                            </div>
                                            <div className="min-w-0">
                                                <h5 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white truncate">
                                                    {prod.title || prod.name}
                                                </h5>
                                                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                                                    {prod.clicks || 0} visits • {prod.orders || 0} orders
                                                </p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => setSelectedShareProduct(prod)}
                                            className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-black transition-all shrink-0 shadow-xs cursor-pointer"
                                        >
                                            Share
                                        </button>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-7 px-3 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
                                    <p className="text-xs sm:text-sm font-bold text-slate-500">No shared products yet</p>
                                    <Link href="/marketing/products" className="text-xs sm:text-sm font-black text-blue-600 hover:underline mt-1.5 block">
                                        Browse Products to Share →
                                    </Link>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="pt-3.5 border-t border-slate-100 dark:border-slate-800 mt-3">
                        <Link
                            href="/marketing/products"
                            className="text-xs sm:text-sm font-bold text-slate-600 dark:text-slate-400 hover:text-blue-600 flex items-center justify-between"
                        >
                            <span>Share catalog links to earn cashback</span>
                            <ArrowRight size={14} />
                        </Link>
                    </div>
                </div>

                {/* Column 3: Recent Transactions */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-2xs flex flex-col justify-between md:col-span-2 lg:col-span-1">
                    <div>
                        <div className="flex items-center justify-between mb-3.5">
                            <span className="text-xs font-black uppercase text-slate-400 tracking-wider">
                                Recent Passbook Credits
                            </span>
                            <Link href="/marketing/transactions" className="text-xs font-black text-blue-600 dark:text-blue-400 hover:underline">
                                View Passbook →
                            </Link>
                        </div>

                        <div className="space-y-2.5">
                            {initialTransactions?.length > 0 ? (
                                initialTransactions.slice(0, 4).map((tx) => (
                                    <div 
                                        key={tx.id}
                                        className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60"
                                    >
                                        <div className="min-w-0 pr-2">
                                            <h5 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">
                                                {tx.description}
                                            </h5>
                                            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-0.5">
                                                {new Date(tx.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                            </p>
                                        </div>
                                        <span className={`text-sm sm:text-base font-black tabular-nums shrink-0 ${tx.type === 'CREDIT' ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-900 dark:text-white'}`}>
                                            {tx.type === 'CREDIT' ? '+' : '-'} ₹{((tx.amount_paise || 0) / 100).toFixed(0)}
                                        </span>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-7 px-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 space-y-2">
                                    <div className="w-11 h-11 rounded-2xl bg-teal-50 dark:bg-teal-950/60 text-teal-600 flex items-center justify-center mx-auto">
                                        <Wallet size={20} />
                                    </div>
                                    <h5 className="text-sm font-black text-slate-900 dark:text-slate-100">No Rewards Yet</h5>
                                    <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed font-medium">Play daily quiz or share deals to earn guaranteed cashbacks.</p>
                                    <Link href="/marketing/daily-challenge" className="inline-block text-xs sm:text-sm font-black text-blue-600 dark:text-blue-400 hover:underline pt-1">
                                        Play Quiz for ₹{dailyRewardRupees} →
                                    </Link>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="pt-3.5 border-t border-slate-100 dark:border-slate-800 mt-3">
                        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block truncate">
                            Directly synchronized with InTrust Wallet.
                        </span>
                    </div>
                </div>
            </div>

            {/* 5. BOTTOM CALL-TO-ACTION BANNER */}
            <div className="rounded-2xl sm:rounded-3xl bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 text-white p-5 sm:p-7 lg:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5 sm:gap-6 shadow-sm border border-slate-800">
                <div>
                    <h3 className="text-xl sm:text-2xl lg:text-3xl font-black tracking-tight">
                        Grow Your Business with InTrust
                    </h3>
                    <p className="text-sm sm:text-base text-blue-200/90 mt-1 max-w-xl leading-relaxed">
                        Share amazing products across India. Earn guaranteed cashbacks and unlock exclusive physical mystery rewards.
                    </p>
                </div>
                <Link
                    href="/marketing/products"
                    className="py-3 px-6 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-black text-sm shadow-md shadow-blue-500/25 shrink-0 transition-all active:scale-95"
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
