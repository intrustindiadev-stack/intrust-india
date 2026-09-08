'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useMerchant } from '@/hooks/useMerchant';
import { supabase } from '@/lib/supabaseClient';
import OrderBoard from '@/components/merchant/ai-orders/OrderBoard';
import AIOrderNotificationModal from '@/components/merchant/ai-orders/AIOrderNotificationModal';
import ProductThumbnail from '@/components/ai-orders/ProductThumbnail';
import { Zap, ShieldCheck, ArrowRight, Wallet, RefreshCw, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function AIOrdersMerchantPage() {
    const { merchant } = useMerchant();
    const [orders, setOrders] = useState([]);
    const [counts, setCounts] = useState({ total: 0, pending: 0, paymentPending: 0, inProgress: 0, completed: 0 });
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [activeTab, setActiveTab] = useState('ALL');
    const [vault, setVault] = useState(null);
    const [isBalanceRevealed, setIsBalanceRevealed] = useState(false);
    
    // Withdrawal state
    const [showWithdrawModal, setShowWithdrawModal] = useState(false);
    const [withdrawAmount, setWithdrawAmount] = useState('');
    const [isProcessingWithdraw, setIsProcessingWithdraw] = useState(false);

    const fetchVault = async () => {
        try {
            const res = await fetch('/api/merchant/vault');
            if (res.ok) {
                const data = await res.json();
                setVault(data.vault);
            }
        } catch (e) {
            console.error('Error fetching vault:', e);
        }
    };

    useEffect(() => {
        if (merchant) {
            fetchVault();
        }
    }, [merchant]);

    const fetchOrders = async (silent = false) => {
        if (!silent) setIsLoading(true);
        else setIsRefreshing(true);

        try {
            const res = await fetch('/api/merchant/ai-orders');
            if (!res.ok) throw new Error('Failed to fetch AI orders');
            const data = await res.json();
            setOrders(data.orders || []);
            setCounts(data.counts || { total: 0, pending: 0, paymentPending: 0, inProgress: 0, completed: 0 });
        } catch (error) {
            toast.error(error.message || 'An error occurred loading orders');
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    };

    useEffect(() => {
        if (!merchant) return;
        fetchOrders();

        const channel = supabase
            .channel('merchant_ai_orders_channel')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'ai_orders' }, () => {
                fetchOrders(true);
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [merchant]);

    if (!merchant) return null;

    // Filter orders by active tab
    const filteredOrders = orders.filter(order => {
        if (activeTab === 'PENDING') return order.status === 'PENDING';
        if (activeTab === 'PAYMENT_PENDING') return order.status === 'PAYMENT_PENDING';
        if (activeTab === 'IN_PROGRESS') return order.status === 'ACCEPTED';
        if (activeTab === 'COMPLETED') return order.status === 'COMPLETED';
        return true; // 'ALL'
    });

    const pendingOrders = orders.filter(o => o.status === 'PENDING');
    const hasPending = pendingOrders.length > 0;
    
    const availableBalance = (vault?.balance_paise != null ? vault.balance_paise / 100 : 0);

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
                    amount_paise: amt * 100
                })
            });
            const data = await res.json();
            
            if (!res.ok) throw new Error(data.error || 'Failed to process withdrawal');

            toast.success(`Withdrawal of ₹${amt.toLocaleString('en-IN')} requested successfully!`);
            setShowWithdrawModal(false);
            setWithdrawAmount('');
            fetchVault(); // Refresh balance
        } catch (err) {
            toast.error(err.message || 'An error occurred during withdrawal');
        } finally {
            setIsProcessingWithdraw(false);
        }
    };

    const tabs = [
        { key: 'ALL', label: 'All', count: counts.total || orders.length },
        { key: 'PENDING', label: 'Pending', count: counts.pending },
        { key: 'PAYMENT_PENDING', label: 'Payment Pending', count: counts.paymentPending },
        { key: 'IN_PROGRESS', label: 'In Progress', count: counts.inProgress },
        { key: 'COMPLETED', label: 'Completed', count: counts.completed },
    ];

    const handleViewAndAcceptHero = () => {
        if (hasPending) {
            setActiveTab('PENDING');
            const target = document.getElementById('orders-section');
            if (target) target.scrollIntoView({ behavior: 'smooth' });
        }
    };

    return (
        <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-8">
            {/* Top Row / Hero Banner: Screen 4 Blueprint */}
            <div className="relative w-full rounded-3xl overflow-hidden shadow-lg border border-slate-100 dark:border-slate-800 bg-[#e8f3fc] dark:bg-[#121c29]">
                {/* Background Banner Image with Cityscape and Robot Mascot */}
                <div className="relative w-full min-h-[190px] sm:min-h-[220px] md:min-h-[250px] flex items-center">
                    <img 
                        src="/banners/robo-orders.png" 
                        alt="Robo AI Orders" 
                        className="absolute inset-0 w-full h-full object-cover object-right pointer-events-none"
                    />

                    {/* Content on Left */}
                    <div className="relative z-10 p-6 sm:p-8 md:p-10 max-w-lg">
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/80 dark:bg-black/50 backdrop-blur-md text-blue-900 dark:text-blue-300 text-[10px] font-black uppercase tracking-wider mb-3 shadow-xs">
                            <Zap size={12} className="text-amber-500 fill-amber-500" />
                            Exclusive Allocation
                        </div>
                        <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-slate-900 dark:text-white tracking-tight leading-tight mb-2">
                            New AI Order Available!
                        </h1>
                        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 font-medium mb-5 max-w-md">
                            A high-demand product has been assigned to you. Don't miss this opportunity!
                        </p>

                        <div className="flex items-center gap-3">
                            <button
                                onClick={handleViewAndAcceptHero}
                                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs sm:text-sm font-bold shadow-md hover:bg-slate-800 dark:hover:bg-slate-100 transition-all active:scale-95"
                            >
                                View & Accept <ArrowRight size={16} />
                            </button>
                            <Link
                                href="/merchant/vault/ai-orders"
                                className="inline-flex items-center justify-center gap-1.5 px-4 py-3 rounded-xl bg-white/70 dark:bg-black/40 backdrop-blur-md border border-white/60 dark:border-white/10 text-slate-800 dark:text-white text-xs font-bold hover:bg-white dark:hover:bg-black/60 transition-colors"
                            >
                                <Wallet size={14} /> My Vault
                            </Link>
                        </div>
                    </div>

                    {/* Pending Product Allocation Card with Thumbnail (Screen Blueprint) */}
                    {hasPending && pendingOrders[0] && (
                        <div className="hidden lg:flex items-center gap-3.5 p-3.5 rounded-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-white dark:border-slate-800 shadow-xl max-w-xs absolute right-8 z-20">
                            <ProductThumbnail
                                src={pendingOrders[0].product_image_url}
                                alt={pendingOrders[0].product_name}
                                category={pendingOrders[0].category}
                                className="w-14 h-14 rounded-xl shadow-xs shrink-0"
                            />
                            <div className="min-w-0 pr-2">
                                <span className="text-[10px] uppercase font-black text-amber-600 dark:text-amber-400 tracking-wider">
                                    New Allocation
                                </span>
                                <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                                    {pendingOrders[0].product_name}
                                </div>
                                <div className="text-[11px] font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
                                    +₹{((pendingOrders[0].profit_margin_paise || 0) / 100).toLocaleString('en-IN')} Profit
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Merchant Vault Available Balance */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div 
                    onClick={() => !isBalanceRevealed && setIsBalanceRevealed(true)}
                    className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col justify-between relative transition-all hover:shadow-md cursor-pointer select-none group"
                >
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400">
                            <span>Available Balance</span>
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
                                    Tap to reveal
                                </div>
                            </div>
                        ) : (
                            <div className="flex items-center justify-between">
                                <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                                    ₹{Math.round(availableBalance).toLocaleString('en-IN')}
                                </div>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setIsBalanceRevealed(false);
                                    }}
                                    className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                                    title="Hide balance"
                                >
                                    Hide
                                </button>
                            </div>
                        )}
                    </div>
                    
                    <div className="flex items-center justify-between mt-1 pt-3 border-t border-slate-100 dark:border-slate-800">
                        <button 
                            onClick={(e) => {
                                e.stopPropagation();
                                setShowWithdrawModal(true);
                            }}
                            className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 px-3 py-1.5 rounded-lg transition-colors"
                        >
                            Withdraw Funds
                        </button>
                        <Link href="/merchant/vault/ai-orders" className="text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-300 flex items-center gap-1">
                            Go to Vault <ArrowRight size={12} />
                        </Link>
                    </div>
                </div>
            </div>

            {/* Section: My AI Orders */}
            <div id="orders-section" className="space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                        <h2 className="text-xl font-black text-slate-900 dark:text-white">
                            My AI Orders
                        </h2>
                        <p className="text-xs text-slate-400 mt-0.5">
                            Manage your assigned inventory, escrow lock-ins, and mature profits.
                        </p>
                    </div>

                    <div className="flex items-center gap-3 self-end sm:self-auto">
                        <button
                            onClick={() => fetchOrders(true)}
                            disabled={isRefreshing}
                            className="p-2 rounded-xl text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            title="Refresh orders"
                        >
                            <RefreshCw size={16} className={isRefreshing ? 'animate-spin text-blue-600' : ''} />
                        </button>
                        <button
                            onClick={() => setActiveTab('ALL')}
                            className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline"
                        >
                            View All
                        </button>
                    </div>
                </div>

                {/* Filter Tabs matching Screen 4 Blueprint */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none border-b border-slate-200/60 dark:border-slate-800">
                    {tabs.map((tab) => {
                        const isActive = activeTab === tab.key;
                        return (
                            <button
                                key={tab.key}
                                onClick={() => setActiveTab(tab.key)}
                                className={`whitespace-nowrap px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                                    isActive
                                        ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
                                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60'
                                }`}
                            >
                                {tab.label}
                                <span className={`ml-1.5 px-1.5 py-0.5 rounded-md text-[10px] font-black ${
                                    isActive
                                        ? 'bg-white/20 text-white dark:bg-black/20 dark:text-slate-900'
                                        : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                                }`}>
                                    {tab.count}
                                </span>
                            </button>
                        );
                    })}
                </div>

                {/* Order Cards Grid */}
                {isLoading ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="h-64 rounded-3xl bg-slate-100 dark:bg-slate-900 animate-pulse" />
                        ))}
                    </div>
                ) : (
                    <OrderBoard orders={filteredOrders} onAccepted={() => fetchOrders(true)} activeTab={activeTab} />
                )}
            </div>

            {/* Withdrawal Modal */}
            {showWithdrawModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-slate-900/40 dark:bg-black/60 backdrop-blur-sm">
                    <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-2xl relative overflow-hidden animate-in fade-in zoom-in duration-200">
                        <button 
                            onClick={() => setShowWithdrawModal(false)}
                            className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-white"
                        >
                            <span className="material-icons-round text-xl">close</span>
                        </button>
                        
                        <div className="flex items-center gap-3 mb-5">
                            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
                                <Wallet size={20} />
                            </div>
                            <div>
                                <h3 className="text-lg font-black text-slate-900 dark:text-white leading-tight">Withdraw Funds</h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400">Available: ₹{availableBalance.toLocaleString('en-IN')}</p>
                            </div>
                        </div>

                        <form onSubmit={handleConfirmWithdraw} className="space-y-5">
                            <div>
                                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">Amount (₹)</label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₹</span>
                                    <input 
                                        type="number"
                                        placeholder="0.00"
                                        value={withdrawAmount}
                                        onChange={(e) => setWithdrawAmount(e.target.value)}
                                        max={availableBalance}
                                        className="w-full pl-8 pr-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-bold focus:outline-hidden focus:border-blue-500 dark:focus:border-blue-400 transition-colors"
                                    />
                                    <button 
                                        type="button"
                                        onClick={() => setWithdrawAmount(availableBalance.toString())}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-black uppercase text-blue-600 bg-blue-50 px-2 py-1 rounded-md"
                                    >
                                        Max
                                    </button>
                                </div>
                            </div>
                            
                            <button 
                                type="submit"
                                disabled={isProcessingWithdraw || !withdrawAmount || parseFloat(withdrawAmount) > availableBalance}
                                className="w-full py-3.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-sm font-bold shadow-lg hover:shadow-xl transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {isProcessingWithdraw ? (
                                    <Loader2 size={18} className="animate-spin" />
                                ) : (
                                    <>Withdraw to Wallet <ArrowRight size={16} /></>
                                )}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
