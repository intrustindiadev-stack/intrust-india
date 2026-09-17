'use client';

import Link from 'next/link';
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
    Wallet
} from 'lucide-react';

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
    }
}) {
    const streak = Number(quizStats?.streak || 0);
    const playedToday = !!quizStats?.playedToday;
    const rewardRupees = (Number(quizStats?.potentialRewardPaise || 2500)) / 100;
    const giftsUnlocked = Number(quizStats?.unlockedMysteryGifts || 0);
    const shares = Number(quizStats?.totalShares || 0);
    const clicks = Number(quizStats?.linkClicks || 0);
    const cashbackEarnedRupees = (Number(quizStats?.cashbackEarnedPaise || 0)) / 100;

    return (
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-600/[0.04] via-indigo-600/[0.02] to-amber-500/[0.03] dark:from-white/[0.03] dark:via-blue-500/[0.02] dark:to-white/[0.01] border border-blue-500/20 dark:border-white/10 p-4 sm:p-6 shadow-xs space-y-4">
            {/* Header with Title, Live Badge and Direct Hub Action */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-blue-500/10 dark:border-white/5 pb-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-blue-500/25 shrink-0">
                        <Sparkles size={19} />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h3 className="text-base font-black text-slate-900 dark:text-white tracking-tight">
                                InTrust Play & Earn Hub
                            </h3>
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                Instant Wallet Cash
                            </span>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                            Play daily challenges, build dynamic streaks, share deals & claim mystery milestone gifts.
                        </p>
                    </div>
                </div>

                <Link
                    href="/marketing"
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-white dark:bg-white/10 hover:bg-slate-50 dark:hover:bg-white/15 text-slate-900 dark:text-white text-xs font-black border border-slate-200 dark:border-white/10 shadow-2xs hover:shadow-xs transition-all group self-start sm:self-auto active:scale-95"
                >
                    <span>Visit Play Hub</span>
                    <ArrowUpRight size={14} className="text-blue-500 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                </Link>
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
                            Marketing Cash
                        </span>
                        <div className="w-7 h-7 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                            <Wallet size={13} />
                        </div>
                    </div>

                    <div className="space-y-1">
                        <div className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight">
                            ₹{cashbackEarnedRupees.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                        </div>
                        <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-white/5 text-[10px] font-bold">
                            <span className="text-slate-400 truncate max-w-[95px] sm:max-w-none">
                                {cashbackEarnedRupees > 0 ? 'InTrust wallet cash' : `Up to ₹${rewardRupees.toFixed(0)} today`}
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
