"use client";

import { useState } from 'react';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

export default function AdminRecentTransactions({ transactions = [] }) {
    const [imgErrors, setImgErrors] = useState({});

    const getInitials = (name) => {
        if (!name) return 'U';
        const parts = name.trim().split(/\s+/);
        return (parts[0][0] + (parts[1]?.[0] || '')).toUpperCase();
    };

    const formatPrice = (paise) => {
        if (paise === null || paise === undefined) return '₹0.00';
        return `₹${(paise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    if (!transactions || transactions.length === 0) {
        return (
            <div className="p-12 text-center text-slate-400">
                <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-3 border border-slate-100">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                </div>
                <p className="text-sm font-semibold text-slate-500">No recent transactions</p>
                <p className="text-xs text-slate-400 mt-0.5">Platform orders and payments will appear here in real-time.</p>
            </div>
        );
    }

    return (
        <div>
            {/* ──────────────── MOBILE: High-Density Flex List (md:hidden) ──────────────── */}
            <div className="flex flex-col md:hidden divide-y divide-slate-100">
                {transactions.map((tx) => {
                    const hasImg = tx.avatar_url && !imgErrors[tx.id];
                    const dateStr = new Date(tx.created_at).toLocaleDateString('en-IN', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                    });

                    return (
                        <Link
                            key={tx.id}
                            href="/admin/transactions"
                            className="p-3.5 hover:bg-slate-50 active:bg-slate-100 transition-colors flex items-center justify-between gap-3 min-h-[52px]"
                        >
                            {/* Left: Avatar + Title */}
                            <div className="flex items-center gap-3 min-w-0">
                                {hasImg ? (
                                    <img
                                        src={tx.avatar_url}
                                        alt={tx.buyer_name}
                                        onError={() => setImgErrors(prev => ({ ...prev, [tx.id]: true }))}
                                        className="w-10 h-10 rounded-xl object-cover ring-1 ring-slate-200 shrink-0"
                                    />
                                ) : (
                                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-xs">
                                        {getInitials(tx.buyer_name)}
                                    </div>
                                )}
                                <div className="min-w-0">
                                    <p className="text-sm font-bold text-slate-900 truncate">
                                        {tx.buyer_name}
                                    </p>
                                    <p className="text-xs text-slate-500 truncate flex items-center gap-1 mt-0.5 font-medium">
                                        <span>{tx.icon}</span>
                                        <span>{tx.brand}</span>
                                        <span className="text-slate-300">·</span>
                                        <span className="text-slate-400">{tx.source}</span>
                                    </p>
                                </div>
                            </div>

                            {/* Right: Amount + Date */}
                            <div className="text-right shrink-0">
                                <p className="text-sm font-extrabold text-emerald-600">
                                    {formatPrice(tx.amount)}
                                </p>
                                <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                                    {dateStr}
                                </p>
                            </div>
                        </Link>
                    );
                })}
            </div>

            {/* ──────────────── DESKTOP: Clean Table (hidden md:block) ──────────────── */}
            <div className="hidden md:block w-full overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-slate-50/80 text-[11px] uppercase tracking-wider text-slate-400 font-bold border-b border-slate-100 select-none">
                            <th className="py-3 px-4 lg:px-6">Customer</th>
                            <th className="py-3 px-4 lg:px-6">Transaction Type</th>
                            <th className="py-3 px-4 lg:px-6">Channel / Ref</th>
                            <th className="py-3 px-4 lg:px-6">Date</th>
                            <th className="py-3 px-4 lg:px-6 text-right">Amount</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-sm">
                        {transactions.map((tx) => {
                            const hasImg = tx.avatar_url && !imgErrors[tx.id];
                            const dateStr = new Date(tx.created_at).toLocaleDateString('en-IN', {
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                            });

                            return (
                                <tr
                                    key={tx.id}
                                    className="hover:bg-slate-50/80 transition-colors group"
                                >
                                    {/* Customer */}
                                    <td className="py-3.5 px-4 lg:px-6">
                                        <div className="flex items-center gap-3">
                                            {hasImg ? (
                                                <img
                                                    src={tx.avatar_url}
                                                    alt={tx.buyer_name}
                                                    onError={() => setImgErrors(prev => ({ ...prev, [tx.id]: true }))}
                                                    className="w-8 h-8 rounded-lg object-cover ring-1 ring-slate-200 shrink-0"
                                                />
                                            ) : (
                                                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                                                    {getInitials(tx.buyer_name)}
                                                </div>
                                            )}
                                            <span className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                                                {tx.buyer_name}
                                            </span>
                                        </div>
                                    </td>

                                    {/* Type */}
                                    <td className="py-3.5 px-4 lg:px-6 text-slate-700">
                                        <div className="flex items-center gap-1.5">
                                            <span>{tx.icon}</span>
                                            <span className="font-semibold text-slate-800">{tx.brand}</span>
                                        </div>
                                    </td>

                                    {/* Channel */}
                                    <td className="py-3.5 px-4 lg:px-6 text-xs text-slate-500">
                                        <div className="flex flex-col gap-0.5">
                                            <span className="font-medium text-slate-700">{tx.merchant_name}</span>
                                            <span className="text-[10px] uppercase font-bold text-slate-400">
                                                {tx.source}
                                            </span>
                                        </div>
                                    </td>

                                    {/* Date */}
                                    <td className="py-3.5 px-4 lg:px-6 text-xs text-slate-400 font-medium whitespace-nowrap">
                                        {dateStr}
                                    </td>

                                    {/* Amount */}
                                    <td className="py-3.5 px-4 lg:px-6 text-right whitespace-nowrap">
                                        <span className="font-extrabold text-emerald-600">
                                            {formatPrice(tx.amount)}
                                        </span>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
