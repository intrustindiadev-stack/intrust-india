'use client';

import { useState } from 'react';
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
import ShareModal from '@/components/marketing/ShareModal';
import MarketingBreadcrumbs from '@/components/marketing/layout/MarketingBreadcrumbs';

export default function MarketingOverviewClient({
    user,
    profile,
    merchant,
    isMerchant,
    initialStats,
    initialTransactions,
    initialTopProducts
}) {
    const [selectedShareProduct, setSelectedShareProduct] = useState(null);

    const firstName = profile?.full_name?.split(' ')[0] || merchant?.business_name?.split(' ')[0] || 'Partner';
    const stats = initialStats || {};
    const rewardsConfig = stats.rewards_config || {
        daily_challenge_reward_paise: 2500,
        campaign_share_bonus_paise: 5000,
        product_promo_default_cashback_paise: 10000,
        sponsorship_fee_paise: 99900
    };

    const dailyRewardRupees = (rewardsConfig.daily_challenge_reward_paise || 2500) / 100;
    const cashbackEarnedRupees = ((stats.cashback_earned_paise || 245000) / 100).toLocaleString('en-IN');

    // Default top products if none loaded from DB
    const topProducts = initialTopProducts?.length > 0 ? initialTopProducts : [
        { id: '1', title: 'Organic Atta (10kg)', clicks: '1,240', customers: '86', growth: '+28%', price: 449, image: '/icons/intrustLogo.png' },
        { id: '2', title: 'Premium Basmati Rice', clicks: '980', customers: '64', growth: '+18%', price: 799, image: '/icons/intrustLogo.png' },
        { id: '3', title: 'Cold Pressed Mustard Oil', clicks: '640', customers: '42', growth: '+12%', price: 499, image: '/icons/intrustLogo.png' }
    ];

    return (
        <div className="space-y-6 sm:space-y-8 animate-fadeIn">
            {/* Breadcrumb Navigation */}
            <MarketingBreadcrumbs />

            {/* 1. HERO BANNER WITH CULTURAL MONUMENT ARTWORK */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-blue-50 via-indigo-50/70 to-sky-100/90 dark:from-slate-900 dark:via-blue-950/40 dark:to-slate-900 border border-blue-100/80 dark:border-slate-800 p-5 sm:p-8 lg:p-10 shadow-sm">
                <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                    {/* Left text column with right-side mobile image */}
                    <div className="flex items-center justify-between gap-4 max-w-xl">
                        <div className="flex-1">
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-600/10 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 text-xs font-black uppercase tracking-wider mb-2.5 border border-blue-600/20">
                                <Sparkles size={13} />
                                <span>InTrust Marketing Workspace</span>
                            </div>
                            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-950 dark:text-white tracking-tight leading-tight">
                                Good Morning, {firstName}!
                            </h1>
                            <p className="text-xs sm:text-base font-semibold text-slate-600 dark:text-slate-300 mt-1">
                                Share. Inspire. Grow together.
                            </p>
                            <p className="text-[10px] sm:text-xs font-bold text-slate-400 dark:text-slate-500 mt-2.5 flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                                Empowering Local Businesses Across India
                            </p>
                        </div>

                        {/* Right-side mobile image thumbnail */}
                        <div className="lg:hidden relative w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden shadow-xs shrink-0 border border-blue-200/80 dark:border-slate-700">
                            <Image 
                                src="/marketing/hero_banner_art.jpg" 
                                alt="Indian Heritage" 
                                fill 
                                className="object-cover object-center" 
                                priority
                            />
                        </div>
                    </div>

                    {/* Right Current Target Card Teaser */}
                    <div className="w-full lg:w-72 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-sm">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-[10px] font-extrabold uppercase text-slate-400 dark:text-slate-500 tracking-wider">
                                Your Current Target
                            </span>
                            <Gift size={18} className="text-rose-500" />
                        </div>
                        <h3 className="text-sm font-black text-slate-900 dark:text-white mb-2">
                            25 New Customers
                        </h3>
                        {/* Progress bar */}
                        <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden mb-2">
                            <div className="h-full rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 w-[48%]" />
                        </div>
                        <div className="flex items-center justify-between text-[11px] font-bold">
                            <span className="text-slate-500 dark:text-slate-400">12 / 25 Acquired</span>
                            <Link href="/marketing/targets" className="text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1">
                                <span>View All</span>
                                <ArrowRight size={11} />
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
                        className="object-cover object-center mix-blend-multiply dark:mix-blend-luminosity" 
                        priority
                    />
                </div>
            </div>

            {/* 2. TOP 5 KPI SUMMARY CARDS WITH QUICK ACTION CTAS */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5 sm:gap-4">
                {/* Total Shares */}
                <div className="bg-white dark:bg-slate-900 rounded-3xl p-4 sm:p-5 border border-slate-200/80 dark:border-slate-800 shadow-2xs flex flex-col justify-between hover:border-blue-500/40 hover:shadow-md transition-all group">
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Total Shares</span>
                            <div className="w-7 h-7 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 flex items-center justify-center">
                                <Share2 size={15} />
                            </div>
                        </div>
                        <div className="text-2xl font-black text-slate-900 dark:text-white">
                            {(stats.total_shares || 1248).toLocaleString('en-IN')}
                        </div>
                        <div className="mt-1 flex items-center gap-1 text-[11px] font-extrabold text-emerald-600 dark:text-emerald-400">
                            <TrendingUp size={12} />
                            <span>+12% this week</span>
                        </div>
                    </div>
                    <Link
                        href="/marketing/products"
                        className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px] font-black text-blue-600 dark:text-blue-400 group-hover:translate-x-0.5 transition-transform"
                    >
                        <span>Share Catalog</span>
                        <ChevronRight size={13} />
                    </Link>
                </div>

                {/* Link Clicks */}
                <div className="bg-white dark:bg-slate-900 rounded-3xl p-4 sm:p-5 border border-slate-200/80 dark:border-slate-800 shadow-2xs flex flex-col justify-between hover:border-amber-500/40 hover:shadow-md transition-all group">
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Link Clicks</span>
                            <div className="w-7 h-7 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 flex items-center justify-center">
                                <MousePointerClick size={15} />
                            </div>
                        </div>
                        <div className="text-2xl font-black text-slate-900 dark:text-white">
                            {(stats.link_clicks || 8420).toLocaleString('en-IN')}
                        </div>
                        <div className="mt-1 flex items-center gap-1 text-[11px] font-extrabold text-emerald-600 dark:text-emerald-400">
                            <TrendingUp size={12} />
                            <span>+18% CTR</span>
                        </div>
                    </div>
                    <Link
                        href="/marketing/analytics"
                        className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px] font-black text-amber-600 dark:text-amber-400 group-hover:translate-x-0.5 transition-transform"
                    >
                        <span>View Analytics</span>
                        <ChevronRight size={13} />
                    </Link>
                </div>

                {/* New Customers / Campaign Reach */}
                <div className="bg-white dark:bg-slate-900 rounded-3xl p-4 sm:p-5 border border-slate-200/80 dark:border-slate-800 shadow-2xs flex flex-col justify-between hover:border-emerald-500/40 hover:shadow-md transition-all group">
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                                {isMerchant ? 'New Customers' : 'Audience Reach'}
                            </span>
                            <div className="w-7 h-7 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center">
                                <Users size={15} />
                            </div>
                        </div>
                        <div className="text-2xl font-black text-slate-900 dark:text-white">
                            {(stats.new_customers || 312).toLocaleString('en-IN')}
                        </div>
                        <div className="mt-1 flex items-center gap-1 text-[11px] font-extrabold text-emerald-600 dark:text-emerald-400">
                            <TrendingUp size={12} />
                            <span>+22% growth</span>
                        </div>
                    </div>
                    <button
                        onClick={() => setSelectedShareProduct({
                            id: 'primary-campaign',
                            title: isMerchant ? (merchant?.business_name || 'My InTrust Store') : 'InTrust Shopping Pass & Campaign',
                            price: 0,
                            share_cashback_paise: rewardsConfig.campaign_share_bonus_paise || 5000
                        })}
                        className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between w-full text-left text-[11px] font-black text-emerald-600 dark:text-emerald-400 group-hover:translate-x-0.5 transition-transform"
                    >
                        <span>Share Campaign</span>
                        <ChevronRight size={13} />
                    </button>
                </div>

                {/* Orders */}
                <div className="bg-white dark:bg-slate-900 rounded-3xl p-4 sm:p-5 border border-slate-200/80 dark:border-slate-800 shadow-2xs flex flex-col justify-between hover:border-purple-500/40 hover:shadow-md transition-all group">
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Orders</span>
                            <div className="w-7 h-7 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 flex items-center justify-center">
                                <ShoppingBag size={15} />
                            </div>
                        </div>
                        <div className="text-2xl font-black text-slate-900 dark:text-white">
                            {(stats.orders || 186).toLocaleString('en-IN')}
                        </div>
                        <div className="mt-1 flex items-center gap-1 text-[11px] font-extrabold text-emerald-600 dark:text-emerald-400">
                            <TrendingUp size={12} />
                            <span>+16% conversions</span>
                        </div>
                    </div>
                    <Link
                        href="/marketing/targets"
                        className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px] font-black text-purple-600 dark:text-purple-400 group-hover:translate-x-0.5 transition-transform"
                    >
                        <span>Check Targets</span>
                        <ChevronRight size={13} />
                    </Link>
                </div>

                {/* Cashback Earned */}
                <div className="col-span-2 sm:col-span-1 bg-white dark:bg-slate-900 rounded-3xl p-4 sm:p-5 border border-slate-200/80 dark:border-slate-800 shadow-2xs flex flex-col justify-between hover:border-teal-500/40 hover:shadow-md transition-all group">
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Cashback Earned</span>
                            <div className="w-7 h-7 rounded-xl bg-teal-50 dark:bg-teal-950/60 text-teal-600 flex items-center justify-center">
                                <Wallet size={15} />
                            </div>
                        </div>
                        <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                            ₹{cashbackEarnedRupees}
                        </div>
                        <div className="mt-1 flex items-center gap-1 text-[11px] font-extrabold text-emerald-600 dark:text-emerald-400">
                            <TrendingUp size={12} />
                            <span>+28% credited</span>
                        </div>
                    </div>
                    <Link
                        href="/marketing/transactions"
                        className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px] font-black text-teal-600 dark:text-teal-400 group-hover:translate-x-0.5 transition-transform"
                    >
                        <span>Wallet Ledger</span>
                        <ChevronRight size={13} />
                    </Link>
                </div>
            </div>

            {/* 3. QUICK ACTION CARDS */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Link
                    href="/marketing/products"
                    className="flex items-center gap-4 p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs hover:shadow-md hover:border-emerald-500/40 transition-all group"
                >
                    <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-200 dark:border-emerald-800 group-hover:scale-105 transition-transform shrink-0">
                        <Send size={22} />
                    </div>
                    <div>
                        <h4 className="text-sm font-extrabold text-slate-900 dark:text-white">
                            {isMerchant ? 'Share a Product' : 'Share InTrust Products'}
                        </h4>
                        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-0.5">
                            Generate attributed link & dispatch to social channels
                        </p>
                    </div>
                </Link>

                {isMerchant ? (
                    <Link
                        href="/marketing/daily-challenge"
                        className="flex items-center gap-4 p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs hover:shadow-md hover:border-amber-500/40 transition-all group"
                    >
                        <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-200 dark:border-amber-800 group-hover:scale-105 transition-transform shrink-0">
                            <Trophy size={22} />
                        </div>
                        <div>
                            <h4 className="text-sm font-extrabold text-slate-900 dark:text-white">
                                Sponsor a Daily Challenge
                            </h4>
                            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-0.5">
                                Select date, choose 4 products & get noticed
                            </p>
                        </div>
                    </Link>
                ) : (
                    <Link
                        href="/marketing/daily-challenge"
                        className="flex items-center gap-4 p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs hover:shadow-md hover:border-amber-500/40 transition-all group"
                    >
                        <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-200 dark:border-amber-800 group-hover:scale-105 transition-transform shrink-0">
                            <Trophy size={22} />
                        </div>
                        <div>
                            <h4 className="text-sm font-extrabold text-slate-900 dark:text-white">
                                Play Daily Challenge
                            </h4>
                            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-0.5">
                                10 questions daily, win ₹{dailyRewardRupees} instant cashback
                            </p>
                        </div>
                    </Link>
                )}

                <Link
                    href="/marketing/analytics"
                    className="flex items-center gap-4 p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs hover:shadow-md hover:border-purple-500/40 transition-all group"
                >
                    <div className="w-12 h-12 rounded-2xl bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 flex items-center justify-center border border-purple-200 dark:border-purple-800 group-hover:scale-105 transition-transform shrink-0">
                        <BarChart3 size={22} />
                    </div>
                    <div>
                        <h4 className="text-sm font-extrabold text-slate-900 dark:text-white">
                            View Analytics
                        </h4>
                        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-0.5">
                            Track conversion rates, channel reach & revenue
                        </p>
                    </div>
                </Link>
            </div>

            {/* 4. THREE-COLUMN SECTION: CHALLENGE, TOP PRODUCTS, TRANSACTIONS */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Column 1: Today's Daily Challenge Preview */}
                <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-2xs flex flex-col justify-between">
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
                                    Today's Prize
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
                <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-2xs flex flex-col justify-between">
                    <div>
                        <div className="flex items-center justify-between mb-4">
                            <span className="text-xs font-extrabold uppercase text-slate-400 tracking-wider">
                                Top Performing Products
                            </span>
                            <Link href="/marketing/products" className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline">
                                View All →
                            </Link>
                        </div>

                        <div className="space-y-3">
                            {topProducts.map((prod, idx) => (
                                <div 
                                    key={prod.id || idx}
                                    className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 hover:bg-slate-100/80 transition-colors"
                                >
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className="w-7 h-7 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-center font-black text-xs text-slate-700 dark:text-slate-300 shrink-0">
                                            {idx + 1}
                                        </div>
                                        <div className="min-w-0">
                                            <h5 className="text-xs font-extrabold text-slate-900 dark:text-white truncate">
                                                {prod.title || prod.name}
                                            </h5>
                                            <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                                {prod.clicks || '1,240'} clicks • {prod.customers || '86'} acquired
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-right shrink-0">
                                        <span className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400">
                                            {prod.growth || '+28%'}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="pt-4 border-t border-slate-100 dark:border-slate-800 mt-4">
                        <Link
                            href="/marketing/products"
                            className="text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-blue-600 flex items-center justify-between"
                        >
                            <span>Share new products to boost reach</span>
                            <ArrowRight size={14} />
                        </Link>
                    </div>
                </div>

                {/* Column 3: Recent Transactions */}
                <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-2xs flex flex-col justify-between">
                    <div>
                        <div className="flex items-center justify-between mb-4">
                            <span className="text-xs font-extrabold uppercase text-slate-400 tracking-wider">
                                Recent Transactions
                            </span>
                            <Link href="/marketing/transactions" className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline">
                                View All →
                            </Link>
                        </div>

                        <div className="space-y-3">
                            {initialTransactions?.length > 0 ? (
                                initialTransactions.slice(0, 4).map((tx) => (
                                    <div 
                                        key={tx.id}
                                        className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60"
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
                                            {tx.type === 'CREDIT' ? '+' : '-'} ₹{(tx.amount_paise / 100).toFixed(0)}
                                        </span>
                                    </div>
                                ))
                            ) : (
                                <>
                                    <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60">
                                        <div>
                                            <h5 className="text-xs font-extrabold text-slate-900 dark:text-white">Daily Challenge</h5>
                                            <p className="text-[10px] text-slate-400">Completed Challenge • Today</p>
                                        </div>
                                        <span className="text-xs font-black text-emerald-600">+ ₹{dailyRewardRupees}</span>
                                    </div>
                                    <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60">
                                        <div>
                                            <h5 className="text-xs font-extrabold text-slate-900 dark:text-white">Target Milestone</h5>
                                            <p className="text-[10px] text-slate-400">25 Customers Target</p>
                                        </div>
                                        <span className="text-xs font-black text-emerald-600">+ ₹500</span>
                                    </div>
                                    <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60">
                                        <div>
                                            <h5 className="text-xs font-extrabold text-slate-900 dark:text-white">Product Promotion</h5>
                                            <p className="text-[10px] text-slate-400">Organic Atta Share Cashback</p>
                                        </div>
                                        <span className="text-xs font-black text-emerald-600">+ ₹100</span>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>

                    <div className="pt-4 border-t border-slate-100 dark:border-slate-800 mt-4">
                        <span className="text-[11px] text-slate-400 block">
                            Directly synchronized with your InTrust Wallet ledger.
                        </span>
                    </div>
                </div>
            </div>

            {/* 5. BOTTOM CALL-TO-ACTION BANNER */}
            <div className="rounded-3xl bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 text-white p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-md border border-slate-800">
                <div>
                    <h3 className="text-xl sm:text-2xl font-black tracking-tight">
                        Grow Your Business with InTrust
                    </h3>
                    <p className="text-xs sm:text-sm text-blue-200/80 mt-1 max-w-xl">
                        Share amazing products across India. Earn guaranteed cashbacks and unlock exclusive physical mystery rewards.
                    </p>
                </div>
                <Link
                    href="/marketing/products"
                    className="py-3.5 px-6 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs shadow-md shadow-blue-500/25 shrink-0 transition-all active:scale-95"
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
