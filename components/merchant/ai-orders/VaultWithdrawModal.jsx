'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Wallet, 
    X, 
    ArrowRight, 
    Loader2, 
    CheckCircle2, 
    Zap, 
    ShieldCheck 
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function VaultWithdrawModal({ 
    isOpen, 
    onClose, 
    availableBalance = 0, 
    onSuccess 
}) {
    const [amount, setAmount] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    if (!isOpen) return null;

    const numBalance = Number(availableBalance) || 0;
    const numAmount = parseFloat(amount) || 0;
    const isValidAmount = numAmount > 0 && numAmount <= numBalance;

    const handleQuickAdd = (val) => {
        const current = parseFloat(amount) || 0;
        const next = Math.min(current + val, Math.floor(numBalance));
        setAmount(next.toString());
    };

    const handleSetMax = () => {
        setAmount(Math.floor(numBalance).toString());
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!isValidAmount) {
            if (numAmount <= 0) toast.error('Please enter a valid amount');
            else if (numAmount > numBalance) toast.error('Amount exceeds available vault balance');
            return;
        }

        setIsSubmitting(true);
        try {
            const amountPaise = Math.round(numAmount * 100);
            const res = await fetch('/api/merchant/vault/withdraw', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ amount_paise: amountPaise })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Withdrawal request failed');

            toast.success(`₹${numAmount.toLocaleString('en-IN')} withdrawal requested! Transferring to InTrust Wallet.`);
            setAmount('');
            if (onSuccess) onSuccess(data);
            onClose();
        } catch (error) {
            console.error('Withdrawal submission error:', error);
            toast.error(error.message || 'Failed to submit withdrawal');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
                <motion.div
                    initial={{ scale: 0.94, opacity: 0, y: 10 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.94, opacity: 0, y: 10 }}
                    transition={{ type: 'spring', damping: 25, stiffness: 350 }}
                    className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-2xl relative overflow-hidden"
                >
                    {/* Top Close Button */}
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isSubmitting}
                        className="absolute top-5 right-5 p-1.5 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        aria-label="Close modal"
                    >
                        <X size={18} />
                    </button>

                    {/* Modal Header */}
                    <div className="flex items-center gap-3.5 mb-5">
                        <div className="w-11 h-11 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-xs">
                            <Wallet size={22} />
                        </div>
                        <div>
                            <h3 className="text-lg font-black text-slate-900 dark:text-white leading-tight">
                                Withdraw to Wallet
                            </h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                Transfer funds to your InTrust Merchant Wallet
                            </p>
                        </div>
                    </div>

                    {/* Available Vault Balance Card */}
                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 mb-5">
                        <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                                Available Vault Balance
                            </span>
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded-full border border-amber-200/60 dark:border-amber-800/40">
                                <ShieldCheck size={10} /> Admin Approval Required
                            </span>
                        </div>
                        <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mt-1">
                            ₹{Math.round(numBalance).toLocaleString('en-IN')}
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* Amount Input */}
                        <div>
                            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                                Withdrawal Amount (₹)
                            </label>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-base font-bold text-slate-400">
                                    ₹
                                </span>
                                <input
                                    type="number"
                                    min="1"
                                    max={numBalance}
                                    step="any"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    placeholder="Enter amount"
                                    disabled={isSubmitting}
                                    className="w-full pl-9 pr-16 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white text-base font-bold placeholder:text-slate-300 dark:placeholder:text-slate-600 focus:outline-hidden focus:border-emerald-500 dark:focus:border-emerald-400 focus:ring-1 focus:ring-emerald-500 transition-all"
                                />
                                <button
                                    type="button"
                                    onClick={handleSetMax}
                                    disabled={numBalance <= 0 || isSubmitting}
                                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-black uppercase text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/80 px-2.5 py-1 rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-colors disabled:opacity-40"
                                >
                                    Max
                                </button>
                            </div>

                            {/* Quick Add Chips */}
                            <div className="flex items-center gap-1.5 mt-2 overflow-x-auto no-scrollbar">
                                {[1000, 2000, 5000, 10000].map(val => (
                                    <button
                                        type="button"
                                        key={val}
                                        onClick={() => handleQuickAdd(val)}
                                        disabled={numBalance <= 0 || isSubmitting}
                                        className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors shrink-0 disabled:opacity-40"
                                    >
                                        +₹{val.toLocaleString('en-IN')}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Destination Card - Explicit Transfer to Wallet */}
                        <div className="p-3.5 rounded-2xl border border-emerald-100 dark:border-emerald-950/60 bg-emerald-50/40 dark:bg-emerald-950/20 flex items-start gap-3">
                            <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                                <Wallet size={16} />
                            </div>
                            <div className="min-w-0 flex-1">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold text-slate-900 dark:text-white">
                                        InTrust Merchant Wallet
                                    </span>
                                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                                        <CheckCircle2 size={11} /> 0% Fee
                                    </span>
                                </div>
                                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                                    Funds will be credited to your merchant wallet balance <strong className="text-slate-700 dark:text-slate-300">after admin verification</strong>.
                                </p>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="pt-2 flex items-center gap-3">
                            <button
                                type="button"
                                onClick={onClose}
                                disabled={isSubmitting}
                                className="flex-1 py-3 px-4 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold text-xs transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={isSubmitting || !isValidAmount}
                                className="flex-[2] py-3 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/20 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {isSubmitting ? (
                                    <>
                                        <Loader2 size={15} className="animate-spin" />
                                        <span>Transferring...</span>
                                    </>
                                ) : (
                                    <>
                                        <span>Transfer to Wallet</span>
                                        <ArrowRight size={15} />
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
