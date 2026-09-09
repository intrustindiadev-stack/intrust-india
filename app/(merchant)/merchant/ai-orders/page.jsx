'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useMerchant } from '@/hooks/useMerchant';
import { supabase } from '@/lib/supabaseClient';
import OrderBoard from '@/components/merchant/ai-orders/OrderBoard';
import AIOrderNotificationModal from '@/components/merchant/ai-orders/AIOrderNotificationModal';
import ProductThumbnail from '@/components/ai-orders/ProductThumbnail';
import VaultWithdrawModal from '@/components/merchant/ai-orders/VaultWithdrawModal';
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
    
    // Withdrawal modal state
    const [showWithdrawModal, setShowWithdrawModal] = useState(false);

    const fetchVault = async () => {
        try {
            const res = await fetch('/api/merchant/vault');
            if (!res.ok) throw new Error('Failed to fetch vault');
            const data = await res.json();
            setVault(data.vault);
        } catch (error) {
            console.error('Error loading vault in AI Orders page:', error);
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
            {/* Top Row / Hero Banner */}
            <div className="w-full rounded-3xl overflow-hidden shadow-xl border border-slate-200/60 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col-reverse md:flex-row items-stretch">
                {/* Text Content */}
                <div className="flex-1 p-6 sm:p-8 md:p-10 flex flex-col justify-center bg-slate-50 dark:bg-slate-800/40 relative z-10">
                    <div className="inline-flex self-start items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 text-[10px] font-black uppercase tracking-wider mb-4 shadow-xs border border-blue-200/60 dark:border-blue-800/50">
                        <Zap size={12} className="text-amber-500 fill-amber-500" />
                        Exclusive Allocation
                    </div>
                    <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-slate-900 dark:text-white tracking-tight leading-tight mb-3">
                        New High-Demand Order
                    </h1>
                    <p className="text-sm text-slate-600 dark:text-slate-300 font-medium mb-6 max-w-md leading-relaxed">
                        A fast-moving product has been allocated to your store. Accept now to fulfill the demand and secure your earnings.
                    </p>

                    <div className="flex flex-wrap items-center gap-3">
                        <button
                            onClick={handleViewAndAcceptHero}
                            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-slate-900 dark:bg-white hover:bg-slate-800 dark:hover:bg-slate-100 text-white dark:text-slate-900 text-sm font-bold shadow-md transition-all active:scale-95"
                        >
                            View & Accept <ArrowRight size={16} />
                        </button>
                        <Link
                            href="/merchant/vault/ai-orders"
                            className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-sm font-bold hover:bg-slate-50 dark:hover:bg-slate-700 shadow-xs transition-colors"
                        >
                            <Wallet size={15} /> My Vault
                        </Link>
                    </div>
                </div>

                {/* Image Container */}
                <div className="w-full md:w-5/12 lg:w-1/2 relative min-h-[220px] md:min-h-full">
                    <img 
                        src="/banners/rider-delivery.jpg" 
                        alt="InTrust Express Delivery" 
                        className="absolute inset-0 w-full h-full object-cover object-center md:object-right"
                    />
                    
                    {/* Floating Product Card */}
                    {hasPending && pendingOrders[0] && (
                        <div className="hidden sm:flex items-center gap-3.5 p-3 rounded-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-100 dark:border-slate-700 shadow-xl max-w-xs absolute bottom-4 left-4 md:-left-12 z-20 animate-in slide-in-from-bottom duration-500">
                            <ProductThumbnail
                                src={pendingOrders[0].product_image_url}
                                alt={pendingOrders[0].product_name}
                                category={pendingOrders[0].category}
                                className="w-12 h-12 rounded-xl shadow-xs shrink-0"
                            />
                            <div className="min-w-0 pr-4">
                                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Assigned</div>
                                <div className="text-xs font-black text-slate-900 dark:text-white truncate">
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
                            className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 px-3 py-1.5 rounded-lg transition-colors"
                        >
                            <Wallet size={13} />
                            <span>Withdraw to Wallet</span>
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

            {/* Reusable Unified Withdrawal Modal */}
            <VaultWithdrawModal
                isOpen={showWithdrawModal}
                onClose={() => setShowWithdrawModal(false)}
                availableBalance={availableBalance}
                onSuccess={() => fetchVault()}
            />
        </div>
    );
}
