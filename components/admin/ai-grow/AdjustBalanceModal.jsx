'use client';

import { useState, useEffect, useCallback } from 'react';
import { X, AlertTriangle, CheckCircle, Loader2, TrendingUp, TrendingDown, Equal, AlertCircle } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { createClient } from '@/lib/supabaseClient';
import toast from 'react-hot-toast';

const TABS = [
    {
        id: 'credit',
        label: 'Credit',
        icon: TrendingUp,
        badge: '+',
        theme: {
            active: 'bg-emerald-600 text-white shadow-emerald-200',
            badge: 'bg-emerald-100 text-emerald-700',
            accent: 'text-emerald-600',
            ring: 'focus:ring-emerald-500/30 focus:border-emerald-400',
            highlight: 'border-emerald-200 bg-emerald-50/50',
            button: 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200',
            confirm: 'bg-emerald-50 border-emerald-200 text-emerald-800',
            confirmBtn: 'bg-emerald-600 hover:bg-emerald-700',
        },
    },
    {
        id: 'debit',
        label: 'Debit',
        icon: TrendingDown,
        badge: '−',
        theme: {
            active: 'bg-rose-600 text-white shadow-rose-200',
            badge: 'bg-rose-100 text-rose-700',
            accent: 'text-rose-600',
            ring: 'focus:ring-rose-500/30 focus:border-rose-400',
            highlight: 'border-rose-200 bg-rose-50/50',
            button: 'bg-rose-600 hover:bg-rose-700 shadow-rose-200',
            confirm: 'bg-rose-50 border-rose-200 text-rose-800',
            confirmBtn: 'bg-rose-600 hover:bg-rose-700',
        },
    },
    {
        id: 'admin_adjustment',
        label: 'Override',
        icon: Equal,
        badge: '=',
        theme: {
            active: 'bg-indigo-600 text-white shadow-indigo-200',
            badge: 'bg-indigo-100 text-indigo-700',
            accent: 'text-indigo-600',
            ring: 'focus:ring-indigo-500/30 focus:border-indigo-400',
            highlight: 'border-indigo-200 bg-indigo-50/50',
            button: 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200',
            confirm: 'bg-indigo-50 border-indigo-200 text-indigo-800',
            confirmBtn: 'bg-indigo-600 hover:bg-indigo-700',
        },
    },
];

function formatCurrency(amount) {
    return `₹${Number(amount || 0).toLocaleString('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    })}`;
}

function computeProjectedBalance(currentBalance, tab, amount) {
    const n = parseFloat(amount) || 0;
    if (tab === 'credit') return currentBalance + n;
    if (tab === 'debit') return currentBalance - n;
    if (tab === 'admin_adjustment') return n;
    return currentBalance;
}

function computeDelta(currentBalance, tab, amount) {
    const projected = computeProjectedBalance(currentBalance, tab, amount);
    return projected - currentBalance;
}

