'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';
import {
    Trophy, Medal, TrendingUp, Users, Star,
    ArrowLeft, Crown, Flame, RefreshCw
} from 'lucide-react';

const FILTERS = [
    { id: 'all_time', label: 'All Time' },
    { id: 'this_month', label: 'This Month' },
    { id: 'this_week', label: 'This Week' },
];

function RankBadge({ rank }) {
    if (rank === 1) return (
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-yellow-300 to-amber-500 flex items-center justify-center shadow-lg shadow-amber-400/40">
            <Crown size={16} className="text-white" />
        </div>
    );
    if (rank === 2) return (
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-slate-300 to-slate-500 flex items-center justify-center shadow-md">
            <Medal size={16} className="text-white" />
        </div>
    );
    if (rank === 3) return (
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-orange-300 to-orange-600 flex items-center justify-center shadow-md shadow-orange-400/30">
            <Medal size={16} className="text-white" />
        </div>
    );
    return (
        <div className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
            <span className="text-xs font-black text-slate-500 dark:text-slate-400">#{rank}</span>
        </div>
    );
}

function PodiumCard({ user, rank, delay }) {
    const configs = {
        1: { height: 'h-36', bg: 'from-yellow-400 to-amber-500', glow: 'shadow-amber-400/40', size: 'w-20 h-20', ring: 'ring-yellow-400' },
        2: { height: 'h-24', bg: 'from-slate-300 to-slate-500', glow: 'shadow-slate-400/30', size: 'w-16 h-16', ring: 'ring-slate-400' },
        3: { height: 'h-20', bg: 'from-orange-300 to-orange-500', glow: 'shadow-orange-400/30', size: 'w-16 h-16', ring: 'ring-orange-400' },
    };
    const c = configs[rank];

    return (
        <motion.div
            className="flex flex-col items-center gap-2"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay, type: 'spring', stiffness: 180 }}
        >
            {rank === 1 && (
                <motion.div
                    animate={{ y: [0, -4, 0] }}
                    transition={{ duration: 2, repeat: Infinity }}
                >
                    <Crown size={20} className="text-amber-400" />
                </motion.div>
            )}
            <div className={`${c.size} rounded-full ring-4 ${c.ring} ring-offset-2 dark:ring-offset-slate-950 overflow-hidden bg-gradient-to-br ${c.bg} flex items-center justify-center shadow-xl ${c.glow}`}>
                {user?.avatar_url ? (
                    <img src={user.avatar_url} alt={user.full_name} className="w-full h-full object-cover" />
                ) : (
                    <span className="text-white font-black text-xl">
                        {(user?.full_name || 'U')[0].toUpperCase()}
                    </span>
                )}
            </div>
            <div className="text-center">
                <p className="text-xs font-black text-slate-800 dark:text-slate-100 max-w-[80px] truncate">
                    {user?.full_name || 'Anonymous'}
                </p>
                <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
                    {(user?.total_points || 0).toLocaleString('en-IN')} pts
                </p>
            </div>
            <div className={`w-full ${c.height} rounded-t-3xl bg-gradient-to-t ${c.bg} flex items-start justify-center pt-2 shadow-xl ${c.glow} min-w-[80px]`}>
                <span className="text-white font-black text-2xl opacity-60">#{rank}</span>
            </div>
        </motion.div>
    );
}

