'use client';

import React from 'react';
import { Wallet, TrendingUp, History, ArrowDownToLine, ArrowUpFromLine } from 'lucide-react';

const TX_COLORS = {
    'ORDER_COMPLETION_CREDIT': 'bg-blue-100 text-blue-800',
    'PROFIT_CREDIT': 'bg-emerald-100 text-emerald-800',
    'WITHDRAWAL': 'bg-orange-100 text-orange-800'
};

export default function AIVaultOverview({ vault, transactions }) {
    const balance = vault?.balance_paise || 0;
    const totalProfit = vault?.total_profit_paise || 0;

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-xl bg-gradient-to-br from-slate-900 to-slate-800 text-white shadow-xl shadow-slate-900/10 relative overflow-hidden p-6">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-2xl -mt-10 -mr-10" />
                    <div className="mb-4">
                        <h3 className="text-sm font-medium text-slate-300 uppercase tracking-widest flex items-center gap-2">
                            <Wallet size={16} />
                            Available Balance
                        </h3>
                    </div>
                    <div>
                        <div className="text-4xl font-black mb-4">
                            ₹{(balance / 100).toLocaleString('en-IN')}
                        </div>
                        <div className="flex gap-2">
                            <button className="inline-flex items-center justify-center rounded-lg bg-[#D4AF37] hover:bg-[#B8860B] px-3 py-1.5 text-sm font-bold text-slate-900 transition-colors">
                                <ArrowDownToLine size={16} className="mr-2" />
                                Withdraw
                            </button>
                            <button className="inline-flex items-center justify-center rounded-lg border border-white/20 hover:bg-white/10 px-3 py-1.5 text-sm font-bold text-white transition-colors">
                                <ArrowUpFromLine size={16} className="mr-2" />
                                Top Up
                            </button>
                        </div>
                    </div>
                </div>

                <div className="rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 p-6">
                    <div className="mb-4">
                        <h3 className="text-sm font-medium text-emerald-800 dark:text-emerald-400 uppercase tracking-widest flex items-center gap-2">
                            <TrendingUp size={16} />
                            Total Profit Earned
                        </h3>
                    </div>
                    <div>
                        <div className="text-4xl font-black text-emerald-600 dark:text-emerald-500">
                            +₹{(totalProfit / 100).toLocaleString('en-IN')}
                        </div>
                        <p className="text-xs text-emerald-600/70 dark:text-emerald-500/70 mt-2 font-medium">
                            Lifetime earnings from AI Orders
                        </p>
                    </div>
                </div>
            </div>

            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
                <div className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 p-4">
                    <h3 className="text-base font-bold flex items-center gap-2 text-slate-900 dark:text-white">
                        <History size={18} className="text-slate-500" />
                        Transaction History
                    </h3>
                </div>
                <div>
                    {(!transactions || transactions.length === 0) ? (
                        <div className="p-8 text-center text-slate-500 text-sm">
                            No transactions yet. Complete an AI Order to see activity here.
                        </div>
                    ) : (
                        <div className="w-full overflow-x-auto">
                            <table className="w-full text-left text-sm text-slate-700 dark:text-slate-300">
                                <thead className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 text-xs uppercase text-slate-500 dark:text-slate-400">
                                    <tr>
                                        <th className="px-4 py-3 font-medium">Date</th>
                                        <th className="px-4 py-3 font-medium">Type</th>
                                        <th className="px-4 py-3 font-medium text-right">Amount</th>
                                        <th className="px-4 py-3 font-medium text-right">Balance</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                                    {transactions.map((tx) => (
                                        <tr key={tx.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                            <td className="px-4 py-3 text-slate-500 text-sm">
                                                {new Date(tx.created_at).toLocaleString()}
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase ${TX_COLORS[tx.type] || 'bg-slate-100 text-slate-800'}`}>
                                                    {tx.type.replace(/_/g, ' ')}
                                                </span>
                                            </td>
                                            <td className={`px-4 py-3 text-right font-bold ${tx.type === 'WITHDRAWAL' ? 'text-orange-600' : 'text-emerald-600'}`}>
                                                {tx.type === 'WITHDRAWAL' ? '-' : '+'}₹{(tx.amount_paise / 100).toLocaleString('en-IN')}
                                            </td>
                                            <td className="px-4 py-3 text-right font-medium text-slate-900 dark:text-slate-100">
                                                ₹{(tx.balance_after_paise / 100).toLocaleString('en-IN')}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
