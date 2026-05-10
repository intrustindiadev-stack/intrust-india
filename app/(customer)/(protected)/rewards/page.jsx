'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Trophy, Gift, Star, History,
    ArrowUpRight, Sparkles, Coins, Wallet,
    CheckCircle, Zap, Target, X,
    Archive, Clock, AlertCircle, ChevronRight,
    Network, Layers
} from 'lucide-react';
import { useAuth } from '@/lib/contexts/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import toast from 'react-hot-toast';
import Navbar from '@/components/layout/Navbar';
import CustomerBottomNav from '@/components/layout/customer/CustomerBottomNav';
import ScratchCard from '@/components/ui/ScratchCard';
import Breadcrumbs from '@/components/giftcards/Breadcrumbs';
import RewardsInfoModal from '@/components/rewards/RewardsInfoModal';
import { useRewardsRealtime } from '@/lib/contexts/RewardsRealtimeContext';
import { useRewardsBalance } from '@/hooks/useRewardsBalance';

// ─── Constants ──────────────────────────────────────────────────────────────
const POINTS_PER_RUPEE = 100;

const TIERS = [
    { name: 'Bronze', color: 'text-orange-500', bg: 'bg-orange-500/10', border: 'border-orange-500/20', icon: <Star size={16} />, perks: 'Basic Rewards' },
    { name: 'Silver', color: 'text-slate-400', bg: 'bg-slate-400/10', border: 'border-slate-400/20', icon: <Star size={16} />, perks: '1.2x Points' },
    { name: 'Gold', color: 'text-amber-500', bg: 'bg-amber-500/10', border: 'border-amber-500/20', icon: <Trophy size={16} />, perks: '1.5x Points' },
    { name: 'Platinum', color: 'text-indigo-500', bg: 'bg-indigo-500/10', border: 'border-indigo-500/20', icon: <Zap size={16} />, perks: '2x Points' }
];



