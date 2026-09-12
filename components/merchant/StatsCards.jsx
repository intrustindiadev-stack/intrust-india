"use client";

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { 
    ShoppingCart, 
    Package, 
    Zap, 
    Wallet, 
    ArrowUpRight, 
    ArrowRight,
    TrendingUp,
    Clock,
    ShieldCheck,
    Coins
} from 'lucide-react';

export default function StatsCards({ stats = {}, aiStats = {} }) {
    const totalSales = stats?.totalSales ?? 0;
    const pendingOrders = stats?.pendingOrders ?? 0;
    const activeCoupons = stats?.activeCoupons ?? 0;
    const listedCoupons = stats?.listedCoupons ?? 0;
    const shoppingSpend = stats?.shoppingSpend ?? 0;
    const totalCommission = stats?.totalCommission ?? 0;
    const lockinBalance = stats?.lockinBalance ?? 0;

    const aiTotalOrders = aiStats?.totalOrders ?? 0;
    const aiPendingCount = aiStats?.pendingCount ?? 0;
    const aiInProgressCount = aiStats?.inProgressCount ?? 0;
    const aiVaultBalance = aiStats?.vaultBalance ?? 0;
    const aiTotalProfit = aiStats?.totalProfit ?? 0;

    return (
        <div className="space-y-3 mb-8">
            <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                    <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
                        Performance Metrics
                    </h3>
                </div>
                <Link 
                    href="/merchant/analytics" 
                    className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-0.5"
                >
                    <span>View Analytics</span>
                    <ArrowUpRight size={13} />
                </Link>
            </div>

            {/* 4 Responsive Modern KPI Cards with Direct Redirection */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                
                {/* 1. Sales & Orders Card */}
                <Link href="/merchant/shopping/orders" className="block outline-none group">
                    <motion.div 
                        whileHover={{ y: -2 }}
                        className="relative h-full bg-white dark:bg-slate-900/90 border border-slate-200/80 dark:border-white/10 rounded-2xl p-5 shadow-xs transition-all group-hover:shadow-md group-hover:border-purple-300 dark:group-hover:border-purple-800 flex flex-col justify-between"
                    >
                        <div>
                            <div className="flex items-center justify-between mb-3">
                                <div>
                                    <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                                        Sales & Orders
                                    </h4>
                                    <p className="text-[11px] text-slate-400 font-medium">Customer purchases</p>
                                </div>
                                <div className="w-9 h-9 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 flex items-center justify-center border border-purple-100 dark:border-purple-900/40 transition-transform group-hover:scale-105">
                                    <ShoppingCart size={18} />
                                </div>
                            </div>

                            <div className="flex items-baseline gap-2 mb-3">
                                <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                                    {totalSales.toLocaleString('en-IN')}
                                </span>
                                <span className="text-xs font-bold text-slate-400">orders</span>
                            </div>

                            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px]">
                                <div>
                                    <span className="text-slate-400 block font-medium">Pending Orders</span>
                                    <span className={`font-bold ${pendingOrders > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-800 dark:text-slate-200'}`}>
                                        {pendingOrders} {pendingOrders === 1 ? 'order' : 'orders'}
                                    </span>
                                </div>
                                <div className="text-right">
                                    <span className="text-slate-400 block font-medium">Status</span>
                                    <span className="text-emerald-600 font-bold inline-flex items-center gap-1">
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Active
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] font-semibold text-purple-600 dark:text-purple-400">
                            <span>Manage Orders</span>
                            <ArrowUpRight size={13} className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                        </div>
                    </motion.div>
                </Link>

                {/* 2. Inventory & Stock Card */}
                <Link href="/merchant/inventory" className="block outline-none group">
                    <motion.div 
                        whileHover={{ y: -2 }}
                        className="relative h-full bg-white dark:bg-slate-900/90 border border-slate-200/80 dark:border-white/10 rounded-2xl p-5 shadow-xs transition-all group-hover:shadow-md group-hover:border-indigo-300 dark:group-hover:border-indigo-800 flex flex-col justify-between"
                    >
                        <div>
                            <div className="flex items-center justify-between mb-3">
                                <div>
                                    <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                                        Inventory & Stock
                                    </h4>
                                    <p className="text-[11px] text-slate-400 font-medium">Coupons & products</p>
                                </div>
                                <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-100 dark:border-indigo-900/40 transition-transform group-hover:scale-105">
                                    <Package size={18} />
                                </div>
                            </div>

                            <div className="flex items-baseline gap-2 mb-3">
                                <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                                    {activeCoupons.toLocaleString('en-IN')}
                                </span>
                                <span className="text-xs font-bold text-slate-400">in stock</span>
                            </div>

                            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px]">
                                <div>
                                    <span className="text-slate-400 block font-medium">Marketplace Listed</span>
                                    <span className="font-bold text-slate-800 dark:text-slate-200">
                                        {listedCoupons} listed
                                    </span>
                                </div>
                                <div className="text-right">
                                    <span className="text-slate-400 block font-medium">Available</span>
                                    <span className="font-bold text-indigo-600 dark:text-indigo-400">
                                        {activeCoupons} ready
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] font-semibold text-indigo-600 dark:text-indigo-400">
                            <span>Open Inventory</span>
                            <ArrowUpRight size={13} className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                        </div>
                    </motion.div>
                </Link>

                {/* 3. AI Orders & Vault Card (Highlights pending orders and redirects) */}
                <Link 
                    href={aiPendingCount > 0 ? '/merchant/ai-orders?tab=PENDING' : '/merchant/ai-orders'} 
                    className="block outline-none group"
                >
                    <motion.div 
                        whileHover={{ y: -2 }}
                        className={`relative h-full bg-white dark:bg-slate-900/90 border ${
                            aiPendingCount > 0 
                                ? 'border-amber-300 dark:border-amber-800/80 shadow-[0_4px_20px_rgba(245,158,11,0.12)]' 
                                : 'border-slate-200/80 dark:border-white/10'
                        } rounded-2xl p-5 shadow-xs transition-all group-hover:shadow-md group-hover:border-amber-400 flex flex-col justify-between`}
                    >
                        <div>
                            <div className="flex items-center justify-between mb-3">
                                <div>
                                    <div className="flex items-center gap-1.5">
                                        <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                                            AI Orders & Vault
                                        </h4>
                                    </div>
                                    <p className="text-[11px] text-slate-400 font-medium">Automated allocations</p>
                                </div>
                                <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-200/60 dark:border-amber-900/40 transition-transform group-hover:scale-105">
                                    <Zap size={18} />
                                </div>
                            </div>

                            <div className="flex items-baseline gap-2 mb-3">
                                <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                                    {aiTotalOrders.toLocaleString('en-IN')}
                                </span>
                                {aiPendingCount > 0 ? (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60 animate-pulse">
                                        {aiPendingCount} Pending
                                    </span>
                                ) : (
                                    <span className="text-xs font-bold text-slate-400">allocated</span>
                                )}
                            </div>

                            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px]">
                                <div>
                                    <span className="text-slate-400 block font-medium">Vault Balance</span>
                                    <span className="font-bold text-emerald-600 dark:text-emerald-400">
                                        ₹{Math.round(aiVaultBalance).toLocaleString('en-IN')}
                                    </span>
                                </div>
                                <div className="text-right">
                                    <span className="text-slate-400 block font-medium">In Progress</span>
                                    <span className="font-bold text-slate-800 dark:text-slate-200">
                                        {aiInProgressCount} active
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] font-semibold text-amber-600 dark:text-amber-400">
                            <span>{aiPendingCount > 0 ? 'Accept Pending Orders' : 'View AI Orders'}</span>
                            <ArrowUpRight size={13} className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                        </div>
                    </motion.div>
                </Link>

                {/* 4. Financial Overview & Wallet Card */}
                <Link href="/merchant/wallet" className="block outline-none group">
                    <motion.div 
                        whileHover={{ y: -2 }}
                        className="relative h-full bg-white dark:bg-slate-900/90 border border-slate-200/80 dark:border-white/10 rounded-2xl p-5 shadow-xs transition-all group-hover:shadow-md group-hover:border-emerald-300 dark:group-hover:border-emerald-800 flex flex-col justify-between"
                    >
                        <div>
                            <div className="flex items-center justify-between mb-3">
                                <div>
                                    <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                                        Wallet & Finances
                                    </h4>
                                    <p className="text-[11px] text-slate-400 font-medium">Balance & lockin</p>
                                </div>
                                <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-100 dark:border-emerald-900/40 transition-transform group-hover:scale-105">
                                    <Wallet size={18} />
                                </div>
                            </div>

                            <div className="flex items-baseline gap-2 mb-3">
                                <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                                    ₹{Math.round(lockinBalance).toLocaleString('en-IN')}
                                </span>
                                <span className="text-xs font-bold text-slate-400">locked</span>
                            </div>

                            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px]">
                                <div>
                                    <span className="text-slate-400 block font-medium">Shopping Spend</span>
                                    <span className="font-bold text-slate-800 dark:text-slate-200">
                                        ₹{Math.round(shoppingSpend).toLocaleString('en-IN')}
                                    </span>
                                </div>
                                <div className="text-right">
                                    <span className="text-slate-400 block font-medium">Commission</span>
                                    <span className="font-bold text-slate-800 dark:text-slate-200">
                                        ₹{Math.round(totalCommission).toLocaleString('en-IN')}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                            <span>Open InTrust Wallet</span>
                            <ArrowUpRight size={13} className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                        </div>
                    </motion.div>
                </Link>
            </div>
        </div>
    );
}
