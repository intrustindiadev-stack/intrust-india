'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Trophy, Crown, Medal, Award, ChevronLeft, Star, ChevronRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

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
            case 'diamond': return 'bg-cyan-50 dark:bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 border-cyan-200 dark:border-cyan-500/50';
            case 'gold': return 'bg-yellow-50 dark:bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 border-yellow-200 dark:border-yellow-500/50';
            case 'silver': return 'bg-gray-100 dark:bg-gray-400/20 text-gray-600 dark:text-gray-300 border-gray-300 dark:border-gray-400/50';
            default: return 'bg-amber-50 dark:bg-amber-700/20 text-amber-700 dark:text-amber-600 border-amber-200 dark:border-amber-700/50'; // Bronze
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

    const topThree = leaderboard.slice(0, 3);
    const rest = leaderboard.slice(3);

    // Reorder top 3 for podium display: Rank 2, Rank 1, Rank 3
    const podiumOrder = topThree.length === 3 
        ? [topThree[1], topThree[0], topThree[2]]
        : topThree;

    return (
        <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#121212] text-gray-900 dark:text-white pb-20 relative overflow-hidden font-[family-name:var(--font-outfit)]">
            {/* Background effects */}
            <div className="absolute top-0 inset-x-0 h-[500px] bg-gradient-to-b from-yellow-500/5 via-purple-500/5 dark:from-yellow-500/10 dark:via-purple-500/5 to-transparent pointer-events-none" />
            <div className="absolute top-1/4 left-0 w-96 h-96 bg-yellow-500/10 blur-[100px] rounded-full pointer-events-none" />
            <div className="absolute top-1/3 right-0 w-96 h-96 bg-purple-500/10 blur-[100px] rounded-full pointer-events-none" />

            {/* Header */}
            <div className="sticky top-0 z-50 bg-white/80 dark:bg-[#121212]/80 backdrop-blur-xl border-b border-gray-200 dark:border-white/5 px-4 py-4 flex items-center justify-between">
                <button 
                    onClick={() => router.back()}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-full transition-colors"
                >
                    <ChevronLeft className="w-6 h-6 text-gray-600 dark:text-gray-300" />
                </button>
                <div className="flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-yellow-500" />
                    <h1 className="text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-yellow-500 to-orange-500 dark:from-yellow-400 dark:to-yellow-600">
                        Top Earners
                    </h1>
                </div>
                <div className="w-10" /> {/* Spacer for centering */}
            </div>

            <div className="max-w-4xl mx-auto px-4 mt-6 sm:mt-8 relative z-10">
                {/* Breadcrumbs */}
                <nav className="flex items-center gap-2 text-sm font-medium text-gray-500 dark:text-gray-400 mb-6">
                    <button onClick={() => router.push('/dashboard')} className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">Dashboard</button>
                    <ChevronRight size={14} />
                    <button onClick={() => router.push('/rewards')} className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">Rewards</button>
                    <ChevronRight size={14} />
                    <span className="text-gray-900 dark:text-white">Leaderboard</span>
                </nav>

                {/* Intro Text */}
                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center mb-12"
                >
                    <h2 className="text-3xl md:text-5xl font-black mb-4 tracking-tight text-gray-900 dark:text-white">
                        Rewards <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-500 to-orange-500">Leaderboard</span>
                    </h2>
                    <p className="text-gray-500 dark:text-gray-400 text-sm md:text-base max-w-xl mx-auto font-medium">
                        Ranked by current unspent reward points. Keep earning, keep climbing!
                    </p>
                </motion.div>

                {/* Podium Section for Top 3 */}
                {topThree.length > 0 && (
                    <div className="flex items-end justify-center gap-2 md:gap-6 mb-16 h-[300px]">
                        {podiumOrder.map((user, idx) => {
                            if (!user) return null;
                            
                            // Determine height and style based on actual rank (1, 2, or 3)
                            const isFirst = user.rank === 1;
                            const isSecond = user.rank === 2;
                            const isThird = user.rank === 3;
                            
                            const height = isFirst ? 'h-[200px]' : isSecond ? 'h-[160px]' : 'h-[130px]';
                            const badgeColor = isFirst ? 'text-yellow-600 bg-yellow-100 dark:text-yellow-400 dark:bg-yellow-400/20' : 
                                               isSecond ? 'text-gray-600 bg-gray-200 dark:text-gray-300 dark:bg-gray-400/20' : 
                                               'text-amber-700 bg-amber-200 dark:text-amber-600 dark:bg-amber-700/20';
                            
                            const borderGlow = isFirst ? 'shadow-[0_0_30px_rgba(234,179,8,0.3)] border-yellow-400 dark:border-yellow-500/50' :
                                               isSecond ? 'shadow-[0_0_20px_rgba(156,163,175,0.2)] border-gray-300 dark:border-gray-400/30' :
                                               'shadow-[0_0_15px_rgba(180,83,9,0.2)] border-amber-600/50 dark:border-amber-700/30';

                            return (
                                <motion.div 
                                    key={user.userId}
                                    initial={{ opacity: 0, y: 50 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: idx * 0.15 + 0.2, type: 'spring', bounce: 0.4 }}
                                    className="flex flex-col items-center relative w-1/3 max-w-[140px]"
                                >
                                    {/* Avatar & Crown */}
                                    <div className="relative z-10 mb-[-20px] flex flex-col items-center">
                                        {isFirst && (
                                            <motion.div 
                                                initial={{ scale: 0, y: 10 }}
                                                animate={{ scale: 1, y: 0 }}
                                                transition={{ delay: 0.8, type: 'spring' }}
                                                className="absolute -top-10 z-20"
                                            >
                                                <Crown className="w-10 h-10 text-yellow-500 fill-yellow-500/20 drop-shadow-lg" />
                                            </motion.div>
                                        )}
                                        <div className={`rounded-full p-1 border-2 ${isFirst ? 'border-yellow-400 bg-white dark:bg-[#121212]' : 'border-transparent'}`}>
                                            <div className={`w-16 h-16 md:w-20 md:h-20 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900 border ${borderGlow} flex items-center justify-center overflow-hidden relative shadow-md`}>
                                                {user.avatarUrl ? (
                                                    <Image src={user.avatarUrl} alt={user.name} fill className="object-cover" />
                                                ) : (
                                                    <span className="text-2xl font-bold text-gray-500 dark:text-gray-400">{user.name.charAt(0)}</span>
                                                )}
                                            </div>
                                        </div>
                                        {/* Rank Badge */}
                                        <div className={`absolute -bottom-3 w-8 h-8 rounded-full flex items-center justify-center font-black border-2 border-white dark:border-[#121212] text-sm shadow-sm ${badgeColor}`}>
                                            {user.rank}
                                        </div>
                                    </div>

                                    {/* Podium Block */}
                                    <div className={`w-full ${height} bg-white/60 dark:bg-white/[0.03] backdrop-blur-xl rounded-t-2xl border border-gray-200 dark:border-white/10 flex flex-col items-center pt-8 px-2 text-center relative overflow-hidden shadow-lg`}>
                                        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-yellow-400/50 dark:via-white/20 to-transparent" />
                                        
                                        <p className="font-bold text-sm md:text-base text-gray-900 dark:text-gray-200 line-clamp-1">{user.name}</p>
                                        
                                        <div className="mt-2 flex items-center gap-1 text-yellow-600 dark:text-yellow-500">
                                            <Star className="w-3 h-3 md:w-4 md:h-4 fill-yellow-500" />
                                            <span className="font-black text-sm md:text-lg">{user.points.toLocaleString()}</span>
                                        </div>

                                        <span className={`mt-2 text-[10px] md:text-xs px-2 py-0.5 rounded-full border ${getTierColor(user.tier)} uppercase tracking-wider font-bold`}>
                                            {user.tier}
                                        </span>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>
                )}

                {/* List Section for Ranks 4+ */}
                {rest.length > 0 && (
                    <div className="flex flex-col gap-3">
                        {rest.map((user, idx) => (
                            <motion.div
                                key={user.userId}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.1 * Math.min(idx, 10) }}
                                className="bg-white/80 dark:bg-white/[0.02] hover:bg-white dark:hover:bg-white/[0.04] border border-gray-100 dark:border-white/5 rounded-2xl p-4 flex items-center gap-4 transition-all hover:shadow-md backdrop-blur-md group"
                            >
                                {/* Rank */}
                                <div className="w-8 flex justify-center">
                                    <span className="text-gray-400 dark:text-gray-500 font-bold text-lg group-hover:text-gray-900 dark:group-hover:text-white transition-colors">{user.rank}</span>
                                </div>

                                {/* Avatar */}
                                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900 border border-gray-200 dark:border-white/10 flex items-center justify-center overflow-hidden relative shrink-0 shadow-sm">
                                    {user.avatarUrl ? (
                                        <Image src={user.avatarUrl} alt={user.name} fill className="object-cover" />
                                    ) : (
                                        <span className="text-gray-500 dark:text-gray-400 font-bold">{user.name.charAt(0)}</span>
                                    )}
                                </div>

                                {/* Details */}
                                <div className="flex-1 min-w-0">
                                    <p className="font-bold text-gray-900 dark:text-gray-200 truncate">{user.name}</p>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className={`text-[10px] px-2 py-0.5 rounded-full border ${getTierColor(user.tier)} uppercase tracking-wider font-bold`}>
                                            {user.tier}
                                        </span>
                                    </div>
                                </div>

                                {/* Points */}
                                <div className="text-right">
                                    <div className="flex items-center justify-end gap-1 text-yellow-600 dark:text-yellow-500">
                                        <Star className="w-4 h-4 fill-yellow-500/50" />
                                        <span className="font-black text-lg">{user.points.toLocaleString()}</span>
                                    </div>
                                    <p className="text-[10px] sm:text-xs text-gray-500 font-medium uppercase tracking-wider">Points</p>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                )}
                
                {leaderboard.length === 0 && !loading && (
                    <div className="text-center py-20 bg-white/50 dark:bg-white/[0.02] border border-gray-200 dark:border-white/5 rounded-3xl backdrop-blur-md">
                        <Award className="w-16 h-16 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
                        <h3 className="text-xl font-bold text-gray-900 dark:text-gray-400">No Champions Yet</h3>
                        <p className="text-gray-500 mt-2 font-medium">The leaderboard is currently empty.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