function LeaderRow({ user, rank, isCurrentUser, delay }) {
    return (
        <motion.div
            initial={{ opacity: 0, x: -15 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay, duration: 0.35 }}
            className={`flex items-center gap-3 p-3 rounded-2xl transition-all ${
                isCurrentUser
                    ? 'bg-[#D4AF37]/10 border border-[#D4AF37]/30 shadow-sm'
                    : 'hover:bg-slate-50 dark:hover:bg-slate-900/50'
            }`}
        >
            <RankBadge rank={rank} />

            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-600 overflow-hidden flex items-center justify-center shrink-0">
                {user?.avatar_url ? (
                    <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                    <span className="text-sm font-black text-slate-500 dark:text-slate-400">
                        {(user?.full_name || 'U')[0].toUpperCase()}
                    </span>
                )}
            </div>

            <div className="flex-1 min-w-0">
                <p className={`text-sm font-black truncate ${isCurrentUser ? 'text-amber-700 dark:text-amber-400' : 'text-slate-800 dark:text-slate-100'}`}>
                    {user?.full_name || 'Anonymous'}
                    {isCurrentUser && <span className="ml-2 text-[9px] font-black text-amber-600 dark:text-amber-400 uppercase tracking-widest bg-amber-100 dark:bg-amber-900/30 px-1.5 py-0.5 rounded-full">You</span>}
                </p>
                <p className="text-[10px] text-slate-400 font-medium truncate">
                    {user?.referral_count || 0} referrals
                </p>
            </div>

            <div className="text-right shrink-0">
                <p className={`text-sm font-black ${isCurrentUser ? 'text-amber-700 dark:text-amber-400' : 'text-slate-800 dark:text-slate-200'}`}>
                    {(user?.total_points || 0).toLocaleString('en-IN')}
                </p>
                <p className="text-[10px] text-slate-400 font-medium">pts</p>
            </div>
        </motion.div>
    );
}

