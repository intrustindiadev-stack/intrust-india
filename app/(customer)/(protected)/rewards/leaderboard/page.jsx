'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Trophy, Crown, Medal, Award, ChevronLeft, Star, ChevronRight, Sparkles, TrendingUp, Target, Zap } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Breadcrumbs from '@/components/giftcards/Breadcrumbs';

export default function LeaderboardPage() {
    const router = useRouter();
    const [leaderboard, setLeaderboard] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchLeaderboard = async () => {
            try {
                const res = await fetch('/api/rewards/leaderboard');
                const data = await res.json();
                
                if (!res.ok) throw new Error(data.error || 'Failed to fetch leaderboard');
                
                setLeaderboard(data.leaderboard || []);
            } catch (err) {
                console.error(err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchLeaderboard();
    }, []);

    // Helper for rendering tier badges
    const getTierColor = (tier) => {
        switch (tier?.toLowerCase()) {
            case 'diamond': return 'bg-sky-500/10 text-sky-500 border-sky-500/20';
            case 'platinum': return 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20';
            case 'gold': return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
            case 'silver': return 'bg-slate-400/10 text-slate-400 border-slate-400/20';
            default: return 'bg-orange-500/10 text-orange-500 border-orange-500/20'; // Bronze
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#121212] flex flex-col items-center justify-center">
                <motion.div 
                    animate={{ rotate: 360 }}
                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                >
                    <Trophy className="w-12 h-12 text-yellow-500" />
                </motion.div>
                <p className="mt-4 text-gray-500 dark:text-gray-400 animate-pulse">Loading Champions...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#121212] flex flex-col items-center justify-center p-6">
                <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 p-6 rounded-2xl text-center max-w-md">
                    <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>
                    <button 
                        onClick={() => window.location.reload()}
                        className="px-6 py-2 bg-red-100 dark:bg-red-500/20 hover:bg-red-200 dark:hover:bg-red-500/30 text-red-700 dark:text-red-300 rounded-full transition-colors font-semibold"
                    >
                        Try Again
                    </button>
                </div>
            </div>
        );
    }

    const topTen = leaderboard.slice(0, 10);
    const topThree = topTen.slice(0, 3);
    const rest = topTen.slice(3);

    // Reorder top 3 for podium display: Rank 2, Rank 1, Rank 3
    const podiumOrder = topThree.length === 3 
        ? [topThree[1], topThree[0], topThree[2]]
        : topThree;

    return (
        <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#020617] text-gray-900 dark:text-white pb-20 relative overflow-hidden font-[family-name:var(--font-outfit)]">
            {/* Background effects */}
            <div className="absolute top-0 inset-x-0 h-[800px] bg-gradient-to-b from-emerald-500/10 via-teal-500/5 to-transparent pointer-events-none" />
            <div className="absolute top-1/4 left-0 w-96 h-96 bg-emerald-500/10 blur-[120px] rounded-full pointer-events-none" />
            <div className="absolute top-1/3 right-0 w-96 h-96 bg-teal-500/10 blur-[120px] rounded-full pointer-events-none" />

            {/* Header */}
            <div className="sticky top-0 z-50 bg-white/80 dark:bg-[#121212]/80 backdrop-blur-xl border-b border-gray-200 dark:border-white/5 px-4 py-4 flex items-center justify-between">
                <button 
                    onClick={() => router.back()}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-2xl transition-colors"
                >
                    <ChevronLeft className="w-6 h-6 text-gray-600 dark:text-gray-300" />
                </button>
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                        <Trophy size={18} className="text-white" />
                    </div>
                    <h1 className="text-xl font-black tracking-tighter text-slate-900 dark:text-white uppercase italic">
                        Empire <span className="text-emerald-500">Top 10</span>
                    </h1>
                </div>
                <div className="w-10" />
            </div>

            <div className="max-w-4xl mx-auto px-4 mt-8 sm:mt-12 relative z-10">
                <Breadcrumbs items={[{ label: 'Rewards', href: '/rewards' }, { label: 'Leaderboard' }]} />

                {/* Intro Text */}
                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center mb-16 mt-8"
                >
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 mb-6">
                        <Sparkles size={14} className="animate-pulse" />
                        <span className="text-[10px] font-black uppercase tracking-[0.3em]">Global Ascension Feed</span>
                    </div>
                    <h2 className="text-4xl md:text-7xl font-black mb-4 tracking-tighter text-slate-900 dark:text-white leading-none">
                        The <span className="text-transparent bg-clip-text bg-gradient-to-b from-emerald-400 to-emerald-600">Champion's</span> Circle
                    </h2>
                    <p className="text-slate-500 dark:text-gray-400 text-sm md:text-lg max-w-xl mx-auto font-bold uppercase tracking-widest opacity-60">
                        Ranked by total unspent reward points
                    </p>
                </motion.div>

                {/* Podium Section for Top 3 */}
                {topThree.length > 0 && (
                    <div className="flex items-end justify-center gap-3 md:gap-8 mb-20 h-[350px]">
                        {podiumOrder.map((user, idx) => {
                            if (!user) return null;
                            
                            const isFirst = user.rank === 1;
                            const isSecond = user.rank === 2;
                            const isThird = user.rank === 3;
                            
                            const height = isFirst ? 'h-[240px]' : isSecond ? 'h-[190px]' : 'h-[150px]';
                            const badgeColor = isFirst ? 'text-white bg-emerald-500 border-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.5)]' : 
                                               isSecond ? 'text-white bg-slate-500 border-slate-400 shadow-[0_0_15px_rgba(100,116,139,0.3)]' : 
                                               'text-white bg-orange-600 border-orange-500 shadow-[0_0_15px_rgba(234,88,12,0.3)]';
                            
                            const borderGlow = isFirst ? 'shadow-[0_0_40px_rgba(16,185,129,0.4)] border-emerald-400/50' :
                                               isSecond ? 'shadow-[0_0_25px_rgba(100,116,139,0.2)] border-slate-400/30' :
                                               'shadow-[0_0_20px_rgba(234,88,12,0.2)] border-orange-500/30';

                            return (
                                <motion.div 
                                    key={user.userId}
                                    initial={{ opacity: 0, y: 50 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: idx * 0.15 + 0.2, type: 'spring', bounce: 0.4 }}
                                    className="flex flex-col items-center relative w-1/3 max-w-[160px]"
                                >
                                    {/* Avatar & Crown */}
                                    <div className="relative z-10 mb-[-30px] flex flex-col items-center">
                                        {isFirst && (
                                            <motion.div 
                                                initial={{ scale: 0, y: 10, rotate: -15 }}
                                                animate={{ scale: 1, y: 0, rotate: 0 }}
                                                transition={{ delay: 0.8, type: 'spring' }}
                                                className="absolute -top-12 z-20"
                                            >
                                                <Crown className="w-12 h-12 text-emerald-500 fill-emerald-500/20 drop-shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                                            </motion.div>
                                        )}
                                        <div className={`rounded-full p-1.5 border-2 ${isFirst ? 'border-emerald-500 bg-white/10 backdrop-blur-xl' : 'border-transparent'}`}>
                                            <div className={`w-20 h-20 md:w-24 md:h-24 rounded-full bg-[#020617] border-2 ${borderGlow} flex items-center justify-center overflow-hidden relative shadow-2xl`}>
                                                {user.avatarUrl ? (
                                                    <Image src={user.avatarUrl} alt={user.name} fill className="object-cover" />
                                                ) : (
                                                    <span className="text-3xl font-black text-slate-700">{user.name.charAt(0)}</span>
                                                )}
                                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                                            </div>
                                        </div>
                                        {/* Rank Badge */}
                                        <div className={`absolute -bottom-4 w-10 h-10 rounded-2xl flex items-center justify-center font-black border-2 border-white dark:border-[#020617] text-lg ${badgeColor} italic`}>
                                            {user.rank}
                                        </div>
                                    </div>

                                    {/* Podium Block */}
                                    <div className={`w-full ${height} bg-white dark:bg-white/[0.03] backdrop-blur-3xl rounded-t-[2.5rem] border border-gray-200 dark:border-white/10 flex flex-col items-center pt-12 px-3 text-center relative overflow-hidden shadow-2xl group`}>
                                        <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent" />
                                        
                                        <p className="font-black text-sm md:text-base text-slate-900 dark:text-white line-clamp-1 italic tracking-tight">{user.name}</p>
                                        
                                        <div className="mt-3 flex items-center gap-1.5 text-emerald-500">
                                            <TrendingUp size={16} />
                                            <span className="font-black text-lg md:text-2xl tracking-tighter italic">{user.points.toLocaleString()}</span>
                                        </div>

                                        <span className={`mt-3 text-[9px] px-2.5 py-1 rounded-lg border ${getTierColor(user.tier)} uppercase tracking-[0.2em] font-black italic`}>
                                            {user.tier} Elite
                                        </span>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>
                )}

                {/* List Section for Ranks 4-10 */}
                {rest.length > 0 && (
                    <div className="flex flex-col gap-4 max-w-2xl mx-auto">
                        <div className="flex items-center gap-3 mb-4 px-2 opacity-40">
                            <Zap size={14} className="text-emerald-500" />
                            <span className="text-[10px] font-black uppercase tracking-[0.4em]">Rising Contenders</span>
                            <div className="flex-1 h-[1px] bg-gradient-to-r from-emerald-500/50 to-transparent" />
                        </div>
                        {rest.map((user, idx) => (
                            <motion.div
                                key={user.userId}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.1 * Math.min(idx, 10) }}
                                className="bg-white/80 dark:bg-white/[0.03] hover:bg-white dark:hover:bg-white/[0.06] border border-gray-100 dark:border-white/10 rounded-[2rem] p-5 flex items-center gap-5 transition-all hover:shadow-2xl hover:-translate-y-1 backdrop-blur-3xl group"
                            >
                                {/* Rank */}
                                <div className="w-10 flex justify-center">
                                    <span className="text-slate-400 dark:text-gray-600 font-black text-2xl group-hover:text-emerald-500 transition-colors italic">#{user.rank}</span>
                                </div>

                                {/* Avatar */}
                                <div className="w-14 h-14 rounded-2xl bg-[#020617] border border-gray-200 dark:border-white/10 flex items-center justify-center overflow-hidden relative shrink-0 shadow-lg group-hover:scale-110 transition-transform">
                                    {user.avatarUrl ? (
                                        <Image src={user.avatarUrl} alt={user.name} fill className="object-cover" />
                                    ) : (
                                        <span className="text-slate-700 font-black text-xl">{user.name.charAt(0)}</span>
                                    )}
                                </div>

                                {/* Details */}
                                <div className="flex-1 min-w-0">
                                    <p className="font-black text-lg text-slate-900 dark:text-white truncate italic tracking-tight">{user.name}</p>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className={`text-[9px] px-2 py-0.5 rounded-md border ${getTierColor(user.tier)} uppercase tracking-widest font-black italic`}>
                                            {user.tier}
                                        </span>
                                    </div>
                                </div>

                                {/* Points */}
                                <div className="text-right">
                                    <div className="flex items-center justify-end gap-2 text-emerald-500">
                                        <Target size={18} className="opacity-50" />
                                        <span className="font-black text-2xl tracking-tighter italic">{user.points.toLocaleString()}</span>
                                    </div>
                                    <p className="text-[9px] font-black text-slate-400 dark:text-gray-500 uppercase tracking-[0.3em] mt-0.5">Points</p>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                )}
                
                {leaderboard.length === 0 && !loading && (
                    <div className="text-center py-24 bg-white/50 dark:bg-white/[0.02] border border-gray-200 dark:border-white/5 rounded-[3rem] backdrop-blur-3xl">
                        <div className="w-20 h-20 bg-emerald-500/10 rounded-3xl flex items-center justify-center mx-auto mb-6 text-emerald-500 border border-emerald-500/20">
                            <Award size={40} />
                        </div>
                        <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tighter uppercase italic">No Champions Yet</h3>
                        <p className="text-slate-500 mt-2 font-bold uppercase tracking-widest text-xs opacity-60">The throne remains unclaimed.</p>
                    </div>
                )}

                <div className="mt-20 text-center">
                    <p className="text-[10px] font-black text-slate-400 dark:text-gray-600 uppercase tracking-[0.5em] italic">Empire Rewards Governance</p>
                </div>
            </div>
        </div>
    );
}
