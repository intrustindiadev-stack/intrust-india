'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { 
    CheckCircle2, 
    XCircle,
    Clock, 
    Wallet, 
    ArrowLeft,
    RefreshCw,
    Loader2,
    Phone,
    Mail,
    AlertCircle,
    Sparkles
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function AdminWithdrawalsPage() {
    const [withdrawals, setWithdrawals] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [processingId, setProcessingId] = useState(null);
    const [filterStatus, setFilterStatus] = useState('ALL');

    const fetchWithdrawals = async (silent = false) => {
        if (!silent) setIsLoading(true);
        else setIsRefreshing(true);

        try {
            const res = await fetch('/api/admin/ai-orders/withdrawals');
            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.error || 'Failed to fetch withdrawals');
            }
            const data = await res.json();
            setWithdrawals(data.withdrawals || []);
        } catch (error) {
            console.error('Error loading withdrawals:', error);
            toast.error(error.message || 'Error loading withdrawals');
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    };

    useEffect(() => {
        fetchWithdrawals();
    }, []);

    const handleAction = async (id, action) => {
        const actionLabel = action === 'approve' ? 'approve and credit wallet for' : 'reject and refund';
        if (!confirm(`Are you sure you want to ${actionLabel} this withdrawal request?`)) return;

        setProcessingId(id);
        try {
            const res = await fetch(`/api/admin/ai-orders/withdrawals/${id}/${action}`, {
                method: 'POST'
            });
            const data = await res.json();
            
            if (!res.ok) throw new Error(data.error || `Failed to ${action} withdrawal`);
            
            toast.success(action === 'approve' ? 'Withdrawal approved! Merchant wallet credited.' : 'Withdrawal rejected. Funds refunded to vault.');
            fetchWithdrawals(true);
        } catch (error) {
            toast.error(error.message || `Error trying to ${action}`);
        } finally {
            setProcessingId(null);
        }
    };

    const stats = useMemo(() => {
        const total = withdrawals.length;
        const pending = withdrawals.filter(w => w.status === 'PENDING').length;
        const approved = withdrawals.filter(w => w.status === 'COMPLETED').length;
        const rejected = withdrawals.filter(w => w.status === 'REJECTED').length;
        const pendingAmount = withdrawals
            .filter(w => w.status === 'PENDING')
            .reduce((acc, w) => acc + (w.amount_paise || 0), 0) / 100;

        return { total, pending, approved, rejected, pendingAmount };
    }, [withdrawals]);

    const filteredWithdrawals = useMemo(() => {
        if (filterStatus === 'ALL') return withdrawals;
        return withdrawals.filter(w => w.status === filterStatus);
    }, [withdrawals, filterStatus]);

    if (isLoading) {
        return (
            <div className="flex h-[60vh] flex-col items-center justify-center gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                <p className="text-xs text-slate-400 font-medium">Loading withdrawal requests...</p>
            </div>
        );
    }

    return (
        <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
            {/* Top Navigation & Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2 mb-1.5">
                        <Link 
                            href="/admin/ai-orders"
                            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
                        >
                            <ArrowLeft size={14} /> Back to AI Orders
                        </Link>
                    </div>
                    <div className="flex items-center gap-3">
                        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                            AI Vault Withdrawals
                        </h1>
                        {stats.pending > 0 && (
                            <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-800/80 animate-pulse">
                                {stats.pending} Action Required
                            </span>
                        )}
                    </div>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                        Review, approve, and settle merchant withdrawal requests from their AI Orders Vault to InTrust Wallet.
                    </p>
                </div>

                <div className="flex items-center gap-2.5">
                    <button
                        onClick={() => fetchWithdrawals(true)}
                        disabled={isRefreshing}
                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-xs active:scale-95 disabled:opacity-50"
                    >
                        <RefreshCw size={14} className={isRefreshing ? 'animate-spin text-blue-600' : ''} />
                        <span>Refresh</span>
                    </button>
                    <Link
                        href="/admin/ai-orders"
                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold shadow-xs hover:bg-slate-800 dark:hover:bg-slate-100 transition-all active:scale-95"
                    >
                        <Sparkles size={14} />
                        <span>AI Orders Feed</span>
                    </Link>
                </div>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div 
                    onClick={() => setFilterStatus('ALL')}
                    className={`p-5 rounded-2xl border transition-all cursor-pointer ${
                        filterStatus === 'ALL'
                            ? 'bg-blue-50/50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800/60 shadow-xs'
                            : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 hover:border-slate-300'
                    }`}
                >
                    <div className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total Requests</div>
                    <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">{stats.total}</div>
                </div>

                <div 
                    onClick={() => setFilterStatus('PENDING')}
                    className={`p-5 rounded-2xl border transition-all cursor-pointer ${
                        filterStatus === 'PENDING'
                            ? 'bg-amber-50/70 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800 shadow-xs'
                            : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 hover:border-slate-300'
                    }`}
                >
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider">Pending Approval</span>
                        <Clock size={16} className="text-amber-500" />
                    </div>
                    <div className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">{stats.pending}</div>
                    <div className="text-[11px] font-semibold text-slate-400 mt-0.5">₹{stats.pendingAmount.toLocaleString('en-IN')} pending</div>
                </div>

                <div 
                    onClick={() => setFilterStatus('COMPLETED')}
                    className={`p-5 rounded-2xl border transition-all cursor-pointer ${
                        filterStatus === 'COMPLETED'
                            ? 'bg-emerald-50/70 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 shadow-xs'
                            : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 hover:border-slate-300'
                    }`}
                >
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">Approved & Paid</span>
                        <CheckCircle2 size={16} className="text-emerald-500" />
                    </div>
                    <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">{stats.approved}</div>
                </div>

                <div 
                    onClick={() => setFilterStatus('REJECTED')}
                    className={`p-5 rounded-2xl border transition-all cursor-pointer ${
                        filterStatus === 'REJECTED'
                            ? 'bg-rose-50/70 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800 shadow-xs'
                            : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 hover:border-slate-300'
                    }`}
                >
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-rose-700 dark:text-rose-400 uppercase tracking-wider">Rejected</span>
                        <XCircle size={16} className="text-rose-500" />
                    </div>
                    <div className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-1">{stats.rejected}</div>
                </div>
            </div>

            {/* Withdrawals Table Card */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                    <div className="text-sm font-bold text-slate-800 dark:text-white">
                        Showing {filteredWithdrawals.length} request{filteredWithdrawals.length === 1 ? '' : 's'}
                    </div>
                    {filterStatus !== 'ALL' && (
                        <button
                            onClick={() => setFilterStatus('ALL')}
                            className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline"
                        >
                            Clear Filter
                        </button>
                    )}
                </div>

                {filteredWithdrawals.length === 0 ? (
                    <div className="p-16 text-center text-slate-500 dark:text-slate-400 space-y-2">
                        <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto text-slate-400 mb-2">
                            <Wallet size={24} />
                        </div>
                        <p className="text-sm font-bold text-slate-700 dark:text-slate-300">No withdrawal requests found</p>
                        <p className="text-xs text-slate-400 max-w-sm mx-auto">
                            When merchants withdraw earnings from their AI Orders Vault to InTrust Wallet, they will appear here.
                        </p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm text-slate-700 dark:text-slate-300">
                            <thead className="bg-slate-50 dark:bg-slate-950 text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
                                <tr>
                                    <th className="px-6 py-4">Request Date</th>
                                    <th className="px-6 py-4">Merchant</th>
                                    <th className="px-6 py-4">Amount</th>
                                    <th className="px-6 py-4">Destination</th>
                                    <th className="px-6 py-4">Status</th>
                                    <th className="px-6 py-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                                {filteredWithdrawals.map((req) => (
                                    <tr key={req.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                                        <td className="px-6 py-4 text-slate-500 font-medium whitespace-nowrap">
                                            <div className="font-bold text-slate-900 dark:text-white">
                                                {new Date(req.created_at).toLocaleDateString('en-IN', {
                                                    month: 'short', day: 'numeric', year: 'numeric'
                                                })}
                                            </div>
                                            <div className="text-xs text-slate-400">
                                                {new Date(req.created_at).toLocaleTimeString('en-IN', {
                                                    hour: '2-digit', minute: '2-digit'
                                                })}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="font-bold text-slate-900 dark:text-white">
                                                {req.ai_orders_vault?.merchants?.business_name || 'Merchant Owner'}
                                            </div>
                                            <div className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
                                                <Mail size={11} className="text-slate-400" />
                                                <span>{req.ai_orders_vault?.merchants?.email}</span>
                                            </div>
                                            {req.ai_orders_vault?.merchants?.phone && req.ai_orders_vault?.merchants?.phone !== '—' && (
                                                <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                                                    <Phone size={10} className="text-slate-400" />
                                                    <span>{req.ai_orders_vault?.merchants?.phone}</span>
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="font-black text-base text-slate-900 dark:text-white">
                                                ₹{((req.amount_paise || 0) / 100).toLocaleString('en-IN')}
                                            </div>
                                            <div className="text-[10px] text-slate-400 uppercase font-semibold">
                                                Vault Debit
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300">
                                                <Wallet size={12} className="text-emerald-500" /> InTrust Wallet
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {req.status === 'PENDING' && (
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200/80 dark:border-amber-800/60">
                                                    <Clock size={12} /> PENDING
                                                </span>
                                            )}
                                            {req.status === 'COMPLETED' && (
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200/80 dark:border-emerald-800/60">
                                                    <CheckCircle2 size={12} /> APPROVED & CREDITED
                                                </span>
                                            )}
                                            {req.status === 'REJECTED' && (
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-200/80 dark:border-rose-800/60">
                                                    <XCircle size={12} /> REJECTED & REFUNDED
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right">
                                            {req.status === 'PENDING' && (
                                                <div className="flex items-center justify-end gap-2">
                                                    <button
                                                        onClick={() => handleAction(req.id, 'reject')}
                                                        disabled={processingId === req.id}
                                                        className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-rose-600 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/40 transition-all disabled:opacity-50 active:scale-95"
                                                    >
                                                        Reject
                                                    </button>
                                                    <button
                                                        onClick={() => handleAction(req.id, 'approve')}
                                                        disabled={processingId === req.id}
                                                        className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-xs hover:shadow-md transition-all disabled:opacity-50 active:scale-95"
                                                    >
                                                        {processingId === req.id ? (
                                                            <Loader2 size={14} className="animate-spin" />
                                                        ) : (
                                                            <CheckCircle2 size={14} />
                                                        )}
                                                        Approve
                                                    </button>
                                                </div>
                                            )}
                                            {req.status !== 'PENDING' && (
                                                <span className="text-xs text-slate-400 italic">Completed</span>
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
