'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Trophy, Gift, Star, ChevronRight, History, TrendingUp,
    Info, ArrowUpRight, Sparkles, Coins, Wallet, CreditCard,
    Lock, CheckCircle, ChevronLeft, Zap, Target, Palette, X,
    Archive, Clock, Calendar
} from 'lucide-react';
import { useAuth } from '@/lib/contexts/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import toast from 'react-hot-toast';
import Navbar from '@/components/layout/Navbar';
import CustomerBottomNav from '@/components/layout/customer/CustomerBottomNav';
import ScratchCard from '@/components/ui/ScratchCard';
import Breadcrumbs from '@/components/giftcards/Breadcrumbs';

// ─── Constants ──────────────────────────────────────────────────────────────
const POINTS_PER_RUPEE = 100;

const TIERS = [
    { name: 'Bronze', minPoints: 0, color: 'text-orange-500', bg: 'bg-orange-500/10', border: 'border-orange-500/20', icon: <Star size={16} />, perks: 'Basic Rewards' },
    { name: 'Silver', minPoints: 1000, color: 'text-slate-400', bg: 'bg-slate-400/10', border: 'border-slate-400/20', icon: <Star size={16} />, perks: '2% Extra Points' },
    { name: 'Gold', minPoints: 5000, color: 'text-amber-500', bg: 'bg-amber-500/10', border: 'border-amber-500/20', icon: <Trophy size={16} />, perks: '5% Extra Points' },
    { name: 'Platinum', minPoints: 15000, color: 'text-indigo-500', bg: 'bg-indigo-500/10', border: 'border-indigo-500/20', icon: <Zap size={16} />, perks: 'Priority Support' },
    { name: 'Diamond', minPoints: 50000, color: 'text-sky-500', bg: 'bg-sky-500/10', border: 'border-sky-500/20', icon: <Target size={16} />, perks: 'Elite Concierge' },
];

