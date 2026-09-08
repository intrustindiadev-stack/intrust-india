'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { 
    TrendingUp, 
    CircleDollarSign, 
    ShoppingBag, 
    Percent, 
    ArrowUpRight,
    Zap
} from 'lucide-react';

export default function TodayStatsCards({ todayStats }) {
    const {
        todaySales = 0,
        todayProfit = 0,
        todayOrdersCount = 0,
        todayMargin = 0,
        avgOrderValue = 0,
    } = todayStats || {};

    const formatCurrency = (val) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0,
        }).format(val || 0);
    };

    return (
        <section className="space-y-3">
            <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                    <span className="relative flex h-2.5 w-2.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
                    </span>
                    <h2 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
                        Today&apos;s Performance
                    </h2>
                </div>
                <Link
                    href="/merchant/analytics"
                    className="text-xs font-bold text-primary dark:text-blue-400 hover:underline flex items-center gap-0.5"
                >
                    <span>Analytics</span>
                    <ArrowUpRight size={13} />
                </Link>
            </div>

            {/* 3-Column Today's Metric Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                {/* 1. Today's Sale */}
                <Link href="/merchant/shopping/orders" className="block outline-none">
                    <motion.div
                        whileHover={{ y: -2 }}
                        className="relative overflow-hidden rounded-3xl bg-white dark:bg-slate-900/90 border border-slate-200/80 dark:border-white/10 p-5 shadow-xs transition-shadow hover:shadow-md cursor-pointer"
                    >
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                            Today&apos;s Sale
                        </span>
                        <div className="w-9 h-9 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-500/20">
                            <CircleDollarSign size={20} />
                        </div>
                    </div>
                    <div className="flex items-baseline gap-2">
                        <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                            {formatCurrency(todaySales)}
                        </span>
                    </div>
                    <div className="mt-2.5 flex items-center justify-between text-[11px] font-semibold text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800">
                        <span>{todayOrdersCount} orders placed today</span>
                        <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold">
                            <Zap size={12} />
                            Live
                        </span>
                    </div>
                </motion.div>
                </Link>

                {/* 2. Today's Profit */}
                <Link href="/merchant/wallet" className="block outline-none">
                <motion.div
                    whileHover={{ y: -2 }}
                    className="relative overflow-hidden rounded-3xl bg-white dark:bg-slate-900/90 border border-slate-200/80 dark:border-white/10 p-5 shadow-xs transition-shadow hover:shadow-md cursor-pointer"
                >
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                            Today&apos;s Profit
                        </span>
                        <div className="w-9 h-9 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-500/20">
                            <TrendingUp size={20} />
                        </div>
                    </div>
                    <div className="flex items-baseline gap-2">
                        <span className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight">
                            {formatCurrency(todayProfit)}
                        </span>
                    </div>
                    <div className="mt-2.5 flex items-center justify-between text-[11px] font-semibold text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800">
                        <span>Net merchant earnings</span>
                        <span className="px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-300 font-bold border border-emerald-200 dark:border-emerald-800/60">
                            {todayMargin}% margin
                        </span>
                    </div>
                </motion.div>
                </Link>

                {/* 3. Today's Orders / Conversions */}
                <Link href="/merchant/shopping/orders" className="block outline-none">
                <motion.div
                    whileHover={{ y: -2 }}
                    className="relative overflow-hidden rounded-3xl bg-white dark:bg-slate-900/90 border border-slate-200/80 dark:border-white/10 p-5 shadow-xs transition-shadow hover:shadow-md cursor-pointer"
                >
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                            Today&apos;s Orders
                        </span>
                        <div className="w-9 h-9 rounded-2xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center border border-purple-500/20">
                            <ShoppingBag size={20} />
                        </div>
                    </div>
                    <div className="flex items-baseline gap-2">
                        <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                            {todayOrdersCount}
                        </span>
                        <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                            completed
                        </span>
                    </div>
                    <div className="mt-2.5 flex items-center justify-between text-[11px] font-semibold text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800">
                        <span>Average ticket size</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200">
                            {formatCurrency(avgOrderValue)}
                        </span>
                    </div>
                </motion.div>
                </Link>
            </div>
        </section>
    );
}
