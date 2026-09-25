'use client';

import Link from 'next/link';
import Image from 'next/image';
import { 
    Trophy, 
    Sparkles, 
    Gift, 
    Flame, 
    Share2, 
    ArrowUpRight, 
    ChevronRight, 
    CheckCircle2,
    Coins,
    Wallet,
    Clock
} from 'lucide-react';
import { IS_MARKETING_COMING_SOON } from '@/lib/marketingConfig';

export default function CustomerMarketingKpiSection({
    quizStats = {
        streak: 0,
        highestStreak: 0,
        playedToday: false,
        freezesLeft: 1,
        potentialRewardPaise: 2500,
        unlockedMysteryGifts: 0,
        totalShares: 0,
        linkClicks: 0,
        cashbackEarnedPaise: 0
    },
    walletBalance = null
}) {
    const streak = Number(quizStats?.streak || 0);
    const playedToday = !!quizStats?.playedToday;
    const rewardRupees = (Number(quizStats?.potentialRewardPaise || 2500)) / 100;
    const giftsUnlocked = Number(quizStats?.unlockedMysteryGifts || 0);
    const shares = Number(quizStats?.totalShares || 0);
    const clicks = Number(quizStats?.linkClicks || 0);
    const cashbackEarnedRupees = (Number(quizStats?.cashbackEarnedPaise || 0)) / 100;
    const displayWallet = walletBalance !== null ? Number(walletBalance) : cashbackEarnedRupees;

    return (
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-600/[0.04] via-indigo-600/[0.02] to-amber-500/[0.03] dark:from-white/[0.03] dark:via-blue-500/[0.02] dark:to-white/[0.01] border border-blue-500/20 dark:border-white/10 p-3.5 sm:p-5 shadow-xs space-y-4">
            {/* ── Clean Hero Banner with 3D Robot Mascot Explaining Marketing Hub ── */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-[#0052FF] text-white p-4 sm:p-6 shadow-md border border-blue-400/30">
                {/* Ambient Decorative Lighting */}
                <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-white/15 blur-2xl pointer-events-none" />
                <div className="absolute -bottom-10 left-1/3 w-40 h-40 rounded-full bg-indigo-400/20 blur-xl pointer-events-none" />

                <div className="relative z-10 flex flex-col sm:flex-row items-center justify-between gap-4">
                    {/* Left: Explainer content & Robo Speech Bubble */}
                    <div className="min-w-0 flex-1 space-y-2.5 text-center sm:text-left">
                        {/* Top Badge */}
                        <div className="flex items-center justify-center sm:justify-start gap-2 flex-wrap">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-white/20 text-white backdrop-blur-md border border-white/25">
                                <Sparkles size={11} className="text-amber-300" />
                                InTrust Marketing Hub
                            </span>
                            {IS_MARKETING_COMING_SOON ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wide bg-amber-400 text-amber-950 shadow-2xs">
                                    <Clock size={10} />
                                    Coming Soon
                                </span>
                            ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wide bg-emerald-400 text-emerald-950 shadow-2xs">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-950 animate-pulse" />
                                    Instant Wallet Cash
                                </span>
                            )}
                        </div>

                        {/* Title & Robo Voice Explanation */}
                        <div>
                            <h3 className="text-base sm:text-lg font-black tracking-tight leading-snug">
                                {IS_MARKETING_COMING_SOON ? 'Marketing Hub is Coming Soon!' : 'Check out our Marketing Hub!'}
                            </h3>
                            {/* Speech Bubble from Robo */}
                            <div className="mt-1.5 p-2.5 sm:p-3 rounded-2xl bg-white/15 backdrop-blur-md border border-white/20 text-xs sm:text-[13px] leading-relaxed font-medium text-blue-50 text-left relative">
                                <p>
                                    👋 <strong>Hey!</strong> We're preparing exciting daily challenge quizzes, streak rewards, and product sharing with instant cashbacks. Launching soon!
                                </p>
                            </div>
                        </div>

                        {/* Quick Feature Pills + CTA */}
                        <div className="flex flex-col sm:flex-row items-center sm:items-center justify-between gap-2.5 pt-1">
                            <div className="flex items-center gap-1.5 text-[10px] font-bold text-blue-100 flex-wrap justify-center sm:justify-start">
                                <span className="px-2 py-0.5 rounded-lg bg-black/20">🎯 Daily Challenge</span>
                                <span className="px-2 py-0.5 rounded-lg bg-black/20">🔥 Streaks</span>
                                <span className="px-2 py-0.5 rounded-lg bg-black/20">🛍️ Share Deals</span>
                                <span className="px-2 py-0.5 rounded-lg bg-black/20">🎁 Free Gifts</span>
                            </div>

                            <Link
                                href="/marketing"
                                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white hover:bg-blue-50 text-blue-700 hover:text-blue-800 text-xs font-black shadow-md shadow-black/10 transition-all active:scale-95 group shrink-0"
                            >
                                <span>{IS_MARKETING_COMING_SOON ? 'Marketing Hub (Soon)' : 'Visit Marketing Hub'}</span>
                                <ArrowUpRight size={14} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                            </Link>
                        </div>
                    </div>

                    {/* Right: Adorable 3D Robot Mascot */}
                    <div className="shrink-0 flex items-center justify-center relative">
                        <div className="relative w-24 h-24 sm:w-28 sm:h-28 drop-shadow-[0_10px_20px_rgba(0,0,0,0.35)]">
                            <Image
                                src="/robot-mascot-nobg.png"
                                alt="InTrust Assistant Robot explaining Marketing Hub"
                                fill
                                sizes="(max-width: 640px) 96px, 112px"
                                className="object-contain"
                                priority
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* 4 Responsive Interactive KPI Tiles */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                {/* 1. Daily Quiz / Challenge Card */}
                <Link
                    href="/marketing/daily-challenge"
                    className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-[#13161f] border border-slate-200/80 dark:border-white/5 hover:border-amber-500/50 hover:shadow-sm transition-all flex flex-col justify-between group cursor-pointer"
                >
                    <div className="flex items-center justify-between mb-2 sm:mb-3">
                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                            Daily Challenge
                        </span>
                        <div className="w-7 h-7 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                            <Trophy size={13} />
                        </div>
                    </div>

                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <span className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                                {streak > 0 ? `${streak} Days` : 'Day 1'}
                            </span>
                            {streak > 0 ? (
                                <span className="inline-flex items-center gap-1 text-[9px] font-black px-1.5 py-0.5 rounded-full bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20">
                                    <Flame size={10} className="text-orange-500 fill-orange-500 animate-pulse" />
                                    Active
                                </span>
                            ) : (
                                <span className="inline-flex items-center gap-1 text-[9px] font-black px-1.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
                                    Start
                                </span>
                            )}
                        </div>

                        <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-white/5 text-[10px] font-bold">
                            {playedToday ? (
                                <>
                                    <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-black truncate max-w-[95px] sm:max-w-none">
                                        <CheckCircle2 size={11} /> Solved Today
                                    </span>
                                    <span className="text-slate-400 font-bold group-hover:text-amber-500 transition-colors flex items-center shrink-0">
                                        Score <ChevronRight size={10} />
                                    </span>
                                </>
                            ) : (
                                <>
                                    <span className="text-emerald-600 dark:text-emerald-400 font-black truncate max-w-[95px] sm:max-w-none">
                                        Win ₹{rewardRupees.toFixed(0)}
                                    </span>
                                    <span className="text-amber-600 dark:text-amber-400 font-black group-hover:translate-x-0.5 transition-transform flex items-center shrink-0">
                                        Play <ChevronRight size={10} />
                                    </span>
                                </>
                            )}
                        </div>
                    </div>
                </Link>

                {/* 2. Product Promotional Sharing */}
                <Link
                    href="/marketing/products"
                    className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-[#13161f] border border-slate-200/80 dark:border-white/5 hover:border-blue-500/50 hover:shadow-sm transition-all flex flex-col justify-between group cursor-pointer"
                >
                    <div className="flex items-center justify-between mb-2 sm:mb-3">
                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                            Promote & Earn
                        </span>
                        <div className="w-7 h-7 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                            <Share2 size={13} />
                        </div>
                    </div>

                    <div className="space-y-1">
                        <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                            {shares > 0 ? `${shares} Deals` : 'Share Deals'}
                        </div>
                        <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-white/5 text-[10px] font-bold">
                            <span className="text-slate-400 truncate max-w-[95px] sm:max-w-none">
                                {clicks > 0 ? `${clicks} visits` : 'Cashback on orders'}
                            </span>
                            <span className="text-blue-600 dark:text-blue-400 flex items-center group-hover:translate-x-0.5 transition-transform shrink-0">
                                Deals <ChevronRight size={10} />
                            </span>
                        </div>
                    </div>
                </Link>

                {/* 3. Earned Wallet Rewards */}
                <Link
                    href="/wallet"
                    className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-[#13161f] border border-slate-200/80 dark:border-white/5 hover:border-emerald-500/50 hover:shadow-sm transition-all flex flex-col justify-between group cursor-pointer"
                >
                    <div className="flex items-center justify-between mb-2 sm:mb-3">
                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                            {walletBalance !== null ? 'Wallet Balance' : 'Marketing Cash'}
                        </span>
                        <div className="w-7 h-7 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                            <Wallet size={13} />
                        </div>
                    </div>

                    <div className="space-y-1">
                        <div className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight">
                            ₹{displayWallet.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                        <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-white/5 text-[10px] font-bold">
                            <span className="text-slate-400 truncate max-w-[95px] sm:max-w-none">
                                {walletBalance !== null ? 'Live available cash' : (cashbackEarnedRupees > 0 ? 'Earned marketing cash' : `Up to ₹${rewardRupees.toFixed(0)} today`)}
                            </span>
                            <span className="text-emerald-600 dark:text-emerald-400 flex items-center group-hover:translate-x-0.5 transition-transform shrink-0">
                                Wallet <ChevronRight size={10} />
                            </span>
                        </div>
                    </div>
                </Link>

                {/* 4. Mystery Milestone Targets */}
                <Link
                    href="/marketing/targets"
                    className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-[#13161f] border border-slate-200/80 dark:border-white/5 hover:border-purple-500/50 hover:shadow-sm transition-all flex flex-col justify-between group cursor-pointer"
                >
                    <div className="flex items-center justify-between mb-2 sm:mb-3">
                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                            Mystery Gifts
                        </span>
                        <div className="w-7 h-7 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                            <Gift size={13} />
                        </div>
                    </div>

                    <div className="space-y-1">
                        <div className="text-xl sm:text-2xl font-black text-purple-600 dark:text-purple-400 tracking-tight">
                            {giftsUnlocked > 0 ? `${giftsUnlocked} Gifts` : 'Level 1'}
                        </div>
                        <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-white/5 text-[10px] font-bold">
                            <span className="text-slate-400 truncate max-w-[95px] sm:max-w-none">
                                {giftsUnlocked > 0 ? 'Gift parcel earned' : 'Free physical gifts'}
                            </span>
                            <span className="text-purple-600 dark:text-purple-400 flex items-center group-hover:translate-x-0.5 transition-transform shrink-0">
                                Targets <ChevronRight size={10} />
                            </span>
                        </div>
                    </div>
                </Link>
            </div>
        </section>
    );
}
