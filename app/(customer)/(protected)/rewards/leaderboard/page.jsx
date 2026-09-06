'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { Trophy, Crown, Medal, Award, ChevronLeft, Star, ChevronRight, Sparkles, TrendingUp, Target, Zap, Coins } from 'lucide-react';
import { useRouter } from 'next/navigation';
import CustomerBreadcrumbs from '@/components/common/CustomerBreadcrumbs';

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
            case 'diamond': return 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20';
            case 'platinum': return 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20';
            case 'gold': return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20';
            case 'silver': return 'bg-slate-400/10 text-slate-600 dark:text-slate-300 border-slate-400/20';
            default: return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20'; // Bronze
        }
    };

    if (loading) {
        return (
            <div className="min-h-[70vh] flex flex-col items-center justify-center gap-3">
                <motion.div 
                    animate={{ rotate: 360 }}
                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                    className="w-12 h-12 rounded-2xl bg-blue-600/10 text-blue-600 flex items-center justify-center"
                >
                    <Trophy className="w-6 h-6" />
                </motion.div>
                <p className="text-xs font-bold text-on-surface-variant animate-pulse">Loading Leaderboard...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center">
                <div className="bg-surface-container-lowest border border-outline-variant/30 p-8 rounded-3xl max-w-md shadow-sm space-y-4">
                    <p className="text-sm font-bold text-red-600 dark:text-red-400">{error}</p>
                    <button 
                        onClick={() => window.location.reload()}
                        className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-2xl text-xs font-black shadow-md shadow-blue-500/25 active:scale-[0.98] transition-all"
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
        <div className="w-full pb-20 relative overflow-hidden">
            {/* Subtle background glow */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-3xl h-[400px] bg-gradient-to-b from-blue-500/10 via-blue-600/5 to-transparent blur-3xl pointer-events-none" />

            <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-4 sm:pt-6 relative z-10 space-y-8">
                {/* Header & Breadcrumbs */}
                <div className="flex items-center justify-between gap-4">
                    <CustomerBreadcrumbs 
                        items={[
                            { label: 'InTrust Rewards', href: '/rewards' }, 
                            { label: 'Champions Leaderboard' }
                        ]} 
                        className="mb-0" 
                    />
                    <button 
                        onClick={() => router.push('/rewards')}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-surface-container-lowest hover:bg-surface-container text-xs font-bold text-on-surface border border-outline-variant/30 transition-all active:scale-95 shadow-xs"
                    >
                        <ChevronLeft size={14} />
                        <span>Back to Rewards</span>
                    </button>
                </div>

                {/* Intro Title */}
                <motion.div 
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center space-y-2 pt-2"
                >
                    <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400">
                        <Sparkles size={13} />
                        <span className="text-[10px] font-black uppercase tracking-widest">InTrust Community Champions</span>
                    </div>
                    <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-on-surface">
                        Top Rewards <span className="text-blue-600 dark:text-blue-400">Leaderboard</span>
                    </h1>
                    <p className="text-xs sm:text-sm text-on-surface-variant max-w-lg mx-auto font-medium">
                        Ranked by active InTrust Coins, shopping purchases, and loyalty milestones
                    </p>
                </motion.div>

                {/* Podium Section for Top 3 */}
                {topThree.length > 0 && (
                    <div className="flex items-end justify-center gap-3 sm:gap-6 pt-6 pb-2 min-h-[320px]">
                        {podiumOrder.map((user, idx) => {
                            if (!user) return null;
                            
                            const isFirst = user.rank === 1;
                            const isSecond = user.rank === 2;
                            const isThird = user.rank === 3;
                            
                            const height = isFirst ? 'h-[210px] sm:h-[230px]' : isSecond ? 'h-[160px] sm:h-[180px]' : 'h-[130px] sm:h-[150px]';
                            const badgeBg = isFirst 
                                ? 'bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 shadow-md shadow-amber-500/30' 
                                : isSecond 
                                ? 'bg-slate-400 text-white shadow-md' 
                                : 'bg-amber-700 text-white shadow-md';
                            
                            const borderStyle = isFirst 
                                ? 'border-2 border-blue-600/40 shadow-xl shadow-blue-500/10' 
                                : 'border border-outline-variant/30';

                            return (
                                <motion.div 
                                    key={user.userId || user.id || idx}
                                    initial={{ opacity: 0, y: 30 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: idx * 0.12 + 0.1, type: 'spring', bounce: 0.3 }}
                                    className="flex flex-col items-center relative w-1/3 max-w-[170px]"
                                >
                                    {/* Avatar & Crown */}
                                    <div className="relative z-10 mb-[-24px] flex flex-col items-center">
                                        {isFirst && (
                                            <motion.div 
                                                initial={{ scale: 0, y: 10, rotate: -10 }}
                                                animate={{ scale: 1, y: 0, rotate: 0 }}
                                                transition={{ delay: 0.6, type: 'spring' }}
                                                className="absolute -top-10 z-20"
                                            >
                                                <Crown className="w-10 h-10 text-amber-400 fill-amber-400/20 drop-shadow-md" />
                                            </motion.div>
                                        )}
                                        <div className={`rounded-full p-1 ${isFirst ? 'bg-gradient-to-br from-blue-600 to-indigo-600 shadow-lg' : 'bg-surface-container-high'}`}>
                                            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-surface-container-lowest flex items-center justify-center overflow-hidden relative border-2 border-surface-container-lowest">
                                                {user.avatarUrl ? (
                                                    <Image src={user.avatarUrl} alt={user.name} fill className="object-cover" />
                                                ) : (
                                                    <span className="text-xl sm:text-2xl font-black text-on-surface">{user.name?.charAt(0) || 'U'}</span>
                                                )}
                                            </div>
                                        </div>
                                        {/* Rank Badge */}
                                        <div className={`absolute -bottom-3 w-7 h-7 sm:w-8 sm:h-8 rounded-xl flex items-center justify-center font-black text-xs sm:text-sm ${badgeBg} border-2 border-surface-container-lowest`}>
                                            #{user.rank}
                                        </div>
                                    </div>

                                    {/* Podium Column */}
                                    <div className={`w-full ${height} bg-surface-container-lowest rounded-t-3xl ${borderStyle} flex flex-col items-center justify-between pt-9 pb-4 px-2 text-center relative overflow-hidden shadow-xs group`}>
                                        <div className="w-full px-1 min-w-0">
                                            <p className="font-extrabold text-xs sm:text-sm text-on-surface truncate leading-tight">
                                                {user.name}
                                            </p>
                                            <span className={`inline-block mt-1 text-[9px] px-2 py-0.5 rounded-md font-bold uppercase tracking-wider border ${getTierColor(user.tier)}`}>
                                                {user.tier || 'Member'}
                                            </span>
                                        </div>

                                        <div className="w-full border-t border-outline-variant/15 pt-2">
                                            <p className="text-xs sm:text-sm font-black text-blue-600 dark:text-blue-400 tabular-nums">
                                                {Number(user.points || 0).toLocaleString()}
                                            </p>
                                            <p className="text-[9px] font-bold text-on-surface-variant uppercase tracking-widest">
                                                Coins
                                            </p>
                                        </div>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>
                )}

                {/* Remaining Ranks List (4-10) */}
                <div className="space-y-2.5 pt-4">
                    <h2 className="text-sm font-extrabold uppercase tracking-wider text-on-surface-variant px-1">
                        Rankings (4–10)
                    </h2>

                    {rest.map((user, index) => (
                        <motion.div
                            key={user.userId || user.id || index}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.05 + 0.3 }}
                            className="p-3.5 sm:p-4 rounded-2xl bg-surface-container-lowest border border-outline-variant/30 hover:border-blue-500/30 transition-all flex items-center justify-between gap-3 sm:gap-4 shadow-xs hover:shadow-md"
                        >
                            {/* Left: Rank & Avatar */}
                            <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                                <div className="w-8 flex items-center justify-center shrink-0">
                                    <span className="font-black text-sm text-on-surface-variant">
                                        #{user.rank}
                                    </span>
                                </div>

                                <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-surface-container-low border border-outline-variant/20 flex items-center justify-center overflow-hidden relative shrink-0">
                                    {user.avatarUrl ? (
                                        <Image src={user.avatarUrl} alt={user.name} fill className="object-cover" />
                                    ) : (
                                        <span className="text-sm font-black text-on-surface">
                                            {user.name?.charAt(0) || 'U'}
                                        </span>
                                    )}
                                </div>

                                <div className="min-w-0">
                                    <p className="font-extrabold text-xs sm:text-sm text-on-surface truncate">
                                        {user.name}
                                    </p>
                                    <span className={`inline-block text-[9px] px-2 py-0.5 rounded-md font-bold uppercase tracking-wider border mt-0.5 ${getTierColor(user.tier)}`}>
                                        {user.tier || 'Member'}
                                    </span>
                                </div>
                            </div>

                            {/* Right: Points */}
                            <div className="text-right shrink-0">
                                <div className="flex items-center justify-end gap-1.5 text-blue-600 dark:text-blue-400">
                                    <Coins size={14} className="text-amber-500" />
                                    <span className="font-black text-sm sm:text-base tabular-nums">
                                        {Number(user.points || 0).toLocaleString()}
                                    </span>
                                </div>
                                <p className="text-[9px] font-bold text-on-surface-variant uppercase tracking-widest">
                                    Coins
                                </p>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>
        </div>
    );
}
