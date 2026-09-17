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
    Coins,
    ShoppingBag,
    Users,
    Gift
} from 'lucide-react';

export default function StatsCards({ stats = {}, aiStats = {}, ecommerceStats = {}, referralStats = {}, showAiOrders = true }) {
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

    // E-Commerce Metrics
    const ecommerceTotalProducts = ecommerceStats?.totalProducts ?? listedCoupons;
    const ecommerceInStock = ecommerceStats?.inStockCount ?? activeCoupons;
    const ecommerceLowStock = ecommerceStats?.lowStockCount ?? 0;

    // Refer & Earn Metrics
    const totalReferrals = referralStats?.totalReferrals ?? 0;
    const totalReferralEarned = referralStats?.totalEarned ?? 0;
    const referralBounty = referralStats?.bounty ?? 500;

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

                {/* 2. E-Commerce Catalog & Stock Card */}
                <Link href="/merchant/shopping/inventory" className="block outline-none group">
                    <motion.div 
                        whileHover={{ y: -2 }}
                        className="relative h-full bg-white dark:bg-slate-900/90 border border-slate-200/80 dark:border-white/10 rounded-2xl p-5 shadow-xs transition-all group-hover:shadow-md group-hover:border-indigo-300 dark:group-hover:border-indigo-800 flex flex-col justify-between"
                    >
                        <div>
                            <div className="flex items-center justify-between mb-3">
                                <div>
                                    <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                                        E-Commerce Catalog
                                    </h4>
                                    <p className="text-[11px] text-slate-400 font-medium">Products &amp; Stock</p>
                                </div>
                                <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-100 dark:border-indigo-900/40 transition-transform group-hover:scale-105">
                                    <ShoppingBag size={18} />
                                </div>
                            </div>

                            <div className="flex items-baseline gap-2 mb-3">
                                <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                                    {ecommerceTotalProducts.toLocaleString('en-IN')}
                                </span>
                                <span className="text-xs font-bold text-slate-400">products listed</span>
                            </div>

                            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px]">
                                <div>
                                    <span className="text-slate-400 block font-medium">In-Stock Items</span>
                                    <span className="font-bold text-indigo-600 dark:text-indigo-400">
                                        {ecommerceInStock} ready
                                    </span>
                                </div>
                                <div className="text-right">
                                    <span className="text-slate-400 block font-medium">Low Stock</span>
                                    <span className={`font-bold ${ecommerceLowStock > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-800 dark:text-slate-200'}`}>
                                        {ecommerceLowStock} alerts
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] font-semibold text-indigo-600 dark:text-indigo-400">
                            <span>Manage E-Commerce</span>
                            <ArrowUpRight size={13} className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                        </div>
                    </motion.div>
                </Link>

                {/* 3. AI Orders & Vault Card (Highlights pending orders and redirects)
                    Hidden entirely when AI Orders is disabled by a super admin */}
                {showAiOrders && (
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
                )}

                {/* 4. Refer & Earn Network Card */}
                <Link href="/merchant/referrals" className="block outline-none group">
                    <motion.div 
                        whileHover={{ y: -2 }}
                        className="relative h-full bg-white dark:bg-slate-900/90 border border-slate-200/80 dark:border-white/10 rounded-2xl p-5 shadow-xs transition-all group-hover:shadow-md group-hover:border-emerald-300 dark:group-hover:border-emerald-800 flex flex-col justify-between"
                    >
                        <div>
                            <div className="flex items-center justify-between mb-3">
                                <div>
                                    <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                                        Refer &amp; Earn
                                    </h4>
                                    <p className="text-[11px] text-slate-400 font-medium">Network &amp; Rewards</p>
                                </div>
                                <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-100 dark:border-emerald-900/40 transition-transform group-hover:scale-105">
                                    <Users size={18} />
                                </div>
                            </div>

                            <div className="flex items-baseline gap-2 mb-3">
                                <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                                    {totalReferralEarned > 0 ? `₹${Math.round(totalReferralEarned).toLocaleString('en-IN')}` : `₹${referralBounty}`}
                                </span>
                                <span className="text-xs font-bold text-slate-400">
                                    {totalReferralEarned > 0 ? 'earned' : '/ activation'}
                                </span>
                            </div>

                            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px]">
                                <div>
                                    <span className="text-slate-400 block font-medium">Invited Network</span>
                                    <span className="font-bold text-slate-800 dark:text-slate-200">
                                        {totalReferrals} {totalReferrals === 1 ? 'partner' : 'partners'}
                                    </span>
                                </div>
                                <div className="text-right">
                                    <span className="text-slate-400 block font-medium">Bounty Rate</span>
                                    <span className="font-bold text-emerald-600 dark:text-emerald-400">
                                        ₹{referralBounty} / invite
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                            <span>View Network &amp; Earn</span>
                            <ArrowUpRight size={13} className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                        </div>
                    </motion.div>
                </Link>
            </div>
        </div>
    );
}