export default function AdjustBalanceModal({ isOpen, onClose, merchant, onSuccess }) {
    const supabase = createClient();

    const [activeTab, setActiveTab] = useState('credit');
    const [amount, setAmount] = useState('');
    const [reason, setReason] = useState('');
    const [confirmStep, setConfirmStep] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const tab = TABS.find(t => t.id === activeTab);
    const currentBalance = parseFloat(merchant?.balance || 0);
    const parsedAmount = parseFloat(amount) || 0;
    const projectedBalance = computeProjectedBalance(currentBalance, activeTab, amount);
    const delta = computeDelta(currentBalance, activeTab, amount);

    const isDebitOverflow = activeTab === 'debit' && parsedAmount > currentBalance;
    const amountValid = parsedAmount > 0 && !isDebitOverflow;
    const reasonValid = reason.trim().length >= 10 && reason.trim().length <= 500;
    const formValid = amountValid && reasonValid;

    // Reset state when modal opens or tab changes
    useEffect(() => {
        if (isOpen) {
            setAmount('');
            setReason('');
            setConfirmStep(false);
            setError('');
            setActiveTab('credit');
        }
    }, [isOpen]);

    useEffect(() => {
        setAmount('');
        setError('');
        setConfirmStep(false);
    }, [activeTab]);

    // Close on Escape
    useEffect(() => {
        if (!isOpen) return;
        const handler = (e) => { if (e.key === 'Escape') onClose(); };
        document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, [isOpen, onClose]);

    const handleSubmit = useCallback(async () => {
        if (!formValid || loading) return;
        setLoading(true);
        setError('');

        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.access_token) throw new Error('Session expired. Please refresh.');

            const res = await fetch('/api/admin/ai-grow/adjust-wallet', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`,
                },
                body: JSON.stringify({
                    merchant_id: merchant.merchant_id,
                    adjustment_type: activeTab,
                    amount: parsedAmount,
                    reason: reason.trim(),
                }),
            });

            const result = await res.json();
            if (!res.ok) throw new Error(result.error || 'Adjustment failed');

            toast.success(
                `${activeTab === 'credit' ? 'Credited' : activeTab === 'debit' ? 'Debited' : 'Override set'} successfully! New balance: ${formatCurrency(result.data?.new_balance)}`,
                { duration: 5000 }
            );
            onSuccess?.(result.data);
            onClose();
        } catch (err) {
            const msg = err instanceof Error ? err.message : 'An unexpected error occurred';
            setError(msg);
            toast.error(msg);
            setConfirmStep(false);
        } finally {
            setLoading(false);
        }
    }, [formValid, loading, supabase, merchant, activeTab, parsedAmount, reason, onSuccess, onClose]);

    if (!isOpen || !merchant) return null;

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
                        onClick={onClose}
                    />

                    {/* Modal */}
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.96, y: 12 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.96, y: 12 }}
                            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                            className="pointer-events-auto w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden"
                        >
                            {/* Header */}
                            <div className="flex items-start justify-between p-6 border-b border-gray-50">
                                <div>
                                    <h2 className="text-lg font-bold text-gray-900">Adjust Investment Wallet</h2>
                                    <p className="text-sm text-gray-500 mt-0.5">
                                        {merchant.merchant?.business_name}
                                        <span className="mx-1.5 text-gray-300">·</span>
                                        <span className="font-mono text-xs">{merchant.merchant_id?.slice(0, 8)}…</span>
                                    </p>
                                </div>
                                <button
                                    onClick={onClose}
                                    className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                                >
                                    <X size={18} />
                                </button>
                            </div>

                            <div className="p-6 space-y-5">
                                {/* Tabs */}
                                <div className="flex gap-1.5 bg-gray-100 p-1 rounded-xl">
                                    {TABS.map(t => (
                                        <button
                                            key={t.id}
                                            onClick={() => setActiveTab(t.id)}
                                            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-semibold transition-all ${
                                                activeTab === t.id
                                                    ? `${t.theme.active} shadow-sm`
                                                    : 'text-gray-500 hover:text-gray-700'
                                            }`}
                                        >
                                            <span className={`text-xs font-bold ${activeTab === t.id ? 'opacity-80' : ''}`}>
                                                {t.badge}
                                            </span>
                                            {t.label}
                                        </button>
                                    ))}
                                </div>

                                {/* Balance Preview Card */}
                                <div className={`rounded-xl border p-4 ${tab.theme.highlight}`}>
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-gray-600 font-medium">Current Balance</span>
                                        <span className="font-mono font-bold text-gray-900">{formatCurrency(currentBalance)}</span>
                                    </div>
                                    {parsedAmount > 0 && (
                                        <motion.div
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: 'auto' }}
                                            className="mt-3 pt-3 border-t border-current/10 space-y-1.5"
                                        >
                                            <div className="flex items-center justify-between text-sm">
                                                <span className="text-gray-500">
                                                    {activeTab === 'credit' ? 'Adding' : activeTab === 'debit' ? 'Removing' : 'Setting to'}
                                                </span>
                                                <span className={`font-mono font-semibold ${tab.theme.accent}`}>
                                                    {activeTab === 'admin_adjustment' ? formatCurrency(parsedAmount) : `${delta >= 0 ? '+' : ''}${formatCurrency(Math.abs(delta))}`}
                                                </span>
                                            </div>
                                            <div className="flex items-center justify-between text-sm">
                                                <span className="font-semibold text-gray-700">Projected Balance</span>
                                                <span className={`font-mono font-bold text-lg ${isDebitOverflow ? 'text-red-600' : 'text-gray-900'}`}>
                                                    {isDebitOverflow ? (
                                                        <span className="flex items-center gap-1 text-red-600 text-sm">
                                                            <AlertCircle size={14} />
                                                            Insufficient balance
                                                        </span>
                                                    ) : formatCurrency(projectedBalance)}
                                                </span>
                                            </div>
                                        </motion.div>
                                    )}
                                </div>

                                {/* Amount Input */}
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                                        {activeTab === 'admin_adjustment' ? 'New Target Balance (₹)' : 'Amount (₹)'}
                                    </label>
                                    <div className="relative">
                                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 font-medium text-sm">₹</span>
                                        <input
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            value={amount}
                                            onChange={e => setAmount(e.target.value)}
                                            placeholder="0.00"
                                            className={`w-full pl-8 pr-4 py-2.5 text-sm border rounded-xl font-mono focus:outline-none focus:ring-2 transition-all ${
                                                isDebitOverflow
                                                    ? 'border-red-300 focus:ring-red-500/20 bg-red-50/50'
                                                    : `border-gray-200 ${tab.theme.ring} bg-gray-50`
                                            }`}
                                        />
                                    </div>
                                    {isDebitOverflow && (
                                        <p className="mt-1.5 text-xs text-red-600 flex items-center gap-1">
                                            <AlertTriangle size={12} />
                                            Debit amount exceeds available balance of {formatCurrency(currentBalance)}.
                                        </p>
                                    )}
                                </div>

                                {/* Reason Textarea */}
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                                        Audit Reason
                                        <span className="text-red-500 ml-0.5">*</span>
                                    </label>
                                    <textarea
                                        value={reason}
                                        onChange={e => setReason(e.target.value)}
                                        rows={3}
                                        maxLength={500}
                                        placeholder="Provide a detailed reason for this adjustment (min. 10 characters)…"
                                        className={`w-full px-3.5 py-2.5 text-sm border rounded-xl resize-none focus:outline-none focus:ring-2 transition-all ${
                                            reason.length > 0 && reason.trim().length < 10
                                                ? 'border-amber-300 focus:ring-amber-500/20 bg-amber-50/30'
                                                : `border-gray-200 ${tab.theme.ring} bg-gray-50`
                                        }`}
                                    />
                                    <div className="flex justify-between mt-1">
                                        <p className="text-xs text-gray-400">Minimum 10 characters required for audit trail</p>
                                        <p className={`text-xs tabular-nums font-mono ${reason.length > 480 ? 'text-amber-500' : 'text-gray-400'}`}>
                                            {reason.length}/500
                                        </p>
                                    </div>
                                </div>

                                {/* Error Banner */}
                                {error && (
                                    <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
                                        <AlertTriangle size={15} className="flex-shrink-0 mt-0.5" />
                                        <p>{error}</p>
                                    </div>
                                )}

                                {/* Confirmation Step Banner */}
                                <AnimatePresence>
                                    {confirmStep && (
                                        <motion.div
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: 'auto' }}
                                            exit={{ opacity: 0, height: 0 }}
                                            className={`p-4 rounded-xl border ${tab.theme.confirm}`}
                                        >
                                            <div className="flex items-start gap-2">
                                                <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
                                                <div className="text-sm">
                                                    <p className="font-semibold mb-0.5">Confirm Adjustment</p>
                                                    <p className="opacity-80">
                                                        You are about to{' '}
                                                        <strong>
                                                            {activeTab === 'credit' ? 'CREDIT' : activeTab === 'debit' ? 'DEBIT' : 'OVERRIDE to'}{' '}
                                                            {formatCurrency(parsedAmount)}
                                                        </strong>{' '}
                                                        {activeTab !== 'admin_adjustment' && 'to '}
                                                        <strong>{merchant.merchant?.business_name}</strong>.
                                                        This action will be permanently written to the audit log.
                                                    </p>
                                                </div>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                {/* Actions */}
                                <div className="flex gap-3 pt-1">
                                    <button
                                        onClick={onClose}
                                        className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
                                    >
                                        Cancel
                                    </button>

                                    {!confirmStep ? (
                                        <button
                                            disabled={!formValid}
                                            onClick={() => setConfirmStep(true)}
                                            className={`flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition-all shadow-sm disabled:opacity-40 disabled:cursor-not-allowed ${tab.theme.button}`}
                                        >
                                            Review Adjustment
                                        </button>
                                    ) : (
                                        <button
                                            disabled={loading}
                                            onClick={handleSubmit}
                                            className={`flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition-all shadow-sm disabled:opacity-60 ${tab.theme.confirmBtn}`}
                                        >
                                            {loading ? (
                                                <span className="flex items-center justify-center gap-2">
                                                    <Loader2 size={15} className="animate-spin" />
                                                    Processing…
                                                </span>
                                            ) : (
                                                <span className="flex items-center justify-center gap-1.5">
                                                    <CheckCircle size={15} />
                                                    Confirm &amp; Execute
                                                </span>
                                            )}
                                        </button>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    </div>
                </>
            )}
        </AnimatePresence>
    );
}
