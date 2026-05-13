'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

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
    const accountNumber = bankData.account_number || 'N/A';
    const ifsc = bankData.ifsc || bankData.ifsc_code || 'N/A';
    const holder = bankData.name || bankData.account_holder_name || bankData.beneficiary_name || 'N/A';
    const bankName = bankData.bank_name || '';

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

    if (success) {
        return (
            <div className="py-10 text-center">
                <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="material-icons-round text-emerald-500 text-3xl">check_circle</span>
                </div>
                <h3 className="font-bold text-lg text-slate-800 dark:text-slate-100 mb-2">Withdrawal Requested!</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">Your payout request has been submitted. The admin will review and release the payment manually.</p>
            </div>
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
                        <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">{holder}</span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="text-xs text-slate-500 dark:text-slate-400">Account Number</span>
                        <span className="text-sm font-semibold text-slate-800 dark:text-slate-100 font-mono">
                            ••••{accountNumber.slice(-4)}
                        </span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="text-xs text-slate-500 dark:text-slate-400">IFSC</span>
                        <span className="text-sm font-semibold text-slate-800 dark:text-slate-100 font-mono">{ifsc}</span>
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
