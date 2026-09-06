'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Wallet,
    Plus,
    ArrowUpRight,
    ArrowDownLeft,
    History,
    ShieldCheck,
    Coins,
    Sparkles,
    Eye,
    EyeOff,
    CheckCircle2,
    AlertCircle,
    Clock,
    Zap,
    Gift,
    ChevronRight
} from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/lib/contexts/AuthContext';
import { PayerContactError, usePayment } from '@/hooks/usePayment';
import { usePayerContact } from '@/hooks/usePayerContact';
import { supabase } from '@/lib/supabaseClient';
import PayerContactRecoveryPanel from '@/components/payment/PayerContactRecoveryPanel';
import CustomerBreadcrumbs from '@/components/common/CustomerBreadcrumbs';

function AnimatedCounter({ value, duration = 900 }) {
    const [displayValue, setDisplayValue] = useState(0);

    useEffect(() => {
        let startTimestamp = null;
        const startValue = 0;
        const endValue = Number(value) || 0;

        let animationFrameId;
        const step = (timestamp) => {
            if (!startTimestamp) startTimestamp = timestamp;
            const progress = Math.min((timestamp - startTimestamp) / duration, 1);
            // Smooth easeOutExpo
            const easeProgress = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
            const current = startValue + (endValue - startValue) * easeProgress;
            setDisplayValue(current);
            if (progress < 1) {
                animationFrameId = window.requestAnimationFrame(step);
            }
        };

        animationFrameId = window.requestAnimationFrame(step);
        return () => window.cancelAnimationFrame(animationFrameId);
    }, [value, duration]);

    return (
        <span>
            ₹{displayValue.toLocaleString('en-IN', {
                minimumFractionDigits: value % 1 === 0 ? 0 : 2,
                maximumFractionDigits: 2,
            })}
        </span>
    );
}

