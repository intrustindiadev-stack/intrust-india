'use client';

import { useState, useCallback } from 'react';
import { X, AlertTriangle, CheckCircle, Loader2, ArrowUp, ArrowDown, Info, Wallet } from 'lucide-react';
import { createClient } from '@/lib/supabaseClient';

/**
 * WalletAdjustModal — modern reusable modal for admin wallet adjustments.
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

    const hasFullAccess = adminPermissions.includes('adjust_wallet_any');
    const maxAmount = hasFullAccess ? 1_000_000 : 100_000;
    const quickAmounts = [100, 500, 1000, 5000];

    const parsedAmount = Number(amount) || 0;
    const previewBalance = operation === 'credit'
        ? currentBalance + parsedAmount
        : currentBalance - parsedAmount;

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
            if (!res.ok) throw new Error(data.error || 'Adjustment failed');

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
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center sm:p-4 perspective-1000">
            {/* Backdrop */}
            <div 
                className="absolute inset-0 bg-slate-900/40 backdrop-blur-md transition-opacity" 
                onClick={() => !loading && onClose(!!success)} 
            />

            {/* Modal */}
            <div className="relative w-full sm:max-w-lg bg-white rounded-t-[2.5rem] sm:rounded-3xl shadow-[0_-20px_40px_-15px_rgba(0,0,0,0.3)] sm:shadow-2xl overflow-hidden mt-auto sm:mt-0 animate-in slide-in-from-bottom-8 sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-300 max-h-[92vh] flex flex-col border border-white/20">
                
                {/* Mobile Drag Handle */}
                <div className="w-full flex justify-center pt-3 pb-1 sm:hidden absolute top-0 z-20">
                    <div className="w-12 h-1.5 bg-white/40 rounded-full" />
                </div>

                {/* Header */}
                <div className={`px-6 pt-10 pb-6 sm:pt-6 sm:pb-6 flex items-start justify-between relative overflow-hidden transition-colors duration-500 ease-in-out ${
                    success ? 'bg-gradient-to-br from-emerald-500 via-teal-500 to-emerald-700' :
                    operation === 'credit'
                        ? 'bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-700'
                        : 'bg-gradient-to-br from-orange-500 via-orange-600 to-red-700'
                } text-white shrink-0`}>
                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 mix-blend-overlay"></div>
                    <div className="relative z-10">
                        <h2 className="text-2xl sm:text-xl font-black tracking-tight flex items-center gap-2">
                            <Wallet size={24} className="opacity-80 drop-shadow-sm" />
                            {walletType === 'customer' ? 'Customer' : 'Merchant'} Wallet
                        </h2>
                        <p className="text-white/80 text-sm sm:text-xs font-medium mt-1">
                            {showConfirm ? 'Reviewing adjustment parameters' : success ? 'Adjustment securely processed' : 'Configure strict balance adjustment'}
                        </p>
                    </div>
                    <button
                        onClick={() => !loading && onClose(!!success)}
                        className="relative z-10 w-10 h-10 sm:w-8 sm:h-8 rounded-full bg-black/10 hover:bg-black/20 backdrop-blur-md flex items-center justify-center transition-all border border-white/10"
                        disabled={loading}
                    >
                        <X size={20} className="sm:w-4 sm:h-4 text-white" />
                    </button>
                    {/* Decorative Blobs */}
                    <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
                    <div className="absolute top-0 left-1/2 w-40 h-40 bg-black/5 rounded-full blur-2xl"></div>
                </div>

                {/* Main Content Area */}
                <div className="p-6 sm:p-6 space-y-7 sm:space-y-6 overflow-y-auto overscroll-contain bg-slate-50/50">
                    
                    {success ? (
                        /* SUCCESS STATE */
                        <div className="text-center py-6 sm:py-4 space-y-6 animate-in slide-in-from-right-8 duration-300">
                            <div className="w-20 h-20 sm:w-16 sm:h-16 mx-auto rounded-full bg-emerald-100 flex items-center justify-center ring-8 ring-emerald-50">
                                <CheckCircle size={40} className="text-emerald-500 sm:w-8 sm:h-8" />
                            </div>
                            <div>
                                <h3 className="text-2xl sm:text-xl font-black text-slate-900 tracking-tight">
                                    {success.duplicate ? 'Already Processed' : 'Adjustment Successful'}
                                </h3>
                                <div className="mt-3 inline-flex flex-col items-center bg-white border border-slate-200 shadow-sm rounded-2xl p-4">
                                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">New Balance</span>
                                    <span className="text-3xl font-black text-slate-900 bg-clip-text text-transparent bg-gradient-to-br from-slate-900 to-slate-600">
                                        ₹{success.newBalance?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                    </span>
                                </div>
                            </div>
                            
                            <div className="bg-white rounded-2xl p-4 text-left space-y-3 shadow-sm border border-slate-100">
                                <div className="flex justify-between items-center text-sm border-b border-slate-50 pb-2">
                                    <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Audit Log ID</span>
                                    <span className="font-mono text-xs font-bold text-slate-600 bg-slate-100 px-2 py-1 rounded-md">{success.auditLogId?.slice(0, 12)}...</span>
                                </div>
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Timestamp</span>
                                    <span className="text-slate-600 font-bold text-xs">
                                        {success.timestamp ? new Date(success.timestamp).toLocaleString('en-IN') : 'N/A'}
                                    </span>
                                </div>
                            </div>

                            <div className="flex gap-3 pt-4 border-t border-slate-200/60">
                                <button
                                    onClick={handleNewAdjustment}
                                    className="flex-1 py-3.5 sm:py-3 rounded-xl sm:rounded-lg border-2 border-slate-200 text-slate-700 text-sm font-bold hover:bg-slate-100 hover:border-slate-300 transition-colors shadow-sm"
                                >
                                    New Adjustment
                                </button>
                                <button
                                    onClick={() => onClose(true)}
                                    className="flex-1 py-3.5 sm:py-3 rounded-xl sm:rounded-lg bg-slate-900 text-white text-sm font-bold hover:bg-slate-800 transition-all shadow-md active:scale-[0.98]"
                                >
                                    Done
                                </button>
                            </div>
                        </div>
                    ) : showConfirm ? (
                        /* CONFIRMATION STATE */
                        <div className="space-y-6 sm:space-y-5 animate-in slide-in-from-right-8 duration-300">
                            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex gap-4 items-start shadow-inner">
                                <div className="p-2 bg-amber-100 rounded-lg shrink-0">
                                    <AlertTriangle size={20} className="text-amber-600" />
                                </div>
                                <div>
                                    <h4 className="font-bold text-amber-900 text-sm">Review Carefully</h4>
                                    <p className="text-amber-700/80 text-xs mt-0.5 leading-relaxed font-medium">
                                        You are about to modify user funds. This action cannot be easily undone and is strictly logged.
                                    </p>
                                </div>
                            </div>

                            <div className="bg-white shadow-sm border border-slate-200 rounded-2xl p-5 space-y-4">
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-slate-500 font-medium">Operation</span>
                                    <span className={`font-black uppercase tracking-widest text-[10px] px-2.5 py-1 rounded-md ${
                                        operation === 'credit' ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' : 'bg-red-100 text-red-700 border border-red-200'
                                    }`}>
                                        {operation}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-slate-500 font-medium">Amount</span>
                                    <span className="font-black text-slate-900 text-lg">₹{parsedAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                                </div>
                                
                                <div className="h-px bg-slate-100 my-2" />
                                
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-slate-500 font-medium">Current Balance</span>
                                    <span className="font-bold text-slate-600">₹{currentBalance.toLocaleString('en-IN')}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-slate-600 font-bold bg-slate-100 px-2.5 py-1 rounded-lg text-xs">New Balance</span>
                                    <span className={`font-black text-xl ${previewBalance >= 0 ? 'text-slate-900' : 'text-red-600'}`}>
                                        ₹{previewBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                    </span>
                                </div>
                            </div>

                            <div className="bg-white shadow-sm border border-slate-200 rounded-2xl p-5">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                                    <Info size={12} /> Reason Provided
                                </p>
                                <p className="text-sm text-slate-700 font-medium leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100">{reason}</p>
                            </div>

                            {error && (
                                <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700 font-medium flex items-center gap-2">
                                    <AlertTriangle size={16} /> {error}
                                </div>
                            )}

                            <div className="flex gap-3 pt-2">
                                <button
                                    onClick={() => { setShowConfirm(false); setError(''); }}
                                    className="flex-1 py-3.5 sm:py-3 rounded-xl sm:rounded-lg border-2 border-slate-200 text-slate-700 text-sm font-bold hover:bg-slate-100 transition-colors"
                                    disabled={loading}
                                >
                                    Modify Form
                                </button>
                                <button
                                    onClick={handleSubmit}
                                    disabled={loading}
                                    className={`flex-1 py-3.5 sm:py-3 rounded-xl sm:rounded-lg text-white text-sm font-bold transition-all shadow-lg active:scale-[0.98] flex items-center justify-center gap-2 ${
                                        operation === 'credit'
                                            ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 shadow-emerald-500/30'
                                            : 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 shadow-red-500/30'
                                    } disabled:opacity-70 disabled:filter-grayscale`}
                                >
                                    {loading ? (
                                        <><Loader2 size={18} className="animate-spin" /> Processing...</>
                                    ) : (
                                        `Execute ${operation === 'credit' ? 'Credit' : 'Debit'}`
                                    )}
                                </button>
                            </div>
                        </div>
                    ) : (
                        /* FORM STATE */
                        <div className="space-y-7 sm:space-y-6 animate-in fade-in duration-300">
                            
                            {/* Current Balance Display */}
                            <div className="bg-slate-900 rounded-2xl p-5 sm:p-4 text-white shadow-inner flex justify-between items-center relative overflow-hidden">
                                <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/5 rounded-full blur-xl"></div>
                                <div className="relative z-10">
                                    <p className="text-[10px] sm:text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                                        Current Balance
                                    </p>
                                    <p className="text-3xl sm:text-2xl font-black tracking-tight text-white drop-shadow-sm">
                                        ₹{currentBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                    </p>
                                </div>
                            </div>

                            {/* Segmented Control for Operation */}
                            <div>
                                <label className="text-[11px] sm:text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2 px-1">
                                    Operation Type
                                </label>
                                <div className="relative flex p-1.5 bg-slate-200/70 rounded-2xl sm:rounded-xl overflow-hidden shadow-inner">
                                    {/* Sliding Background */}
                                    <div 
                                        className="absolute top-1.5 bottom-1.5 w-[calc(50%-6px)] bg-white rounded-xl sm:rounded-lg shadow-sm transition-transform duration-300 ease-spring"
                                        style={{ transform: operation === 'credit' ? 'translateX(0)' : 'translateX(100%)' }}
                                    ></div>
                                    
                                    <button
                                        onClick={() => setOperation('credit')}
                                        className={`relative z-10 flex-1 flex items-center justify-center gap-2 py-3 sm:py-2.5 rounded-xl sm:rounded-lg text-sm font-bold transition-all duration-300 ${
                                            operation === 'credit' ? 'text-emerald-600' : 'text-slate-500 hover:text-slate-700'
                                        }`}
                                    >
                                        <ArrowUp size={16} className={operation === 'credit' ? 'animate-bounce-short' : ''} /> 
                                        Credit (Add)
                                    </button>
                                    <button
                                        onClick={() => setOperation('debit')}
                                        className={`relative z-10 flex-1 flex items-center justify-center gap-2 py-3 sm:py-2.5 rounded-xl sm:rounded-lg text-sm font-bold transition-all duration-300 ${
                                            operation === 'debit' ? 'text-red-600' : 'text-slate-500 hover:text-slate-700'
                                        }`}
                                    >
                                        <ArrowDown size={16} className={operation === 'debit' ? 'animate-bounce-short' : ''} /> 
                                        Debit (Remove)
                                    </button>
                                </div>
                            </div>

                            {/* Amount Input with Quick Actions */}
                            <div>
                                <div className="flex justify-between items-center mb-2 px-1">
                                    <label className="text-[11px] sm:text-[10px] font-black text-slate-500 uppercase tracking-widest block">
                                        Amount
                                    </label>
                                    <span className="text-[10px] font-bold text-slate-400 bg-slate-200 px-2 py-0.5 rounded-md">
                                        Max: ₹{maxAmount.toLocaleString('en-IN')}
                                    </span>
                                </div>
                                <div className="relative group">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold justify-center items-center flex pointer-events-none transition-colors group-focus-within:text-slate-900 group-focus-within:scale-110">₹</span>
                                    <input
                                        type="number"
                                        value={amount}
                                        onChange={(e) => setAmount(e.target.value)}
                                        placeholder="0.00"
                                        min="0"
                                        max={maxAmount}
                                        step="0.01"
                                        className="w-full pl-10 pr-4 py-4 sm:py-3.5 rounded-2xl sm:rounded-xl border-2 border-slate-200 focus:border-slate-800 focus:ring-4 focus:ring-slate-100 text-xl font-black text-slate-900 placeholder:text-slate-300 outline-none transition-all shadow-sm"
                                    />
                                </div>

                                {/* Quick amounts */}
                                <div className="flex gap-2 mt-3 overflow-x-auto pb-1 hide-scrollbar">
                                    {quickAmounts.map(val => (
                                        <button
                                            key={val}
                                            onClick={() => setAmount(val.toString())}
                                            className={`shrink-0 px-4 py-2 sm:px-3 sm:py-1.5 rounded-xl sm:rounded-lg text-xs font-bold border ${
                                                parsedAmount === val 
                                                ? 'bg-slate-800 border-slate-800 text-white shadow-md' 
                                                : 'bg-white border-slate-200 text-slate-600 hover:border-slate-400 hover:bg-slate-50'
                                            } transition-all`}
                                        >
                                            +₹{val}
                                        </button>
                                    ))}
                                </div>
                                
                                {parsedAmount > 0 && !debitValid && (
                                    <p className="text-[11px] text-red-500 font-bold mt-2 flex items-center gap-1.5 animate-in slide-in-from-top-1 px-1">
                                        <AlertTriangle size={12} /> Debit exceeds current balance
                                    </p>
                                )}
                            </div>

                            {/* Live Preview Bar */}
                            {parsedAmount > 0 && (
                                <div className="bg-white border-2 border-blue-100 rounded-2xl p-4 flex items-center justify-between shadow-sm animate-in fade-in slide-in-from-bottom-2">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
                                            <Info size={16} className="text-blue-500" />
                                        </div>
                                        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">New Balance</p>
                                    </div>
                                    <span className="font-black text-lg sm:text-lg text-slate-900">
                                        ₹{previewBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                    </span>
                                </div>
                            )}

                            {/* Reason */}
                            <div>
                                <div className="flex justify-between items-center mb-2 px-1">
                                    <label className="text-[11px] sm:text-[10px] font-black text-slate-500 uppercase tracking-widest block">
                                        Business Reason
                                    </label>
                                </div>
                                <div className="relative group">
                                    <textarea
                                        value={reason}
                                        onChange={(e) => setReason(e.target.value)}
                                        placeholder="Detailed justification for logs..."
                                        rows={3}
                                        maxLength={500}
                                        className="w-full px-4 py-4 sm:py-3.5 rounded-2xl sm:rounded-xl border-2 border-slate-200 focus:border-slate-800 focus:ring-4 focus:ring-slate-100 text-sm font-medium text-slate-900 placeholder:text-slate-300 resize-none outline-none transition-all shadow-sm"
                                    />
                                    <div className="absolute bottom-3 right-3 flex items-center gap-2">
                                        {reason.length >= 10 && (
                                            <span className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 animate-in zoom-in">
                                                <CheckCircle size={12} />
                                            </span>
                                        )}
                                        <p className={`text-[10px] sm:text-[9px] font-black bg-white/80 backdrop-blur px-2 py-1 rounded-md ${
                                            reason.length > 450 ? 'text-amber-500 border border-amber-200' : 'text-slate-400'
                                        }`}>
                                            {reason.length}/500
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Submit */}
                            <button
                                onClick={() => setShowConfirm(true)}
                                disabled={!formValid}
                                className={`w-full py-4 sm:py-3.5 rounded-2xl sm:rounded-xl text-white text-[15px] sm:text-sm font-black tracking-wide transition-all shadow-lg active:scale-[0.98] ${
                                    formValid
                                        ? operation === 'credit'
                                            ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 shadow-emerald-500/30'
                                            : 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 shadow-red-500/30'
                                        : 'bg-slate-300 shadow-none cursor-not-allowed text-slate-400'
                                }`}
                            >
                                Review {operation === 'credit' ? 'Credit' : 'Debit'} 
                                <span className="ml-2 font-serif opacity-70">→</span>
                            </button>

                            {/* Safe padding for bottom notches on some mobile devices when sheet is open */}
                            <div className="h-4 sm:hidden pb-safe"></div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

