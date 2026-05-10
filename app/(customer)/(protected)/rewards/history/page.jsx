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
import Navbar from '@/components/layout/Navbar';
import CustomerBottomNav from '@/components/layout/customer/CustomerBottomNav';
import Breadcrumbs from '@/components/giftcards/Breadcrumbs';

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
        const matchesSearch = tx.description.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesFilter && matchesSearch;
    });

    if (loading) {
        return (
            <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#121212] flex items-center justify-center">
                <div className="w-12 h-12 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#121212] font-[family-name:var(--font-outfit)] pb-24 overflow-x-hidden">
            <Navbar />

            <div className="max-w-2xl mx-auto px-4 sm:px-6 pt-[12vh]">
                <Breadcrumbs items={[
                    { label: 'Rewards', href: '/rewards' },
                    { label: 'Timeline' }
                ]} />

                {/* Header */}
                <div className="flex items-center justify-between mb-8 px-1">
                    <div>
                        <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter">Rewards Timeline</h1>
                        <p className="text-sm text-slate-500 dark:text-gray-400 font-medium">Your complete earning & redemption history</p>
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-white dark:bg-white/5 border border-gray-100 dark:border-white/10 flex items-center justify-center shadow-sm">
                        <History className="text-emerald-500" size={24} />
                    </div>
                </div>

                {/* Filters & Search */}
                <div className="space-y-4 mb-8">
                    <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
                        {['all', 'credit', 'debit'].map((f) => (
                            <button
                                key={f}
                                onClick={() => setFilter(f)}
                                className={`px-5 py-2 rounded-full text-xs font-black uppercase tracking-widest transition-all
                                    ${filter === f 
                                        ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' 
                                        : 'bg-white dark:bg-white/5 text-slate-400 border border-gray-100 dark:border-white/10 hover:bg-emerald-50 dark:hover:bg-emerald-500/10'
                                    }`}
                            >
                                {f}
                            </button>
                        ))}
                    </div>

                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="text"
                            placeholder="Search transactions..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-white dark:bg-white/5 border border-gray-100 dark:border-white/10 rounded-2xl py-4 pl-12 pr-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all"
                        />
                    </div>
                </div>

                {/* History List */}
                <div className="bg-white dark:bg-white/5 rounded-[2.5rem] border border-gray-100 dark:border-white/10 shadow-sm overflow-hidden backdrop-blur-xl">
                    {filteredHistory.length > 0 ? (
                        <div className="divide-y divide-gray-50 dark:divide-white/5">
                            {filteredHistory.map((tx, idx) => (
                                <motion.div
                                    key={tx.id}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: idx * 0.03 }}
                                    className="flex items-center justify-between p-6 hover:bg-gray-50/50 dark:hover:bg-white/10 transition-colors group"
                                >
                                    <div className="flex items-center gap-5">
                                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all group-hover:scale-110 ${
                                            tx.amount > 0 
                                                ? 'bg-emerald-500/10 text-emerald-600' 
                                                : 'bg-rose-500/10 text-rose-600'
                                        }`}>
                                            {tx.amount > 0 ? <ArrowUpRight size={22} /> : <ArrowUpRight size={22} className="rotate-90" />}
                                        </div>
                                        <div>
                                            <p className="font-black text-slate-900 dark:text-white tracking-tight leading-tight mb-1">{tx.description}</p>
                                            <div className="flex items-center gap-3">
                                                <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                                    <Calendar size={10} />
                                                    {new Date(tx.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                </div>
                                                <div className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-700" />
                                                <div className="text-[10px] font-black text-emerald-600/60 uppercase tracking-widest">
                                                    ID: #{tx.id.toString().slice(-6)}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="flex items-center gap-1 justify-end">
                                            <p className={`font-black text-xl tracking-tight ${tx.amount > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                                {tx.amount > 0 ? '+' : ''}{tx.amount}
                                            </p>
                                            <Coins size={14} className={tx.amount > 0 ? 'text-emerald-600' : 'text-rose-600'} />
                                        </div>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Balance: {tx.new_balance || '—'}</p>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    ) : (
                        <div className="py-24 text-center px-10">
                            <div className="w-24 h-24 bg-gray-50 dark:bg-black/40 rounded-[2.5rem] flex items-center justify-center mx-auto mb-8 border border-gray-100 dark:border-white/10 shadow-inner">
                                <History size={40} className="text-gray-300 dark:text-gray-700" />
                            </div>
                            <h3 className="font-black text-slate-900 dark:text-white text-xl mb-2 tracking-tight">Empty Timeline</h3>
                            <p className="text-sm font-medium text-slate-400 max-w-[240px] mx-auto leading-relaxed">
                                No transactions found matching your criteria. Start earning rewards today!
                            </p>
                        </div>
                    )}
                </div>

                {/* Export Button */}
                <button className="w-full mt-8 py-5 bg-white dark:bg-white/5 border border-gray-100 dark:border-white/10 rounded-3xl flex items-center justify-center gap-3 text-sm font-black text-slate-500 hover:text-emerald-600 transition-all shadow-sm">
                    <Download size={18} />
                    DOWNLOAD REPORT (PDF)
                </button>
            </div>

            <CustomerBottomNav />
        </div>
    );
}
