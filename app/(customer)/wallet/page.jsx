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
    CreditCard,
    IndianRupee,
    ChevronRight,
    Search,
    Filter,
    Clock
} from 'lucide-react';
import Navbar from '@/components/layout/Navbar';
import CustomerBottomNav from '@/components/layout/customer/CustomerBottomNav';
import { useAuth } from '@/lib/contexts/AuthContext';
import { usePayment } from '@/hooks/usePayment';
import { supabase } from '@/lib/supabaseClient';

export default function CustomerWalletPage() {
    const { user, profile } = useAuth();
    const { initiatePayment, loading: paymentLoading } = usePayment();
    const [balance, setBalance] = useState(0);
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [addAmount, setAddAmount] = useState('');
    const [isAddingMoney, setIsAddingMoney] = useState(false);

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
                        console.log('[WALLET] Realtime balance update:', payload);
                        if (payload.new && payload.new.balance_paise !== undefined) {
                            setBalance(payload.new.balance_paise / 100);
                        }
                    }
                )
                .on(
                    'postgres_changes',
                    { event: 'INSERT', schema: 'public', table: 'customer_wallet_transactions', filter: `user_id=eq.${user.id}` },
                    (payload) => {
                        console.log('[WALLET] Realtime transaction:', payload);
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

            // Fetch Balance
            const { data: wallet, error: walletError } = await supabase
                .from('customer_wallets')
                .select('balance_paise')
                .eq('user_id', user.id)
                .single();

            if (!walletError && wallet) {
                setBalance(wallet.balance_paise / 100);
                hasWallet = true;
            } else {
                console.log('[WALLET] Wallet not found. Attempting auto-creation...');
                // Fallback: expressly insert if missing
                const { data: newWallet } = await supabase.from('customer_wallets')
                    .insert([{ user_id: user.id }])
                    .select('balance_paise')
                    .single();
                if (newWallet) {
                    setBalance((newWallet.balance_paise || 0) / 100);
                    hasWallet = true;
                }
            }

            // Fetch Transactions only if wallet actually exists/created to prevent 403 on foreign key
            if (hasWallet) {
                const { data: txs, error: txError } = await supabase
                    .from('customer_wallet_transactions')
                    .select('*')
                    .eq('user_id', user.id)
                    .order('created_at', { ascending: false })
                    .limit(20);

                if (!txError && txs) {
                    setTransactions(txs);
                }
            }
        } catch (error) {
            console.error('Error fetching wallet data:', error);
        } finally {
            setLoading(false);
        }
    };

    const quickAmounts = [100, 200, 500, 1000, 2000];

    const getIconColor = (type) => {
        switch (type) {
            case 'CREDIT': return 'text-green-500 bg-green-50 dark:bg-green-900/20';
            case 'CASHBACK': return 'text-amber-500 bg-amber-50 dark:bg-amber-900/20';
            case 'TOPUP': return 'text-blue-500 bg-blue-50 dark:bg-blue-900/20';
            case 'DEBIT': return 'text-red-500 bg-red-50 dark:bg-red-900/20';
            default: return 'text-gray-500 bg-gray-50 dark:bg-gray-900/20';
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
            <Navbar />

            <div className="pt-24 pb-32 px-4 max-w-4xl mx-auto">
                <header className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">My Wallet</h1>
                    <p className="text-gray-500 dark:text-gray-400">Manage your funds and rewards</p>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Principal Balance Card */}
                    <div className="md:col-span-2">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-gradient-to-br from-gray-900 via-gray-800 to-black p-8 rounded-3xl text-white shadow-2xl relative overflow-hidden"
                        >
                            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-3xl -mr-10 -mt-10" />
                            <div className="absolute bottom-0 left-0 w-32 h-32 bg-amber-500/10 rounded-full blur-3xl -ml-10 -mb-10" />

                            <div className="relative z-10">
                                <span className="text-gray-400 text-sm font-medium flex items-center gap-2">
                                    <ShieldCheck size={14} className="text-green-400" />
                                    Total Balance
                                </span>
                                <div className="mt-2 flex items-baseline gap-2">
                                    <span className="text-5xl font-black tabular-nums">₹{balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                                </div>

                                <div className="mt-10 flex gap-4">
                                    <button
                                        onClick={() => setIsAddingMoney(true)}
                                        className="flex-1 py-4 bg-white text-black font-bold rounded-2xl flex items-center justify-center gap-2 hover:bg-gray-100 transition-colors"
                                    >
                                        <Plus size={20} />
                                        Add Money
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>

                    {/* Quick Info / Rewards */}
                    <div className="md:col-span-1 space-y-4">


                        <div className="bg-white dark:bg-gray-900 p-6 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm">
                            <div className="flex items-center justify-between mb-4">
                                <div className="p-3 rounded-2xl bg-blue-500/10 text-blue-500">
                                    <CreditCard size={20} />
                                </div>
                                <span className="text-xs font-bold text-blue-500 uppercase">Payments</span>
                            </div>
                            <h3 className="text-sm text-gray-500 dark:text-gray-400 font-medium">Safe & Secure</h3>
                            <div className="flex items-center gap-1 mt-1 text-green-500 text-xs font-bold">
                                <ShieldCheck size={12} />
                                PCI DSS Compliant
                            </div>
                        </div>
                    </div>
                </div>

                {/* Transitions Section */}
                <div className="mt-12">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                            <History size={20} />
                            Recent Transactions
                        </h2>
                        <button className="text-xs font-bold text-blue-500 hover:text-blue-600 uppercase tracking-wider">View All</button>
                    </div>

                    <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 overflow-hidden shadow-sm">
                        {loading ? (
                            <div className="p-12 flex flex-col items-center justify-center space-y-4">
                                <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
                                <p className="text-gray-400 text-sm">Fetching history...</p>
                            </div>
                        ) : transactions.length === 0 ? (
                            <div className="p-12 flex flex-col items-center justify-center text-center">
                                <div className="w-16 h-16 bg-gray-50 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
                                    <Clock className="text-gray-300" size={32} />
                                </div>
                                <p className="text-gray-500 dark:text-gray-400 font-medium">No transactions yet</p>
                                <p className="text-gray-400 text-xs mt-1">Add money to your wallet to get started</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-gray-50 dark:divide-gray-800">
                                {transactions.map((tx) => (
                                    <div key={tx.id} className="p-5 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors cursor-pointer">
                                        <div className="flex items-center gap-4">
                                            <div className={`p-3 rounded-2xl ${getIconColor(tx.type)}`}>
                                                {tx.type === 'DEBIT' ? <ArrowUpRight size={18} /> : <ArrowDownLeft size={18} />}
                                            </div>
                                            <div>
                                                <p className="font-bold text-gray-900 dark:text-white text-sm">
                                                    {tx.description || tx.type}
                                                </p>
                                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                                    {new Date(tx.created_at).toLocaleDateString()} ΓÇó {new Date(tx.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className={`font-black text-sm ${tx.type === 'DEBIT' ? 'text-gray-900 dark:text-white' : 'text-green-500'}`}>
                                                {tx.type === 'DEBIT' ? '-' : '+'} ₹{(tx.amount_paise / 100).toFixed(2)}
                                            </p>
                                            <p className="text-[10px] text-gray-400 mt-0.5 uppercase font-bold tracking-widest">{tx.status || 'COMPLETED'}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
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
                            initial={{ y: 100, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: 100, opacity: 0 }}
                            className="bg-white dark:bg-gray-900 w-full max-w-sm rounded-3xl p-8 relative z-10 shadow-2xl"
                        >
                            <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                                <Plus className="text-blue-500" />
                                Add Money
                            </h3>

                            <div className="relative mb-6">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-bold text-gray-400">₹</span>
                                <input
                                    type="number"
                                    value={addAmount}
                                    onChange={(e) => setAddAmount(e.target.value)}
                                    placeholder="Enter amount"
                                    className="w-full pl-10 pr-4 py-5 bg-gray-50 dark:bg-gray-800 border-none rounded-2xl text-2xl font-black focus:ring-2 focus:ring-blue-500"
                                />
                            </div>

                            <div className="grid grid-cols-3 gap-2 mb-8">
                                {quickAmounts.map(amt => (
                                    <button
                                        key={amt}
                                        onClick={() => setAddAmount(amt.toString())}
                                        className="py-2.5 bg-gray-50 dark:bg-gray-800 rounded-xl text-xs font-bold hover:bg-blue-500 hover:text-white transition-all"
                                    >
                                        +₹{amt}
                                    </button>
                                ))}
                            </div>

                            <button
                                disabled={paymentLoading || !addAmount || Number(addAmount) < 1}
                                className="w-full py-4 bg-gray-900 dark:bg-white text-white dark:text-black font-bold rounded-2xl shadow-xl active:scale-95 transition-all disabled:opacity-50"
                                onClick={async () => {
                                    try {
                                        await initiatePayment({
                                            amount: Number(addAmount),
                                            payerName: profile?.full_name || 'User',
                                            payerEmail: user.email,
                                            payerMobile: profile?.phone || '',
                                            udf1: 'WALLET_TOPUP'
                                        });
                                        setIsAddingMoney(false);
                                    } catch (err) {
                                        alert('Payment initiation failed: ' + err.message);
                                    }
                                }}
                            >
                                {paymentLoading ? 'Processing...' : 'Proceed to Pay'}
                            </button>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <CustomerBottomNav activeTab="profile" />
        </div>
    );
}
