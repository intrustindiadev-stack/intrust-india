'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
    Trophy, Coins, ArrowRight, ChevronLeft, Wallet,
    TrendingUp, Users, Zap, ArrowUpRight, History,
    Crown, Medal, Star
} from 'lucide-react';
import { useAuth } from '@/lib/contexts/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import toast from 'react-hot-toast';
import Navbar from '@/components/layout/Navbar';
import CustomerBottomNav from '@/components/layout/customer/CustomerBottomNav';

const tierIcons = {
    bronze: <Star size={20} className="text-amber-700" />,
    silver: <Medal size={20} className="text-gray-400" />,
    gold: <Trophy size={20} className="text-yellow-500" />,
    platinum: <Crown size={20} className="text-violet-500" />
};

const tierColors = {
    bronze: 'bg-amber-100 text-amber-800 border-amber-200',
    silver: 'bg-gray-100 text-gray-700 border-gray-200',
    gold: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    platinum: 'bg-violet-100 text-violet-800 border-violet-200'
};

export default function RewardsDashboardPage() {
    const { user } = useAuth();
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [balance, setBalance] = useState(null);
    const [nextTier, setNextTier] = useState(null);
    const [nextTierConfig, setNextTierConfig] = useState(null);
    const [transactions, setTransactions] = useState([]);
    const [convertAmount, setConvertAmount] = useState('');
    const [converting, setConverting] = useState(false);

    useEffect(() => {
        if (!loading && !user) {
            router.push('/login');
            return;
        }

        const fetchData = async () => {
            if (!user) return;
            try {
                // Fetch balance
                const { data: balanceData } = await supabase
                    .from('reward_points_balance')
                    .select('*')
                    .eq('user_id', user.id)
                    .single();

                setBalance(balanceData);

                // Fetch next tier config
                const tiers = ['bronze', 'silver', 'gold', 'platinum'];
                const currentTierIndex = tiers.indexOf(balanceData?.tier || 'bronze');
                const nextTierName = tiers[currentTierIndex + 1];
                setNextTier(nextTierName);

                if (nextTierName) {
                    const { data: tierConfig } = await supabase
                        .from('reward_configuration')
                        .select('config_value')
                        .eq('config_key', `tier_${nextTierName}`)
                        .single();
                    setNextTierConfig(tierConfig?.config_value);
                }

                // Fetch recent transactions
                const { data: txns } = await supabase
                    .from('reward_transactions')
                    .select('*')
                    .eq('user_id', user.id)
                    .order('created_at', { ascending: false })
                    .limit(5);

                setTransactions(txns || []);
            } catch (err) {
                console.error('Error fetching reward data:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [user]);

    const handleConvert = async () => {
        const points = parseInt(convertAmount);
        if (!points || points <= 0) {
            toast.error('Please enter a valid amount');
            return;
        }
        if (points > (balance?.current_balance || 0)) {
            toast.error('Insufficient points');
            return;
        }

        setConverting(true);
        try {
            const response = await fetch('/api/rewards/convert', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ points })
            });

            const result = await response.json();

            if (result.success) {
                toast.success(result.message);
                setConvertAmount('');
                // Refresh balance
                const { data: newBalance } = await supabase
                    .from('reward_points_balance')
                    .select('*')
                    .eq('user_id', user.id)
                    .single();
                setBalance(newBalance);
            } else {
                toast.error(result.message || 'Conversion failed');
            }
        } catch (err) {
            console.error('Convert error:', err);
            toast.error('Conversion failed');
        } finally {
            setConverting(false);
        }
    };

    const getTierProgress = () => {
        if (!nextTierConfig || !balance) return 0;
        const minTree = nextTierConfig.min_tree_size || 0;
        const minActive = nextTierConfig.min_active_referrals || 0;
        const treeProgress = Math.min((balance.tree_size / minTree) * 50, 50);
        const activeProgress = Math.min((balance.active_downline / minActive) * 50, 50);
        return Math.round(treeProgress + activeProgress);
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-[#F8FAFC] dark:bg-gray-900 font-[family-name:var(--font-outfit)] flex flex-col items-center justify-center">
                <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#F8FAFC] dark:bg-gray-900 font-[family-name:var(--font-outfit)] pb-24">
            <Navbar />

            <div className="pt-[10vh] px-4 sm:hidden">
                <button onClick={() => router.back()} className="w-10 h-10 flex items-center justify-center bg-white dark:bg-gray-800 rounded-full shadow-sm">
                    <ChevronLeft size={20} className="text-gray-700 dark:text-gray-300" />
                </button>
            </div>

            <div className="max-w-2xl mx-auto px-4 sm:px-6 pt-4 sm:pt-[15vh]">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-8"
                >
                    <h1 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
                        Intrust <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-500 to-purple-600">Rewards</span>
                    </h1>
                    <p className="text-slate-500 dark:text-gray-300 mt-2">
                        Manage your reward points and track your network earnings
                    </p>
                </motion.div>

                {/* Points Card */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.1 }}
                    className="bg-gradient-to-br from-violet-500 via-purple-500 to-indigo-600 rounded-3xl p-6 sm:p-8 shadow-xl shadow-purple-500/20 mb-8 text-white"
                >
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <Coins size={20} className="text-white/80" />
                            <span className="text-white/80 font-medium">Current Balance</span>
                        </div>
                        <div className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 ${tierColors[balance?.tier || 'bronze']} bg-white/20 text-white border-white/30`}>
                            {tierIcons[balance?.tier || 'bronze']}
                            <span className="capitalize">{balance?.tier || 'bronze'}</span>
                        </div>
                    </div>
                    <p className="text-5xl sm:text-6xl font-black mb-2">
                        {(balance?.current_balance || 0).toLocaleString('en-IN')}
                    </p>
                    <p className="text-white/70 text-sm">Intrust Reward Points</p>

                    <div className="grid grid-cols-2 gap-4 mt-6 pt-6 border-t border-white/20">
                        <div>
                            <p className="text-white/60 text-xs mb-1">Total Earned</p>
                            <p className="text-xl font-bold">{(balance?.total_earned || 0).toLocaleString('en-IN')}</p>
                        </div>
                        <div>
                            <p className="text-white/60 text-xs mb-1">Total Redeemed</p>
                            <p className="text-xl font-bold">{(balance?.total_redeemed || 0).toLocaleString('en-IN')}</p>
                        </div>
                    </div>
                </motion.div>

                {/* Tier Progress */}
                {nextTier && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.15 }}
                        className="bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 mb-8"
                    >
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <p className="font-bold text-gray-900 dark:text-white">Next Tier: <span className="capitalize">{nextTier}</span></p>
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                    {balance?.tree_size || 0} / {nextTierConfig?.min_tree_size || 0} tree size &middot; {balance?.active_downline || 0} / {nextTierConfig?.min_active_referrals || 0} active
                                </p>
                            </div>
                            <div className={`px-3 py-1 rounded-full text-xs font-bold border ${tierColors[nextTier]}`}>
                                {tierIcons[nextTier]}
                                <span className="capitalize ml-1">{nextTier}</span>
                            </div>
                        </div>
                        <div className="h-3 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                            <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${getTierProgress()}%` }}
                                transition={{ duration: 1, delay: 0.3 }}
                                className="h-full bg-gradient-to-r from-violet-400 to-purple-500 rounded-full"
                            />
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                            {nextTierConfig?.bonus_multiplier}x bonus multiplier when you reach {nextTier}
                        </p>
                    </motion.div>
                )}

                {/* Quick Stats */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="grid grid-cols-3 gap-4 mb-8"
                >
                    <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm text-center">
                        <div className="w-10 h-10 bg-emerald-50 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mx-auto mb-2">
                            <Users size={18} className="text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <p className="text-lg font-black text-gray-900 dark:text-white">{balance?.direct_referrals || 0}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Direct</p>
                    </div>
                    <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm text-center">
                        <div className="w-10 h-10 bg-blue-50 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-2">
                            <TrendingUp size={18} className="text-blue-600 dark:text-blue-400" />
                        </div>
                        <p className="text-lg font-black text-gray-900 dark:text-white">{balance?.tree_size || 0}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Tree Size</p>
                    </div>
                    <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm text-center">
                        <div className="w-10 h-10 bg-amber-50 dark:bg-amber-900/30 rounded-full flex items-center justify-center mx-auto mb-2">
                            <Zap size={18} className="text-amber-600 dark:text-amber-400" />
                        </div>
                        <p className="text-lg font-black text-gray-900 dark:text-white">{balance?.active_downline || 0}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Active</p>
                    </div>
                </motion.div>

                {/* Convert to Wallet */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.25 }}
                    className="bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 mb-8"
                >
                    <div className="flex items-center gap-2 mb-4">
                        <Wallet size={20} className="text-violet-600 dark:text-violet-400" />
                        <h3 className="font-bold text-gray-900 dark:text-white">Convert to Wallet</h3>
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                        Convert your Intrust Reward Points to wallet cash. Minimum 100 points.
                    </p>
                    <div className="flex gap-3">
                        <input
                            type="number"
                            value={convertAmount}
                            onChange={(e) => setConvertAmount(e.target.value)}
                            placeholder="Enter points"
                            className="flex-1 px-4 py-3 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                            min="100"
                        />
                        <button
                            onClick={handleConvert}
                            disabled={converting || !convertAmount}
                            className="px-6 py-3 bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white font-bold rounded-xl shadow-lg shadow-violet-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.98]"
                        >
                            {converting ? '...' : 'Convert'}
                        </button>
                    </div>
                </motion.div>

                {/* Recent Transactions */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 mb-8"
                >
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <History size={20} className="text-violet-600 dark:text-violet-400" />
                            <h3 className="font-bold text-gray-900 dark:text-white">Recent Activity</h3>
                        </div>
                        <button
                            onClick={() => router.push('/rewards/transactions')}
                            className="text-sm text-violet-600 dark:text-violet-400 font-medium flex items-center gap-1 hover:underline"
                        >
                            View All <ArrowRight size={14} />
                        </button>
                    </div>

                    {transactions.length === 0 ? (
                        <div className="text-center py-8">
                            <Coins size={40} className="text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                            <p className="text-gray-500 dark:text-gray-400 text-sm">No transactions yet</p>
                            <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">Start referring to earn points!</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {transactions.map((txn) => (
                                <div
                                    key={txn.id}
                                    className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900/50 rounded-xl"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${txn.points > 0 ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
                                            {txn.points > 0 ? <TrendingUp size={14} /> : <Wallet size={14} />}
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-gray-900 dark:text-white capitalize">
                                                {txn.event_type.replace(/_/g, ' ')}
                                            </p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                                {txn.level ? `Level ${txn.level}` : 'Direct'} &middot; {new Date(txn.created_at).toLocaleDateString()}
                                            </p>
                                        </div>
                                    </div>
                                    <p className={`font-bold ${txn.points > 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                                        {txn.points > 0 ? '+' : ''}{txn.points}
                                    </p>
                                </div>
                            ))}
                        </div>
                    )}
                </motion.div>

                {/* Quick Links */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.35 }}
                >
                    <button
                        onClick={() => router.push('/refer')}
                        className="w-full bg-white dark:bg-gray-800 p-5 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm text-left hover:shadow-md transition-all flex items-center gap-4"
                    >
                        <div className="w-10 h-10 bg-emerald-50 dark:bg-emerald-900/30 rounded-full flex items-center justify-center flex-shrink-0">
                            <Users size={18} className="text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <div>
                            <p className="font-bold text-gray-900 dark:text-white">Refer Friends</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Share your code &amp; view your network chain</p>
                        </div>
                        <ArrowRight size={18} className="text-gray-400 ml-auto flex-shrink-0" />
                    </button>
                </motion.div>
            </div>

            <CustomerBottomNav />
        </div>
    );
}
