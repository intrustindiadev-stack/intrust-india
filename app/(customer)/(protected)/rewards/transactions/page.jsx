'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ChevronLeft, History, TrendingUp, Wallet, Filter, ArrowLeft, ArrowRight, Coins } from 'lucide-react';
import { useAuth } from '@/lib/contexts/AuthContext';
import CustomerBreadcrumbs from '@/components/common/CustomerBreadcrumbs';

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
            <div className="min-h-[70vh] flex flex-col items-center justify-center gap-3">
                <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
                <p className="text-xs font-bold text-on-surface-variant animate-pulse">Loading Activity...</p>
            </div>
        );
    }

    return (
        <div className="w-full pb-24 overflow-x-hidden">
            <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
                <CustomerBreadcrumbs items={[
                    { label: 'Rewards & Coins', href: '/rewards' },
                    { label: 'Transaction History' }
                ]} />

                {/* Header */}
                <div className="flex items-center justify-between px-1">
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-black text-on-surface tracking-tight">Reward Activities</h1>
                        <p className="text-xs sm:text-sm text-on-surface-variant font-medium mt-0.5">All your reward coin transactions and logs</p>
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-600 border border-blue-500/20 flex items-center justify-center shadow-xs shrink-0">
                        <History size={22} />
                    </div>
                </div>

                {/* Filter */}
                <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar">
                    <Filter size={15} className="text-on-surface-variant shrink-0" />
                    {['all', 'signup', 'purchase', 'kyc_complete', 'wallet_conversion'].map((type) => {
                        const isSelected = filter === type;
                        return (
                            <button
                                key={type}
                                onClick={() => setFilter(type)}
                                className={`px-4 py-2 rounded-xl text-xs font-black whitespace-nowrap uppercase tracking-wider transition-all active:scale-95 ${
                                    isSelected
                                        ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25'
                                        : 'bg-surface-container-lowest text-on-surface-variant border border-outline-variant/30 hover:border-blue-500/30'
                                }`}
                            >
                                {type === 'all' ? 'All Types' : eventTypeLabels[type] || type}
                            </button>
                        );
                    })}
                </div>

                {/* Transactions List */}
                <div className="space-y-3">
                    {transactions.length === 0 ? (
                        <div className="bg-surface-container-lowest rounded-3xl p-10 text-center border border-outline-variant/30 shadow-xs">
                            <History size={36} className="text-on-surface-variant/40 mx-auto mb-3" />
                            <p className="text-on-surface font-extrabold text-base">No transactions found</p>
                            <p className="text-on-surface-variant text-xs mt-1">
                                {filter !== 'all' ? 'Try selecting a different filter above' : 'Start referring friends and shopping to earn coins!'}
                            </p>
                        </div>
                    ) : (
                        transactions.map((txn, index) => (
                            <motion.div
                                key={txn.id}
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.03 }}
                                className="bg-surface-container-lowest rounded-2xl p-4 sm:p-5 border border-outline-variant/30 hover:border-blue-500/30 transition-all shadow-xs flex items-center justify-between gap-4"
                            >
                                <div className="flex items-center gap-3.5 min-w-0">
                                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
                                        txn.points > 0 ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                                    }`}>
                                        {txn.points > 0 ? <TrendingUp size={18} /> : <Wallet size={18} />}
                                    </div>
                                    <div className="min-w-0">
                                        <p className="font-extrabold text-sm text-on-surface truncate">
                                            {eventTypeLabels[txn.event_type] || txn.event_type}
                                        </p>
                                        <p className="text-xs text-on-surface-variant font-medium truncate mt-0.5">
                                            {txn.description || (txn.level ? `Level ${txn.level} reward` : 'Direct reward')}
                                        </p>
                                        <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mt-0.5">
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
                                <div className="text-right shrink-0 pl-3">
                                    <p className={`text-base sm:text-lg font-black tabular-nums ${txn.points > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                                        {txn.points > 0 ? '+' : ''}{txn.points}
                                    </p>
                                    <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mt-0.5">
                                        Bal: {txn.points_after}
                                    </p>
                                </div>
                            </motion.div>
                        ))
                    )}
                </div>

                {/* Pagination */}
                {pagination.total_pages > 1 && (
                    <div className="flex items-center justify-center gap-3 pt-4">
                        <button
                            onClick={() => handlePageChange(pagination.page - 1)}
                            disabled={pagination.page === 1}
                            className="w-10 h-10 flex items-center justify-center rounded-xl bg-surface-container-lowest border border-outline-variant/30 text-on-surface disabled:opacity-40 disabled:cursor-not-allowed hover:bg-surface-container transition-all active:scale-95"
                        >
                            <ArrowLeft size={16} />
                        </button>
                        <span className="text-xs text-on-surface-variant font-extrabold uppercase tracking-wider">
                            Page {pagination.page} of {pagination.total_pages}
                        </span>
                        <button
                            onClick={() => handlePageChange(pagination.page + 1)}
                            disabled={pagination.page === pagination.total_pages}
                            className="w-10 h-10 flex items-center justify-center rounded-xl bg-surface-container-lowest border border-outline-variant/30 text-on-surface disabled:opacity-40 disabled:cursor-not-allowed hover:bg-surface-container transition-all active:scale-95"
                        >
                            <ArrowRight size={16} />
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