export default function CustomerWalletPage() {
    const { user, profile } = useAuth();
    const { initiatePayment, loading: paymentLoading } = usePayment();
    const payerContact = usePayerContact({ requireMerchant: false });
    const [balance, setBalance] = useState(0);
    const [rewardPoints, setRewardPoints] = useState(0);
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [addAmount, setAddAmount] = useState('');
    const [isAddingMoney, setIsAddingMoney] = useState(false);
    const [isBalanceVisible, setIsBalanceVisible] = useState(false);
    const [serverContactError, setServerContactError] = useState(null);

    const firstInvalidField = Object.keys(payerContact.validation.errors).filter(k => k !== 'phone')[0] || null;
    const recoveryField = serverContactError?.field || firstInvalidField;
    const hasContactIssue = Boolean(recoveryField);

    const savePayerContact = async (nextValue, field) => {
        const profileId = payerContact.profile?.id || payerContact.authUser?.id || user?.id;
        if (!profileId) throw new Error('Please log in again to update your contact details.');

        const { error } = await supabase
            .from('user_profiles')
            .update(field === 'phone' ? { phone: nextValue } : { email: nextValue })
            .eq('id', profileId);

        if (error) throw error;
        setServerContactError(null);
        await payerContact.refresh();
    };

    useEffect(() => {
        let subscription;

        if (user) {
            fetchWalletData();

            subscription = supabase
                .channel('wallet_realtime')
                .on(
                    'postgres_changes',
                    { event: '*', schema: 'public', table: 'customer_wallets', filter: `user_id=eq.${user.id}` },
                    (payload) => {
                        if (payload.new && payload.new.balance_paise !== undefined) {
                            setBalance(payload.new.balance_paise / 100);
                        }
                    }
                )
                .on(
                    'postgres_changes',
                    { event: 'INSERT', schema: 'public', table: 'customer_wallet_transactions', filter: `user_id=eq.${user.id}` },
                    (payload) => {
                        if (payload.new) {
                            setTransactions(prev => [payload.new, ...prev]);
                        }
                    }
                )
                .subscribe();
        }

        return () => {
            if (subscription) {
                supabase.removeChannel(subscription);
            }
        };
    }, [user]);

    const fetchWalletData = async () => {
        setLoading(true);
        try {
            let hasWallet = false;

            // 1. Fetch Balance & Rewards in parallel
            const [walletRes, rewardRes] = await Promise.allSettled([
                supabase.from('customer_wallets').select('balance_paise').eq('user_id', user.id).maybeSingle(),
                supabase.from('reward_points_balance').select('total_earned').eq('user_id', user.id).maybeSingle(),
            ]);

            if (walletRes.status === 'fulfilled' && walletRes.value.data) {
                setBalance((walletRes.value.data.balance_paise || 0) / 100);
                hasWallet = true;
            } else {
                // Auto-create wallet if missing
                const { data: newWallet } = await supabase.from('customer_wallets')
                    .insert([{ user_id: user.id }])
                    .select('balance_paise')
                    .single();
                if (newWallet) {
                    setBalance((newWallet.balance_paise || 0) / 100);
                    hasWallet = true;
                }
            }

            if (rewardRes.status === 'fulfilled' && rewardRes.value.data) {
                setRewardPoints(rewardRes.value.data.total_earned || 0);
            }

            // 2. Fetch Transactions
            let mergedTxs = [];
            if (hasWallet) {
                const { data: successfulTxs } = await supabase
                    .from('customer_wallet_transactions')
                    .select('*')
                    .eq('user_id', user.id)
                    .order('created_at', { ascending: false })
                    .limit(20);

                if (successfulTxs) {
                    mergedTxs = [...successfulTxs];
                }
            }

            // Also fetch failed / pending SabPaisa topups
            const { data: failedTopups } = await supabase
                .from('transactions')
                .select('client_txn_id, created_at, amount, status, payment_mode')
                .eq('user_id', user.id)
                .eq('udf1', 'WALLET_TOPUP')
                .neq('status', 'gateway_success')
                .order('created_at', { ascending: false })
                .limit(20);

            if (failedTopups) {
                const mappedFailed = failedTopups.map(t => ({
                    id: t.client_txn_id,
                    type: 'TOPUP',
                    description: `Wallet Topup attempt ${t.payment_mode ? `(${t.payment_mode})` : ''}`,
                    created_at: t.created_at,
                    amount_paise: Math.round((Number(t.amount) || 0) * 100),
                    status: t.status
                }));
                mergedTxs = [...mergedTxs, ...mappedFailed];
            }

            mergedTxs.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
            setTransactions(mergedTxs.slice(0, 20));

        } catch (error) {
            console.error('Error fetching wallet data:', error);
        } finally {
            setLoading(false);
        }
    };

    const quickAmounts = [100, 500, 1000, 2000];

    const handleTopUpSubmit = async (amtValue) => {
        const topUpAmt = amtValue || Number(addAmount);
        if (!topUpAmt || topUpAmt < 1) return;

        try {
            await initiatePayment({
                amount: topUpAmt,
                payerName: payerContact.payerName || profile?.full_name || 'User',
                payerEmail: payerContact.payerEmail,
                payerMobile: payerContact.payerPhone,
                udf1: 'WALLET_TOPUP'
            });
            setIsAddingMoney(false);
            setAddAmount('');
        } catch (err) {
            if (err instanceof PayerContactError) {
                setServerContactError({ field: err.field || 'phone', message: err.message });
                setIsAddingMoney(true);
                return;
            }
            alert('Payment initiation failed: ' + err.message);
        }
    };

    return (
        <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6 sm:space-y-8">
            <CustomerBreadcrumbs items={[{ label: 'InTrust Wallet' }]} className="mb-2" />

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-on-surface tracking-tight">
                        InTrust Digital Wallet
                    </h1>
                    <p className="text-xs sm:text-sm text-on-surface-variant mt-1">
                        Manage your digital platform cash, reward points, and instant express top-ups
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-bold border border-emerald-500/20">
                        <ShieldCheck size={14} />
                        <span>100% Safe &amp; RBI Compliant</span>
                    </span>
                </div>
            </div>

            {/* Top Grid: Main Digital Wallet & Sub-balances */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Main Digital Wallet Card */}
                <div className="lg:col-span-7">
                    <motion.div
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="w-full bg-surface-container-lowest border border-outline-variant/30 rounded-3xl p-6 sm:p-7 shadow-sm relative overflow-hidden flex flex-col justify-between"
                    >
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                                <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-bold">
                                    <Wallet size={20} />
                                </div>
                                <div>
                                    <h2 className="font-extrabold text-sm text-on-surface">Available Platform Balance</h2>
                                    <p className="text-[11px] text-on-surface-variant font-medium">Usable across all verified stores & services</p>
                                </div>
                            </div>

                            <button
                                type="button"
                                onClick={() => setIsBalanceVisible(!isBalanceVisible)}
                                className="w-8 h-8 rounded-full bg-surface-container-low hover:bg-surface-container flex items-center justify-center text-on-surface-variant transition-colors"
                                title={isBalanceVisible ? 'Hide Balance' : 'Reveal Balance'}
                            >
                                {isBalanceVisible ? <EyeOff size={15} /> : <Eye size={15} />}
                            </button>
                        </div>

                        {/* Balance Amount */}
                        <div className="my-6">
                            <span className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">
                                Total Digital Cash
                            </span>
                            <div className="flex items-baseline gap-2 mt-1 min-h-[48px] sm:min-h-[56px]">
                                {isBalanceVisible ? (
                                    <motion.h3 
                                        key="visible"
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        transition={{ duration: 0.25 }}
                                        className="text-4xl sm:text-5xl font-black text-on-surface tracking-tight tabular-nums"
                                    >
                                        <AnimatedCounter value={balance} duration={900} />
                                    </motion.h3>
                                ) : (
                                    <motion.button
                                        key="hidden"
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        type="button"
                                        onClick={() => setIsBalanceVisible(true)}
                                        className="flex items-center gap-3 group cursor-pointer focus:outline-none"
                                        title="Tap to reveal balance"
                                    >
                                        <h3 className="text-3xl sm:text-4xl font-mono tracking-[0.25em] text-on-surface-variant/70 group-hover:text-primary transition-colors">
                                            ••••••
                                        </h3>
                                        <span className="text-[11px] font-extrabold px-2.5 py-1 rounded-full bg-primary/10 text-primary group-hover:bg-primary group-hover:text-white transition-all shadow-xs flex items-center gap-1">
                                            <Eye size={12} />
                                            <span>Tap to reveal</span>
                                        </span>
                                    </motion.button>
                                )}
                            </div>
                        </div>

                        {/* Split Sub-balances: InTrust Reward Points & Escrow */}
                        <div className="grid grid-cols-2 gap-3 p-3.5 rounded-2xl bg-surface-container-low/70 border border-outline-variant/20">
                            <Link href="/rewards" className="flex flex-col group p-1 hover:opacity-80 transition-opacity">
                                <div className="flex items-center gap-1.5 text-on-surface-variant text-xs font-bold">
                                    <Coins size={14} className="text-amber-500" />
                                    <span>Reward Points</span>
                                </div>
                                <span className="text-lg font-extrabold text-on-surface mt-0.5 tabular-nums">
                                    {Number(rewardPoints).toLocaleString()} <span className="text-xs font-bold text-on-surface-variant">pts</span>
                                </span>
                            </Link>

                            <Link href="/my-giftcards" className="flex flex-col group p-1 hover:opacity-80 transition-opacity">
                                <div className="flex items-center gap-1.5 text-on-surface-variant text-xs font-bold">
                                    <Gift size={14} className="text-primary" />
                                    <span>Digital Gift Cards</span>
                                </div>
                                <span className="text-xs font-bold text-primary flex items-center gap-0.5 mt-1">
                                    <span>View active vouchers</span>
                                    <ChevronRight size={12} />
                                </span>
                            </Link>
                        </div>

                        {/* Actions */}
                        <div className="mt-6 pt-4 border-t border-outline-variant/20 flex items-center gap-3">
                            <button
                                onClick={() => setIsAddingMoney(true)}
                                className="flex-1 py-3.5 px-4 rounded-2xl bg-primary hover:bg-primary/95 text-on-primary font-bold text-sm flex items-center justify-center gap-2 shadow-sm shadow-primary/20 active:scale-95 transition-all"
                            >
                                <Plus size={18} strokeWidth={2.5} />
                                <span>Add Money</span>
                            </button>

                            <Link
                                href="/transactions"
                                className="py-3.5 px-5 rounded-2xl bg-surface-container hover:bg-surface-container-high text-on-surface font-bold text-sm flex items-center justify-center gap-2 border border-outline-variant/20 active:scale-95 transition-all"
                            >
                                <History size={16} />
                                <span>Passbook</span>
                            </Link>
                        </div>
                    </motion.div>
                </div>

                {/* Express Top-Up & Quick Presets */}
                <div className="lg:col-span-5 flex flex-col justify-between">
                    <div className="w-full bg-surface-container-lowest border border-outline-variant/30 rounded-3xl p-6 shadow-sm h-full flex flex-col justify-between">
                        <div>
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-2">
                                    <Zap size={18} className="text-primary" />
                                    <h3 className="font-extrabold text-base text-on-surface">Express Top-Up</h3>
                                </div>
                                <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full">
                                    0% Gateway Fee
                                </span>
                            </div>

                            <p className="text-xs text-on-surface-variant mb-4">
                                Select a fast recharge preset or type an amount to load your wallet via UPI, Cards, or NetBanking:
                            </p>

                            {/* Preset Buttons */}
                            <div className="grid grid-cols-2 gap-2.5 mb-4">
                                {quickAmounts.map(amt => (
                                    <button
                                        key={amt}
                                        type="button"
                                        onClick={() => setAddAmount(amt.toString())}
                                        className={`py-3 px-3 rounded-2xl font-extrabold text-sm border transition-all active:scale-95 text-center ${
                                            addAmount === amt.toString()
                                                ? 'bg-primary text-on-primary border-primary shadow-sm'
                                                : 'bg-surface-container-low hover:bg-surface-container text-on-surface border-outline-variant/30'
                                        }`}
                                    >
                                        +₹{amt.toLocaleString('en-IN')}
                                    </button>
                                ))}
                            </div>

                            {/* Custom Amount Input */}
                            <div className="relative mb-4">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg font-black text-on-surface-variant">₹</span>
                                <input
                                    type="number"
                                    min="1"
                                    value={addAmount}
                                    onChange={(e) => setAddAmount(e.target.value)}
                                    placeholder="Enter custom amount"
                                    className="w-full pl-9 pr-4 py-3.5 bg-surface-container-low border border-outline-variant/30 rounded-2xl text-base font-bold text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all placeholder:text-on-surface-variant/40"
                                />
                            </div>
                        </div>

                        <button
                            type="button"
                            disabled={paymentLoading || !addAmount || Number(addAmount) < 1}
                            onClick={() => handleTopUpSubmit()}
                            className="w-full py-3.5 bg-primary hover:bg-primary/95 text-on-primary font-bold text-sm rounded-2xl shadow-sm shadow-primary/20 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {paymentLoading ? (
                                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            ) : (
                                <>
                                    <span>Recharge ₹{addAmount || 0}</span>
                                    <ArrowUpRight size={16} />
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>

            {/* Recent Activity / Passbook */}
            <div className="space-y-4 pt-2">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <History size={18} className="text-on-surface-variant" />
                        <h2 className="text-lg sm:text-xl font-extrabold text-on-surface">Recent Wallet Activity</h2>
                    </div>
                    <Link
                        href="/transactions"
                        className="text-xs font-bold text-primary hover:underline uppercase tracking-wider flex items-center gap-1"
                    >
                        <span>View All</span>
                        <ChevronRight size={14} />
                    </Link>
                </div>

                <div className="w-full bg-surface-container-lowest border border-outline-variant/30 rounded-3xl overflow-hidden shadow-sm">
                    {loading ? (
                        <div className="p-12 flex flex-col items-center justify-center space-y-3">
                            <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
                            <p className="text-on-surface-variant text-xs font-medium">Syncing live passbook...</p>
                        </div>
                    ) : transactions.length === 0 ? (
                        <div className="p-12 flex flex-col items-center justify-center text-center">
                            <div className="w-14 h-14 bg-surface-container-low rounded-2xl flex items-center justify-center mb-3 text-on-surface-variant">
                                <Clock size={24} />
                            </div>
                            <p className="text-on-surface font-bold text-sm">No transactions yet</p>
                            <p className="text-on-surface-variant text-xs mt-1">Top up your wallet or make a purchase to see records here</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-outline-variant/15">
                            {transactions.slice(0, 8).map((tx) => {
                                const isDebit = tx.type === 'DEBIT';
                                const isFailed = ['failed', 'ERROR', 'aborted'].includes(tx.status);
                                const isPending = tx.status === 'initiated';

                                return (
                                    <div key={tx.id} className="p-4 sm:p-5 flex items-center justify-between hover:bg-surface-container-low/40 transition-colors">
                                        <div className="flex items-center gap-3.5">
                                            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${
                                                isFailed
                                                    ? 'bg-rose-500/10 text-rose-500'
                                                    : isDebit
                                                        ? 'bg-primary/10 text-primary'
                                                        : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                                            }`}>
                                                {isDebit ? <ArrowUpRight size={18} /> : <ArrowDownLeft size={18} />}
                                            </div>
                                            <div>
                                                <p className={`font-bold text-sm ${isFailed ? 'text-on-surface-variant line-through' : 'text-on-surface'}`}>
                                                    {tx.description || (isDebit ? 'Order Payment' : 'Wallet Recharge')}
                                                </p>
                                                <p className="text-xs text-on-surface-variant mt-0.5">
                                                    {new Date(tx.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} • {new Date(tx.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="text-right">
                                            <p className={`font-extrabold text-sm tabular-nums ${
                                                isFailed
                                                    ? 'text-on-surface-variant line-through'
                                                    : isDebit
                                                        ? 'text-on-surface'
                                                        : 'text-emerald-600 dark:text-emerald-400'
                                            }`}>
                                                {isDebit && !isFailed ? '-' : '+'} ₹{Number.isInteger(tx.amount_paise / 100) ? (tx.amount_paise / 100) : (tx.amount_paise / 100).toFixed(2)}
                                            </p>
                                            <span className={`text-[10px] uppercase font-bold tracking-wider ${
                                                isFailed
                                                    ? 'text-rose-500'
                                                    : isPending
                                                        ? 'text-amber-500'
                                                        : 'text-on-surface-variant/70'
                                            }`}>
                                                {tx.status || 'SUCCESS'}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* Add Money Modal */}
            <AnimatePresence>
                {isAddingMoney && (
                    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsAddingMoney(false)}
                            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ y: 50, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: 50, opacity: 0 }}
                            className="bg-surface-container-lowest border border-outline-variant/30 w-full max-w-md rounded-3xl p-6 sm:p-7 relative z-10 shadow-2xl space-y-5"
                        >
                            <div className="flex items-center justify-between">
                                <h3 className="text-lg font-extrabold text-on-surface flex items-center gap-2">
                                    <Plus className="text-primary" />
                                    Add Money to InTrust Wallet
                                </h3>
                                <button
                                    onClick={() => setIsAddingMoney(false)}
                                    className="text-xs font-bold text-on-surface-variant hover:text-on-surface"
                                >
                                    ✕
                                </button>
                            </div>

                            {hasContactIssue && (
                                <PayerContactRecoveryPanel
                                    field={recoveryField}
                                    message={serverContactError?.message || payerContact.validation.errors[recoveryField]}
                                    currentValue={recoveryField === 'email' ? payerContact.payerEmail : payerContact.payerPhone}
                                    onSave={savePayerContact}
                                    profileDeepLinkBase="/profile"
                                    returnPath="/wallet"
                                />
                            )}

                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-black text-on-surface-variant">₹</span>
                                <input
                                    type="number"
                                    min="1"
                                    value={addAmount}
                                    onChange={(e) => setAddAmount(e.target.value)}
                                    placeholder="Enter amount"
                                    className="w-full pl-10 pr-4 py-4 bg-surface-container-low border border-outline-variant/30 rounded-2xl text-2xl font-black text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/40"
                                />
                            </div>

                            <div className="grid grid-cols-4 gap-2">
                                {quickAmounts.map(amt => (
                                    <button
                                        key={amt}
                                        type="button"
                                        onClick={() => setAddAmount(amt.toString())}
                                        className="py-2.5 bg-surface-container-low hover:bg-surface-container rounded-xl text-xs font-bold text-on-surface transition-all active:scale-95 border border-outline-variant/20"
                                    >
                                        +₹{amt}
                                    </button>
                                ))}
                            </div>

                            <button
                                type="button"
                                disabled={paymentLoading || payerContact.loading || hasContactIssue || !addAmount || Number(addAmount) < 1}
                                className="w-full py-4 bg-primary hover:bg-primary/95 text-on-primary font-extrabold rounded-2xl shadow-sm shadow-primary/20 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                onClick={() => handleTopUpSubmit()}
                            >
                                {paymentLoading ? (
                                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                ) : (
                                    <span>Proceed to Pay ₹{addAmount || 0}</span>
                                )}
                            </button>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
