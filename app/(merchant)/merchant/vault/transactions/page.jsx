'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useMerchant } from '@/hooks/useMerchant';
import { supabase } from '@/lib/supabaseClient';
import toast from 'react-hot-toast';
import { 
    ArrowLeft, 
    ShieldCheck, 
    ArrowUp, 
    ArrowDown, 
    RefreshCw, 
    CheckCircle2, 
    Clock, 
    X,
    Wallet
} from 'lucide-react';

export default function VaultTransactionsPage() {
    const { merchant, loading: merchantLoading } = useMerchant();
    const [transactions, setTransactions] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchTransactions = async () => {
            if (merchantLoading) return;
            if (!merchant) {
                setIsLoading(false);
                return;
            }

            try {
                const merchantUserId = merchant.user_id || merchant.id;
                if (!merchantUserId) {
                    setIsLoading(false);
                    return;
                }

                // 1. Fetch Vault
                const { data: vaultData, error: vaultError } = await supabase
                    .from('ai_orders_vault')
                    .select('*')
                    .eq('merchant_id', merchantUserId)
                    .maybeSingle();

                if (vaultError) throw vaultError;

                // 2. Fetch all orders for this merchant to map order codes
                const { data: allOrders, error: ordersError } = await supabase
                    .from('ai_orders')
                    .select('id, order_code')
                    .eq('merchant_id', merchantUserId);

                if (ordersError) throw ordersError;

                const orderCodeMap = {};
                (allOrders || []).forEach(o => {
                    if (o && o.id) {
                        orderCodeMap[o.id] = o.order_code || `AI-${String(o.id).slice(0, 4)}`;
                    }
                });

                if (vaultData) {
                    // 3. Fetch Transactions
                    const { data: txData, error: txError } = await supabase
                        .from('ai_orders_vault_transactions')
                        .select('*')
                        .eq('vault_id', vaultData.id)
                        .order('created_at', { ascending: false });

                    if (txError) throw txError;

                    const enrichedTx = (txData || []).map(tx => ({
                        ...tx,
                        order_code: orderCodeMap[tx.reference_order_id] || (tx.reference_order_id ? `#AI-${String(tx.reference_order_id).slice(0, 4)}` : '—')
                    }));

                    setTransactions(enrichedTx);
                } else {
                    setTransactions([]);
                }
            } catch (error) {
                console.error("Vault tx fetch error:", error);
                toast.error('Failed to load transactions');
            } finally {
                setIsLoading(false);
            }
        };

        fetchTransactions();
    }, [merchant, merchantLoading]);

    const displayTransactions = useMemo(() => {
        if (!transactions || !Array.isArray(transactions)) return [];
        return transactions.map(tx => {
            const isDebit = tx.type === 'WITHDRAWAL';
            let formattedDate = '—';
            try {
                if (tx.created_at) {
                    const dateObj = new Date(tx.created_at);
                    if (!isNaN(dateObj.getTime())) {
                        formattedDate = dateObj.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) + 
                            ', ' + dateObj.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
                    }
                }
            } catch {
                formattedDate = '—';
            }

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
                id: tx.id || Math.random().toString(),
                date: formattedDate,
                type: displayType,
                iconType,
                orderRef: tx.order_code || (tx.reference_order_id ? `#AI-${String(tx.reference_order_id).slice(0, 4)}` : '#TX-001'),
                amount: (Number(tx.amount_paise) || 0) / 100,
                isDebit,
                status: statusLabel
            };
        });
    }, [transactions]);

    if (!merchantLoading && !merchant) {
        return (
            <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 text-center py-20">
                <p className="text-sm font-semibold text-slate-500">Merchant account not found. Please log in with a valid merchant profile.</p>
                <Link href="/merchant/ai-orders" className="text-xs font-bold text-blue-600 hover:underline">
                    Go to AI Orders
                </Link>
            </div>
        );
    }

    return (
        <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
            {/* Top Navigation Bar */}
            <div className="flex items-center justify-between">
                <Link 
                    href="/merchant/vault/ai-orders" 
                    className="inline-flex items-center text-xs font-bold text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors"
                >
                    <ArrowLeft size={14} className="mr-1.5" />
                    Back to AI Vault
                </Link>

                <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-bold">
                    <ShieldCheck size={16} /> InTrust Escrow Guaranteed
                </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                        Vault Transactions
                    </h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                        Full history of your earnings, withdrawals, and order allocations.
                    </p>
                </div>
            </div>

            {isLoading ? (
                <div className="space-y-4 animate-pulse">
                    {[1, 2, 3, 4, 5].map(i => (
                        <div key={i} className="h-16 bg-slate-100 dark:bg-slate-800 rounded-xl" />
                    ))}
                </div>
            ) : (
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden">
                    {displayTransactions.length === 0 ? (
                        <div className="py-24 text-center">
                            <div className="w-12 h-12 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center mx-auto mb-3">
                                <Wallet size={20} className="text-slate-400" />
                            </div>
                            <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">No transactions yet</p>
                            <p className="text-xs text-slate-400 mt-1">Your vault history will appear here.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
                                <thead className="bg-slate-50/70 dark:bg-slate-800/40 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800">
                                    <tr>
                                        <th className="px-6 py-4">Date & Time</th>
                                        <th className="px-6 py-4">Transaction Type</th>
                                        <th className="px-6 py-4">Reference</th>
                                        <th className="px-6 py-4">Amount</th>
                                        <th className="px-6 py-4 text-right">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                                    {displayTransactions.map((tx) => (
                                        <tr key={tx.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                                            <td className="px-6 py-4 text-slate-500 font-medium whitespace-nowrap">
                                                {tx.date}
                                            </td>
                                            <td className="px-6 py-4 font-semibold text-slate-800 dark:text-slate-200 whitespace-nowrap">
                                                <span className="inline-flex items-center gap-1.5">
                                                    {tx.iconType === 'profit' && <ArrowUp size={14} className="text-emerald-500" />}
                                                    {tx.iconType === 'completion' && <RefreshCw size={14} className="text-blue-500" />}
                                                    {tx.iconType === 'withdrawal' && <ArrowDown size={14} className="text-rose-500" />}
                                                    {tx.iconType === 'investment' && <RefreshCw size={14} className="text-blue-500" />}
                                                    <span>{tx.type}</span>
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 font-mono text-slate-500 font-medium whitespace-nowrap">
                                                {tx.orderRef}
                                            </td>
                                            <td className={`px-6 py-4 font-bold whitespace-nowrap ${
                                                tx.isDebit ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'
                                            }`}>
                                                {tx.isDebit ? '- ' : '+ '}₹{tx.amount.toLocaleString('en-IN')}
                                            </td>
                                            <td className="px-6 py-4 text-right whitespace-nowrap">
                                                {tx.status === 'Credited' && (
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/40">
                                                        <CheckCircle2 size={12} /> Credited
                                                    </span>
                                                )}
                                                {tx.status === 'Processing' && (
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400 border border-blue-200/60 dark:border-blue-800/40">
                                                        <Clock size={12} /> Processing
                                                    </span>
                                                )}
                                                {tx.status === 'Pending Admin Approval' && (
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200/60 dark:border-amber-800/40">
                                                        <Clock size={12} /> Pending Admin
                                                    </span>
                                                )}
                                                {tx.status === 'Rejected' && (
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-200/60 dark:border-rose-800/40">
                                                        <X size={12} /> Rejected
                                                    </span>
                                                )}
                                                {tx.status === 'Debited' && (
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-200/60 dark:border-rose-800/40">
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
            )}
        </div>
    );
}
