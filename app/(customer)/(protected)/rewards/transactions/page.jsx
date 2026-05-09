'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ChevronLeft, History, TrendingUp, Wallet, Filter, ArrowLeft, ArrowRight } from 'lucide-react';
import { useAuth } from '@/lib/contexts/AuthContext';
import Navbar from '@/components/layout/Navbar';
import CustomerBottomNav from '@/components/layout/customer/CustomerBottomNav';

const eventTypeLabels = {
    signup: 'Signup Bonus',
    purchase: 'Purchase Reward',
    kyc_complete: 'KYC Complete',
    merchant_onboard: 'Merchant Onboard',
    subscription_renewal: 'Subscription Renewal',
    daily_login: 'Daily Login',
    tier_upgrade: 'Tier Upgrade',
    manual_credit: 'Manual Credit',
    manual_debit: 'Manual Debit',
    wallet_conversion: 'Wallet Conversion',
    expiry: 'Points Expired'
};

export default function TransactionsPage() {
    const { user } = useAuth();
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [transactions, setTransactions] = useState([]);
    const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, total_pages: 0 });
    const [filter, setFilter] = useState('all');

    const fetchTransactions = async (page = 1, eventType = null) => {
        try {
            let url = `/api/rewards/transactions?page=${page}&limit=20`;
            if (eventType && eventType !== 'all') {
                url += `&event_type=${eventType}`;
            }

            const response = await fetch(url);
            const data = await response.json();

            if (data.transactions) {
                setTransactions(data.transactions);
                setPagination(data.pagination);
            }
        } catch (err) {
            console.error('Error fetching transactions:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!loading && !user) {
            router.push('/login');
            return;
        }
        fetchTransactions(1, filter === 'all' ? null : filter);
    }, [user, filter]);

    const handlePageChange = (newPage) => {
        if (newPage < 1 || newPage > pagination.total_pages) return;
        fetchTransactions(newPage, filter === 'all' ? null : filter);
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
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-12 h-12 bg-gradient-to-br from-violet-400 to-purple-500 rounded-2xl flex items-center justify-center shadow-lg shadow-violet-500/20">
                            <History size={24} className="text-white" />
                        </div>
                        <div>
                            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                                Transaction History
                            </h1>
                            <p className="text-slate-500 dark:text-gray-300 text-sm">
                                All your reward point activities
                            </p>
                        </div>
                    </div>
                </motion.div>

                {/* Filter */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="mb-6"
                >
                    <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
                        <Filter size={16} className="text-gray-400 flex-shrink-0" />
                        {['all', 'signup', 'purchase', 'kyc_complete', 'wallet_conversion'].map((type) => (
                            <button
                                key={type}
                                onClick={() => setFilter(type)}
                                className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${filter === type
                                        ? 'bg-violet-500 text-white shadow-lg shadow-violet-500/20'
                                        : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
                                    }`}
                            >
                                {type === 'all' ? 'All' : eventTypeLabels[type] || type}
                            </button>
                        ))}
                    </div>
                </motion.div>

                {/* Transactions List */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="space-y-3"
                >
                    {transactions.length === 0 ? (
                        <div className="bg-white dark:bg-gray-800 rounded-3xl p-8 text-center border border-gray-100 dark:border-gray-700 shadow-sm">
                            <History size={48} className="text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                            <p className="text-gray-500 dark:text-gray-400 font-medium">No transactions found</p>
                            <p className="text-gray-400 dark:text-gray-500 text-sm mt-1">
                                {filter !== 'all' ? 'Try a different filter' : 'Start referring to earn points!'}
                            </p>
                        </div>
                    ) : (
                        transactions.map((txn, index) => (
                            <motion.div
                                key={txn.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.05 }}
                                className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-100 dark:border-gray-700 shadow-sm"
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${txn.points > 0 ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'
                                            }`}>
                                            {txn.points > 0 ? <TrendingUp size={18} /> : <Wallet size={18} />}
                                        </div>
                                        <div>
                                            <p className="font-bold text-gray-900 dark:text-white text-sm">
                                                {eventTypeLabels[txn.event_type] || txn.event_type}
                                            </p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                                {txn.description || (txn.level ? `Level ${txn.level} reward` : 'Direct reward')}
                                            </p>
                                            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                                                {new Date(txn.created_at).toLocaleString('en-IN', {
                                                    day: 'numeric',
                                                    month: 'short',
                                                    year: 'numeric',
                                                    hour: '2-digit',
                                                    minute: '2-digit'
                                                })}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className={`text-lg font-black ${txn.points > 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                                            {txn.points > 0 ? '+' : ''}{txn.points}
                                        </p>
                                        <p className="text-xs text-gray-400 dark:text-gray-500">
                                            Bal: {txn.points_after}
                                        </p>
                                    </div>
                                </div>
                            </motion.div>
                        ))
                    )}
                </motion.div>

                {/* Pagination */}
                {pagination.total_pages > 1 && (
                    <div className="flex items-center justify-center gap-4 mt-8">
                        <button
                            onClick={() => handlePageChange(pagination.page - 1)}
                            disabled={pagination.page === 1}
                            className="w-10 h-10 flex items-center justify-center rounded-xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 text-gray-600 dark:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700 transition-all"
                        >
                            <ArrowLeft size={16} />
                        </button>
                        <span className="text-sm text-gray-600 dark:text-gray-300 font-medium">
                            Page {pagination.page} of {pagination.total_pages}
                        </span>
                        <button
                            onClick={() => handlePageChange(pagination.page + 1)}
                            disabled={pagination.page === pagination.total_pages}
                            className="w-10 h-10 flex items-center justify-center rounded-xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 text-gray-600 dark:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700 transition-all"
                        >
                            <ArrowRight size={16} />
                        </button>
                    </div>
                )}
            </div>

            <CustomerBottomNav />
        </div>
    );
}
