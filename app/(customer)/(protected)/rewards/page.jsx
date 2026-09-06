'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Trophy, Gift, Star, History,
    ArrowUpRight, Sparkles, Coins, Wallet,
    CheckCircle, Zap, Target, X,
    Archive, Clock, AlertCircle, ChevronRight,
    Network, Layers, Crown, ShieldCheck
} from 'lucide-react';
import { useAuth } from '@/lib/contexts/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import toast from 'react-hot-toast';
import ScratchCard from '@/components/ui/ScratchCard';
import CustomerBreadcrumbs from '@/components/common/CustomerBreadcrumbs';
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

    // ── Server-authoritative balance ──────────────────────────────────────────
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
            ), { duration: 5000, style: { background: '#2563EB', color: '#fff' } });
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
            const friendlyMessages = {
                not_found: 'Reward card not found or already claimed.',
                rate_limited: 'Please wait a moment before revealing another card.',
                server_error: "We couldn't reveal your reward right now. Please try again.",
                unauthorized: 'Please sign in to reveal your reward.',
                bad_request: 'Invalid reward card request.',
            };
            toast.error(friendlyMessages[err.message] || err.message || 'Failed to claim reward. Please try again.');
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
            const friendlyMessages = {
                not_found: 'Some reward cards were not found or already claimed.',
                rate_limited: 'Please wait a moment before revealing cards.',
                server_error: "We couldn't reveal your rewards right now. Please try again.",
                unauthorized: 'Please sign in to reveal your rewards.',
                bad_request: 'Invalid reward cards request.',
            };
            toast.error(friendlyMessages[err.message] || err.message || "Some rewards couldn't be revealed.");
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
            toast.success(`₹${rupees} added to your InTrust Wallet!`, { id: 'redeem-success' });
        } catch (err) {
            console.error('Redemption error:', err);
            toast.error(err.message || 'Failed to redeem. Please try again.');
        } finally {
            setRedeemLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-[70vh] flex flex-col items-center justify-center gap-3">
                <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
                <p className="text-xs font-bold text-on-surface-variant animate-pulse">Loading InTrust Rewards...</p>
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
        <div className="w-full pb-24 overflow-x-hidden">
            <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
                <CustomerBreadcrumbs items={[{ label: 'InTrust Rewards & Coins' }]} />

                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl sm:text-4xl font-black text-on-surface tracking-tight">Rewards &amp; Coins</h1>
                        <p className="text-xs sm:text-sm text-on-surface-variant font-medium mt-1">Earn, track and redeem your platform reward coins</p>
                    </div>
                    <div className="flex items-center gap-2.5">
                        <button 
                            onClick={() => router.push('/rewards/leaderboard')}
                            className="flex items-center gap-2 px-3.5 py-2.5 rounded-2xl bg-surface-container-lowest hover:bg-surface-container border border-outline-variant/30 text-on-surface font-bold text-xs transition-all active:scale-95 shadow-xs"
                            title="Leaderboard"
                        >
                            <Trophy className="text-amber-500" size={16} />
                            <span className="hidden sm:inline">Leaderboard</span>
                        </button>
                        <button 
                            onClick={() => setShowInfoModal(true)}
                            className="flex items-center gap-2 px-3.5 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold text-xs shadow-md shadow-blue-500/25 transition-all active:scale-[0.98]"
                            title="Rewards Info"
                        >
                            <Gift className="text-white" size={16} />
                            <span>Guide</span>
                        </button>
                    </div>
                </div>

                {/* Cross-navigation to Referral & Leaderboard */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <motion.button
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        onClick={() => router.push('/refer')}
                        className="w-full flex items-center justify-between p-4 sm:p-5 bg-surface-container-lowest border border-outline-variant/30 rounded-2xl group transition-all hover:border-blue-500/40 shadow-xs hover:shadow-sm text-left"
                    >
                        <div className="flex items-center gap-3.5">
                            <div className="w-11 h-11 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-600 border border-blue-500/20 group-hover:scale-105 transition-transform shrink-0">
                                <Network size={18} />
                            </div>
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-wider text-blue-600 dark:text-blue-400">Referral Network</p>
                                <p className="text-sm font-extrabold text-on-surface">Invite Friends &amp; Earn ₹50</p>
                            </div>
                        </div>
                        <ChevronRight size={16} className="text-on-surface-variant/40 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-transform shrink-0" />
                    </motion.button>

                    <motion.button
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.05 }}
                        onClick={() => router.push('/rewards/leaderboard')}
                        className="w-full flex items-center justify-between p-4 sm:p-5 bg-surface-container-lowest border border-outline-variant/30 rounded-2xl group transition-all hover:border-amber-500/40 shadow-xs hover:shadow-sm text-left"
                    >
                        <div className="flex items-center gap-3.5">
                            <div className="w-11 h-11 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500 border border-amber-500/20 group-hover:scale-105 transition-transform shrink-0">
                                <Trophy size={18} />
                            </div>
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-wider text-amber-600 dark:text-amber-400">Hall of Fame</p>
                                <p className="text-sm font-extrabold text-on-surface">Champions Leaderboard</p>
                            </div>
                        </div>
                        <ChevronRight size={16} className="text-on-surface-variant/40 group-hover:text-amber-500 group-hover:translate-x-0.5 transition-transform shrink-0" />
                    </motion.button>
                </div>

                {/* Main Points Card (Unified Royal Blue Hero) */}
                <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="relative bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 rounded-3xl p-6 sm:p-8 text-white shadow-xl shadow-blue-500/20 overflow-hidden"
                >
                    <div className="absolute top-0 right-0 w-72 h-72 bg-white/10 blur-[90px] rounded-full pointer-events-none" />
                    <div className="absolute bottom-0 left-0 w-48 h-48 bg-indigo-500/20 blur-[80px] rounded-full pointer-events-none" />

                    <div className="relative z-10 space-y-6">
                        <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3">
                                <div className="w-11 h-11 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/25 shrink-0 shadow-sm">
                                    <Coins size={22} className="text-white" />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-blue-200">Portfolio</p>
                                    <p className="font-extrabold text-sm text-white">InTrust Growth Coins</p>
                                </div>
                            </div>

                            <div className={`px-3.5 py-1.5 rounded-full bg-white/15 backdrop-blur-md border border-white/25 flex items-center gap-1.5 shadow-xs`}>
                                <div className="text-amber-300">{currentTier.icon}</div>
                                <span className="text-[10px] font-black uppercase tracking-widest text-white">{currentTier.name} Tier</span>
                            </div>
                        </div>

                        <div className="flex flex-col items-center justify-center py-4 text-center">
                            <motion.h2 
                                key={points}
                                initial={{ scale: 0.9, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                className="text-6xl sm:text-7xl font-black tracking-tight mb-2 text-white tabular-nums"
                            >
                                {points.toLocaleString()}
                            </motion.h2>
                            <div className="inline-flex items-center gap-2 px-5 py-2 bg-white/15 backdrop-blur-md rounded-full border border-white/25 shadow-sm">
                                <p className="text-white font-black text-xl tracking-tight">≈ {pointsInRupees}</p>
                                <div className="w-[1px] h-3.5 bg-white/30" />
                                <p className="text-[10px] font-black text-blue-100 uppercase tracking-widest">Liquid Value</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3 pt-2">
                            <button
                                onClick={() => { setRedeemPoints(Math.max(100, Math.floor(points / 100) * 100 > points ? points : Math.floor(points / 100) * 100)); setShowRedeemModal(true); }}
                                disabled={points < 100}
                                className="flex items-center justify-center gap-2 bg-white text-blue-700 hover:bg-blue-50 active:bg-blue-100 py-3.5 px-4 rounded-2xl font-black text-xs sm:text-sm shadow-md transition-all disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98]"
                            >
                                <Wallet size={16} />
                                <span>Redeem to Wallet</span>
                            </button>
                            <button
                                onClick={() => router.push('/rewards/history')}
                                className="flex items-center justify-center gap-2 bg-white/15 hover:bg-white/25 active:bg-white/30 text-white py-3.5 px-4 rounded-2xl font-black text-xs sm:text-sm border border-white/25 transition-all active:scale-[0.98]"
                            >
                                <History size={16} />
                                <span>Timeline</span>
                            </button>
                        </div>
                    </div>
                </motion.div>

                {/* Daily Scratch Cards Section */}
                <section className="space-y-4">
                    <div className="flex items-center justify-between px-1">
                        <div className="flex items-center gap-2.5">
                            <div className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-pulse" />
                            <h3 className="font-black text-xl text-on-surface tracking-tight">Daily Scratch Cards</h3>
                        </div>
                        <div className="flex items-center gap-2.5">
                            {dailyLoot.length > 1 && (
                                <button
                                    onClick={handleRevealAll}
                                    disabled={isProcessingReveal}
                                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-black text-xs transition-all shadow-md shadow-blue-500/25 active:scale-95 disabled:opacity-40"
                                >
                                    <Layers size={13} />
                                    <span>Reveal All</span>
                                </button>
                            )}
                            {storedCards.length > 0 && (
                                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-500/20 text-blue-600 dark:text-blue-400 font-bold text-xs">
                                    <Archive size={13} />
                                    <span>{storedCards.length} Saved</span>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="flex gap-4 overflow-x-auto pb-4 -mx-1 px-1 snap-x no-scrollbar">
                        {dailyLoot.map((card, idx) => (
                            <motion.div
                                key={card.id}
                                initial={{ opacity: 0, scale: 0.92 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: 0.15 + idx * 0.08 }}
                                onClick={() => !isProcessingReveal && setSelectedCard(card)}
                                className={`snap-center shrink-0 w-[230px] h-[330px] relative rounded-3xl p-5 border transition-all cursor-pointer group overflow-hidden bg-surface-container-lowest border-outline-variant/30 hover:border-blue-500/40 shadow-xs hover:shadow-lg hover:-translate-y-1 ${isProcessingReveal ? 'pointer-events-none opacity-80' : ''}`}
                            >
                                <div className="h-full flex flex-col justify-between relative z-10">
                                    <div>
                                        <div className="flex items-center justify-between mb-4">
                                            <div className="px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/40 border border-blue-500/20 flex items-center gap-1.5 text-blue-600 dark:text-blue-400">
                                                <Sparkles size={12} />
                                                <span className="text-[10px] font-black uppercase tracking-wider">{card.type || 'Loot'}</span>
                                            </div>
                                            <span className="text-[9px] font-black text-on-surface-variant uppercase tracking-widest">{card.date}</span>
                                        </div>
                                        <h4 className="font-black text-lg text-on-surface mb-1 leading-tight tracking-tight">{card.title}</h4>
                                        <p className="text-xs font-bold text-blue-600 dark:text-blue-400">Win up to {card.prize} Coins</p>
                                    </div>

                                    <div className="mt-auto">
                                        <div className="w-full aspect-square rounded-2xl bg-surface-container-low border border-outline-variant/25 flex items-center justify-center group-hover:scale-105 transition-transform overflow-hidden relative shadow-inner">
                                            {revealedCardIds.has(card.id) ? (
                                                <div className="text-center relative z-10">
                                                    <motion.div 
                                                        initial={{ scale: 0 }}
                                                        animate={{ scale: 1 }}
                                                        className="text-emerald-600 dark:text-emerald-400 font-black text-3xl mb-1"
                                                    >
                                                        +{card.prize}
                                                    </motion.div>
                                                    <p className="text-[9px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">Claimed</p>
                                                </div>
                                            ) : (
                                                <div className="text-center relative z-10 p-4">
                                                    <div className="w-12 h-12 mx-auto rounded-2xl bg-blue-600/10 text-blue-600 flex items-center justify-center mb-2">
                                                        <Sparkles className="group-hover:animate-bounce" size={22} />
                                                    </div>
                                                    <p className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest mb-0.5">Tap to</p>
                                                    <p className="text-sm font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest">Scratch</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        ))}

                        {dailyLoot.length === 0 && (
                            <div className="w-full py-12 text-center bg-surface-container-lowest rounded-3xl border border-dashed border-outline-variant/30 px-6">
                                <div className="w-14 h-14 bg-blue-500/10 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-3">
                                    <Clock size={26} />
                                </div>
                                <h4 className="font-extrabold text-on-surface text-base">All Daily Scratch Cards Claimed</h4>
                                <p className="text-xs text-on-surface-variant font-medium mt-1 max-w-sm mx-auto">
                                    Check back tomorrow or place new orders on InTrust to unlock fresh bonus scratch cards!
                                </p>
                            </div>
                        )}
                    </div>
                </section>

                {/* Tier Journey */}
                <section className="space-y-4">
                    <div className="flex items-center gap-3 px-1">
                        <div className="w-10 h-10 rounded-xl bg-blue-600/10 text-blue-600 flex items-center justify-center shrink-0">
                            <Target size={20} />
                        </div>
                        <div>
                            <h3 className="font-black text-xl text-on-surface tracking-tight">Tier Milestones &amp; Perks</h3>
                            <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Ascend your membership status</p>
                        </div>
                    </div>

                    <div className="space-y-3">
                        {TIERS.map((tier, idx) => {
                            const isCurrent = currentTier.name === tier.name;
                            const tierIndex = TIERS.findIndex(t => t.name === tier.name);
                            const currentTierIndex = TIERS.findIndex(t => t.name === currentTier.name);
                            const isCompleted = currentTierIndex >= tierIndex;

                            return (
                                <motion.div 
                                    key={tier.name}
                                    initial={{ opacity: 0, x: -15 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.05 * idx }}
                                    className={`relative p-4 sm:p-5 rounded-2xl border transition-all overflow-hidden ${
                                        isCurrent
                                            ? 'bg-surface-container-lowest border-blue-600/40 shadow-md ring-1 ring-blue-500/20'
                                            : isCompleted
                                            ? 'bg-surface-container-lowest border-outline-variant/30 shadow-xs'
                                            : 'bg-surface-container-low/50 border-outline-variant/20 opacity-60'
                                    }`}
                                >
                                    <div className="flex items-center gap-4 relative z-10">
                                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border transition-all ${
                                            isCompleted 
                                                ? 'bg-blue-600 border-blue-500 text-white shadow-md shadow-blue-500/25' 
                                                : 'bg-surface-container-low border-outline-variant/30 text-on-surface-variant'
                                        }`}>
                                            {isCompleted ? <CheckCircle size={22} /> : tier.icon}
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between mb-0.5">
                                                <h4 className="font-black text-base tracking-tight text-on-surface">
                                                    {tier.name} Tier
                                                </h4>
                                                {isCurrent && (
                                                    <span className="text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-md bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                                                        Active Tier
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">
                                                {tier.perks}
                                            </p>
                                        </div>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>
                </section>

                {/* Recent Activity Section */}
                <section className="space-y-4">
                    <div className="flex items-center justify-between px-1">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-surface-container-low flex items-center justify-center text-on-surface-variant shrink-0">
                                <History size={20} />
                            </div>
                            <div>
                                <h3 className="font-black text-xl text-on-surface tracking-tight">Recent Activity</h3>
                                <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Live earning feed</p>
                            </div>
                        </div>
                        <button 
                            onClick={() => router.push('/rewards/history')}
                            className="text-xs font-black uppercase tracking-wider text-blue-600 dark:text-blue-400 hover:underline"
                        >
                            View All Timeline
                        </button>
                    </div>

                    <div className="bg-surface-container-lowest rounded-3xl border border-outline-variant/30 shadow-xs overflow-hidden">
                        {history.length > 0 ? (
                            <div className="divide-y divide-outline-variant/15">
                                {history.map((tx) => (
                                    <div
                                        key={tx.id}
                                        className="flex items-center justify-between p-4 sm:p-5 hover:bg-surface-container-low/40 transition-colors"
                                    >
                                        <div className="flex items-center gap-3.5 min-w-0">
                                            <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
                                                tx.points > 0 
                                                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' 
                                                    : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                                            }`}>
                                                {tx.points > 0 ? <ArrowUpRight size={18} /> : <ArrowUpRight size={18} className="rotate-90" />}
                                            </div>
                                            <div className="min-w-0">
                                                <p className="font-extrabold text-sm text-on-surface truncate">{tx.description}</p>
                                                <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mt-0.5">
                                                    {new Date(tx.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="text-right shrink-0 pl-3">
                                            <p className={`font-black text-sm sm:text-base tabular-nums ${tx.points > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                                                {tx.points > 0 ? '+' : ''}{tx.points}
                                            </p>
                                            <p className="text-[9px] font-bold text-on-surface-variant uppercase tracking-widest">Coins</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="py-14 text-center px-4">
                                <p className="font-bold text-on-surface-variant text-xs uppercase tracking-widest">No activity recorded yet</p>
                            </div>
                        )}
                    </div>
                </section>
            </div>

            {/* Premium Reward Scratch Modal */}
            <AnimatePresence>
                {selectedCard && (
                    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="relative w-full max-w-md bg-surface-container-lowest rounded-3xl p-6 sm:p-8 shadow-2xl border border-outline-variant/30 overflow-hidden space-y-6"
                        >
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="text-xl font-black text-on-surface tracking-tight">InTrust Scratch Card</h3>
                                    <p className="text-blue-600 dark:text-blue-400 font-black uppercase tracking-widest text-[10px]">Scratch to Reveal Prize</p>
                                </div>
                                <button 
                                    onClick={() => !isProcessingReveal && setSelectedCard(null)}
                                    disabled={isProcessingReveal}
                                    className="w-8 h-8 rounded-full bg-surface-container-low hover:bg-surface-container flex items-center justify-center text-on-surface-variant transition-colors disabled:opacity-50"
                                >
                                    <X size={16} />
                                </button>
                            </div>

                            <div className="relative h-72 sm:h-80 w-full rounded-2xl overflow-hidden border border-outline-variant/30 shadow-inner">
                                <ScratchCard 
                                    id={selectedCard.id}
                                    prizePoints={selectedCard.prize}
                                    onComplete={() => handleScratchComplete(selectedCard.id)}
                                    revealed={revealedCardIds.has(selectedCard.id)}
                                />
                            </div>

                            <div className="text-center space-y-1">
                                <p className="text-on-surface-variant text-[10px] font-black uppercase tracking-widest">100% Guaranteed Reward</p>
                                <p className="text-blue-600 dark:text-blue-400 text-xs font-black uppercase tracking-widest">Instant InTrust Wallet Credit</p>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* ── Redeem to Wallet Modal ────────────────────────────────────────── */}
            <AnimatePresence>
                {showRedeemModal && (
                    <div 
                        className="fixed inset-0 z-[150] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/70 backdrop-blur-sm"
                        onClick={() => !redeemLoading && setShowRedeemModal(false)}
                    >
                        <motion.div
                            initial={{ y: '100%', opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: '100%', opacity: 0 }}
                            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
                            onClick={e => e.stopPropagation()}
                            className="relative w-full max-w-lg bg-surface-container-lowest rounded-t-3xl sm:rounded-3xl p-6 sm:p-8 shadow-2xl border border-outline-variant/30 overflow-hidden space-y-6"
                        >
                            <div className="w-12 h-1 bg-surface-container-high rounded-full mx-auto sm:hidden" />

                            <div className="flex items-start justify-between">
                                <div>
                                    <h3 className="text-2xl font-black text-on-surface tracking-tight leading-none">Redeem to Wallet</h3>
                                    <p className="text-xs font-bold text-on-surface-variant uppercase tracking-widest mt-1.5">100 pts = ₹1.00 · Min 100 pts</p>
                                </div>
                                <button
                                    onClick={() => setShowRedeemModal(false)}
                                    disabled={redeemLoading}
                                    className="w-8 h-8 rounded-full bg-surface-container-low hover:bg-surface-container flex items-center justify-center text-on-surface-variant transition-colors"
                                >
                                    <X size={16} />
                                </button>
                            </div>

                            {/* Balance chip */}
                            <div className="flex items-center gap-3 p-4 bg-blue-50 dark:bg-blue-950/40 rounded-2xl border border-blue-500/20">
                                <div className="w-10 h-10 rounded-xl bg-blue-600/10 dark:bg-blue-500/20 flex items-center justify-center text-blue-600 dark:text-blue-400">
                                    <Coins size={20} />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-blue-600 dark:text-blue-400">Available Balance</p>
                                    <p className="font-black text-xl text-on-surface tracking-tight">{points.toLocaleString()} pts</p>
                                </div>
                            </div>

                            {/* Points Input */}
                            <div className="space-y-3">
                                <label className="block text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Points to Redeem</label>
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
                                        className="w-full text-2xl sm:text-3xl font-black text-on-surface bg-surface-container-low border border-outline-variant/30 rounded-2xl px-5 py-4 pr-20 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-colors"
                                    />
                                    <span className="absolute right-5 top-1/2 -translate-y-1/2 text-xs font-black uppercase tracking-widest text-on-surface-variant">pts</span>
                                </div>

                                <input
                                    type="range"
                                    min={100}
                                    max={Math.max(100, points)}
                                    step={100}
                                    value={redeemPoints}
                                    onChange={e => setRedeemPoints(parseInt(e.target.value))}
                                    className="w-full accent-blue-600 cursor-pointer"
                                />
                                <div className="flex justify-between text-[10px] font-bold text-on-surface-variant">
                                    <span>100 pts</span>
                                    <span>{points.toLocaleString()} pts</span>
                                </div>
                            </div>

                            {/* Quick select buttons */}
                            <div className="flex gap-2">
                                {[25, 50, 75, 100].map(pct => {
                                    const val = Math.floor((points * pct) / 100 / 100) * 100;
                                    if (val < 100) return null;
                                    const isSelected = redeemPoints === val;
                                    return (
                                        <button
                                            key={pct}
                                            onClick={() => setRedeemPoints(val)}
                                            className={`flex-1 py-2.5 rounded-xl text-xs font-black transition-all active:scale-95 ${
                                                isSelected
                                                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25'
                                                    : 'bg-surface-container-low text-on-surface hover:bg-blue-50 dark:hover:bg-blue-950/30 hover:text-blue-600 border border-outline-variant/20'
                                            }`}
                                        >
                                            {pct}%
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Conversion summary */}
                            <div className="p-4 bg-surface-container-low rounded-2xl border border-outline-variant/20 space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold text-on-surface-variant">Conversion Rate</span>
                                    <span className="font-extrabold text-xs text-on-surface">100 pts = ₹1</span>
                                </div>
                                <div className="h-px bg-outline-variant/20 my-1" />
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-black text-on-surface uppercase tracking-wide">You&apos;ll receive in Wallet</span>
                                    <span className="text-2xl font-black text-blue-600 dark:text-blue-400">₹{Math.floor(redeemPoints / 100)}</span>
                                </div>
                            </div>

                            {/* Validation warning */}
                            {redeemPoints > points && (
                                <div className="flex items-center gap-2 p-3 bg-rose-50 dark:bg-rose-500/10 rounded-xl border border-rose-200 dark:border-rose-500/20">
                                    <AlertCircle size={16} className="text-rose-500 shrink-0" />
                                    <p className="text-xs font-bold text-rose-600">Exceeds your available balance</p>
                                </div>
                            )}

                            {/* CTA */}
                            <button
                                onClick={handleRedeem}
                                disabled={redeemLoading || redeemPoints < 100 || redeemPoints > points}
                                className="w-full py-4 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-black text-xs sm:text-sm rounded-2xl shadow-md shadow-blue-500/25 active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 uppercase tracking-wider"
                            >
                                {redeemLoading ? (
                                    <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Processing...</>
                                ) : (
                                    <><Wallet size={16} /> Redeem ₹{Math.floor(redeemPoints / 100)} to Wallet</>
                                )}
                            </button>
                            <p className="text-center text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">⚡ Instant InTrust Wallet Credit</p>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <RewardsInfoModal isOpen={showInfoModal} onClose={() => setShowInfoModal(false)} userTier={currentTier.name.toLowerCase()} />
            
        </div>
    );
}