export default function RewardsPage() {
    const { user } = useAuth();
    const router = useRouter();

    // ── Server-authoritative balance (Improvement #1) ─────────────────────────
    const {
        balance: points,
        tier: balanceTier,
        loading: balanceLoading,
        applyServerBalance,
        refresh: refreshBalance,
    } = useRewardsBalance();

    // ── Card list from shared realtime context ────────────────────────────────
    const {
        unscratchedCards: dailyLoot,
        markScratched,
        lastArrival,
    } = useRewardsRealtime();

    const [history, setHistory] = useState([]);
    const [historyLoading, setHistoryLoading] = useState(true);

    // Derive tier objects from server balance
    const currentTierIdx = Math.max(0, TIERS.findIndex(
        t => t.name.toLowerCase() === (balanceTier || 'bronze').toLowerCase()
    ));
    const currentTier = TIERS[currentTierIdx];
    const nextTier = currentTierIdx < TIERS.length - 1 ? TIERS[currentTierIdx + 1] : null;

    const loading = balanceLoading;

    // Modal state
    const [selectedCard, setSelectedCard] = useState(null);
    const [showInfoModal, setShowInfoModal] = useState(false);
    const [showRedeemModal, setShowRedeemModal] = useState(false);
    const [redeemPoints, setRedeemPoints] = useState(100);
    const [redeemLoading, setRedeemLoading] = useState(false);

    // Scratch reveal state
    const [revealedCardIds, setRevealedCardIds] = useState(new Set());
    const [isProcessingReveal, setIsProcessingReveal] = useState(false);

    useEffect(() => {
        if (!user && !loading) {
            router.push('/login');
        }
    }, [user, loading, router]);

    // ── Fetch history only (balance + cards come from hooks/context) ──────────
    useEffect(() => {
        if (!user) return;

        const fetchHistory = async () => {
            try {
                const { data: txs } = await supabase
                    .from('reward_transactions')
                    .select('*')
                    .eq('user_id', user.id)
                    .order('created_at', { ascending: false })
                    .limit(5);
                setHistory(txs || []);
            } catch (err) {
                console.error('Error fetching history:', err);
            } finally {
                setHistoryLoading(false);
            }
        };

        fetchHistory();
    }, [user]);

    // ── Auto-open modal for new arrivals from context ─────────────────────────
    const selectedCardRef = useRef(null);
    useEffect(() => {
        selectedCardRef.current = selectedCard;
    }, [selectedCard]);

    useEffect(() => {
        if (!lastArrival) return;
        if (selectedCardRef.current === null) {
            setSelectedCard(lastArrival);
            toast.success("🎁 You've earned a new reward! Scratch to reveal.", { duration: 4000 });
        } else {
            toast((t) => (
                <div onClick={() => { setSelectedCard(lastArrival); toast.dismiss(t.id); }} className="cursor-pointer font-medium">
                    🎁 New reward arrived — tap to scratch
                </div>
            ), { duration: 5000, style: { background: '#10B981', color: '#fff' } });
        }
    }, [lastArrival]);

    // ── Server-driven single reveal (POST /api/rewards/scratch/[id]) ──────────
    const handleScratchComplete = useCallback(async (cardId) => {
        if (isProcessingReveal) return;
        setIsProcessingReveal(true);

        try {
            const res = await fetch(`/api/rewards/scratch/${cardId}`, {
                method: 'POST',
            });

            const data = await res.json();

            if (!res.ok && data.code !== 'already_scratched') {
                throw new Error(data.code || 'Failed to claim reward');
            }

            // Push authoritative balance — no client arithmetic
            if (data.newBalance !== undefined) {
                applyServerBalance(data.newBalance, data.tier);
            }

            setRevealedCardIds(prev => new Set(prev).add(cardId));
            const pts = data.pointsWon ?? 0;
            if (pts > 0) toast.success(`🎉 Won ${pts} Points!`);

            setTimeout(() => {
                markScratched(cardId);
                setRevealedCardIds(prev => { const s = new Set(prev); s.delete(cardId); return s; });
                setSelectedCard(null);
                setIsProcessingReveal(false);
            }, 2500);

        } catch (err) {
            toast.error(err.message || 'Failed to claim reward. Please try again.');
            setIsProcessingReveal(false);
        }
    }, [isProcessingReveal, applyServerBalance, markScratched]);

    // ── Bulk reveal (POST /api/rewards/scratch/bulk) ───────────────────────────
    const handleRevealAll = useCallback(async () => {
        const unscratched = dailyLoot.filter(c => !revealedCardIds.has(c.id));
        if (unscratched.length === 0 || isProcessingReveal) return;

        setIsProcessingReveal(true);
        const loadingToast = toast.loading(`Revealing ${unscratched.length} boxes...`);

        try {
            const res = await fetch('/api/rewards/scratch/bulk', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ids: unscratched.map(c => c.id) }),
            });

            const data = await res.json();
            toast.dismiss(loadingToast);

            if (!res.ok) throw new Error(data.code || 'Bulk reveal failed');

            // Push authoritative balance — no client arithmetic
            if (data.newBalance !== undefined) {
                applyServerBalance(data.newBalance, data.tier);
            }

            const ids = (data.scratched ?? []).map(r => r.id);
            if (ids.length > 0) {
                setRevealedCardIds(new Set(ids));
                toast.success(`Claimed ${data.totalPointsWon ?? 0} pts from ${data.scratchedCount} boxes!`, { duration: 5000 });
                setTimeout(() => {
                    markScratched(ids);
                    setRevealedCardIds(new Set());
                    setIsProcessingReveal(false);
                }, 3000);
            } else {
                setIsProcessingReveal(false);
            }
        } catch (err) {
            toast.dismiss(loadingToast);
            toast.error(err.message || "Some rewards couldn't be revealed.");
            setIsProcessingReveal(false);
        }
    }, [dailyLoot, revealedCardIds, isProcessingReveal, applyServerBalance, markScratched]);

    const handleRedeem = async () => {
        if (redeemPoints < 100) {
            toast.error('Minimum redemption is 100 points');
            return;
        }
        if (redeemPoints > points) {
            toast.error('Insufficient points balance');
            return;
        }
        if (redeemPoints % 100 !== 0) {
            toast.error('Points must be in multiples of 100');
            return;
        }

        setRedeemLoading(true);
        try {
            const { data, error } = await supabase.rpc('convert_points_to_wallet', {
                p_user_id: user.id,
                p_points: redeemPoints
            });

            if (error) throw error;

            if (!data?.success) {
                toast.error(data?.message || 'Redemption failed. Please try again.');
                return;
            }

            // Refresh authoritative balance after redemption
            await refreshBalance();
            setShowRedeemModal(false);
            setRedeemPoints(100);
            const rupees = Math.floor(redeemPoints / 100);
            toast.success(`₹${rupees} added to your wallet!`, { id: 'redeem-success' });
        } catch (err) {
            console.error('Redemption error:', err);
            toast.error(err.message || 'Failed to redeem. Please try again.');
        } finally {
            setRedeemLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#121212] flex items-center justify-center">
                <div className="w-12 h-12 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
            </div>
        );
    }

    const pointsInRupees = (points / POINTS_PER_RUPEE).toLocaleString('en-IN', {
        style: 'currency',
        currency: 'INR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 2
    });

    const storedCards = dailyLoot.filter(c => c.isStored);

    return (
        <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#121212] font-[family-name:var(--font-outfit)] pb-24 overflow-x-hidden">
            <Navbar />

            <div className="max-w-2xl mx-auto px-4 sm:px-6 pt-[12vh]">
                <Breadcrumbs items={[{ label: 'My Rewards' }]} />

                {/* Header */}
                <div className="flex items-center justify-between mb-8 px-1">
                    <div>
                        <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter">Empire Rewards</h1>
                        <p className="text-sm text-slate-500 dark:text-gray-400 font-medium">Earn, track and redeem your benefits</p>
                    </div>
                    <motion.button 
                        onClick={() => setShowInfoModal(true)}
                        whileHover={{ rotate: 15, scale: 1.1 }}
                        className="w-14 h-14 rounded-3xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/20 border border-white/20"
                    >
                        <Gift className="text-white" size={28} />
                    </motion.button>
                </div>

                {/* Cross-navigation to Referral */}
                <motion.button
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    onClick={() => router.push('/refer')}
                    className="w-full flex items-center justify-between px-6 py-4 bg-[#020617] dark:bg-black border border-white/10 rounded-[2rem] mb-6 group transition-all hover:border-emerald-500/30"
                >
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 border border-emerald-500/20 group-hover:scale-110 transition-transform">
                            <Network size={16} />
                        </div>
                        <div className="text-left">
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-400/60">Empire Builder</p>
                            <p className="text-sm font-bold text-white">Referral Empire</p>
                        </div>
                    </div>
                    <ChevronRight size={16} className="text-white/40 group-hover:translate-x-1 transition-transform" />
                </motion.button>

                {/* Main Points Card */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="relative bg-[#020617] dark:bg-black rounded-[3rem] p-8 text-white shadow-2xl mb-10 overflow-hidden group border border-white/5"
                >
                    <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 via-transparent to-teal-500/10 opacity-50" />
                    <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/20 blur-[100px] rounded-full -mr-32 -mt-32 animate-pulse" />
                    
                    <div className="relative z-10">
                        <div className="flex items-center justify-between mb-10">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-2xl bg-white/5 backdrop-blur-md flex items-center justify-center border border-white/10">
                                    <Coins size={22} className="text-emerald-400" />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-400/60">Portfolio</p>
                                    <p className="font-bold text-sm text-white/80">Growth Points</p>
                                </div>
                            </div>
                            <div className={`px-4 py-1.5 rounded-full ${currentTier.bg} border ${currentTier.border} flex items-center gap-2 backdrop-blur-md shadow-lg`}>
                                <div className={currentTier.color}>{currentTier.icon}</div>
                                <span className={`text-[10px] font-black uppercase tracking-widest ${currentTier.color}`}>{currentTier.name} Elite</span>
                            </div>
                        </div>

                        <div className="flex flex-col items-center justify-center py-6">
                            <motion.h2 
                                key={points}
                                initial={{ scale: 0.9, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                className="text-7xl sm:text-8xl font-black tracking-tighter mb-2 text-transparent bg-clip-text bg-gradient-to-b from-white to-white/40"
                            >
                                {points.toLocaleString()}
                            </motion.h2>
                            <div className="flex items-center gap-2 px-6 py-2.5 bg-white/5 backdrop-blur-2xl rounded-full border border-white/10 shadow-2xl">
                                <p className="text-emerald-400 font-black text-2xl tracking-tight">{pointsInRupees}</p>
                                <div className="w-[1px] h-4 bg-white/10 mx-1" />
                                <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Liquid Cash</p>
                            </div>
                        </div>

                        <div className="mt-12 grid grid-cols-2 gap-4">
                            <button
                                onClick={() => { setRedeemPoints(Math.max(100, Math.floor(points / 100) * 100 > points ? points : Math.floor(points / 100) * 100)); setShowRedeemModal(true); }}
                                disabled={points < 100}
                                className="flex items-center justify-center gap-2 bg-emerald-500 text-white py-4 rounded-[2rem] font-black text-sm shadow-xl shadow-emerald-500/20 hover:bg-emerald-400 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                                <Wallet size={18} />
                                Redeem to Wallet
                            </button>
                            <button
                                onClick={() => router.push('/rewards/history')}
                                className="flex items-center justify-center gap-2 bg-white/5 backdrop-blur-md text-white py-4 rounded-[2rem] font-black text-sm border border-white/10 hover:bg-white/10 active:scale-95 transition-all"
                            >
                                <History size={18} />
                                Timeline
                            </button>
                        </div>
                    </div>
                </motion.div>

                {/* Daily Loot Section */}
                <section className="mb-14">
                    <div className="flex items-center justify-between mb-8 px-1">
                        <div className="flex items-center gap-3">
                            <div className="w-3 h-3 rounded-full bg-emerald-500 animate-ping shadow-[0_0_12px_rgba(16,185,129,0.8)]" />
                            <h3 className="font-black text-2xl text-slate-900 dark:text-white tracking-tight leading-none">Daily Loot</h3>
                        </div>
                        <div className="flex items-center gap-3">
                            {dailyLoot.length > 1 && (
                                <button
                                    onClick={handleRevealAll}
                                    disabled={isProcessingReveal}
                                    className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 hover:bg-emerald-500/20 transition-all disabled:opacity-40"
                                >
                                    <Layers size={14} />
                                    <span className="text-[10px] font-black uppercase tracking-widest">Reveal All</span>
                                </button>
                            )}
                            {storedCards.length > 0 && (
                                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-600">
                                    <Archive size={14} />
                                    <span className="text-[10px] font-black uppercase tracking-widest">{storedCards.length} Stored</span>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="flex gap-5 overflow-x-auto pb-6 -mx-1 px-1 snap-x no-scrollbar">
                        {dailyLoot.map((card, idx) => (
                            <motion.div
                                key={card.id}
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: 0.2 + idx * 0.1 }}
                                onClick={() => !isProcessingReveal && setSelectedCard(card)}
                                className={`snap-center shrink-0 w-[240px] h-[340px] relative rounded-[2.5rem] p-6 border transition-all cursor-pointer group overflow-hidden bg-white dark:bg-white/5 border-gray-200 dark:border-white/10 shadow-lg hover:shadow-2xl hover:-translate-y-2 ${isProcessingReveal ? 'pointer-events-none opacity-80' : ''}`}
                            >
                                {/* Card Glow Overlay */}
                                <div className={`absolute -top-20 -right-20 w-40 h-40 ${card.classes.glow} blur-[60px] rounded-full pointer-events-none transition-all`} />

                                <div className="h-full flex flex-col justify-between relative z-10">
                                    <div>
                                        <div className="flex items-center justify-between mb-6">
                                            <div className={`px-3 py-1 rounded-full ${card.classes.bg} border ${card.classes.border} flex items-center gap-1.5`}>
                                                <div className={`w-1.5 h-1.5 rounded-full ${card.classes.dot} animate-pulse`} />
                                                <span className={`text-[10px] font-black uppercase tracking-[0.2em] ${card.classes.text}`}>{card.type}</span>
                                            </div>
                                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{card.date}</span>
                                        </div>
                                        <h4 className="font-black text-xl text-slate-900 dark:text-white mb-2 leading-tight tracking-tight">{card.title}</h4>
                                        <p className="text-xs font-bold text-slate-400 dark:text-gray-500 uppercase tracking-widest">Potential: {card.prize}</p>
                                    </div>

                                    <div className="mt-auto">
                                        <div className="w-full aspect-square rounded-[2rem] bg-gradient-to-br from-slate-100 to-slate-200 dark:from-white/10 dark:to-white/5 flex items-center justify-center border border-gray-200 dark:border-white/10 group-hover:scale-105 transition-transform shadow-inner overflow-hidden relative">
                                            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10" />
                                            
                                            {/* Revealed State in Preview */}
                                            {revealedCardIds.has(card.id) ? (
                                                <div className="text-center relative z-10">
                                                    <motion.div 
                                                        initial={{ scale: 0 }}
                                                        animate={{ scale: 1 }}
                                                        className="text-emerald-500 font-black text-3xl mb-1"
                                                    >
                                                        +{card.prize}
                                                    </motion.div>
                                                    <p className="text-[8px] font-black text-emerald-400 uppercase tracking-widest">Claimed</p>
                                                </div>
                                            ) : (
                                                <div className="text-center relative z-10">
                                                    <Sparkles className={`mx-auto mb-2 ${card.classes.sparkle} group-hover:animate-bounce`} size={24} />
                                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Tap to</p>
                                                    <p className={`text-sm font-black ${card.classes.unbox} uppercase tracking-[0.2em]`}>Unbox</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        ))}

                        {dailyLoot.length === 0 && (
                            <div className="w-full py-12 text-center bg-gray-50 dark:bg-white/5 rounded-[3rem] border-2 border-dashed border-gray-200 dark:border-white/10">
                                <div className="w-16 h-16 bg-white dark:bg-black/20 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-300">
                                    <Clock size={32} />
                                </div>
                                <h4 className="font-black text-slate-400 uppercase tracking-widest text-sm">All Loot Claimed</h4>
                                <p className="text-[10px] font-bold text-slate-500 mt-1">Check back tomorrow for fresh rewards!</p>
                            </div>
                        )}
                    </div>
                </section>

                {/* Tier Journey */}
                <section className="mb-16">
                    <div className="flex items-center gap-4 mb-10 px-1">
                        <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-500 border border-indigo-500/20 shadow-lg shadow-indigo-500/5">
                            <Target size={26} />
                        </div>
                        <div>
                            <h3 className="font-black text-2xl text-slate-900 dark:text-white tracking-tight">The Road to Diamond</h3>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Ascend your status</p>
                        </div>
                    </div>

                    <div className="relative space-y-4">
                        {TIERS.map((tier, idx) => {
                            const isCurrent = currentTier.name === tier.name;
                            const tierIndex = TIERS.findIndex(t => t.name === tier.name);
                            const currentTierIndex = TIERS.findIndex(t => t.name === currentTier.name);
                            const isCompleted = currentTierIndex >= tierIndex;

                            return (
                                <motion.div 
                                    key={tier.name}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.1 * idx }}
                                    className={`relative p-6 rounded-[2rem] border transition-all duration-500 overflow-hidden group
                                        ${isCompleted 
                                            ? 'bg-white dark:bg-white/5 border-emerald-500/20 shadow-xl shadow-emerald-500/5' 
                                            : 'bg-white/40 dark:bg-white/[0.02] border-gray-100 dark:border-white/5 opacity-50'}`}
                                >
                                    {isCurrent && (
                                        <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 via-transparent to-transparent animate-pulse" />
                                    )}

                                    <div className="flex items-center gap-5 relative z-10">
                                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 border-2 transition-all duration-500 ${
                                            isCompleted 
                                                ? 'bg-emerald-500 border-emerald-400 text-white shadow-2xl shadow-emerald-500/40 rotate-3 group-hover:rotate-6' 
                                                : 'bg-white dark:bg-black border-gray-100 dark:border-white/10 text-gray-400'
                                        }`}>
                                            {isCompleted ? <CheckCircle size={28} /> : tier.icon}
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex items-center justify-between mb-1">
                                                <h4 className={`font-black text-xl tracking-tight ${isCompleted ? 'text-slate-900 dark:text-white' : 'text-slate-400'}`}>
                                                    {tier.name}
                                                </h4>
                                                {isCurrent && (
                                                    <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-600`}>
                                                        Current Tier
                                                    </span>
                                                )}
                                            </div>
                                            <p className={`text-xs font-bold uppercase tracking-widest ${isCompleted ? 'text-emerald-500' : 'text-gray-400'}`}>
                                                {tier.perks}
                                            </p>
                                        </div>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>
                </section>

                {/* Timeline Card */}
                <section className="mb-16">
                    <div className="flex items-center justify-between mb-8 px-1">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-white/5 flex items-center justify-center text-slate-600 dark:text-slate-400 border border-slate-200/50">
                                <History size={26} />
                            </div>
                            <div>
                                <h3 className="font-black text-2xl text-slate-900 dark:text-white tracking-tight">Recent Activity</h3>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Live earning feed</p>
                            </div>
                        </div>
                        <button 
                            onClick={() => router.push('/rewards/history')}
                            className="text-[10px] font-black uppercase tracking-widest text-emerald-600"
                        >
                            View Full Timeline
                        </button>
                    </div>

                    <div className="bg-white dark:bg-white/5 rounded-[3rem] border border-gray-100 dark:border-white/10 shadow-sm overflow-hidden backdrop-blur-3xl">
                        {history.length > 0 ? (
                            <div className="divide-y divide-gray-50 dark:divide-white/5">
                                {history.map((tx, idx) => (
                                    <div
                                        key={tx.id}
                                        className="flex items-center justify-between p-6 hover:bg-gray-50/50 dark:hover:bg-white/10 transition-colors group"
                                    >
                                        <div className="flex items-center gap-5">
                                            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all group-hover:scale-110 ${
                                                tx.points > 0 
                                                    ? 'bg-emerald-500/10 text-emerald-600 shadow-emerald-500/5' 
                                                    : 'bg-rose-500/10 text-rose-600 shadow-rose-500/5'
                                            }`}>
                                                {tx.points > 0 ? <ArrowUpRight size={22} /> : <ArrowUpRight size={22} className="rotate-90" />}
                                            </div>
                                            <div>
                                                <p className="font-black text-slate-900 dark:text-white tracking-tight group-hover:text-emerald-600 transition-colors">{tx.description}</p>
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-1">
                                                    {new Date(tx.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className={`font-black text-xl tracking-tight ${tx.points > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                                {tx.points > 0 ? '+' : ''}{tx.points}
                                            </p>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Points</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="py-20 text-center">
                                <p className="font-black text-slate-400 uppercase tracking-widest text-xs">No activity yet</p>
                            </div>
                        )}
                    </div>
                </section>
            </div>

            {/* Premium Reward Scratch Modal */}
            <AnimatePresence>
                {selectedCard && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl"
                    >
                        <motion.div
                            initial={{ scale: 0.8, y: 50, rotateX: 20 }}
                            animate={{ scale: 1, y: 0, rotateX: 0 }}
                            exit={{ scale: 0.8, y: 50, rotateX: 20 }}
                            className="relative w-full max-w-md bg-gradient-to-b from-[#0F172A] to-black rounded-[3rem] p-1 shadow-2xl border border-white/10 overflow-hidden"
                        >
                            <div className="relative bg-black/40 rounded-[2.9rem] p-8 overflow-hidden">
                                <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 blur-[100px] rounded-full pointer-events-none" />
                                <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/10 blur-[100px] rounded-full pointer-events-none" />

                                <button 
                                    onClick={() => !isProcessingReveal && setSelectedCard(null)}
                                    className="absolute top-6 right-6 w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-white/40 hover:text-white transition-colors border border-white/10 z-20 disabled:opacity-50"
                                    disabled={isProcessingReveal}
                                >
                                    <X size={20} />
                                </button>

                                <div className="text-center mb-10 relative z-10 pt-4">
                                    <h3 className="text-3xl font-black text-white mb-2 tracking-tighter italic">Empire Loot Box</h3>
                                    <p className="text-emerald-400 font-bold uppercase tracking-[0.3em] text-[10px]">Scratch to Reveal Prize</p>
                                </div>

                                <div className="relative h-72 sm:h-80 w-full rounded-[2.5rem] overflow-hidden border border-white/10 shadow-2xl ring-4 ring-emerald-500/5">
                                    <ScratchCard 
                                        id={selectedCard.id}
                                        prizePoints={selectedCard.prize}
                                        onComplete={() => handleScratchComplete(selectedCard.id)}
                                        revealed={revealedCardIds.has(selectedCard.id)}
                                    />
                                </div>

                                <div className="mt-10 text-center relative z-10">
                                    <p className="text-white/40 text-[10px] font-black uppercase tracking-[0.4em] mb-6 italic">Verified Rewards System</p>
                                    <div className="flex items-center justify-center gap-3">
                                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                                        <p className="text-emerald-400 text-sm font-black uppercase tracking-widest">Live Settlement</p>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ── Redeem to Wallet Modal ────────────────────────────────────────── */}
            <AnimatePresence>
                {showRedeemModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => !redeemLoading && setShowRedeemModal(false)}
                        className="fixed inset-0 z-[150] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-md"
                    >
                        <motion.div
                            initial={{ y: '100%', opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: '100%', opacity: 0 }}
                            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
                            onClick={e => e.stopPropagation()}
                            className="relative w-full max-w-lg bg-white dark:bg-[#0B1120] rounded-t-[2.5rem] sm:rounded-[2.5rem] p-8 shadow-2xl border-t sm:border border-gray-100 dark:border-white/10 overflow-hidden"
                        >
                            {/* Glow blob */}
                            <div className="absolute -top-20 -right-20 w-64 h-64 bg-emerald-500/10 blur-[100px] rounded-full pointer-events-none" />

                            {/* Handle bar */}
                            <div className="w-10 h-1 bg-gray-200 dark:bg-white/10 rounded-full mx-auto mb-6 sm:hidden" />

                            {/* Header */}
                            <div className="flex items-start justify-between mb-8">
                                <div>
                                    <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight leading-none">Redeem to Wallet</h3>
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1.5">100 pts = ₹1.00 · Min 100 pts</p>
                                </div>
                                <button
                                    onClick={() => setShowRedeemModal(false)}
                                    disabled={redeemLoading}
                                    className="w-10 h-10 rounded-2xl bg-gray-100 dark:bg-white/5 flex items-center justify-center text-slate-500 hover:text-slate-900 dark:hover:text-white transition-all shrink-0"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            {/* Balance chip */}
                            <div className="flex items-center gap-3 mb-8 p-4 bg-emerald-50 dark:bg-emerald-500/10 rounded-2xl border border-emerald-200/50 dark:border-emerald-500/20">
                                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 dark:bg-emerald-500/20 flex items-center justify-center text-emerald-600">
                                    <Coins size={20} />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600/70">Available Balance</p>
                                    <p className="font-black text-xl text-emerald-700 dark:text-emerald-400 tracking-tight">{points.toLocaleString()} pts</p>
                                </div>
                            </div>

                            {/* Points Input */}
                            <div className="mb-6">
                                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-3">Points to Redeem</label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        min={100}
                                        max={points}
                                        step={100}
                                        value={redeemPoints}
                                        onChange={e => {
                                            const val = parseInt(e.target.value) || 100;
                                            setRedeemPoints(Math.min(Math.max(100, val), points));
                                        }}
                                        className="w-full text-3xl font-black text-slate-900 dark:text-white bg-gray-50 dark:bg-white/5 border-2 border-gray-200 dark:border-white/10 rounded-2xl px-6 py-5 pr-24 focus:outline-none focus:border-emerald-500 dark:focus:border-emerald-500 transition-colors"
                                    />
                                    <span className="absolute right-6 top-1/2 -translate-y-1/2 text-xs font-black uppercase tracking-widest text-slate-400">pts</span>
                                </div>
                                {/* Slider */}
                                <input
                                    type="range"
                                    min={100}
                                    max={Math.max(100, points)}
                                    step={100}
                                    value={redeemPoints}
                                    onChange={e => setRedeemPoints(parseInt(e.target.value))}
                                    className="w-full mt-4 accent-emerald-500"
                                />
                                <div className="flex justify-between text-[10px] font-bold text-slate-400 mt-1">
                                    <span>100 pts</span>
                                    <span>{points.toLocaleString()} pts</span>
                                </div>
                            </div>

                            {/* Quick select buttons */}
                            <div className="flex gap-2 mb-8">
                                {[25, 50, 75, 100].map(pct => {
                                    const val = Math.floor((points * pct) / 100 / 100) * 100;
                                    if (val < 100) return null;
                                    return (
                                        <button
                                            key={pct}
                                            onClick={() => setRedeemPoints(val)}
                                            className="flex-1 py-2 rounded-xl bg-gray-100 dark:bg-white/5 text-xs font-black text-slate-600 dark:text-slate-300 hover:bg-emerald-500/10 hover:text-emerald-600 transition-all border border-transparent hover:border-emerald-500/20"
                                        >
                                            {pct}%
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Conversion summary */}
                            <div className="mb-8 p-5 bg-gray-50 dark:bg-white/5 rounded-2xl border border-gray-100 dark:border-white/10">
                                <div className="flex items-center justify-between mb-3">
                                    <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Points</span>
                                    <span className="font-black text-slate-900 dark:text-white">{redeemPoints.toLocaleString()} pts</span>
                                </div>
                                <div className="flex items-center justify-between mb-3">
                                    <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Conversion Rate</span>
                                    <span className="font-black text-slate-900 dark:text-white">100 pts = ₹1</span>
                                </div>
                                <div className="h-px bg-gray-200 dark:bg-white/10 my-3" />
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wide">You'll receive</span>
                                    <span className="text-2xl font-black text-emerald-600">₹{Math.floor(redeemPoints / 100)}</span>
                                </div>
                            </div>

                            {/* Validation warning */}
                            {redeemPoints > points && (
                                <div className="flex items-center gap-2 mb-4 p-3 bg-rose-50 dark:bg-rose-500/10 rounded-xl border border-rose-200 dark:border-rose-500/20">
                                    <AlertCircle size={16} className="text-rose-500 shrink-0" />
                                    <p className="text-xs font-bold text-rose-600">Exceeds your available balance</p>
                                </div>
                            )}

                            {/* CTA */}
                            <button
                                onClick={handleRedeem}
                                disabled={redeemLoading || redeemPoints < 100 || redeemPoints > points}
                                className="w-full py-5 bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-black text-base rounded-2xl shadow-xl shadow-emerald-500/20 hover:from-emerald-400 hover:to-teal-400 active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-3"
                            >
                                {redeemLoading ? (
                                    <><div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Processing...</>
                                ) : (
                                    <><Wallet size={20} /> Redeem ₹{Math.floor(redeemPoints / 100)} to Wallet</>
                                )}
                            </button>
                            <p className="text-center text-[10px] font-bold text-slate-400 mt-4 uppercase tracking-widest">⚡ Instant wallet credit</p>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <RewardsInfoModal isOpen={showInfoModal} onClose={() => setShowInfoModal(false)} userTier={currentTier.name.toLowerCase()} />
            <CustomerBottomNav />
        </div>
    );
}
