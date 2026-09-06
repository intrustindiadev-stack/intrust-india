'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { 
    ChevronLeft, History, TrendingUp, ArrowUpRight, 
    Filter, Search, Download, Calendar, Coins
} from 'lucide-react';
import { useAuth } from '@/lib/contexts/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import CustomerBreadcrumbs from '@/components/common/CustomerBreadcrumbs';

export default function RewardsHistoryPage() {
    const { user } = useAuth();
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [history, setHistory] = useState([]);
    const [filter, setFilter] = useState('all'); // all, credit, debit
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        if (!user && !loading) {
            router.push('/login');
        }
    }, [user, loading, router]);

    useEffect(() => {
        if (!user) return;

        const fetchHistory = async () => {
            try {
                let query = supabase
                    .from('reward_transactions')
                    .select('*')
                    .eq('user_id', user.id)
                    .order('created_at', { ascending: false });

                const { data, error } = await query;
                if (error) throw error;
                setHistory(data || []);
            } catch (err) {
                console.error('Error fetching history:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchHistory();
    }, [user]);

    const filteredHistory = history.filter(tx => {
        const matchesFilter = filter === 'all' || (filter === 'credit' ? tx.amount > 0 : tx.amount < 0);
        const matchesSearch = (tx.description || '').toLowerCase().includes(searchTerm.toLowerCase());
        return matchesFilter && matchesSearch;
    });

    if (loading) {
        return (
            <div className="min-h-[70vh] flex flex-col items-center justify-center gap-3">
                <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
                <p className="text-xs font-bold text-on-surface-variant animate-pulse">Loading Rewards Timeline...</p>
            </div>
        );
    }

    return (
        <div className="w-full pb-24 overflow-x-hidden">
            <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
                <CustomerBreadcrumbs items={[
                    { label: 'Rewards & Coins', href: '/rewards' },
                    { label: 'Timeline & History' }
                ]} />

                {/* Header */}
                <div className="flex items-center justify-between px-1">
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-black text-on-surface tracking-tight">Rewards Timeline</h1>
                        <p className="text-xs sm:text-sm text-on-surface-variant font-medium mt-0.5">Your complete earning &amp; redemption history</p>
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-600 border border-blue-500/20 flex items-center justify-center shadow-xs shrink-0">
                        <History size={22} />
                    </div>
                </div>

                {/* Filters & Search */}
                <div className="space-y-3">
                    <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                        {['all', 'credit', 'debit'].map((f) => {
                            const isSelected = filter === f;
                            return (
                                <button
                                    key={f}
                                    onClick={() => setFilter(f)}
                                    className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all active:scale-95 ${
                                        isSelected
                                            ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25'
                                            : 'bg-surface-container-lowest text-on-surface-variant border border-outline-variant/30 hover:border-blue-500/30'
                                    }`}
                                >
                                    {f === 'all' ? 'All Activities' : f === 'credit' ? 'Earned (+) Coins' : 'Redeemed (-) Coins'}
                                </button>
                            );
                        })}
                    </div>

                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant" size={16} />
                        <input
                            type="text"
                            placeholder="Search transactions..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-surface-container-lowest border border-outline-variant/30 rounded-2xl py-3.5 pl-11 pr-4 text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all text-on-surface placeholder:text-on-surface-variant/50"
                        />
                    </div>
                </div>

                {/* History List */}
                <div className="bg-surface-container-lowest rounded-3xl border border-outline-variant/30 shadow-xs overflow-hidden">
                    {filteredHistory.length > 0 ? (
                        <div className="divide-y divide-outline-variant/15">
                            {filteredHistory.map((tx, idx) => (
                                <motion.div
                                    key={tx.id}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: idx * 0.02 }}
                                    className="flex items-center justify-between p-4 sm:p-5 hover:bg-surface-container-low/40 transition-colors"
                                >
                                    <div className="flex items-center gap-3.5 min-w-0">
                                        <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
                                            tx.amount > 0 
                                                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' 
                                                : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                                        }`}>
                                            {tx.amount > 0 ? <ArrowUpRight size={18} /> : <ArrowUpRight size={18} className="rotate-90" />}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="font-extrabold text-sm text-on-surface truncate">{tx.description}</p>
                                            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                                <div className="flex items-center gap-1 text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">
                                                    <Calendar size={11} />
                                                    {new Date(tx.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                </div>
                                                <div className="w-1 h-1 rounded-full bg-outline-variant" />
                                                <span className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                                                    #{tx.id.toString().slice(-6)}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-right shrink-0 pl-3">
                                        <div className="flex items-center gap-1 justify-end">
                                            <p className={`font-black text-sm sm:text-base tabular-nums ${tx.amount > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                                                {tx.amount > 0 ? '+' : ''}{tx.amount}
                                            </p>
                                            <Coins size={13} className={tx.amount > 0 ? 'text-amber-500' : 'text-rose-500'} />
                                        </div>
                                        <p className="text-[9px] font-bold text-on-surface-variant uppercase tracking-widest mt-0.5">
                                            Balance: {tx.new_balance || '—'}
                                        </p>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    ) : (
                        <div className="py-16 text-center px-6">
                            <div className="w-14 h-14 bg-surface-container-low rounded-2xl flex items-center justify-center mx-auto mb-3 text-on-surface-variant">
                                <History size={26} />
                            </div>
                            <h3 className="font-extrabold text-on-surface text-base mb-1">No Activity Found</h3>
                            <p className="text-xs text-on-surface-variant max-w-xs mx-auto">
                                No reward points records matching your current filter criteria.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
