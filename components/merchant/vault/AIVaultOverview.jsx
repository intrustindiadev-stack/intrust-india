'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { 
    Wallet, 
    TrendingUp, 
    Coins, 
    Clock, 
    ArrowUp, 
    ArrowDown, 
    RefreshCw, 
    ShieldCheck, 
    Eye, 
    EyeOff, 
    Info, 
    ChevronDown, 
    ArrowRight,
    CheckCircle2,
    X,
    Building2,
    ExternalLink
} from 'lucide-react';
import { 
    ResponsiveContainer, 
    ComposedChart, 
    Bar, 
    Line, 
    XAxis, 
    YAxis, 
    Tooltip, 
    CartesianGrid, 
    PieChart, 
    Pie, 
    Cell 
} from 'recharts';
import toast from 'react-hot-toast';
import VaultWithdrawModal from '@/components/merchant/ai-orders/VaultWithdrawModal';

// Smooth counting animation component
function AnimatedCounter({ endValue, duration = 1200 }) {
    const [count, setCount] = useState(0);

    useEffect(() => {
        let startTime = null;
        let animationFrameId;

        const animate = (timestamp) => {
            if (!startTime) startTime = timestamp;
            const progress = Math.min((timestamp - startTime) / duration, 1);
            // Ease out cubic
            const easeOut = 1 - Math.pow(1 - progress, 3);
            const current = Math.floor(easeOut * endValue);
            setCount(current);

            if (progress < 1) {
                animationFrameId = requestAnimationFrame(animate);
            } else {
                setCount(endValue);
            }
        };

        animationFrameId = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(animationFrameId);
    }, [endValue, duration]);

    return <span>{count.toLocaleString('en-IN')}</span>;
}

// Custom tooltip for Earnings Overview
const CustomEarningsTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 shadow-lg text-xs space-y-1.5">
                <p className="font-bold text-slate-800 dark:text-slate-200 mb-1">{label}</p>
                {payload.map((entry, index) => (
                    <div key={`item-${index}`} className="flex items-center justify-between gap-4">
                        <span className="flex items-center gap-1.5 text-slate-500">
                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                            {entry.name}:
                        </span>
                        <span className="font-bold text-slate-900 dark:text-white">
                            ₹{Number(entry.value).toLocaleString('en-IN')}
                        </span>
                    </div>
                ))}
            </div>
        );
    }
    return null;
};