export default function LeaderboardPage() {
    const [leaderboard, setLeaderboard] = useState([]);
    const [currentUser, setCurrentUser] = useState(null);
    const [currentUserRank, setCurrentUserRank] = useState(null);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all_time');
    const [refreshing, setRefreshing] = useState(false);

    const fetchLeaderboard = useCallback(async (showRefresh = false) => {
        try {
            if (showRefresh) setRefreshing(true);
            else setLoading(true);

            const { data: { user } } = await supabase.auth.getUser();
            setCurrentUser(user);

            // Fetch top leaderboard users by wallet_points
            const { data: leaders } = await supabase
                .from('user_profiles')
                .select('id, full_name, avatar_url, wallet_points, referral_count')
                .order('wallet_points', { ascending: false })
                .limit(20);

            const mapped = (leaders || []).map((u, i) => ({
                ...u,
                total_points: u.wallet_points || 0,
                rank: i + 1,
            }));

            setLeaderboard(mapped);

            // Find current user rank
            if (user) {
                const idx = mapped.findIndex(u => u.id === user.id);
                if (idx !== -1) {
                    setCurrentUserRank(idx + 1);
                } else {
                    // Fetch user's own profile to show their rank
                    const { data: myProfile } = await supabase
                        .from('user_profiles')
                        .select('id, full_name, avatar_url, wallet_points, referral_count')
                        .eq('id', user.id)
                        .single();
                    if (myProfile) {
                        // Count how many users have more points
                        const { count } = await supabase
                            .from('user_profiles')
                            .select('*', { count: 'exact', head: true })
                            .gt('wallet_points', myProfile.wallet_points || 0);
                        setCurrentUserRank((count || 0) + 1);
                        setCurrentUser({ ...user, ...myProfile, total_points: myProfile.wallet_points || 0 });
                    }
                }
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => { fetchLeaderboard(); }, [fetchLeaderboard]);

    const top3 = leaderboard.slice(0, 3);
    const rest = leaderboard.slice(3);
    const currentUserInTop20 = leaderboard.some(u => u.id === currentUser?.id);

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-[#020617] pb-24">

            {/* Header */}
            <div className="bg-gradient-to-br from-[#D4AF37] via-amber-500 to-orange-400 pt-10 pb-28 px-5 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
                    <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full bg-white/10 blur-3xl" />
                    <div className="absolute top-10 -left-10 w-48 h-48 rounded-full bg-orange-600/20 blur-2xl" />
                </div>
                <div className="relative z-10 max-w-lg mx-auto">
                    <Link href="/rewards" className="inline-flex items-center gap-2 text-slate-900/70 text-sm font-bold mb-5 hover:text-slate-900 transition-colors">
                        <ArrowLeft size={16} /> Back to Rewards
                    </Link>
                    <div className="flex items-center justify-between">
                        <div>
                            <div className="flex items-center gap-2 mb-2">
                                <Trophy size={20} className="text-slate-900/80" />
                                <span className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-900/70">InTrust</span>
                            </div>
                            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Leaderboard</h1>
                            <p className="text-sm text-slate-900/60 font-semibold mt-1">Top earners in the InTrust network</p>
                        </div>
                        <button
                            onClick={() => fetchLeaderboard(true)}
                            className="p-3 bg-white/20 rounded-2xl border border-white/30 text-slate-900/70 hover:bg-white/30 transition-all active:scale-95"
                        >
                            <RefreshCw size={18} className={refreshing ? 'animate-spin' : ''} />
                        </button>
                    </div>
                </div>
            </div>

            <div className="max-w-lg mx-auto px-4 -mt-20 relative z-10">

                {/* Filter bar */}
                <div className="flex gap-2 mb-6 bg-white dark:bg-slate-900 rounded-2xl p-1.5 border border-slate-100 dark:border-slate-800 shadow-sm">
                    {FILTERS.map(f => (
                        <button
                            key={f.id}
                            onClick={() => setFilter(f.id)}
                            className={`flex-1 py-2 px-3 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${
                                filter === f.id
                                    ? 'bg-[#D4AF37] text-slate-900 shadow-md shadow-amber-300/30'
                                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                            }`}
                        >
                            {f.label}
                        </button>
                    ))}
                </div>

                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-4">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center animate-pulse">
                            <Trophy size={20} className="text-white" />
                        </div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Loading Rankings…</p>
                    </div>
                ) : (
                    <>
                        {/* Podium — Top 3 */}
                        {top3.length >= 3 && (
                            <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-xl p-6 mb-5 overflow-hidden relative">
                                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-400 via-yellow-300 to-orange-400" />
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center mb-6">
                                    🏆 Top Champions
                                </p>
                                <div className="flex items-end justify-center gap-3">
                                    <PodiumCard user={top3[1]} rank={2} delay={0.2} />
                                    <PodiumCard user={top3[0]} rank={1} delay={0} />
                                    <PodiumCard user={top3[2]} rank={3} delay={0.3} />
                                </div>
                            </div>
                        )}

                        {/* Rankings 4-20 */}
                        {rest.length > 0 && (
                            <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-lg p-4 mb-4">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2 mb-3">Rankings</p>
                                <div className="space-y-1">
                                    {rest.map((u, i) => (
                                        <LeaderRow
                                            key={u.id}
                                            user={u}
                                            rank={u.rank}
                                            isCurrentUser={u.id === currentUser?.id}
                                            delay={i * 0.04}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Your Position (if not in top 20) */}
                        {!currentUserInTop20 && currentUserRank && currentUser && (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="bg-gradient-to-br from-[#D4AF37]/10 to-amber-500/5 border border-[#D4AF37]/30 rounded-[2rem] p-5 mb-4"
                            >
                                <p className="text-[10px] font-black text-amber-700 dark:text-amber-400 uppercase tracking-widest mb-3">
                                    Your Position
                                </p>
                                <LeaderRow
                                    user={{ ...currentUser, total_points: currentUser.total_points || 0 }}
                                    rank={currentUserRank}
                                    isCurrentUser={true}
                                    delay={0}
                                />
                                <p className="text-[10px] text-slate-400 text-center mt-3 font-medium">
                                    Earn more points to climb the leaderboard! 🚀
                                </p>
                            </motion.div>
                        )}

                        {/* Empty state */}
                        {leaderboard.length === 0 && (
                            <div className="text-center py-16">
                                <div className="w-16 h-16 rounded-full bg-amber-100 dark:bg-amber-900/20 flex items-center justify-center mx-auto mb-4">
                                    <Trophy size={28} className="text-amber-400" />
                                </div>
                                <p className="text-slate-500 font-bold text-sm">No rankings yet</p>
                                <p className="text-slate-400 text-xs mt-1">Start earning points to appear here!</p>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
