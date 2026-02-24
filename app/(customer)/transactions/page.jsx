'use client';

import { useState, useEffect } from 'react';
import Navbar from '@/components/layout/Navbar';
import CustomerBottomNav from '@/components/layout/customer/CustomerBottomNav';
import { useAuth } from '@/lib/contexts/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import { Clock, CheckCircle, Search, Filter, TrendingUp, TrendingDown, Wallet, Gift, ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';

function TransactionsSkeleton() {
    return (
        <div className="min-h-screen bg-[#F8FAFC] dark:bg-gray-900 font-[family-name:var(--font-outfit)]">
            <Navbar />
            <div className="pt-[12vh] sm:pt-[15vh] pb-24 px-4 sm:px-6">
                <div className="max-w-5xl mx-auto animate-pulse">
                    <div className="h-10 w-48 bg-gray-200 dark:bg-gray-800 rounded mb-8" />

                    {/* Chart Skeleton */}
                    <div className="h-64 bg-gray-200 dark:bg-gray-800 rounded-3xl mb-8" />

                    {/* Filters Skeleton */}
                    <div className="flex gap-4 mb-6">
                        <div className="h-12 w-full sm:w-64 bg-gray-200 dark:bg-gray-800 rounded-2xl" />
                        <div className="h-12 w-32 bg-gray-200 dark:bg-gray-800 rounded-2xl hidden sm:block" />
                    </div>

                    {/* List Skeleton */}
                    <div className="space-y-4">
                        {[1, 2, 3, 4, 5].map(i => (
                            <div key={i} className="h-24 bg-gray-200 dark:bg-gray-800 rounded-2xl" />
                        ))}
                    </div>
                </div>
            </div>
            <CustomerBottomNav />
        </div>
    );
}

