'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { groupTransactions } from '@/lib/wallet/groupTransactions';

function TransactionsContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(parseInt(searchParams.get('page') || '1'));
    const [hasMore, setHasMore] = useState(true);

    const fetchTransactions = useCallback(async (pageNum) => {
        setLoading(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;

            const res = await fetch(`/api/wallet/transactions?page=${pageNum}&limit=50`, {
                headers: { Authorization: `Bearer ${session.access_token}` }
            });

            if (!res.ok) throw new Error('Failed to fetch');
            const data = await res.json();

            if (pageNum === 1) {
                setTransactions(data.transactions || []);
            } else {
                setTransactions(prev => [...prev, ...(data.transactions || [])]);
            }

            setHasMore((data.transactions || []).length === 50);
        } catch (err) {
            console.error('Fetch transactions error:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchTransactions(1);
    }, [fetchTransactions]);

    const loadMore = () => {
        const nextPage = page + 1;
        setPage(nextPage);
        fetchTransactions(nextPage);
    };

    const groupedTransactions = groupTransactions(transactions);

    return (
        <div className="relative pb-20">
            {/* Background embellishments */}
            <div className="fixed top-[-10%] left-[-5%] w-[40%] h-[40%] bg-[#D4AF37]/10 rounded-full blur-[120px] pointer-events-none -z-10"></div>

            <div className="flex flex-col mb-8 mt-6">
                <Link
                    href="/merchant/wallet"
                    className="inline-flex items-center gap-2 text-slate-500 hover:text-[#D4AF37] mb-6 transition-colors w-fit font-bold text-sm uppercase tracking-wider"
                >
                    <span className="material-icons-round text-lg text-[#D4AF37]">arrow_back</span>
                    <span>Back to Wallet</span>
                </Link>

                <div className="flex flex-col">
                    <div className="inline-flex items-center w-fit gap-2 px-4 py-2 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400 text-[10px] font-bold uppercase tracking-widest mb-4">
                        <span className="material-icons-round text-sm">history</span>
                        <span>Full Statement</span>
                    </div>
                    <h1 className="font-display text-4xl font-bold text-slate-800 dark:text-slate-100">
                        Transaction History
                    </h1>
                    <p className="text-slate-500 font-medium mt-2">View all your credits, debits, and settlements in one place.</p>
                </div>
            </div>

            <div className="flex flex-col gap-4">
                {groupedTransactions.map((tx, index) => (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: Math.min(index * 0.05, 0.5) }}
                        key={tx.id}
                        onClick={() => router.push(`/merchant/wallet/transactions/${tx.id}?source=${tx.source}`)}
                        className="bg-white/60 dark:bg-[#1a1c23]/80 backdrop-blur-md p-5 flex items-center border border-black/5 dark:border-white/5 rounded-[2rem] active:scale-[0.99] transition-all cursor-pointer shadow-sm group hover:border-[#D4AF37]/30"
                    >
                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 border ${tx.transaction_type === 'SETTLEMENT' ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-500' : tx.transaction_type === 'CREDIT' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' : 'bg-red-500/10 border-red-500/20 text-red-500'}`}>
                            <span className="material-icons-round text-2xl">{tx.transaction_type === 'SETTLEMENT' ? 'account_balance' : tx.transaction_type === 'CREDIT' ? 'south_west' : 'north_east'}</span>
                        </div>

                        <div className="ml-5 flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                                <h4 className="text-[15px] font-black text-slate-800 dark:text-slate-100 truncate pr-4">
                                    {tx.transaction_type === 'SETTLEMENT' ? 'Payout Settled to Bank' : (tx.description || tx.reference_type || 'Wallet Activity')}
                                </h4>
                                <div className={`text-lg font-sans font-black tracking-tight ${tx.transaction_type === 'SETTLEMENT' ? 'text-slate-600 dark:text-slate-400' : tx.transaction_type === 'CREDIT' ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-900 dark:text-white'}`}>
                                    {tx.transaction_type === 'SETTLEMENT' ? '' : tx.transaction_type === 'CREDIT' ? '+' : '-'}₹{Number(tx.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest bg-slate-100 dark:bg-white/5 px-2 py-0.5 rounded-md">
                                    {tx.source}
                                </span>
                                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                                    {new Date(tx.created_at).toLocaleDateString('en-IN', {
                                        day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
                                    })}
                                </span>
                            </div>
                        </div>
                    </motion.div>
                ))}

                {loading && page === 1 && (
                    <div className="flex flex-col gap-4">
                        {[...Array(5)].map((_, i) => (
                            <div key={i} className="h-24 bg-white/40 dark:bg-white/5 animate-pulse rounded-[2rem] border border-black/5" />
                        ))}
                    </div>
                )}

                {!loading && transactions.length === 0 && (
                    <div className="bg-white/40 dark:bg-white/5 backdrop-blur-md border border-black/5 dark:border-white/5 rounded-[3rem] p-20 flex flex-col items-center text-center">
                        <div className="w-24 h-24 bg-black/5 dark:bg-white/5 rounded-[2.5rem] flex items-center justify-center mb-6">
                            <span className="material-icons-round text-slate-300 dark:text-slate-600 text-5xl">receipt_long</span>
                        </div>
                        <h3 className="text-xl font-black text-slate-800 dark:text-white mb-2">No Transactions Yet</h3>
                        <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Your financial activity will appear here</p>
                    </div>
                )}

                {hasMore && (
                    <button
                        onClick={loadMore}
                        disabled={loading}
                        className="mt-6 w-full py-5 bg-white/40 dark:bg-white/5 border border-black/5 dark:border-white/10 rounded-2xl text-slate-600 dark:text-slate-400 font-black uppercase text-xs tracking-widest hover:bg-white/60 dark:hover:bg-white/10 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        {loading && <span className="material-icons-round animate-spin text-sm">autorenew</span>}
                        {loading ? 'Processing...' : 'Load Older Transactions'}
                    </button>
                )}
            </div>
        </div>
    );
}

export default function TransactionsPage() {
    return (
        <Suspense fallback={
            <div className="p-20 text-center">
                <span className="material-icons-round animate-spin text-[#D4AF37] text-4xl">autorenew</span>
            </div>
        }>
            <TransactionsContent />
        </Suspense>
    );
}
