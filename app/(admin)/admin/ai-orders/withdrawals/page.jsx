'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
    CheckCircle2, 
    XCircle,
    Clock, 
    Wallet, 
    ArrowRight,
    Loader2
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function AdminWithdrawalsPage() {
    const [withdrawals, setWithdrawals] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [processingId, setProcessingId] = useState(null);

    const fetchWithdrawals = async () => {
        setIsLoading(true);
        try {
            const res = await fetch('/api/admin/ai-orders/withdrawals');
            if (!res.ok) throw new Error('Failed to fetch withdrawals');
            const data = await res.json();
            setWithdrawals(data.withdrawals || []);
        } catch (error) {
            toast.error(error.message || 'Error loading withdrawals');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchWithdrawals();
    }, []);

    const handleAction = async (id, action) => {
        if (!confirm(`Are you sure you want to ${action} this withdrawal?`)) return;

        setProcessingId(id);
        try {
            const res = await fetch(`/api/admin/ai-orders/withdrawals/${id}/${action}`, {
                method: 'POST'
            });
            const data = await res.json();
            
            if (!res.ok) throw new Error(data.error || `Failed to ${action} withdrawal`);
            
            toast.success(`Withdrawal ${action}d successfully`);
            fetchWithdrawals();
        } catch (error) {
            toast.error(error.message || `Error trying to ${action}`);
        } finally {
            setProcessingId(null);
        }
    };

    if (isLoading) {
        return (
            <div className="flex h-[60vh] flex-col items-center justify-center gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-slate-900 dark:text-white" />
                <p className="text-xs text-slate-400 font-medium">Loading withdrawal requests...</p>
            </div>
        );
    }

    return (
        <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                        Vault Withdrawals
                    </h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                        Review and approve merchant withdrawal requests from their AI Orders Vault.
                    </p>
                </div>
                <button
                    onClick={() => fetchWithdrawals()}
                    className="inline-flex items-center justify-center px-4 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                    Refresh List
                </button>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden">
                {withdrawals.length === 0 ? (
                    <div className="p-12 text-center text-slate-500 dark:text-slate-400">
                        No withdrawal requests found.
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm text-slate-700 dark:text-slate-300">
                            <thead className="bg-slate-50 dark:bg-slate-950 text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
                                <tr>
                                    <th className="px-6 py-4">Request Date</th>
                                    <th className="px-6 py-4">Merchant</th>
                                    <th className="px-6 py-4">Amount</th>
                                    <th className="px-6 py-4">Status</th>
                                    <th className="px-6 py-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                                {withdrawals.map((req) => (
                                    <tr key={req.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                                        <td className="px-6 py-4 text-slate-500 font-medium whitespace-nowrap">
                                            {new Date(req.created_at).toLocaleString('en-IN', {
                                                month: 'short', day: 'numeric', year: 'numeric',
                                                hour: '2-digit', minute: '2-digit'
                                            })}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="font-bold text-slate-900 dark:text-white">
                                                {req.ai_orders_vault?.merchants?.business_name || 'Unknown Merchant'}
                                            </div>
                                            <div className="text-xs text-slate-500">
                                                {req.ai_orders_vault?.merchants?.email}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap font-black text-rose-600 dark:text-rose-400">
                                            ₹{(req.amount_paise / 100).toLocaleString('en-IN')}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {req.status === 'PENDING' && (
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-600 border border-amber-200/60">
                                                    <Clock size={12} /> PENDING
                                                </span>
                                            )}
                                            {req.status === 'COMPLETED' && (
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-200/60">
                                                    <CheckCircle2 size={12} /> APPROVED
                                                </span>
                                            )}
                                            {req.status === 'REJECTED' && (
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-50 text-rose-600 border border-rose-200/60">
                                                    <XCircle size={12} /> REJECTED
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right">
                                            {req.status === 'PENDING' && (
                                                <div className="flex items-center justify-end gap-2">
                                                    <button
                                                        onClick={() => handleAction(req.id, 'reject')}
                                                        disabled={processingId === req.id}
                                                        className="px-3 py-1.5 rounded-lg text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 transition-colors disabled:opacity-50"
                                                    >
                                                        Reject
                                                    </button>
                                                    <button
                                                        onClick={() => handleAction(req.id, 'approve')}
                                                        disabled={processingId === req.id}
                                                        className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors disabled:opacity-50"
                                                    >
                                                        {processingId === req.id ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                                                        Approve
                                                    </button>
                                                </div>
                                            )}
                                            {req.status !== 'PENDING' && (
                                                <span className="text-xs text-slate-400 italic">No actions available</span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
