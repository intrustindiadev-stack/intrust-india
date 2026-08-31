'use client';

import { useState, useEffect } from 'react';
import { X, Loader2, TrendingUp, TrendingDown, Equal, RefreshCw, ArrowRight, User, Clock, FileText } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { createClient } from '@/lib/supabaseClient';
import { TRANSACTION_TYPE_LABELS } from '@/types/ai-grow';

function formatCurrency(amount) {
    return `₹${Number(amount || 0).toLocaleString('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    })}`;
}

function formatFullDate(dateStr) {
    return new Date(dateStr).toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
    });
}

function TransactionTypeBadge({ type }) {
    const configs = {
        credit: { label: 'Credit', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', Icon: TrendingUp },
        debit: { label: 'Debit', bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200', Icon: TrendingDown },
        admin_adjustment: { label: 'Override', bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200', Icon: Equal },
        yield_payout: { label: 'Yield Payout', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', Icon: TrendingUp },
        reversal: { label: 'Reversal', bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-200', Icon: RefreshCw },
    };
    const cfg = configs[type] || configs.reversal;
    const Icon = cfg.Icon;

    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${cfg.bg} ${cfg.text} ${cfg.border}`}>
            <Icon size={11} />
            {cfg.label}
        </span>
    );
}

function DeltaAmount({ type, amount, previousBalance, newBalance }) {
    const delta = newBalance - previousBalance;

    if (type === 'admin_adjustment') {
        return (
            <span className="font-mono font-semibold text-sm text-indigo-600 flex items-center gap-1">
                <Equal size={13} />
                {formatCurrency(newBalance)}
            </span>
        );
    }

    const isPositive = delta >= 0;
    return (
        <span className={`font-mono font-semibold text-sm flex items-center gap-1 ${isPositive ? 'text-emerald-600' : 'text-rose-600'}`}>
            {isPositive ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
            {isPositive ? '+' : ''}{formatCurrency(Math.abs(delta))}
        </span>
    );
}

export default function WalletAuditDrawer({ isOpen, onClose, merchant }) {
    const supabase = createClient();
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (isOpen && merchant?.merchant_id) {
            fetchTransactions();
        }
        if (!isOpen) {
            setTransactions([]);
            setError('');
        }
    }, [isOpen, merchant?.merchant_id]);

    async function fetchTransactions() {
        setLoading(true);
        setError('');
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error('Session expired.');

            const { data, error: dbErr } = await supabase
                .from('ai_grow_wallet_transactions')
                .select(`
                    id,
                    wallet_id,
                    merchant_id,
                    admin_id,
                    transaction_type,
                    amount,
                    previous_balance,
                    new_balance,
                    reason,
                    metadata,
                    created_at
                `)
                .eq('merchant_id', merchant.merchant_id)
                .order('created_at', { ascending: false })
                .limit(100);

            if (dbErr) throw new Error(dbErr.message);
            setTransactions(data || []);
        } catch (err) {
            setError(err.message || 'Failed to load audit history.');
        } finally {
            setLoading(false);
        }
    }

    // Close on Escape
    useEffect(() => {
        if (!isOpen) return;
        const handler = (e) => { if (e.key === 'Escape') onClose(); };
        document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, [isOpen, onClose]);

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm"
                        onClick={onClose}
                    />

                    {/* Drawer */}
                    <motion.div
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        transition={{ type: 'spring', stiffness: 350, damping: 35 }}
                        className="fixed right-0 top-0 h-full z-50 w-full max-w-xl bg-white shadow-2xl flex flex-col"
                    >
                        {/* Header */}
                        <div className="flex items-start justify-between p-5 border-b border-gray-100 flex-shrink-0">
                            <div>
                                <h2 className="text-base font-bold text-gray-900">Wallet Audit Trail</h2>
                                <p className="text-sm text-gray-500 mt-0.5">
                                    {merchant?.merchant?.business_name}
                                </p>
                                <p className="text-xs text-gray-400 font-mono mt-0.5">
                                    Wallet · {merchant?.id?.slice(0, 16)}…
                                </p>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={fetchTransactions}
                                    disabled={loading}
                                    className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors disabled:opacity-50"
                                    title="Refresh"
                                >
                                    <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                                </button>
                                <button
                                    onClick={onClose}
                                    className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                                >
                                    <X size={18} />
                                </button>
                            </div>
                        </div>

                        {/* Current Balance Strip */}
                        <div className="px-5 py-3 bg-gray-50 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
                            <span className="text-xs font-medium text-gray-500">Current Balance</span>
                            <span className="font-mono font-bold text-gray-900 text-sm">
                                {formatCurrency(merchant?.balance)}
                                <span className="text-xs text-gray-400 ml-1">{merchant?.currency || 'INR'}</span>
                            </span>
                        </div>

                        {/* Transaction List */}
                        <div className="flex-1 overflow-y-auto">
                            {loading ? (
                                <div className="flex flex-col items-center justify-center py-20 gap-3 text-gray-400">
                                    <Loader2 size={24} className="animate-spin text-indigo-500" />
                                    <p className="text-sm">Loading audit trail…</p>
                                </div>
                            ) : error ? (
                                <div className="p-6 text-center">
                                    <p className="text-sm text-red-600">{error}</p>
                                    <button onClick={fetchTransactions} className="mt-3 text-xs text-indigo-600 hover:underline">
                                        Try again
                                    </button>
                                </div>
                            ) : transactions.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-20 gap-2 text-gray-400">
                                    <FileText size={28} />
                                    <p className="text-sm">No transactions found for this wallet.</p>
                                </div>
                            ) : (
                                <div className="divide-y divide-gray-50">
                                    {transactions.map((tx, idx) => (
                                        <motion.div
                                            key={tx.id}
                                            initial={{ opacity: 0, y: 8 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: idx * 0.03 }}
                                            className="p-5 hover:bg-gray-50/50 transition-colors"
                                        >
                                            {/* Top Row: Type + Delta */}
                                            <div className="flex items-start justify-between mb-3">
                                                <TransactionTypeBadge type={tx.transaction_type} />
                                                <DeltaAmount
                                                    type={tx.transaction_type}
                                                    amount={tx.amount}
                                                    previousBalance={parseFloat(tx.previous_balance)}
                                                    newBalance={parseFloat(tx.new_balance)}
                                                />
                                            </div>

                                            {/* Balance Progression */}
                                            <div className="flex items-center gap-2 mb-3 text-xs text-gray-500 font-mono">
                                                <span className="text-gray-400">Previous:</span>
                                                <span className="font-semibold text-gray-700">{formatCurrency(tx.previous_balance)}</span>
                                                <ArrowRight size={12} className="text-gray-300" />
                                                <span className="text-gray-400">New:</span>
                                                <span className="font-semibold text-gray-900">{formatCurrency(tx.new_balance)}</span>
                                            </div>

                                            {/* Reason */}
                                            <div className="bg-gray-50 border border-gray-100 rounded-lg px-3 py-2 mb-3">
                                                <p className="text-xs font-medium text-gray-400 mb-0.5 flex items-center gap-1">
                                                    <FileText size={10} />
                                                    Reason
                                                </p>
                                                <p className="text-sm text-gray-700 leading-relaxed">{tx.reason}</p>
                                            </div>

                                            {/* Meta Footer */}
                                            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-400">
                                                <span className="flex items-center gap-1">
                                                    <Clock size={11} />
                                                    {formatFullDate(tx.created_at)}
                                                </span>
                                                {tx.admin_id && (
                                                    <span className="flex items-center gap-1">
                                                        <User size={11} />
                                                        <span className="font-mono">{tx.admin_id.slice(0, 8)}…</span>
                                                    </span>
                                                )}
                                                <span className="font-mono text-gray-300">
                                                    #{tx.id.slice(0, 8)}
                                                </span>
                                            </div>
                                        </motion.div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        {transactions.length > 0 && (
                            <div className="px-5 py-3 border-t border-gray-100 bg-gray-50/50 flex-shrink-0">
                                <p className="text-xs text-gray-400">
                                    {transactions.length} transaction{transactions.length !== 1 ? 's' : ''} · Immutable audit ledger
                                </p>
                            </div>
                        )}
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
