'use client';

import { useState, useCallback } from 'react';
import { X, AlertTriangle, CheckCircle, Loader2, ArrowUp, ArrowDown, Info, Wallet, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
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
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4 sm:p-4 pb-[85px] sm:pb-4 perspective-1000 overflow-hidden">
            {/* Backdrop with sophisticated blur and fade */}
            <AnimatePresence>
                <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-slate-900/40 backdrop-blur-md transition-opacity" 
                    onClick={() => !loading && onClose(!!success)} 
                />
            </AnimatePresence>

            {/* Modal Body — Floating Bottom Sheet on Mobile, Centered Card on Desktop */}
            <motion.div 
                initial={{ y: "100%", opacity: 0, scale: 0.95 }}
                animate={{ y: 0, opacity: 1, scale: 1 }}
                exit={{ y: "100%", opacity: 0, scale: 0.95 }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                className="relative w-full sm:max-w-lg bg-white rounded-[2rem] sm:rounded-3xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.5)] overflow-hidden max-h-[85vh] flex flex-col border border-white/40 ring-1 ring-slate-900/5 mx-auto"
            >
                
                {/* Mobile Drag Handle — Visual cue for bottom sheet */}
                <div className="w-full flex justify-center pt-3 pb-1 sm:hidden absolute top-0 z-20">
                    <div className="w-12 h-1.5 bg-white/40 rounded-full drop-shadow-sm" />
                </div>

                {/* Header Section — Dynamic gradients and glassmorphism */}
                <div className={`px-6 pt-10 pb-6 sm:pt-6 sm:pb-6 flex items-start justify-between relative overflow-hidden transition-all duration-700 ease-in-out ${
                    success ? 'bg-gradient-to-br from-emerald-500 via-teal-500 to-emerald-700' :
                    operation === 'credit'
                        ? 'bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-700'
                        : 'bg-gradient-to-br from-orange-500 via-orange-600 to-red-700'
                } text-white shrink-0`}>
                    {/* Pattern Overlay */}
                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 mix-blend-overlay"></div>
                    
                    <div className="relative z-10 space-y-1">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/20">
                                <Wallet size={18} className="text-white drop-shadow-sm" />
                            </div>
                            <h2 className="text-xl font-black tracking-tight">
                                {walletType === 'customer' ? 'Customer' : 'Merchant'} Wallet
                            </h2>
                        </div>
                        <p className="text-white/80 text-[11px] font-bold uppercase tracking-widest pl-1">
                            {showConfirm ? 'Review adjustments' : success ? 'Transaction Complete' : 'Balance Governance'}
                        </p>
                    </div>

                    <button
                        onClick={() => !loading && onClose(!!success)}
                        className="relative z-10 w-10 h-10 sm:w-8 sm:h-8 rounded-full bg-black/10 hover:bg-black/20 backdrop-blur-md flex items-center justify-center transition-all border border-white/10"
                        disabled={loading}
                    >
                        <X size={20} className="sm:w-4 sm:h-4 text-white" />
                    </button>

                    {/* Animated Decorative Blobs */}
                    <motion.div 
                        animate={{ scale: [1, 1.2, 1], opacity: [0.1, 0.2, 0.1] }}
                        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                        className="absolute -bottom-10 -right-10 w-32 h-32 bg-white/10 rounded-full blur-2xl"
                    ></motion.div>
                </div>

                {/* Main Content Area — Scrollable on small screens */}
                <div className="p-6 sm:p-7 space-y-7 sm:space-y-6 overflow-y-auto overscroll-contain bg-slate-50/50 scrollbar-hide">
                    
                    {success ? (
                        /* SUCCESS STATE — Celebratory UI */
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="text-center py-6 sm:py-4 space-y-6"
                        >
                            <div className="w-20 h-20 mx-auto rounded-3xl bg-emerald-50 flex items-center justify-center ring-8 ring-emerald-500/5 rotate-3 shadow-xl">
                                <CheckCircle size={40} className="text-emerald-500" />
                            </div>
                            <div>
                                <h3 className="text-2xl font-black text-slate-900 tracking-tight">
                                    {success.duplicate ? 'Already Processed' : 'Transaction Verified'}
                                </h3>
                                <div className="mt-4 inline-flex flex-col items-center bg-white border border-slate-200 shadow-xl rounded-[2rem] p-6 px-10 relative overflow-hidden group">
                                    <div className="absolute inset-0 bg-gradient-to-br from-emerald-50/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                    <span className="relative z-10 text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Updated Balance</span>
                                    <span className="relative z-10 text-4xl font-black text-slate-900">
                                        ₹{success.newBalance?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                    </span>
                                </div>
                            </div>
                            
                            <div className="bg-white rounded-2xl p-4 text-left space-y-3 shadow-sm border border-slate-100">
                                <div className="flex justify-between items-center text-sm border-b border-slate-50 pb-2">
                                    <span className="text-slate-400 font-bold uppercase tracking-wider text-[9px]">Audit Log ID</span>
                                    <span className="font-mono text-[10px] font-bold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg">{success.auditLogId?.slice(0, 16)}</span>
                                </div>
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-slate-400 font-bold uppercase tracking-wider text-[9px]">Settlement Time</span>
                                    <span className="text-slate-600 font-black text-xs">
                                        {success.timestamp ? new Date(success.timestamp).toLocaleString('en-IN') : 'N/A'}
                                    </span>
                                </div>
                            </div>

                            <div className="flex gap-4 pt-4">
                                <button
                                    onClick={handleNewAdjustment}
                                    className="flex-1 py-4 rounded-2xl border-2 border-slate-200 text-slate-700 text-xs font-black uppercase tracking-widest hover:bg-slate-50 transition-all active:scale-95"
                                >
                                    New Entry
                                </button>
                                <button
                                    onClick={() => onClose(true)}
                                    className="flex-1 py-4 rounded-2xl bg-slate-900 text-white text-xs font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-xl shadow-slate-900/20 active:scale-95"
                                >
                                    Finish
                                </button>
                            </div>
                        </motion.div>
                    ) : showConfirm ? (
                        /* CONFIRMATION STATE */
                        <div className="space-y-6 animate-in slide-in-from-right-8 duration-500">
                            <div className="bg-amber-50 border border-amber-200 rounded-[1.5rem] p-5 flex gap-4 items-center shadow-inner">
                                <div className="w-12 h-12 bg-amber-100 rounded-2xl flex items-center justify-center shrink-0 border border-amber-200">
                                    <AlertTriangle size={24} className="text-amber-600" />
                                </div>
                                <div>
                                    <h4 className="font-black text-amber-900 text-sm uppercase tracking-tight">Security Review</h4>
                                    <p className="text-amber-700/80 text-[11px] font-bold leading-relaxed">
                                        Verify parameters before execution. This adjustment is permanent.
                                    </p>
                                </div>
                            </div>

                            <div className="bg-white shadow-xl border border-slate-100 rounded-[2rem] p-6 space-y-5 relative overflow-hidden group">
                                <div className="flex justify-between items-center relative z-10">
                                    <span className="text-slate-500 font-black text-[10px] uppercase tracking-widest">Type</span>
                                    <span className={`font-black uppercase tracking-widest text-[9px] px-3 py-1.5 rounded-full ${
                                        operation === 'credit' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'bg-orange-500 text-white shadow-lg shadow-orange-500/20'
                                    }`}>
                                        {operation}
                                    </span>
                                </div>
                                
                                <div className="flex flex-col items-center justify-center py-2 relative z-10">
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Adjustment Amount</span>
                                    <span className="font-black text-4xl text-slate-900 tracking-tight">
                                        ₹{parsedAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                    </span>
                                </div>
                                
                                <div className="h-px bg-slate-100 w-full" />
                                
                                <div className="grid grid-cols-2 gap-4 pt-2 relative z-10">
                                    <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Current</p>
                                        <p className="font-black text-slate-700 text-sm">₹{currentBalance.toLocaleString('en-IN')}</p>
                                    </div>
                                    <div className="bg-slate-900 p-3 rounded-2xl shadow-lg">
                                        <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Projected</p>
                                        <p className="font-black text-white text-sm">₹{previewBalance.toLocaleString('en-IN')}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white shadow-sm border border-slate-100 rounded-2xl p-5">
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                                    <Info size={12} /> Justification provided
                                </p>
                                <p className="text-sm text-slate-700 font-bold leading-relaxed italic border-l-4 border-slate-200 pl-4">{reason}</p>
                            </div>

                            {error && (
                                <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-xs text-red-700 font-black flex items-center gap-2 animate-bounce-short">
                                    <AlertTriangle size={16} /> {error}
                                </div>
                            )}

                            <div className="flex gap-3 pt-2">
                                <button
                                    onClick={() => { setShowConfirm(false); setError(''); }}
                                    className="flex-1 py-4 rounded-2xl border-2 border-slate-200 text-slate-700 text-xs font-black uppercase tracking-widest hover:bg-slate-50 transition-all"
                                    disabled={loading}
                                >
                                    Modify
                                </button>
                                <button
                                    onClick={handleSubmit}
                                    disabled={loading}
                                    className={`flex-[2] py-4 rounded-2xl text-white text-xs font-black uppercase tracking-widest transition-all shadow-2xl active:scale-95 flex items-center justify-center gap-3 ${
                                        operation === 'credit'
                                            ? 'bg-emerald-600 shadow-emerald-600/20'
                                            : 'bg-red-600 shadow-red-600/20'
                                    } disabled:opacity-70`}
                                >
                                    {loading ? (
                                        <><Loader2 size={18} className="animate-spin" /> Finalizing...</>
                                    ) : (
                                        `Confirm ${operation}`
                                    )}
                                </button>
                            </div>
                        </div>
                    ) : (
                        /* INITIAL FORM STATE */
                        <div className="space-y-7 animate-in fade-in duration-500">
                            
                            {/* Modern Balance Display Card */}
                            <div className="bg-slate-900 rounded-[2rem] p-6 text-white shadow-2xl flex flex-col items-center justify-center relative overflow-hidden ring-1 ring-white/10">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-3xl -mr-10 -mt-10" />
                                <div className="absolute bottom-0 left-0 w-24 h-24 bg-blue-500/10 rounded-full blur-2xl -ml-5 -mb-5" />
                                
                                <span className="relative z-10 text-[9px] font-black text-slate-500 uppercase tracking-[0.3em] mb-2 px-3 py-1 bg-white/5 rounded-full border border-white/5">Available Liquidity</span>
                                <h3 className="relative z-10 text-4xl font-black tracking-tight drop-shadow-lg">
                                    ₹{currentBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                </h3>
                            </div>

                            {/* Elevated Segmented Control */}
                            <div className="space-y-3">
                                <div className="flex p-1.5 bg-slate-200/50 rounded-2xl overflow-hidden shadow-inner border border-slate-100">
                                    <button
                                        onClick={() => setOperation('credit')}
                                        className={`flex-1 flex items-center justify-center gap-2.5 py-3.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all duration-500 ${
                                            operation === 'credit' ? 'bg-white text-emerald-600 shadow-md transform scale-[1.02]' : 'bg-transparent text-slate-500 opacity-60 hover:opacity-100'
                                        }`}
                                    >
                                        <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${operation === 'credit' ? 'bg-emerald-50' : 'bg-slate-100 group-hover:bg-slate-200'}`}>
                                            <ArrowUp size={14} strokeWidth={3} />
                                        </div>
                                        Credit
                                    </button>
                                    <button
                                        onClick={() => setOperation('debit')}
                                        className={`flex-1 flex items-center justify-center gap-2.5 py-3.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all duration-500 ${
                                            operation === 'debit' ? 'bg-white text-red-600 shadow-md transform scale-[1.02]' : 'bg-transparent text-slate-500 opacity-60 hover:opacity-100'
                                        }`}
                                    >
                                        <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${operation === 'debit' ? 'bg-red-50' : 'bg-slate-100 group-hover:bg-slate-200'}`}>
                                            <ArrowDown size={14} strokeWidth={3} />
                                        </div>
                                        Debit
                                    </button>
                                </div>
                            </div>

                            {/* Ultra-Modern Amount Input */}
                            <div className="space-y-4">
                                <div className="flex justify-between items-end px-1">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Adjustment Amount</label>
                                    <span className="text-[9px] font-black text-slate-500 bg-white border border-slate-100 px-2 py-0.5 rounded shadow-sm">Limit: ₹{maxAmount.toLocaleString('en-IN')}</span>
                                </div>
                                
                                <div className="relative group">
                                    <div className={`absolute inset-0 bg-gradient-to-r ${operation === 'credit' ? 'from-emerald-500/10 to-teal-500/10' : 'from-orange-500/10 to-red-500/10'} rounded-2xl blur-xl group-focus-within:opacity-100 opacity-0 transition-opacity`} />
                                    <div className="relative flex items-center bg-white border-2 border-slate-100 rounded-2xl p-1 shadow-sm transition-all focus-within:border-slate-800 focus-within:shadow-xl">
                                        <div className="pl-5 font-black text-2xl text-slate-300">₹</div>
                                        <input
                                            type="number"
                                            value={amount}
                                            onChange={(e) => setAmount(e.target.value)}
                                            placeholder="0.00"
                                            className="w-full px-4 py-5 font-black text-3xl text-slate-900 placeholder:text-slate-200 bg-transparent outline-none tracking-tight"
                                        />
                                    </div>
                                </div>

                                {/* Smart Chips — One-handed mobile interaction */}
                                <div className="flex gap-2.5 overflow-x-auto pb-2 px-1 scrollbar-hide">
                                    {quickAmounts.map(val => (
                                        <button
                                            key={val}
                                            onClick={() => setAmount(val.toString())}
                                            className={`group shrink-0 h-10 px-5 rounded-xl border-2 transition-all flex items-center gap-1.5 ${
                                                parsedAmount === val 
                                                ? 'bg-slate-900 border-slate-900 text-white shadow-lg' 
                                                : 'bg-white border-slate-100 text-slate-500 hover:border-slate-300'
                                            }`}
                                        >
                                            <Plus size={12} className={`transition-transform duration-300 ${parsedAmount === val ? 'rotate-45' : ''}`} />
                                            <span className="text-xs font-black">₹{val}</span>
                                        </button>
                                    ))}
                                </div>
                                
                                {parsedAmount > 0 && !debitValid && (
                                    <motion.div 
                                        initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }}
                                        className="bg-red-50 text-red-600 p-3 rounded-xl border border-red-100 flex items-center gap-2 text-[11px] font-black uppercase tracking-tight"
                                    >
                                        <AlertTriangle size={14} /> Insufficient Balance for Debit
                                    </motion.div>
                                )}
                            </div>

                            {/* Intelligent Multi-line Textarea */}
                            <div className="space-y-3">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Auditable Reason</label>
                                <div className="relative">
                                    <textarea
                                        value={reason}
                                        onChange={(e) => setReason(e.target.value)}
                                        placeholder="Explain the reason for this adjustment..."
                                        rows={2}
                                        className="w-full p-5 bg-white border-2 border-slate-100 rounded-2xl text-sm font-bold text-slate-800 placeholder:text-slate-300 focus:border-slate-800 focus:shadow-xl outline-none transition-all resize-none shadow-sm"
                                    />
                                    <div className={`absolute bottom-3 right-3 text-[9px] font-black px-2 py-1 rounded bg-slate-50 transition-colors ${reason.length < 10 ? 'text-red-400' : 'text-slate-400'}`}>
                                        {reason.length}/500
                                    </div>
                                </div>
                            </div>

                            {/* Primary Action */}
                            <button
                                onClick={() => setShowConfirm(true)}
                                disabled={!formValid}
                                className={`w-full py-5 rounded-2xl text-[13px] font-black uppercase tracking-[0.2em] transition-all shadow-2xl active:scale-95 group relative overflow-hidden ${
                                    formValid
                                        ? operation === 'credit'
                                            ? 'bg-slate-900 text-white shadow-slate-900/30'
                                            : 'bg-red-600 text-white shadow-red-600/30'
                                        : 'bg-slate-100 text-slate-300 cursor-not-allowed shadow-none'
                                }`}
                            >
                                <span className="relative z-10 flex items-center justify-center gap-3">
                                    Review Details
                                    <ArrowUp className="rotate-90 w-4 h-4 transition-transform group-hover:translate-x-1" />
                                </span>
                                {formValid && (
                                    <motion.div 
                                        className="absolute inset-0 bg-white/10"
                                        initial={false}
                                        whileHover={{ x: "100%" }}
                                        transition={{ duration: 0.6 }}
                                    />
                                )}
                            </button>
                        </div>
                    )}

                    {/* Safe spacing inside scroll on mobile */}
                    <div className="h-4 sm:hidden pointer-events-none" />
                </div>
            </motion.div>
        </div>
    );
}