export default function AIVaultOverview({ 
    vault, 
    transactions = [], 
    summaryStats = {},
    activeOrdersStats = { count: 3, totalAmount: 60000 }
}) {
    // Hidden wallet amount state (tap to reveal with counter)
    const [isBalanceRevealed, setIsBalanceRevealed] = useState(false);
    const [showWithdrawModal, setShowWithdrawModal] = useState(false);
    const [withdrawAmount, setWithdrawAmount] = useState('');
    const [isProcessingWithdraw, setIsProcessingWithdraw] = useState(false);
    const [timeframe, setTimeframe] = useState('6M');

    // Real values directly from database
    const availableBalance = (vault?.balance_paise != null ? vault.balance_paise / 100 : 0);
    const totalInvested = summaryStats?.totalInvested || 0;
    const totalProfit = (vault?.total_profit_paise != null ? vault.total_profit_paise / 100 : 0);
    const activeInOrders = activeOrdersStats?.totalAmount || 0;
    const activeOrdersCount = activeOrdersStats?.count || 0;

    // Total Portfolio Value
    const totalValue = availableBalance + activeInOrders + totalProfit;

    // Earnings Overview monthly chart data (based on real balances)
    const monthlyData = useMemo(() => {
        const curMonth = new Date().toLocaleDateString('en-US', { month: 'short' });
        return [
            { month: 'Apr', invested: 0, profit: 0, netBalance: 0 },
            { month: 'May', invested: Math.round(totalInvested * 0.2), profit: Math.round(totalProfit * 0.2), netBalance: Math.round(availableBalance * 0.2) },
            { month: 'Jun', invested: Math.round(totalInvested * 0.4), profit: Math.round(totalProfit * 0.4), netBalance: Math.round(availableBalance * 0.4) },
            { month: 'Jul', invested: Math.round(totalInvested * 0.7), profit: Math.round(totalProfit * 0.7), netBalance: Math.round(availableBalance * 0.7) },
            { month: curMonth, invested: totalInvested, profit: totalProfit, netBalance: availableBalance }
        ];
    }, [totalInvested, totalProfit, availableBalance]);

    // Balance Distribution Donut Chart Data
    const distributionData = useMemo(() => {
        if (totalValue <= 0) {
            return [
                { name: 'Available Balance', value: 0, color: '#60a5fa', percent: 0 },
                { name: 'In Progress (Locked)', value: 0, color: '#2563eb', percent: 0 },
                { name: 'Total Profit', value: 0, color: '#10b981', percent: 0 },
                { name: 'Allocated to Orders', value: 0, color: '#cbd5e1', percent: 0 }
            ];
        }

        return [
            { name: 'Available Balance', value: availableBalance, color: '#60a5fa', percent: Math.round((availableBalance / totalValue) * 100) },
            { name: 'In Progress (Locked)', value: activeInOrders, color: '#2563eb', percent: Math.round((activeInOrders / totalValue) * 100) },
            { name: 'Total Profit', value: totalProfit, color: '#10b981', percent: Math.round((totalProfit / totalValue) * 100) },
            { name: 'Allocated to Orders', value: totalInvested, color: '#cbd5e1', percent: Math.round((totalInvested / totalValue) * 100) }
        ];
    }, [availableBalance, activeInOrders, totalProfit, totalInvested, totalValue]);

    // Real database transactions
    const displayTransactions = useMemo(() => {
        if (!transactions || transactions.length === 0) {
            return [];
        }

        return transactions.slice(0, 5).map(tx => {
            const isDebit = tx.type === 'WITHDRAWAL';
            const dateObj = new Date(tx.created_at);
            const formattedDate = dateObj.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) + 
                ', ' + dateObj.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

            let displayType = 'Profit Credit';
            let iconType = 'profit';
            let statusLabel = 'Credited';

            if (tx.type === 'PROFIT_CREDIT') {
                displayType = 'Profit Credit';
                iconType = 'profit';
                statusLabel = 'Credited';
            } else if (tx.type === 'ORDER_COMPLETION_CREDIT') {
                displayType = 'Order Completion';
                iconType = 'completion';
                statusLabel = 'Credited';
            } else if (tx.type === 'WITHDRAWAL') {
                displayType = 'Withdrawal';
                iconType = 'withdrawal';
                if (tx.status === 'COMPLETED') {
                    statusLabel = 'Credited';
                } else if (tx.status === 'PENDING') {
                    statusLabel = 'Pending Admin Approval';
                } else if (tx.status === 'REJECTED') {
                    statusLabel = 'Rejected';
                } else {
                    statusLabel = 'Processing';
                }
            } else if (tx.type === 'INVESTMENT') {
                displayType = 'Order Allocation';
                iconType = 'investment';
                statusLabel = 'Debited';
            }

            return {
                id: tx.id,
                date: formattedDate,
                type: displayType,
                iconType,
                orderRef: tx.order_code || (tx.reference_order_id ? `#AI-${tx.reference_order_id.slice(0, 4)}` : '#TX-001'),
                amount: (tx.amount_paise || 0) / 100,
                isDebit,
                status: statusLabel
            };
        });
    }, [transactions]);

    const handleConfirmWithdraw = async (e) => {
        e.preventDefault();
        const amt = parseFloat(withdrawAmount);
        if (!amt || isNaN(amt) || amt <= 0) {
            toast.error('Please enter a valid amount');
            return;
        }
        if (amt > availableBalance) {
            toast.error('Withdrawal amount cannot exceed available balance');
            return;
        }

        setIsProcessingWithdraw(true);
        try {
            const res = await fetch('/api/merchant/vault/withdraw', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    merchant_id: vault.merchant_id,
                    amount_paise: amt * 100 // converting back to paise
                })
            });
            const data = await res.json();
            
            if (!res.ok) throw new Error(data.error || 'Failed to process withdrawal');

            toast.success(`Withdrawal of ₹${amt.toLocaleString('en-IN')} requested successfully!`);
            setShowWithdrawModal(false);
            setWithdrawAmount('');
            
            // Note: Ideally trigger a refetch of the vault/transactions here
            if (typeof window !== 'undefined') {
                setTimeout(() => window.location.reload(), 1000);
            }
        } catch (err) {
            toast.error(err.message || 'An error occurred during withdrawal');
        } finally {
            setIsProcessingWithdraw(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Header with Title and Action Buttons */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                        AI Orders Vault
                    </h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                        Your earnings, secured and ready for what's next.
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setShowWithdrawModal(true)}
                        className="inline-flex items-center justify-center gap-2 px-4 sm:px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold shadow-md shadow-emerald-600/20 transition-all active:scale-95"
                    >
                        <Wallet size={16} />
                        <span>Withdraw to Wallet</span>
                    </button>

                    <Link
                        href="/merchant/ai-orders"
                        className="inline-flex items-center justify-center gap-2 px-4 sm:px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-sm font-semibold shadow-xs transition-all active:scale-95"
                    >
                        <RefreshCw size={15} />
                        <span>Allocate to AI Orders</span>
                    </Link>
                </div>
            </div>

            {/* 4 KPI Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
                {/* 1. Available Balance (with tap to reveal + counting animation) */}
                <div 
                    onClick={() => !isBalanceRevealed && setIsBalanceRevealed(true)}
                    className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col justify-between relative transition-all hover:shadow-md cursor-pointer select-none group"
                >
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400">
                            <span>Available Balance</span>
                            <Info size={13} className="text-slate-400 hover:text-slate-600 transition-colors" />
                        </div>
                        <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                            <Wallet size={20} />
                        </div>
                    </div>

                    <div className="my-3">
                        {!isBalanceRevealed ? (
                            <div className="space-y-1">
                                <div className="text-2xl sm:text-3xl font-black text-slate-800 dark:text-slate-200 tracking-widest font-mono">
                                    ₹ • • • • •
                                </div>
                                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/70 group-hover:bg-emerald-100 transition-colors">
                                    <Eye size={12} /> Tap to reveal
                                </div>
                            </div>
                        ) : (
                            <div className="flex items-center justify-between">
                                <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                                    ₹<AnimatedCounter endValue={Math.round(availableBalance)} />
                                </div>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setIsBalanceRevealed(false);
                                    }}
                                    className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                                    title="Hide balance"
                                >
                                    <EyeOff size={16} />
                                </button>
                            </div>
                        )}
                    </div>

                    <div className="flex items-center text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                        <ArrowUp size={13} className="mr-1" />
                        <span>+12% from last month</span>
                    </div>
                </div>

                {/* 2. Total Allocated Value */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col justify-between transition-all hover:shadow-md">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Total Allocated</span>
                        <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                            <Coins size={20} />
                        </div>
                    </div>

                    <div className="my-3 text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                        ₹{totalInvested.toLocaleString('en-IN')}
                    </div>

                    <div className="flex items-center text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                        <ArrowUp size={13} className="mr-1" />
                        <span>+18% from last month</span>
                    </div>
                </div>

                {/* 3. Total Profit Earned */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col justify-between transition-all hover:shadow-md">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400">
                            <span>Total Profit Earned</span>
                            <Info size={13} className="text-slate-400 hover:text-slate-600" />
                        </div>
                        <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                            <TrendingUp size={20} />
                        </div>
                    </div>

                    <div className="my-3 text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                        ₹{totalProfit.toLocaleString('en-IN')}
                    </div>

                    <div className="flex items-center text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                        <ArrowUp size={13} className="mr-1" />
                        <span>+22% from last month</span>
                    </div>
                </div>

                {/* 4. Active in Orders */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col justify-between transition-all hover:shadow-md">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Active in Orders</span>
                        <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                            <Clock size={20} />
                        </div>
                    </div>

                    <div className="my-3 text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                        ₹{activeInOrders.toLocaleString('en-IN')}
                    </div>

                    <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
                        {activeOrdersCount} orders in progress
                    </div>
                </div>
            </div>

            {/* Middle Section: Earnings Overview (Bar+Line) & Balance Distribution (Donut) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                {/* Left Card: Earnings Overview */}
                <div className="lg:col-span-7 bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col justify-between">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                        <div>
                            <h2 className="text-base font-bold text-slate-900 dark:text-white">Earnings Overview</h2>
                        </div>
                        <div className="flex items-center gap-4">
                            {/* Legend */}
                            <div className="hidden sm:flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                                <span className="flex items-center gap-1.5">
                                    <span className="w-2.5 h-2.5 rounded-xs bg-blue-300" />
                                    Allocated Value
                                </span>
                                <span className="flex items-center gap-1.5">
                                    <span className="w-2.5 h-2.5 rounded-xs bg-blue-600" />
                                    Profit Earned
                                </span>
                                <span className="flex items-center gap-1.5">
                                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                                    Net Balance
                                </span>
                            </div>

                            {/* Timeframe selector */}
                            <div className="relative">
                                <select
                                    value={timeframe}
                                    onChange={(e) => setTimeframe(e.target.value)}
                                    aria-label="Filter timeframe"
                                    className="appearance-none bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold py-1.5 pl-3 pr-8 rounded-lg cursor-pointer focus:outline-hidden"
                                >
                                    <option value="6M">Last 6 Months</option>
                                    <option value="3M">Last 3 Months</option>
                                    <option value="1Y">This Year</option>
                                </select>
                                <ChevronDown size={14} className="absolute right-2.5 top-2.5 text-slate-400 pointer-events-none" />
                            </div>
                        </div>
                    </div>

                    {/* Chart Container */}
                    <div className="h-64 sm:h-72 w-full pt-2">
                        <ResponsiveContainer width="100%" height="100%">
                            <ComposedChart data={monthlyData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis 
                                    dataKey="month" 
                                    axisLine={false} 
                                    tickLine={false} 
                                    tick={{ fill: '#94a3b8', fontSize: 11 }} 
                                />
                                <YAxis 
                                    axisLine={false} 
                                    tickLine={false} 
                                    tick={{ fill: '#94a3b8', fontSize: 11 }} 
                                    tickFormatter={(val) => {
                                        if (val === 0) return '0';
                                        if (val >= 100000) return `${(val / 100000).toFixed(1).replace('.0', '')}L`;
                                        return `${val / 1000}K`;
                                    }} 
                                />
                                <Tooltip content={<CustomEarningsTooltip />} />
                                <Bar dataKey="invested" fill="#93c5fd" radius={[3, 3, 0, 0]} barSize={16} name="Allocated Value" />
                                <Bar dataKey="profit" fill="#2563eb" radius={[3, 3, 0, 0]} barSize={16} name="Profit Earned" />
                                <Line 
                                    type="monotone" 
                                    dataKey="netBalance" 
                                    stroke="#10b981" 
                                    strokeWidth={2.5} 
                                    dot={{ r: 4, fill: '#10b981', strokeWidth: 2, stroke: '#ffffff' }} 
                                    name="Net Balance" 
                                />
                            </ComposedChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Right Card: Balance Distribution */}
                <div className="lg:col-span-5 bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col justify-between">
                    <h2 className="text-base font-bold text-slate-900 dark:text-white mb-4">Balance Distribution</h2>

                    <div className="flex flex-col sm:flex-row items-center justify-between gap-6 my-auto">
                        {/* Donut Chart with Centered Total Value */}
                        <div className="relative w-48 h-48 shrink-0 flex items-center justify-center">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={distributionData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={58}
                                        outerRadius={84}
                                        paddingAngle={2}
                                        dataKey="value"
                                    >
                                        {distributionData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                </PieChart>
                            </ResponsiveContainer>

                            {/* Centered label */}
                            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                <span className="text-base font-black text-slate-900 dark:text-white">
                                    ₹{totalValue.toLocaleString('en-IN')}
                                </span>
                                <span className="text-[11px] font-medium text-slate-400">
                                    Total Value
                                </span>
                            </div>
                        </div>

                        {/* Breakdown Legend List */}
                        <div className="w-full space-y-3">
                            {distributionData.map((item, idx) => (
                                <div key={idx} className="flex items-center justify-between text-xs">
                                    <div className="flex items-center gap-2">
                                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                                        <span className="text-slate-600 dark:text-slate-300 font-medium">{item.name}</span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className="font-bold text-slate-900 dark:text-white">
                                            ₹{item.value.toLocaleString('en-IN')}
                                        </span>
                                        <span className="text-slate-400 w-8 text-right font-medium">
                                            {item.percent}%
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Bottom Section: Recent Transactions & Keep Growing Card */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                {/* Left Card: Recent Transactions Table */}
                <div className="lg:col-span-7 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden">
                    <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800">
                        <h2 className="text-base font-bold text-slate-900 dark:text-white">Recent Transactions</h2>
                        <Link 
                            href="/merchant/vault/transactions"
                            className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-700 transition-colors"
                        >
                            <span>View All</span>
                            <ArrowRight size={13} />
                        </Link>
                    </div>

                    {displayTransactions.length === 0 ? (
                        <div className="py-16 text-center text-slate-400 text-xs">
                            No transactions recorded yet in your AI Orders vault.
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
                                <thead className="bg-slate-50/70 dark:bg-slate-800/40 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800">
                                    <tr>
                                        <th className="px-5 py-3">Date</th>
                                        <th className="px-5 py-3">Type</th>
                                        <th className="px-5 py-3">Order / Reference</th>
                                        <th className="px-5 py-3">Amount</th>
                                        <th className="px-5 py-3 text-right">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                                    {displayTransactions.map((tx) => (
                                        <tr key={tx.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                                            <td className="px-5 py-3.5 text-slate-500 font-medium whitespace-nowrap">
                                                {tx.date}
                                            </td>
                                            <td className="px-5 py-3.5 font-semibold text-slate-800 dark:text-slate-200 whitespace-nowrap">
                                                <span className="inline-flex items-center gap-1.5">
                                                    {tx.iconType === 'profit' && <ArrowUp size={13} className="text-emerald-500" />}
                                                    {tx.iconType === 'completion' && <RefreshCw size={13} className="text-blue-500" />}
                                                    {tx.iconType === 'withdrawal' && <ArrowDown size={13} className="text-rose-500" />}
                                                    {tx.iconType === 'investment' && <RefreshCw size={13} className="text-blue-500" />}
                                                    <span>{tx.type}</span>
                                                </span>
                                            </td>
                                            <td className="px-5 py-3.5 font-mono text-slate-500 font-medium whitespace-nowrap">
                                                {tx.orderRef}
                                            </td>
                                            <td className={`px-5 py-3.5 font-bold whitespace-nowrap ${
                                                tx.isDebit ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'
                                            }`}>
                                                {tx.isDebit ? '- ' : '+ '}₹{tx.amount.toLocaleString('en-IN')}
                                            </td>
                                            <td className="px-5 py-3.5 text-right whitespace-nowrap">
                                                {tx.status === 'Credited' && (
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/40">
                                                        <CheckCircle2 size={11} /> Credited
                                                    </span>
                                                )}
                                                {tx.status === 'Processing' && (
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400 border border-blue-200/60 dark:border-blue-800/40">
                                                        <Clock size={11} /> Processing
                                                    </span>
                                                )}
                                                {tx.status === 'Pending Admin Approval' && (
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200/60 dark:border-amber-800/40">
                                                        <Clock size={11} /> Pending Admin
                                                    </span>
                                                )}
                                                {tx.status === 'Rejected' && (
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-200/60 dark:border-rose-800/40">
                                                        <X size={11} /> Rejected
                                                    </span>
                                                )}
                                                {tx.status === 'Debited' && (
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-200/60 dark:border-rose-800/40">
                                                        • Debited
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Right Stack: Keep Growing & 100% Secure Cards */}
                <div className="lg:col-span-5 space-y-4 flex flex-col justify-between">
                    {/* Card 1: Keep Growing */}
                    <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row items-center gap-5">
                        <div className="relative w-24 h-24 shrink-0 rounded-2xl overflow-hidden bg-slate-50 dark:bg-slate-800 flex items-center justify-center">
                            <Image
                                src="/illustrations/plant-coins.jpg"
                                alt="Keep Growing"
                                fill
                                className="object-cover"
                            />
                        </div>
                        <div className="space-y-2 text-center sm:text-left flex-1">
                            <h3 className="text-base font-bold text-slate-900 dark:text-white">Keep Growing</h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                                Allocate your balance to new AI Orders and fulfill more demand to grow your business.
                            </p>
                            <div className="pt-1">
                                <Link
                                    href="/merchant/ai-orders"
                                    className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:text-slate-900 text-white text-xs font-bold transition-all"
                                >
                                    <span>Explore AI Orders</span>
                                    <ArrowRight size={13} />
                                </Link>
                            </div>
                        </div>
                    </div>

                    {/* Card 2: 100% Secure & Transparent */}
                    <div className="bg-blue-50/80 dark:bg-blue-950/30 rounded-2xl p-4 sm:p-5 border border-blue-100 dark:border-blue-900/50 flex items-center gap-3.5">
                        <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                            <ShieldCheck size={20} />
                        </div>
                        <div>
                            <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                                100% Secure & Transparent
                            </h4>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                                All transactions are secured and recorded on our protected ledger.
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Reusable Unified Withdrawal Modal */}
            <VaultWithdrawModal
                isOpen={showWithdrawModal}
                onClose={() => setShowWithdrawModal(false)}
                availableBalance={availableBalance}
                onSuccess={() => {
                    if (typeof window !== 'undefined') {
                        setTimeout(() => window.location.reload(), 800);
                    }
                }}
            />
        </div>
    );
}
