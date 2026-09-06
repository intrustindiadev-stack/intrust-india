'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/contexts/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import { Clock, CheckCircle, Search, Filter, TrendingUp, TrendingDown, Wallet, Gift, ArrowDownLeft, ArrowUpRight, ArrowLeft, ShoppingBag, Receipt, Smartphone, Crown, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import Link from 'next/link';
import CustomerBreadcrumbs from '@/components/common/CustomerBreadcrumbs';

function TransactionsSkeleton() {
    return (
        <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6 animate-pulse">
            <div className="h-8 w-48 bg-surface-container-high rounded-xl" />
            <div className="h-64 bg-surface-container-high rounded-3xl" />
            <div className="flex gap-3">
                <div className="h-11 w-full sm:w-64 bg-surface-container-high rounded-2xl" />
                <div className="h-11 w-48 bg-surface-container-high rounded-2xl hidden sm:block" />
            </div>
            <div className="space-y-3">
                {[1, 2, 3, 4, 5].map(i => (
                    <div key={i} className="h-20 bg-surface-container-high rounded-2xl" />
                ))}
            </div>
        </div>
    );
}

export default function TransactionsPage() {
    const { user, loading: authLoading } = useAuth();
    const [loading, setLoading] = useState(true);
    const [transactions, setTransactions] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [filter, setFilter] = useState('ALL'); // ALL, PURCHASES, CASHBACK, WALLET, UDHARI, ADMIN
    const [chartData, setChartData] = useState([]);

    const processTransactions = (coupons, walletTxs) => {
        const normalizedCoupons = (coupons || []).map(c => ({
            id: `coupon-${c.id}`,
            rawDate: new Date(c.purchased_at).getTime(),
            brand: 'Gift Card',
            description: c.title || c.brand || 'Gift Card Purchase',
            amount: (c.selling_price_paise || 0) / 100,
            status: 'success',
            type: 'SPENT',
            category: 'GIFT_CARD',
            logo: <Gift size={20} />
        }));

        const normalizedWallet = (walletTxs || [])
            .filter(w => w.reference_type !== 'GIFT_CARD_PURCHASE')
            .map(w => {
                const descLower = (w.description || '').toLowerCase();
                const refType = (w.reference_type || '').toUpperCase();
                const txType = (w.type || '').toUpperCase();

                const isAdminAdjustment = refType === 'ADMIN_ADJUSTMENT' || txType === 'ADMIN_ADJUSTMENT' || descLower.includes('admin adjustment');
                const isUdhari = refType === 'UDHARI_PAYMENT' || refType === 'STORE_CREDIT_PAYMENT' || descLower.includes('udhari') || descLower.includes('store credit');
                const isNfc = refType === 'NFC_ORDER' || descLower.includes('nfc');
                const isGold = refType === 'GOLD_SUBSCRIPTION' || descLower.includes('gold subscription');
                const isOrder = refType === 'SHOPPING_ORDER' || refType === 'ORDER' || refType === 'SHOPPING_PURCHASE' || descLower.includes('shopping purchase') || descLower.includes('order group') || descLower.startsWith('shopping:');
                const isTopup = txType === 'TOPUP' || refType === 'TOPUP' || descLower.includes('wallet topup') || descLower.includes('wallet added');
                const isCashback = txType === 'CASHBACK' || descLower.includes('cashback');
                const isReward = txType === 'REWARD' || refType === 'REWARD_CONVERSION' || descLower.includes('reward');
                const isGiftCard = refType === 'GIFT_CARD_PURCHASE' || descLower.includes('gift card');

                let isSpent = txType === 'DEBIT';
                let logo = <Wallet size={20} />;
                let brand = 'Wallet Transaction';
                let category = 'WALLET';
                let type = isSpent ? 'SPENT' : 'TOPUP';

                if (isAdminAdjustment) {
                    brand = 'Admin Adjustment';
                    logo = <Wallet size={20} />;
                    category = 'ADMIN';
                    type = isSpent ? 'SPENT' : 'TOPUP';
                } else if (isOrder) {
                    brand = 'Order Payment';
                    logo = <ShoppingBag size={20} />;
                    category = 'PURCHASES';
                    isSpent = true;
                    type = 'SPENT';
                } else if (isNfc) {
                    brand = 'NFC Order';
                    logo = <Smartphone size={20} />;
                    category = 'PURCHASES';
                    isSpent = true;
                    type = 'SPENT';
                } else if (isUdhari) {
                    brand = 'Store Credit Settled';
                    logo = <Receipt size={20} />;
                    category = 'UDHARI';
                    isSpent = true;
                    type = 'SPENT';
                } else if (isGold) {
                    brand = 'Gold Subscription';
                    logo = <Crown size={20} />;
                    category = 'WALLET';
                    isSpent = true;
                    type = 'SPENT';
                } else if (isTopup) {
                    brand = 'Wallet Added';
                    logo = <Wallet size={20} />;
                    category = 'WALLET';
                    type = 'TOPUP';
                } else if (isCashback) {
                    brand = 'Cashback Earned';
                    logo = <TrendingUp size={20} />;
                    category = 'CASHBACK';
                    type = 'CASHBACK';
                } else if (isReward) {
                    brand = 'Reward Converted';
                    logo = <TrendingUp size={20} />;
                    category = 'CASHBACK';
                    type = 'CASHBACK';
                } else if (isGiftCard) {
                    brand = 'Gift Card Paid';
                    logo = <Gift size={20} />;
                    category = 'GIFT_CARD';
                    isSpent = true;
                    type = 'SPENT';
                } else if (isSpent) {
                    // Fallback for any other debit
                    brand = 'Order Payment';
                    logo = <ShoppingBag size={20} />;
                    category = 'PURCHASES';
                    type = 'SPENT';
                } else {
                    brand = 'Wallet Added';
                    logo = <Wallet size={20} />;
                    category = 'WALLET';
                    type = 'TOPUP';
                }

                return {
                    id: `wallet-${w.id}`,
                    rawDate: new Date(w.created_at).getTime(),
                    brand,
                    description: w.description || brand,
                    amount: (w.amount_paise || 0) / 100,
                    status: 'success',
                    type,
                    category,
                    logo
                };
            });

        const combined = [...normalizedCoupons, ...normalizedWallet]
            .sort((a, b) => b.rawDate - a.rawDate)
            .map(item => ({
                ...item,
                displayDate: new Date(item.rawDate).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })
            }));

        setTransactions(combined);

        // Group by Date for Chart (Last 7 Active Days or Recent transactions)
        const dateGroups = {};
        combined.slice(0, 30).reverse().forEach(t => {
            const dateStr = new Date(t.rawDate).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
            if (!dateGroups[dateStr]) {
                dateGroups[dateStr] = { name: dateStr, spent: 0, cashback: 0 };
            }
            if (t.type === 'SPENT') {
                dateGroups[dateStr].spent += t.amount;
            } else if (t.type === 'CASHBACK') {
                dateGroups[dateStr].cashback += t.amount;
            }
        });

        setChartData(Object.values(dateGroups));
    };

    const fetchTransactions = async () => {
        if (!user) return;
        setLoading(true);
        try {
            const [ordersRes, walletTxsRes] = await Promise.allSettled([
                supabase.from('orders').select(`
                    id, amount, created_at,
                    coupons:coupons!orders_giftcard_id_fkey (
                        id, brand, title, face_value_paise, selling_price_paise, status, purchased_at, valid_until
                    )
                `).eq('user_id', user.id).eq('payment_status', 'paid').order('created_at', { ascending: false }),
                supabase.from('customer_wallet_transactions').select('*').eq('user_id', user.id).order('created_at', { ascending: false })
            ]);

            let coupons = [];
            if (ordersRes.status === 'fulfilled' && ordersRes.value.data) {
                coupons = ordersRes.value.data
                    .filter(o => o.coupons)
                    .map(o => ({
                        ...o.coupons,
                        purchased_at: o.coupons.purchased_at || o.created_at
                    }));
            }

            let walletTxs = [];
            if (walletTxsRes.status === 'fulfilled' && walletTxsRes.value.data) {
                walletTxs = walletTxsRes.value.data;
            }

            processTransactions(coupons, walletTxs);
        } catch (err) {
            console.error('Error fetching transactions:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!authLoading && user) {
            fetchTransactions();
        } else if (!authLoading && !user) {
            setLoading(false);
        }
    }, [user, authLoading]);

    if (loading || authLoading) {
        return <TransactionsSkeleton />;
    }

    const filteredTransactions = transactions.filter(t => {
        const matchesQuery = t.brand.toLowerCase().includes(searchQuery.toLowerCase()) ||
            t.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
            t.amount.toString().includes(searchQuery);

        if (!matchesQuery) return false;

        if (filter === 'ALL') return true;
        if (filter === 'PURCHASES') return t.type === 'SPENT';
        if (filter === 'CASHBACK') return t.type === 'CASHBACK';
        if (filter === 'WALLET') return t.category === 'WALLET';
        if (filter === 'UDHARI') return t.category === 'UDHARI';
        if (filter === 'ADMIN') return t.category === 'ADMIN';

        return true;
    });

    const totalSpent = transactions.filter(t => t.type === 'SPENT').reduce((acc, t) => acc + t.amount, 0);
    const totalCashback = transactions.filter(t => t.type === 'CASHBACK').reduce((acc, t) => acc + t.amount, 0);

    return (
        <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
            <CustomerBreadcrumbs 
                items={[
                    { label: 'InTrust Wallet', href: '/wallet' }, 
                    { label: 'Passbook & Activity' }
                ]} 
                className="mb-2"
            />

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <Link href="/wallet" className="text-on-surface-variant hover:text-on-surface transition-colors p-1">
                            <ArrowLeft size={18} />
                        </Link>
                        <h1 className="text-2xl sm:text-3xl font-extrabold text-on-surface tracking-tight">Passbook & Activity</h1>
                    </div>
                    <p className="text-xs sm:text-sm text-on-surface-variant">
                        Track your shopping purchases, wallet recharges, and cashback history.
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <div className="bg-surface-container-lowest px-4 py-2.5 rounded-2xl border border-outline-variant/30 text-right">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">Total Spent</p>
                        <p className="text-base font-extrabold text-on-surface tabular-nums">₹{totalSpent.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p>
                    </div>
                    <div className="bg-surface-container-lowest px-4 py-2.5 rounded-2xl border border-outline-variant/30 text-right">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Cashback</p>
                        <p className="text-base font-extrabold text-emerald-600 dark:text-emerald-400 tabular-nums">₹{totalCashback.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p>
                    </div>
                </div>
            </div>

            {/* Spending Chart Overview */}
            {chartData.length > 0 && (
                <motion.div
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-surface-container-lowest rounded-3xl p-6 sm:p-7 shadow-sm border border-outline-variant/30 relative overflow-hidden"
                >
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <TrendingUp className="text-primary" size={20} />
                            <h2 className="text-base font-extrabold text-on-surface">Activity Trends</h2>
                        </div>
                        <span className="text-xs text-on-surface-variant font-medium">Last {chartData.length} active periods</span>
                    </div>

                    <div className="h-60 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorSpent" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#0d56cf" stopOpacity={0.25} />
                                        <stop offset="95%" stopColor="#0d56cf" stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="colorCashback" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                    </linearGradient>
                                </defs>

                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(150,150,150,0.15)" />

                                <XAxis
                                    dataKey="name"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fontSize: 11, fill: 'currentColor', opacity: 0.6 }}
                                    dy={10}
                                />
                                <YAxis
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fontSize: 11, fill: 'currentColor', opacity: 0.6 }}
                                    tickFormatter={(val) => `₹${val}`}
                                />

                                <Tooltip
                                    contentStyle={{
                                        borderRadius: '16px',
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        backgroundColor: 'rgba(15, 23, 42, 0.95)',
                                        color: '#fff',
                                        fontSize: '12px',
                                        padding: '12px'
                                    }}
                                />

                                <Area type="monotone" dataKey="spent" name="Spent" stroke="#0d56cf" strokeWidth={2.5} fillOpacity={1} fill="url(#colorSpent)" activeDot={{ r: 5, fill: '#0d56cf' }} />
                                <Area type="monotone" dataKey="cashback" name="Cashback" stroke="#10b981" strokeWidth={2.5} fillOpacity={1} fill="url(#colorCashback)" activeDot={{ r: 5, fill: '#10b981' }} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </motion.div>
            )}

            {/* Filters & Search */}
            <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant" size={18} />
                    <input
                        type="text"
                        placeholder="Search by store, description, or amount..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-surface-container-lowest border border-outline-variant/30 rounded-2xl py-3 pl-10 pr-4 text-sm text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 shadow-sm"
                    />
                </div>

                <div className="flex overflow-x-auto no-scrollbar gap-1.5 bg-surface-container-low p-1 rounded-2xl border border-outline-variant/20">
                    {['ALL', 'PURCHASES', 'CASHBACK', 'WALLET', 'UDHARI', 'ADMIN'].map(f => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={`whitespace-nowrap px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                                filter === f
                                    ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/25'
                                    : 'text-on-surface-variant hover:text-blue-600 dark:hover:text-blue-400'
                            }`}
                        >
                            {f === 'ALL' ? 'All' : f === 'PURCHASES' ? 'Purchases' : f === 'CASHBACK' ? 'Cashback' : f === 'WALLET' ? 'Wallet' : f === 'UDHARI' ? 'Credit' : 'Admin'}
                        </button>
                    ))}
                </div>
            </div>

            {/* Transactions List */}
            <div className="space-y-3">
                <AnimatePresence>
                    {filteredTransactions.length === 0 ? (
                        <div className="text-center py-16 bg-surface-container-lowest rounded-3xl border border-dashed border-outline-variant/40">
                            <div className="w-12 h-12 bg-surface-container-low rounded-2xl flex items-center justify-center mx-auto mb-3 text-on-surface-variant">
                                <Filter size={20} />
                            </div>
                            <p className="text-sm font-bold text-on-surface">No transactions found</p>
                            <p className="text-xs text-on-surface-variant mt-1">Try adjusting your filters or search keywords.</p>
                        </div>
                    ) : (
                        filteredTransactions.map((tx, idx) => {
                            const isPositive = tx.type === 'CASHBACK' || tx.type === 'TOPUP';

                            return (
                                <motion.div
                                    key={tx.id}
                                    initial={{ opacity: 0, y: 8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: Math.min(idx * 0.03, 0.3) }}
                                >
                                    <Link
                                        href={`/transactions/${tx.id}`}
                                        className="group p-4 sm:p-5 rounded-2xl bg-surface-container-lowest border border-outline-variant/25 hover:border-blue-500/40 hover:shadow-md transition-all flex items-center justify-between gap-4 shadow-sm active:scale-[0.99] cursor-pointer block"
                                    >
                                        <div className="flex items-center gap-3.5 min-w-0">
                                            <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-105 ${
                                                isPositive
                                                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                                                    : 'bg-blue-600/10 text-blue-600 dark:text-blue-400'
                                            }`}>
                                                {tx.logo}
                                            </div>
                                            <div className="min-w-0">
                                                <p className="font-extrabold text-sm text-on-surface group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors truncate">
                                                    {tx.brand}
                                                </p>
                                                <p className="text-xs text-on-surface-variant truncate max-w-xs sm:max-w-md">
                                                    {tx.description}
                                                </p>
                                                <p className="text-[11px] text-on-surface-variant/70 mt-0.5 sm:hidden">
                                                    {tx.displayDate}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-3 sm:gap-6 shrink-0 text-right">
                                            <div className="hidden sm:block">
                                                <p className="text-xs font-semibold text-on-surface-variant">{tx.displayDate}</p>
                                                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                                                    {tx.status}
                                                </span>
                                            </div>

                                            <p className={`text-base sm:text-lg font-black tabular-nums ${
                                                isPositive
                                                    ? 'text-emerald-600 dark:text-emerald-400'
                                                    : 'text-on-surface'
                                            }`}>
                                                {isPositive ? '+' : '-'}₹{tx.amount.toFixed(2)}
                                            </p>

                                            <ChevronRight size={16} className="text-on-surface-variant/30 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all" />
                                        </div>
                                    </Link>
                                </motion.div>
                            );
                        })
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