export default function TransactionsPage() {
    const { user, loading: authLoading } = useAuth();
    const [loading, setLoading] = useState(true);
    const [transactions, setTransactions] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [filter, setFilter] = useState('ALL'); // ALL, IN, OUT
    const [chartData, setChartData] = useState([]);

    const processTransactions = (coupons, walletTxs) => {
        const normalizedCoupons = (coupons || []).map(c => ({
            id: `coupon-${c.id}`,
            rawDate: new Date(c.purchased_at).getTime(),
            brand: 'Gift Card',
            description: c.title || c.brand || 'Gift Card Purchase',
            amount: (c.selling_price_paise || 0) / 100,
            status: 'success',
            type: 'SPENT', // Changed from OUT
            category: 'GIFT_CARD',
            logo: <Gift size={20} />
        }));

        const normalizedWallet = (walletTxs || []).map(w => {
            let logo = <Wallet size={20} />;
            let isSpent = false;
            let isCashback = false;

            if (w.type === 'TOPUP') logo = <Wallet size={20} />;
            if (w.type === 'CASHBACK') {
                logo = <TrendingUp size={20} />;
                isCashback = true;
            }
            if (w.type === 'DEBIT') {
                logo = <Gift size={20} />; // Treat wallet debits mostly as purchases
                isSpent = true;
            }

            return {
                id: `wallet-${w.id}`,
                rawDate: new Date(w.created_at).getTime(),
                brand: w.type === 'TOPUP' ? 'Wallet Added' : (w.type === 'CASHBACK' ? 'Cashback Earned' : 'Gift Card Paid'),
                description: w.description || w.type,
                amount: (w.amount_paise || 0) / 100,
                status: 'success',
                type: isCashback ? 'CASHBACK' : (isSpent ? 'SPENT' : 'TOPUP'),
                category: 'WALLET',
                logo
            };
        });

        // Filter out duplicate 'DEBIT' entries from wallet if we already have the 'GIFT_CARD' entry 
        // to avoid double counting "Spent" on the chart. 
        // A simple heuristic: if a wallet DEBIT and a COUPON have the exact same amount and within a few minutes, we keep only the COUPON.
        // For now, simpler approach: Just count Coupons as SPENT, and Cashback as EARNED for the chart. We still show everything in the list.

        const combined = [...normalizedCoupons, ...normalizedWallet]
            .sort((a, b) => b.rawDate - a.rawDate)
            .map(item => {
                const dateObj = new Date(item.rawDate);
                const timeStr = dateObj.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
                const dateStr = dateObj.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

                return {
                    ...item,
                    displayDate: `${dateStr} at ${timeStr}`,
                    shortDate: dateObj.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
                };
            });

        setTransactions(combined);

        // Prepare Chart Data (Group by shortDate)
        const chronoData = [...combined].reverse();
        const grouped = {};

        chronoData.forEach(tx => {
            if (!grouped[tx.shortDate]) {
                grouped[tx.shortDate] = { name: tx.shortDate, spent: 0, cashback: 0 };
            }
            // Logic for E-commerce chart:
            // "Spent" is when they buy a gift card.
            if (tx.category === 'GIFT_CARD') {
                grouped[tx.shortDate].spent += tx.amount;
            }
            // "Cashback" is when they earn rewards.
            if (tx.type === 'CASHBACK') {
                grouped[tx.shortDate].cashback += tx.amount;
            }
        });

        const chartArray = Object.values(grouped).slice(-7);
        setChartData(chartArray);
    };

    useEffect(() => {
        const fetchTxs = async () => {
            if (!user) return;
            try {
                const [couponsRes, walletRes] = await Promise.all([
                    supabase.from('coupons')
                        .select('id, title, brand, face_value_paise, selling_price_paise, valid_until, status, purchased_at')
                        .eq('purchased_by', user.id)
                        .eq('status', 'sold')
                        .order('purchased_at', { ascending: false })
                        .limit(50),
                    supabase.from('customer_wallet_transactions')
                        .select('id, type, amount_paise, description, created_at')
                        .eq('user_id', user.id)
                        .order('created_at', { ascending: false })
                        .limit(50)
                ]);

                processTransactions(couponsRes.data || [], walletRes.data || []);
            } catch (err) {
                console.error("Failed to fetch transactions", err);
            } finally {
                setLoading(false);
            }
        };

        if (!authLoading && user) {
            fetchTxs();

            const activitySub = supabase
                .channel('transactions_page')
                .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'customer_wallet_transactions', filter: `user_id=eq.${user.id}` }, () => fetchTxs())
                .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'coupons', filter: `purchased_by=eq.${user.id}` }, () => fetchTxs())
                .subscribe();

            return () => {
                supabase.removeChannel(activitySub);
            };
        } else if (!authLoading && !user) {
            setLoading(false);
        }
    }, [user, authLoading]);

    if (authLoading || loading) return <TransactionsSkeleton />;

    const filteredTransactions = transactions.filter(tx => {
        const matchesSearch = tx.brand.toLowerCase().includes(searchQuery.toLowerCase()) ||
            tx.description.toLowerCase().includes(searchQuery.toLowerCase());

        // Filter logic adapted for E-commerce
        let matchesFilter = true;
        if (filter === 'PURCHASES') matchesFilter = tx.category === 'GIFT_CARD' || tx.type === 'SPENT';
        if (filter === 'CASHBACK') matchesFilter = tx.type === 'CASHBACK';
        if (filter === 'WALLET') matchesFilter = tx.type === 'TOPUP';

        return matchesSearch && matchesFilter;
    });

    const totalSpent = transactions.filter(t => t.category === 'GIFT_CARD').reduce((acc, t) => acc + t.amount, 0);
    const totalCashback = transactions.filter(t => t.type === 'CASHBACK').reduce((acc, t) => acc + t.amount, 0);

    return (
        <div className="min-h-screen bg-[#F8FAFC] dark:bg-gray-900 font-[family-name:var(--font-outfit)]">
            <Navbar />

            <div className="pt-[12vh] sm:pt-[15vh] pb-24 px-4 sm:px-6">
                <div className="max-w-5xl mx-auto">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mb-8"
                    >
                        <h1 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-gray-100 tracking-tight mb-2">Shopping Activity</h1>
                        <p className="text-slate-500 dark:text-gray-400 font-medium">Track your gift card purchases and rewards.</p>
                    </motion.div>

                    {/* Chart Overview */}
                    {chartData.length > 0 && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.1 }}
                            className="bg-white dark:bg-gray-800 rounded-3xl p-6 sm:p-8 mb-8 shadow-sm border border-slate-100 dark:border-white/5 relative overflow-hidden group"
                        >
                            {/* Decorative background blurs for the premium feel */}
                            <div className="absolute top-[-50px] right-[-50px] w-48 h-48 bg-blue-500/10 dark:bg-blue-500/20 rounded-full blur-[60px] pointer-events-none group-hover:scale-150 transition-transform duration-1000"></div>
                            <div className="absolute bottom-[-50px] left-[-50px] w-48 h-48 bg-emerald-500/10 dark:bg-emerald-500/20 rounded-full blur-[60px] pointer-events-none group-hover:scale-150 transition-transform duration-1000"></div>

                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4 relative z-10">
                                <div>
                                    <h2 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                                        <TrendingUp className="text-blue-500" size={24} />
                                        Spending Overview
                                    </h2>
                                    <p className="text-sm font-medium text-slate-500 dark:text-gray-400 mt-1">Purchases and rewards over your last {chartData.length} active days</p>
                                </div>
                                <div className="flex gap-4">
                                    <div className="bg-blue-50 dark:bg-blue-900/40 px-5 py-3 rounded-2xl border border-blue-100 dark:border-blue-800/50">
                                        <p className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest mb-1 flex items-center gap-1.5"><Gift size={14} /> Total Spent</p>
                                        <p className="text-xl font-black text-blue-700 dark:text-blue-300">₹{totalSpent.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p>
                                    </div>
                                    <div className="bg-emerald-50 dark:bg-emerald-900/40 px-5 py-3 rounded-2xl border border-emerald-100 dark:border-emerald-800/50">
                                        <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest mb-1 flex items-center gap-1.5"><TrendingUp size={14} /> Rewards Earned</p>
                                        <p className="text-xl font-black text-emerald-700 dark:text-emerald-300">₹{totalCashback.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="h-64 sm:h-72 w-full relative z-10">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                        <defs>
                                            <linearGradient id="colorSpent" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                            </linearGradient>
                                            <linearGradient id="colorCashback" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                                                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>

                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--tw-colors-slate-200)" opacity={0.5} />

                                        <XAxis
                                            dataKey="name"
                                            axisLine={false}
                                            tickLine={false}
                                            tick={{ fontSize: 12, fill: '#94a3b8', fontWeight: 600 }}
                                            dy={10}
                                        />
                                        <YAxis
                                            axisLine={false}
                                            tickLine={false}
                                            tick={{ fontSize: 12, fill: '#94a3b8', fontWeight: 600 }}
                                            tickFormatter={(val) => `₹${val}`}
                                        />

                                        <Tooltip
                                            cursor={{ stroke: '#94a3b8', strokeWidth: 1, strokeDasharray: '5 5' }}
                                            contentStyle={{
                                                borderRadius: '20px',
                                                border: '1px solid rgba(255,255,255,0.1)',
                                                boxShadow: '0 20px 40px -10px rgba(0,0,0,0.2)',
                                                backgroundColor: 'rgba(15, 23, 42, 0.95)',
                                                backdropFilter: 'blur(10px)',
                                                color: '#fff',
                                                padding: '16px'
                                            }}
                                            itemStyle={{ fontWeight: 800, padding: '4px 0' }}
                                            labelStyle={{ color: '#94a3b8', marginBottom: '8px', fontWeight: 700, borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '8px' }}
                                        />

                                        {/* Smooth stroke areas using basis curve */}
                                        <Area type="monotone" dataKey="spent" name="Spent" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorSpent)" activeDot={{ r: 6, strokeWidth: 0, fill: '#3b82f6' }} />
                                        <Area type="monotone" dataKey="cashback" name="Cashback" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorCashback)" activeDot={{ r: 6, strokeWidth: 0, fill: '#10b981' }} />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </motion.div>
                    )}

                    {/* Filters & Search */}
                    <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-6">
                        <div className="relative flex-1">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                            <input
                                type="text"
                                placeholder="Search your purchases and activity..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full bg-white dark:bg-gray-800 border-none rounded-2xl py-4 pl-12 pr-4 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 shadow-sm"
                            />
                        </div>
                        <div className="flex overflow-x-auto hide-scrollbar gap-2 bg-white dark:bg-gray-800 p-1.5 rounded-2xl shadow-sm">
                            {['ALL', 'PURCHASES', 'CASHBACK', 'WALLET'].map(f => (
                                <button
                                    key={f}
                                    onClick={() => setFilter(f)}
                                    className={`whitespace-nowrap px-4 sm:px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${filter === f
                                        ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-md'
                                        : 'text-slate-500 dark:text-gray-400 hover:bg-slate-50 dark:hover:bg-gray-700/50'
                                        }`}
                                >
                                    {f === 'ALL' ? 'All Activity' : f === 'PURCHASES' ? 'Purchases' : f === 'CASHBACK' ? 'Cashback' : 'Wallet'}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Transaction List */}
                    <div className="space-y-3 sm:space-y-4">
                        <AnimatePresence>
                            {filteredTransactions.length === 0 ? (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="text-center py-20 bg-white dark:bg-gray-800 rounded-3xl border border-dashed border-slate-200 dark:border-gray-700"
                                >
                                    <div className="w-16 h-16 bg-slate-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400 dark:text-gray-500">
                                        <Filter size={24} />
                                    </div>
                                    <p className="text-lg font-bold text-slate-900 dark:text-white mb-1">No transactions found</p>
                                    <p className="text-slate-500 dark:text-gray-400">Try adjusting your filters or making a new transaction.</p>
                                </motion.div>
                            ) : (
                                filteredTransactions.map((tx, idx) => (
                                    <motion.div
                                        key={tx.id}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: idx * 0.05 }}
                                        className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-2xl sm:rounded-3xl bg-white dark:bg-gray-800 hover:bg-slate-50 dark:hover:bg-gray-750 transition-colors border border-slate-100 dark:border-white/5 group shadow-sm"
                                    >
                                        <div className="flex items-center gap-4 sm:gap-5 w-full sm:w-auto">
                                            <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform duration-500 ${tx.type === 'CASHBACK' || tx.type === 'TOPUP'
                                                    ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400'
                                                    : 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
                                                }`}>
                                                {tx.logo}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="font-extrabold text-slate-900 dark:text-gray-100 text-base sm:text-lg mb-0.5 truncate">
                                                    {tx.brand}
                                                </div>
                                                <div className="text-sm font-medium text-slate-500 dark:text-gray-400 truncate w-full max-w-[200px] sm:max-w-md">
                                                    {tx.description}
                                                </div>
                                                <div className="text-xs font-bold text-slate-400 dark:text-gray-500 mt-1 sm:hidden">
                                                    {tx.displayDate}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between sm:justify-end gap-6 w-full sm:w-auto mt-2 sm:mt-0 pt-3 sm:pt-0 border-t border-slate-100 dark:border-gray-700 sm:border-t-0">
                                            <div className="hidden sm:block text-right">
                                                <div className="text-sm font-bold text-slate-500 dark:text-gray-400">{tx.displayDate}</div>
                                                <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 mt-0.5 flex items-center justify-end gap-1">
                                                    {tx.status === 'processing' ? <Clock size={10} strokeWidth={3} /> : <CheckCircle size={10} strokeWidth={3} />}
                                                    {tx.status}
                                                </div>
                                            </div>
                                            <div className={`text-xl font-black ${tx.type === 'CASHBACK' || tx.type === 'TOPUP'
                                                    ? 'text-emerald-600 dark:text-emerald-400'
                                                    : 'text-slate-900 dark:text-white'
                                                }`}>
                                                {tx.type === 'CASHBACK' || tx.type === 'TOPUP' ? '+' : '-'}₹{tx.amount.toFixed(2)}
                                            </div>
                                        </div>
                                    </motion.div>
                                ))
                            )}
                        </AnimatePresence>
                    </div>

                </div>
            </div>
            <CustomerBottomNav />
        </div>
    );
}
