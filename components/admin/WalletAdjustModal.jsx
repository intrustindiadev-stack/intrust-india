'use client';

import { useState, useCallback } from 'react';
import { X, AlertTriangle, CheckCircle, Loader2, ArrowUp, ArrowDown, Info } from 'lucide-react';
import { createClient } from '@/lib/supabaseClient';

/**
 * WalletAdjustModal — Reusable modal for admin wallet adjustments.
 *
 * @param {object} props
 * @param {string} props.userId - Target user UUID
 * @param {'customer'|'merchant'} props.walletType
 * @param {number} props.currentBalance - Current balance in rupees
 * @param {function} props.onClose - Called with (actionTaken: boolean)
 * @param {string[]} props.adminPermissions - List of permission strings
 */
export default function WalletAdjustModal({ userId, walletType, currentBalance, onClose, adminPermissions = [] }) {
    const supabase = createClient();

    const [operation, setOperation] = useState('credit');
    const [amount, setAmount] = useState('');
    const [reason, setReason] = useState('');
    const [showConfirm, setShowConfirm] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(null);
    const [idempotencyKey, setIdempotencyKey] = useState(crypto.randomUUID());

    // Determine max amount based on permissions
    const hasFullAccess = adminPermissions.includes('adjust_wallet_any');
    const maxAmount = hasFullAccess ? 1_000_000 : 100_000;

    const parsedAmount = Number(amount) || 0;
    const previewBalance = operation === 'credit'
        ? currentBalance + parsedAmount
        : currentBalance - parsedAmount;

    // Validation
    const amountValid = parsedAmount > 0 && parsedAmount <= maxAmount;
    const debitValid = operation !== 'debit' || parsedAmount <= currentBalance;
    const reasonValid = reason.length >= 10 && reason.length <= 500;
    const formValid = amountValid && debitValid && reasonValid;

    const handleSubmit = useCallback(async () => {
        if (!formValid) return;

        setLoading(true);
        setError('');

        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.access_token) {
                throw new Error('Authentication session expired. Please refresh.');
            }

            const res = await fetch('/api/admin/wallet-adjust', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`,
                },
                body: JSON.stringify({
                    userId,
                    walletType,
                    operation,
                    amountRupees: parsedAmount,
                    reason,
                    idempotencyKey,
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Adjustment failed');
            }

            setSuccess({
                newBalance: data.newBalance,
                auditLogId: data.auditLogId,
                timestamp: data.timestamp,
                duplicate: data.duplicate || false,
            });
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An unexpected error occurred');
            setShowConfirm(false);
        } finally {
            setLoading(false);
        }
    }, [formValid, supabase, userId, walletType, operation, parsedAmount, reason, idempotencyKey]);

    const handleRetry = () => {
        setError('');
        setShowConfirm(true);
    };

    const handleNewAdjustment = () => {
        setSuccess(null);
        setAmount('');
        setReason('');
        setIdempotencyKey(crypto.randomUUID());
        setShowConfirm(false);
        setError('');
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => !loading && onClose(!!success)} />

            {/* Modal */}
            <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                {/* Header */}
                <div className={`px-6 py-5 flex items-center justify-between ${
                    operation === 'credit'
                        ? 'bg-gradient-to-r from-emerald-500 to-teal-500'
                        : 'bg-gradient-to-r from-orange-500 to-red-500'
                } text-white`}>
                    <div>
                        <h2 className="text-lg font-black tracking-tight">
                            Adjust {walletType === 'customer' ? 'Customer' : 'Merchant'} Wallet
                        </h2>
                        <p className="text-white/80 text-xs font-medium mt-0.5">
                            All adjustments are logged for compliance
                        </p>
                    </div>
                    <button
                        onClick={() => !loading && onClose(!!success)}
                        className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
                        disabled={loading}
                    >
                        <X size={16} />
                    </button>
                </div>

                <div className="p-6 space-y-5">
                    {/* Success State */}
                    {success ? (
                        <div className="text-center py-4 space-y-4">
                            <div className="w-16 h-16 mx-auto rounded-full bg-emerald-50 flex items-center justify-center">
                                <CheckCircle size={32} className="text-emerald-500" />
                            </div>
                            <div>
                                <h3 className="text-xl font-black text-slate-900">
                                    {success.duplicate ? 'Already Processed' : 'Adjustment Successful'}
                                </h3>
                                <p className="text-slate-500 text-sm mt-1">
                                    New balance: <span className="font-bold text-slate-900">₹{success.newBalance?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                                </p>
                            </div>
                            <div className="bg-slate-50 rounded-2xl p-4 text-left space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-400 font-medium">Audit Log ID</span>
                                    <span className="font-mono text-xs text-slate-600">{success.auditLogId?.slice(0, 8)}...</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-400 font-medium">Timestamp</span>
                                    <span className="text-slate-600 font-medium">
                                        {success.timestamp ? new Date(success.timestamp).toLocaleString('en-IN') : 'N/A'}
                                    </span>
                                </div>
                            </div>
                            <div className="flex gap-3">
                                <button
                                    onClick={handleNewAdjustment}
                                    className="flex-1 py-3 rounded-xl border-2 border-slate-200 text-slate-700 text-sm font-bold hover:bg-slate-50 transition-colors"
                                >
                                    New Adjustment
                                </button>
                                <button
                                    onClick={() => onClose(true)}
                                    className="flex-1 py-3 rounded-xl bg-slate-900 text-white text-sm font-bold hover:bg-slate-800 transition-colors"
                                >
                                    Done
                                </button>
                            </div>
                        </div>
                    ) : showConfirm ? (
                        /* Confirmation State */
                        <div className="space-y-4">
                            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex gap-3">
                                <AlertTriangle size={20} className="text-amber-500 shrink-0 mt-0.5" />
                                <div>
                                    <h4 className="font-bold text-amber-800 text-sm">Confirm Adjustment</h4>
                                    <p className="text-amber-700 text-xs mt-1">
                                        This action cannot be undone. Please review carefully.
                                    </p>
                                </div>
                            </div>

                            <div className="bg-slate-50 rounded-2xl p-4 space-y-3">
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-400 font-medium">Operation</span>
                                    <span className={`font-bold uppercase text-xs px-2 py-0.5 rounded ${
                                        operation === 'credit' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                                    }`}>
                                        {operation}
                                    </span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-400 font-medium">Amount</span>
                                    <span className="font-black text-slate-900">₹{parsedAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                                </div>
                                <div className="h-px bg-slate-200" />
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-400 font-medium">Current Balance</span>
                                    <span className="font-bold text-slate-600">₹{currentBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-400 font-medium">After Adjustment</span>
                                    <span className={`font-black ${previewBalance >= 0 ? 'text-slate-900' : 'text-red-600'}`}>
                                        ₹{previewBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                    </span>
                                </div>
                            </div>

                            <div className="bg-slate-50 rounded-2xl p-4">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Reason</p>
                                <p className="text-sm text-slate-700 font-medium">{reason}</p>
                            </div>

                            {error && (
                                <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700 font-medium">
                                    {error}
                                </div>
                            )}

                            <div className="flex gap-3">
                                <button
                                    onClick={() => { setShowConfirm(false); setError(''); }}
                                    className="flex-1 py-3 rounded-xl border-2 border-slate-200 text-slate-700 text-sm font-bold hover:bg-slate-50 transition-colors"
                                    disabled={loading}
                                >
                                    Go Back
                                </button>
                                <button
                                    onClick={handleSubmit}
                                    disabled={loading}
                                    className={`flex-1 py-3 rounded-xl text-white text-sm font-bold transition-all flex items-center justify-center gap-2 ${
                                        operation === 'credit'
                                            ? 'bg-emerald-600 hover:bg-emerald-700'
                                            : 'bg-red-600 hover:bg-red-700'
                                    } disabled:opacity-50`}
                                >
                                    {loading ? (
                                        <><Loader2 size={16} className="animate-spin" /> Processing...</>
                                    ) : (
                                        `Confirm ${operation === 'credit' ? 'Credit' : 'Debit'}`
                                    )}
                                </button>
                            </div>
                        </div>
                    ) : (
                        /* Form State */
                        <>
                            {/* Current Balance Display */}
                            <div className="bg-slate-900 rounded-2xl p-4 text-white">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Current Balance</p>
                                <p className="text-2xl font-black tracking-tight">
                                    ₹{currentBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                </p>
                            </div>

                            {/* Operation Toggle */}
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">
                                    Operation Type
                                </label>
                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        onClick={() => setOperation('credit')}
                                        className={`flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all border-2 ${
                                            operation === 'credit'
                                                ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                                                : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'
                                        }`}
                                    >
                                        <ArrowUp size={16} /> Credit (Add)
                                    </button>
                                    <button
                                        onClick={() => setOperation('debit')}
                                        className={`flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all border-2 ${
                                            operation === 'debit'
                                                ? 'border-red-500 bg-red-50 text-red-700'
                                                : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'
                                        }`}
                                    >
                                        <ArrowDown size={16} /> Debit (Remove)
                                    </button>
                                </div>
                            </div>

                            {/* Amount Input */}
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">
                                    Amount (₹)
                                </label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-lg">₹</span>
                                    <input
                                        type="number"
                                        value={amount}
                                        onChange={(e) => setAmount(e.target.value)}
                                        placeholder="0.00"
                                        min="0"
                                        max={maxAmount}
                                        step="0.01"
                                        className="w-full pl-10 pr-4 py-3 rounded-xl border-2 border-slate-200 focus:border-blue-500 focus:ring-0 text-lg font-bold text-slate-900 placeholder:text-slate-300 outline-none transition-colors"
                                    />
                                </div>
                                <div className="flex justify-between mt-1.5">
                                    <p className="text-[10px] text-slate-400 font-medium">
                                        Max: ₹{maxAmount.toLocaleString('en-IN')} per transaction
                                    </p>
                                    {parsedAmount > 0 && !debitValid && (
                                        <p className="text-[10px] text-red-500 font-bold">Exceeds current balance</p>
                                    )}
                                </div>
                            </div>

                            {/* Preview */}
                            {parsedAmount > 0 && (
                                <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 flex items-center gap-3">
                                    <Info size={16} className="text-blue-500 shrink-0" />
                                    <p className="text-sm text-blue-700 font-medium">
                                        Balance after adjustment: <span className="font-bold">₹{previewBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                                    </p>
                                </div>
                            )}

                            {/* Reason */}
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">
                                    Reason for Adjustment
                                </label>
                                <textarea
                                    value={reason}
                                    onChange={(e) => setReason(e.target.value)}
                                    placeholder="Provide a detailed business justification (min 10 characters)..."
                                    rows={3}
                                    maxLength={500}
                                    className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-blue-500 focus:ring-0 text-sm font-medium text-slate-900 placeholder:text-slate-300 resize-none outline-none transition-colors"
                                />
                                <div className="flex justify-between mt-1">
                                    <p className={`text-[10px] font-medium ${reason.length >= 10 ? 'text-emerald-500' : 'text-slate-400'}`}>
                                        {reason.length < 10 ? `${10 - reason.length} more characters needed` : '✓ Valid'}
                                    </p>
                                    <p className={`text-[10px] font-bold ${reason.length > 450 ? 'text-amber-500' : 'text-slate-400'}`}>
                                        {reason.length}/500
                                    </p>
                                </div>
                            </div>

                            {/* Error */}
                            {error && (
                                <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700 font-medium flex items-center justify-between">
                                    <span>{error}</span>
                                    <button onClick={handleRetry} className="text-red-600 font-bold text-xs underline">Retry</button>
                                </div>
                            )}

                            {/* Submit */}
                            <button
                                onClick={() => setShowConfirm(true)}
                                disabled={!formValid}
                                className={`w-full py-3.5 rounded-xl text-white text-sm font-bold transition-all ${
                                    formValid
                                        ? operation === 'credit'
                                            ? 'bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-200'
                                            : 'bg-red-600 hover:bg-red-700 shadow-lg shadow-red-200'
                                        : 'bg-slate-300 cursor-not-allowed'
                                }`}
                            >
                                Review {operation === 'credit' ? 'Credit' : 'Debit'} →
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