export default function RewardsPage() {
    const { user } = useAuth();
    const router = useRouter();

    const [loading, setLoading] = useState(true);
    const [points, setPoints] = useState(0);
    const [history, setHistory] = useState([]);
    const [currentTier, setCurrentTier] = useState(TIERS[0]);
    const [nextTier, setNextTier] = useState(TIERS[1]);
    const [progress, setProgress] = useState(0);

    // Modal state
    const [selectedCard, setSelectedCard] = useState(null);
    const [showRedeemModal, setShowRedeemModal] = useState(false);

    // Scratch card state
    const [dailyLoot, setDailyLoot] = useState([
        { id: 'sc1', title: 'Today\'s Bonus', type: 'Common', status: 'available', prize: '10-50 Points', color: 'emerald', date: 'TODAY' },
        { id: 'sc_stored_1', title: 'Yesterday\'s Loot', type: 'Rare', status: 'available', prize: '20-100 Points', color: 'blue', date: 'MAY 08', isStored: true },
        { id: 'sc_stored_2', title: 'Weekly Special', type: 'Epic', status: 'available', prize: 'Up to ₹50', color: 'purple', date: 'MAY 05', isStored: true },
    ]);

    useEffect(() => {
        if (!user && !loading) {
            router.push('/login');
        }
    }, [user, loading, router]);

    useEffect(() => {
        if (!user) return;

        const fetchRewardsData = async () => {
            try {
                // Fetch points
                const { data: profile } = await supabase
                    .from('user_profiles')
                    .select('reward_points')
                    .eq('id', user.id)
                    .single();

                const userPoints = profile?.reward_points?.total_earned || 0;
                setPoints(userPoints);

                // Calculate tier
                let tierIndex = 0;
                for (let i = TIERS.length - 1; i >= 0; i--) {
                    if (userPoints >= TIERS[i].minPoints) {
                        tierIndex = i;
                        break;
                    }
                }
                setCurrentTier(TIERS[tierIndex]);
                
                if (tierIndex < TIERS.length - 1) {
                    const next = TIERS[tierIndex + 1];
                    setNextTier(next);
                    const range = next.minPoints - TIERS[tierIndex].minPoints;
                    const currentInRange = userPoints - TIERS[tierIndex].minPoints;
                    setProgress(Math.min(100, (currentInRange / range) * 100));
                } else {
                    setNextTier(null);
                    setProgress(100);
                }

                // Fetch history (preview for card)
                const { data: txs } = await supabase
                    .from('reward_transactions')
                    .select('*')
                    .eq('user_id', user.id)
                    .order('created_at', { ascending: false })
                    .limit(5);
                
                setHistory(txs || []);

            } catch (err) {
                console.error('Error fetching rewards:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchRewardsData();
    }, [user]);

    const handleScratchComplete = (cardId, pointsWon) => {
        toast.success(`Empire Success! Won ${pointsWon} Points!`);
        setPoints(prev => prev + pointsWon);
        
        // Remove from list or mark as scratched
        setDailyLoot(prev => prev.filter(c => c.id !== cardId));
        
        // In real app, update DB
        setTimeout(() => setSelectedCard(null), 2500);
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
        maximumFractionDigits: 2
    });

    const storedCards = dailyLoot.filter(c => c.isStored);
    const todayCard = dailyLoot.find(c => !c.isStored);

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
                    <motion.div 
                        whileHover={{ rotate: 15, scale: 1.1 }}
                        className="w-14 h-14 rounded-3xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/20 border border-white/20"
                    >
                        <Gift className="text-white" size={28} />
                    </motion.div>
                </div>

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
                                onClick={() => setShowRedeemModal(true)}
                                className="flex items-center justify-center gap-2 bg-emerald-500 text-white py-4.5 rounded-[2rem] font-black text-sm shadow-xl shadow-emerald-500/20 hover:bg-emerald-400 active:scale-95 transition-all"
                            >
                                <Palette size={18} />
                                Redeem Store
                            </button>
                            <button
                                onClick={() => router.push('/rewards/history')}
                                className="flex items-center justify-center gap-2 bg-white/5 backdrop-blur-md text-white py-4.5 rounded-[2rem] font-black text-sm border border-white/10 hover:bg-white/10 active:scale-95 transition-all"
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
                        {storedCards.length > 0 && (
                            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-600">
                                <Archive size={14} />
                                <span className="text-[10px] font-black uppercase tracking-widest">{storedCards.length} Stored</span>
                            </div>
                        )}
                    </div>

                    <div className="flex gap-5 overflow-x-auto pb-6 -mx-1 px-1 snap-x no-scrollbar">
                        {dailyLoot.map((card, idx) => (
                            <motion.div
                                key={card.id}
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: 0.2 + idx * 0.1 }}
                                onClick={() => setSelectedCard(card)}
                                className={`snap-center shrink-0 w-[240px] h-[340px] relative rounded-[2.5rem] p-6 border transition-all cursor-pointer group overflow-hidden bg-white dark:bg-white/5 border-gray-200 dark:border-white/10 shadow-lg hover:shadow-2xl hover:-translate-y-2`}
                            >
                                {/* Card Glow Overlay */}
                                <div className={`absolute -top-20 -right-20 w-40 h-40 bg-${card.color}-500/10 blur-[60px] rounded-full pointer-events-none group-hover:bg-${card.color}-500/20 transition-all`} />

                                <div className="h-full flex flex-col justify-between relative z-10">
                                    <div>
                                        <div className="flex items-center justify-between mb-6">
                                            <div className={`px-3 py-1 rounded-full bg-${card.color}-500/10 border border-${card.color}-500/20 flex items-center gap-1.5`}>
                                                <div className={`w-1.5 h-1.5 rounded-full bg-${card.color}-500 animate-pulse`} />
                                                <span className={`text-[10px] font-black uppercase tracking-[0.2em] text-${card.color}-500`}>{card.type}</span>
                                            </div>
                                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{card.date}</span>
                                        </div>
                                        <h4 className="font-black text-xl text-slate-900 dark:text-white mb-2 leading-tight tracking-tight">{card.title}</h4>
                                        <p className="text-xs font-bold text-slate-400 dark:text-gray-500 uppercase tracking-widest">Potential: {card.prize}</p>
                                    </div>

                                    <div className="mt-auto">
                                        <div className="w-full aspect-square rounded-[2rem] bg-gradient-to-br from-slate-100 to-slate-200 dark:from-white/10 dark:to-white/5 flex items-center justify-center border border-gray-200 dark:border-white/10 group-hover:scale-105 transition-transform shadow-inner overflow-hidden relative">
                                            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10" />
                                            <div className="text-center relative z-10">
                                                <Sparkles className={`mx-auto mb-2 text-${card.color}-400 group-hover:animate-bounce`} size={24} />
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Tap to</p>
                                                <p className={`text-sm font-black text-${card.color}-600 dark:text-${card.color}-400 uppercase tracking-[0.2em]`}>Unbox</p>
                                            </div>
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
                            const isCompleted = points >= tier.minPoints;
                            const isNext = nextTier?.name === tier.name;

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
                                                <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg ${isCompleted ? 'bg-emerald-500/10 text-emerald-600' : 'bg-gray-100 text-gray-400'}`}>
                                                    {tier.minPoints.toLocaleString()} PTS
                                                </span>
                                            </div>
                                            <p className={`text-xs font-bold uppercase tracking-widest ${isCompleted ? 'text-emerald-500' : 'text-gray-400'}`}>
                                                {tier.perks}
                                            </p>
                                        </div>
                                    </div>

                                    {isNext && (
                                        <div className="mt-6 pt-6 border-t border-gray-100 dark:border-white/5">
                                            <div className="flex justify-between text-[10px] font-black text-emerald-600 uppercase tracking-[0.2em] mb-2.5">
                                                <span>Ascension Progress</span>
                                                <span>{Math.round(progress)}%</span>
                                            </div>
                                            <div className="h-3 w-full bg-gray-100 dark:bg-white/5 rounded-full overflow-hidden shadow-inner p-0.5">
                                                <motion.div 
                                                    initial={{ width: 0 }}
                                                    animate={{ width: `${progress}%` }}
                                                    className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full shadow-[0_0_15px_rgba(16,185,129,0.5)]"
                                                />
                                            </div>
                                        </div>
                                    )}
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
                                                tx.amount > 0 
                                                    ? 'bg-emerald-500/10 text-emerald-600 shadow-emerald-500/5' 
                                                    : 'bg-rose-500/10 text-rose-600 shadow-rose-500/5'
                                            }`}>
                                                {tx.amount > 0 ? <ArrowUpRight size={22} /> : <ArrowUpRight size={22} className="rotate-90" />}
                                            </div>
                                            <div>
                                                <p className="font-black text-slate-900 dark:text-white tracking-tight group-hover:text-emerald-600 transition-colors">{tx.description}</p>
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-1">
                                                    {new Date(tx.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className={`font-black text-xl tracking-tight ${tx.amount > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                                {tx.amount > 0 ? '+' : ''}{tx.amount}
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
                                    onClick={() => setSelectedCard(null)}
                                    className="absolute top-6 right-6 w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-white/40 hover:text-white transition-colors border border-white/10 z-20"
                                >
                                    <X size={20} />
                                </button>

                                <div className="text-center mb-10 relative z-10 pt-4">
                                    <h3 className="text-3xl font-black text-white mb-2 tracking-tighter italic">Empire Loot Box</h3>
                                    <p className="text-emerald-400 font-bold uppercase tracking-[0.3em] text-[10px]">Scratch to Reveal Prize</p>
                                </div>

                                <div className="relative aspect-[4/5] w-full rounded-[2.5rem] overflow-hidden border border-white/10 shadow-2xl ring-4 ring-emerald-500/5">
                                    <ScratchCard 
                                        id={selectedCard.id}
                                        prizePoints={Math.floor(Math.random() * 40) + 10}
                                        onComplete={(pts) => handleScratchComplete(selectedCard.id, pts)}
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

            {/* Redemption Hub Modal */}
            <AnimatePresence>
                {showRedeemModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[150] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/60 backdrop-blur-md"
                    >
                        <motion.div
                            initial={{ y: "100%" }}
                            animate={{ y: 0 }}
                            exit={{ y: "100%" }}
                            className="relative w-full max-w-lg bg-white dark:bg-[#0F172A] rounded-t-[3rem] sm:rounded-[3rem] p-8 shadow-2xl border-t sm:border border-gray-100 dark:border-white/10 overflow-hidden"
                        >
                            <div className="flex items-center justify-between mb-8">
                                <div>
                                    <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight leading-none">Redeem Empire</h3>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1.5">Select a destination</p>
                                </div>
                                <button 
                                    onClick={() => setShowRedeemModal(false)}
                                    className="w-12 h-12 rounded-2xl bg-gray-50 dark:bg-white/5 flex items-center justify-center text-gray-500 hover:text-gray-900 dark:hover:text-white transition-all"
                                >
                                    <X size={24} />
                                </button>
                            </div>

                            <div className="grid grid-cols-2 gap-4 mb-8">
                                {[
                                    { title: 'Shop', icon: <Gift size={24} />, desc: 'Marketplace', color: 'emerald' },
                                    { title: 'Bank', icon: <Wallet size={24} />, desc: 'Instant Cashout', color: 'blue' },
                                    { title: 'GiftCards', icon: <CreditCard size={24} />, desc: 'Premium Vouchers', color: 'purple' },
                                    { title: 'Invest', icon: <TrendingUp size={24} />, desc: 'Grow Wealth', color: 'amber' },
                                ].map((item) => (
                                    <button
                                        key={item.title}
                                        className="bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 p-6 rounded-[2.5rem] text-left hover:shadow-xl hover:scale-[1.02] transition-all group relative overflow-hidden"
                                    >
                                        <div className={`w-12 h-12 rounded-2xl bg-${item.color}-500/10 text-${item.color}-500 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                                            {item.icon}
                                        </div>
                                        <h4 className="font-black text-slate-900 dark:text-white mb-1 tracking-tight">{item.title}</h4>
                                        <p className="text-[10px] font-medium text-slate-400 dark:text-gray-500 uppercase tracking-wider">{item.desc}</p>
                                        <ArrowUpRight size={16} className="absolute top-6 right-6 text-slate-300 group-hover:text-emerald-500 transition-colors" />
                                    </button>
                                ))}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <CustomerBottomNav />
        </div>
    );
}
