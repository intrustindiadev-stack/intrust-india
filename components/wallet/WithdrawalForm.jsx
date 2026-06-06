'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { motion } from 'framer-motion';

/**
 * @typedef {{
 *   id: string;
 *   business_name: string;
 *   bank_verified: boolean;
 *   bank_data: { account_number?: string; ifsc?: string; ifsc_code?: string; name?: string; account_holder_name?: string; beneficiary_name?: string; bank_name?: string } | null;
 *   wallet_balance_paise: number;
 * }} MerchantArg
 */

/**
 * @param {{ 
 *   merchant: MerchantArg; 
 *   onSuccess: () => void; 
 *   onCancel: () => void; 
 *   minAmountPaise?: number;
 *   pendingRequests?: Array<{ id: string; amount: number; payout_source: string }>;
 *   maxPendingCount?: number | null;
 * }} props
 */
export default function WithdrawalForm({ merchant, onSuccess, onCancel, minAmountPaise, pendingRequests, maxPendingCount }) {
    const [amount, setAmount] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    // Client-generated idempotency key — regenerated on each error to allow clean retries
    const [idempotencyKey, setIdempotencyKey] = useState(() => crypto.randomUUID());

    const balanceRupees = (merchant.wallet_balance_paise || 0) / 100;
    const bankData = merchant.bank_data || {};
    const accountNumber = merchant.bank_account_number || bankData.account_number || '';
    const ifsc = merchant.bank_ifsc_code || bankData.ifsc || bankData.ifsc_code || '';
    const holder = merchant.bank_account_name || bankData.name || bankData.account_holder_name || bankData.beneficiary_name || '';
    const bankName = bankData.bank_name || '';

    // All three fields must be present before a withdrawal is permitted
    const isBankComplete = accountNumber.trim() !== '' && ifsc.trim() !== '' && holder.trim() !== '';

    // Derive min amount in rupees from prop (falls back to ₹100)
    const minRupees = (minAmountPaise || 10000) / 100;

    const pendingCount = pendingRequests?.length ?? 0;
    const pendingTotalRupees = (pendingRequests || []).reduce((sum, r) => sum + Number(r.amount), 0);
    const capReached = maxPendingCount != null && pendingCount >= maxPendingCount;

    /** Strip non-numeric chars (except one decimal point), clamp to 2 decimal places */
    const handleAmountChange = (e) => {
        let raw = e.target.value.replace(/[^\d.]/g, '');
        // Allow only one decimal point
        const parts = raw.split('.');
        if (parts.length > 2) raw = parts[0] + '.' + parts.slice(1).join('');
        // Clamp to 2 decimal places
        if (parts[1]?.length > 2) raw = parts[0] + '.' + parts[1].slice(0, 2);
        setAmount(raw);
    };


    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        const amtNum = parseFloat(amount);
        if (!amtNum || amtNum < minRupees) {
            setError(`Minimum withdrawal amount is ₹${minRupees}.`);
            return;
        }

        setLoading(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error('Session expired. Please log in again.');

            // Re-fetch fresh wallet balance to guard against stale prop
            const { data: freshMerchant, error: balErr } = await supabase
                .from('merchants')
                .select('wallet_balance_paise')
                .eq('user_id', session.user.id)
                .single();

            if (balErr) throw new Error('Could not verify wallet balance. Please try again.');

            const freshBalanceRupees = (freshMerchant?.wallet_balance_paise || 0) / 100;
            if (amtNum > freshBalanceRupees) {
                setError('Amount exceeds your current wallet balance.');
                return;
            }

            const res = await fetch('/api/merchant/payout-request', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${session.access_token}`,
                    'Idempotency-Key': idempotencyKey,
                },
                body: JSON.stringify({ amount: amtNum }),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Submission failed');
            setSuccess(true);
            setTimeout(() => {
                onSuccess();
            }, 2000);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Something went wrong');
            // Regenerate key so a retry is treated as a fresh request
            setIdempotencyKey(crypto.randomUUID());
        } finally {
            setLoading(false);
        }
    };

    if (!isBankComplete) {
        return (
            <div className="py-10 text-center">
                <div className="w-16 h-16 bg-orange-500/10 border border-orange-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="material-icons-round text-orange-500 text-3xl">edit_note</span>
                </div>
                <h3 className="font-bold text-lg text-slate-800 dark:text-slate-100 mb-2">Bank Details Incomplete</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 max-w-xs mx-auto mb-4">
                    Your account number, IFSC code, or account holder name is missing. Please complete your bank details before requesting a withdrawal.
                </p>
                <a
                    href="/merchant/settings?tab=bank"
                    className="inline-flex items-center gap-2 px-6 py-3 bg-[#D4AF37] text-[#020617] font-bold rounded-xl hover:opacity-90 transition-all text-sm"
                >
                    <span className="material-icons-round text-base">edit</span>
                    Complete Bank Details
                </a>
            </div>
        );
    }

    if (success) {
        return (
            <motion.div 
                initial={{ opacity: 0, scale: 0.9 }} 
                animate={{ opacity: 1, scale: 1 }} 
                className="py-12 text-center relative overflow-hidden"
            >
                <motion.div 
                    initial={{ scale: 0 }} 
                    animate={{ scale: [1.2, 1] }} 
                    transition={{ type: "spring", stiffness: 200, damping: 15 }}
                    className="w-24 h-24 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl shadow-emerald-500/30 relative z-10"
                >
                    <motion.span 
                        initial={{ pathLength: 0 }}
                        animate={{ pathLength: 1 }}
                        className="material-icons-round text-white text-5xl"
                    >
                        check
                    </motion.span>
                </motion.div>
                
                {/* Decorative flying particles */}
                {[...Array(6)].map((_, i) => (
                    <motion.div
                        key={i}
                        initial={{ opacity: 0, x: 0, y: 0 }}
                        animate={{ 
                            opacity: [0, 1, 0], 
                            x: (Math.random() - 0.5) * 200, 
                            y: (Math.random() - 0.5) * 200 - 50 
                        }}
                        transition={{ duration: 1.5, ease: "easeOut" }}
                        className="absolute left-1/2 top-1/2 w-3 h-3 bg-emerald-400 rounded-full"
                    />
                ))}

                <motion.h3 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="font-black text-2xl text-slate-800 dark:text-slate-100 mb-2 tracking-tight"
                >
                    Withdrawal Initiated!
                </motion.h3>
                <motion.p 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="text-sm text-slate-500 dark:text-slate-400 max-w-xs mx-auto font-medium"
                >
                    Your payout request has been securely submitted. Funds will arrive in your bank soon.
                </motion.p>
            </motion.div>
        );
    }

    return (
        <div>
            <h3 className="font-display text-xl font-bold text-slate-800 dark:text-slate-100 mb-5 flex items-center gap-2">
                <span className="material-icons-round text-[#D4AF37]">account_balance</span>
                Withdraw to Bank
            </h3>

            {/* Bank Details */}
            <div className="mb-6 p-4 bg-black/5 dark:bg-white/5 rounded-2xl border border-black/5 dark:border-white/10">
                <p className="text-[10px] uppercase tracking-widest font-bold text-slate-500 mb-3">Payout Account</p>
                <div className="space-y-2">
                    <div className="flex justify-between items-center">
                        <span className="text-xs text-slate-500 dark:text-slate-400">Account Holder</span>
                        <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">{holder || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="text-xs text-slate-500 dark:text-slate-400">Account Number</span>
                        <span className="text-sm font-semibold text-slate-800 dark:text-slate-100 font-mono">
                            {accountNumber ? `••••${accountNumber.slice(-4)}` : 'N/A'}
                        </span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="text-xs text-slate-500 dark:text-slate-400">IFSC</span>
                        <span className="text-sm font-semibold text-slate-800 dark:text-slate-100 font-mono">{ifsc || 'N/A'}</span>
                    </div>
                    {bankName && (
                        <div className="flex justify-between items-center">
                            <span className="text-xs text-slate-500 dark:text-slate-400">Bank</span>
                            <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">{bankName}</span>
                        </div>
                    )}
                </div>

            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
                <div className="group">
                    <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-2 group-focus-within:text-[#D4AF37] transition-colors">
                        Withdrawal Amount (₹)
                    </label>
                    <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-lg select-none">₹</span>
                        <input
                            type="text"
                            inputMode="decimal"
                            min={minRupees}
                            max={balanceRupees}
                            value={amount}
                            onChange={handleAmountChange}
                            className="w-full pl-10 pr-5 py-4 bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10 rounded-xl focus:outline-none focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37] text-slate-800 dark:text-slate-100 font-medium transition-all text-lg"
                            placeholder="0.00"
                            required
                        />
                    </div>
                    <div className="flex flex-col mt-1.5 gap-1">
                        <div className="flex justify-between">
                            <p className="text-xs text-slate-400">Minimum ₹{minRupees.toLocaleString('en-IN')}</p>
                            <button
                                type="button"
                                onClick={() => setAmount(balanceRupees.toFixed(2))}
                                className="text-xs text-[#D4AF37] hover:underline font-semibold"
                            >
                                Use full balance ₹{balanceRupees.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </button>
                        </div>
                        {pendingCount > 0 && (
                            <p className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                                ↳ Includes {pendingCount} pending withdrawal{pendingCount > 1 ? 's' : ''} totalling ₹{pendingTotalRupees.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </p>
                        )}
                    </div>
                </div>

                {error && (
                    <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 rounded-xl text-sm flex items-center gap-2 font-semibold">
                        <span className="material-icons-round text-base">error_outline</span>
                        {error}
                    </div>
                )}

                <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-700 dark:text-amber-300 flex gap-2">
                    <span className="material-icons-round text-base flex-shrink-0">info</span>
                    <span>Funds will reach your bank within 24 working hours after release.</span>
                </div>

                <div className="flex gap-3 pt-2">
                    {capReached ? (
                        <div className="flex-1 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-700 dark:text-amber-300 flex items-center justify-center gap-2 font-semibold">
                            <span className="material-icons-round text-base">warning</span>
                            You've reached the maximum of {maxPendingCount} pending requests. Please wait for one to be processed.
                        </div>
                    ) : (
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 py-4 bg-[#D4AF37] text-[#020617] font-bold rounded-xl shadow-lg shadow-[#D4AF37]/20 hover:bg-opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 gold-glow"
                        >
                            {loading ? (
                                <>
                                    <span className="material-icons-round animate-spin text-base">autorenew</span>
                                    Submitting...
                                </>
                            ) : (
                                <>
                                    <span className="material-icons-round text-base">send</span>
                                    Request Withdrawal
                                </>
                            )}
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={onCancel}
                        disabled={loading}
                        className="px-6 py-4 border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 font-bold rounded-xl hover:bg-black/5 dark:hover:bg-white/5 transition-all"
                    >
                        Cancel
                    </button>
                </div>
            </form>
        </div>
    );
}
