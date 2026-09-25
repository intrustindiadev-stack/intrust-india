'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X, Wallet, Banknote, ArrowRight, ArrowLeft, AlertTriangle,
    ShieldCheck, CheckCircle2, Info, Building2, UserCheck
} from 'lucide-react';
import { toast } from 'react-hot-toast';

/**
 * Mobile-first, atomic AI Grow settlement modal.
 * Clearly separates digital wallet credit from offline cash payment.
 *
 * @param {object} props
 * @param {object} props.investment - Investment record with merchant details & profit
 * @param {object} [props.merchant] - Optional merchant override
 * @param {function} props.onClose - Modal close handler
 * @param {function} props.onSuccess - Callback after successful settlement
 */
export default function InvestmentSettlementFlow({ investment, merchant: merchantProp, onClose, onSuccess }) {
    const [step, setStep] = useState('select'); // 'select' | 'confirm'
    const [destination, setDestination] = useState('wallet'); // 'wallet' | 'offline_cash'
    const [acknowledgedCash, setAcknowledgedCash] = useState(false);
    const [loading, setLoading] = useState(false);
    const [notes, setNotes] = useState('');

    const merchant = merchantProp || investment?.merchant || {};
    const businessName = merchant?.business_name || 'Merchant';
    const currentWalletPaise = Number(merchant?.wallet_balance_paise || 0);

    const principalPaise = Number(investment?.amount_paise || 0);
    const profitPaise = Number(investment?.total_profit_paid_paise || 0);
    const totalPayoutPaise = principalPaise + profitPaise;

    const principalRupees = principalPaise / 100;
    const profitRupees = profitPaise / 100;
    const totalPayoutRupees = totalPayoutPaise / 100;
    const currentWalletRupees = currentWalletPaise / 100;
    const resultingWalletRupees = (destination === 'wallet')
        ? (currentWalletPaise + totalPayoutPaise) / 100
        : currentWalletRupees;

    const handleExecuteSettlement = async () => {
        if (destination === 'offline_cash' && !acknowledgedCash) {
            toast.error('Please acknowledge that no digital wallet credit will occur.');
            return;
        }

        setLoading(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error('Session expired. Please sign in again.');

            const res = await fetch(`/api/admin/investments/${investment.id}/settle`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${session.access_token}`
                },
                body: JSON.stringify({
                    destination,
                    idempotencyKey: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : undefined,
                    notes: notes.trim() || undefined
                })
            });

            const result = await res.json();
            if (!res.ok) throw new Error(result.error || 'Settlement failed');

            if (destination === 'wallet') {
                toast.success(`Plan settled! ₹${totalPayoutRupees.toLocaleString('en-IN')} credited to merchant wallet.`);
            } else {
                toast.success(`Plan marked as paid offline (₹${totalPayoutRupees.toLocaleString('en-IN')}).`);
            }

            if (onSuccess) onSuccess(result.data);
            onClose();
        } catch (err) {
            console.error('Settlement error:', err);
            toast.error(err.message || 'Settlement failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/80 backdrop-blur-md"
        >
            <div className="absolute inset-0" onClick={() => !loading && onClose()} />

            <motion.div
                initial={{ scale: 0.95, opacity: 0, y: 16 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 16 }}
                className="bg-white rounded-[2rem] sm:rounded-[2.5rem] w-full max-w-lg shadow-2xl relative z-10 border border-slate-100 flex flex-col max-h-[92vh] overflow-hidden"
            >
                {/* Header */}
                <div className="p-5 sm:p-6 pb-4 border-b border-slate-100 flex items-start justify-between bg-slate-50/50 shrink-0">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-indigo-100 text-indigo-700">
                                AI Grow Settlement
                            </span>
                            <span className="text-[11px] font-mono text-slate-400">
                                #{investment?.id?.slice(0, 8)}
                            </span>
                        </div>
                        <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                            <Building2 size={20} className="text-slate-400 shrink-0" />
                            {businessName}
                        </h3>
                    </div>
                    <button
                        type="button"
                        onClick={() => !loading && onClose()}
                        className="w-10 h-10 bg-white border border-slate-200 rounded-full text-slate-400 hover:text-slate-900 hover:bg-slate-100 flex items-center justify-center transition-all shrink-0 active:scale-95"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Body - Scrollable */}
                <div className="p-5 sm:p-6 overflow-y-auto space-y-5">
                    {/* Financial Summary Pill Card */}
                    <div className="bg-slate-900 text-white rounded-2xl p-4 sm:p-5 relative overflow-hidden shadow-inner">
                        <div className="flex justify-between items-center text-xs font-bold text-slate-400 mb-2">
                            <span>GROWTH PLAN PAYOUT</span>
                            <span className="text-[10px] tracking-widest uppercase bg-slate-800 px-2 py-0.5 rounded text-emerald-400">
                                Matured
                            </span>
                        </div>
                        <div className="flex items-baseline justify-between">
                            <div>
                                <span className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                                    ₹{totalPayoutRupees.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                </span>
                            </div>
                            <div className="text-right text-[11px] text-slate-300">
                                <div>Principal: ₹{principalRupees.toLocaleString('en-IN')}</div>
                                <div className="text-emerald-400 font-bold">+ Profit: ₹{profitRupees.toLocaleString('en-IN')}</div>
                            </div>
                        </div>
                    </div>

                    <AnimatePresence mode="wait">
                        {step === 'select' ? (
                            /* STEP 1: DESTINATION SELECTION */
                            <motion.div
                                key="step-select"
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 10 }}
                                className="space-y-4"
                            >
                                <div>
                                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 mb-1">
                                        Select Payout Destination
                                    </h4>
                                    <p className="text-[12px] text-slate-500 leading-snug">
                                        Choose how this merchant will receive their capital and profit.
                                    </p>
                                </div>

                                {/* Destination Option 1: Digital Wallet */}
                                <div
                                    onClick={() => setDestination('wallet')}
                                    className={`cursor-pointer rounded-2xl p-4 border-2 transition-all active:scale-[0.99] ${
                                        destination === 'wallet'
                                            ? 'border-indigo-600 bg-indigo-50/40 shadow-sm'
                                            : 'border-slate-200 hover:border-slate-300 bg-white'
                                    }`}
                                >
                                    <div className="flex items-start gap-3.5">
                                        <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
                                            destination === 'wallet' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'
                                        }`}>
                                            <Wallet size={20} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between gap-2">
                                                <p className="text-sm font-black text-slate-900">
                                                    Settle to Merchant Wallet
                                                </p>
                                                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                                                    Recommended
                                                </span>
                                            </div>
                                            <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                                                Instant digital credit. Merchant can use funds for orders, subscriptions, or bank payout.
                                            </p>
                                            <div className="mt-3 pt-2.5 border-t border-slate-200/60 flex items-center justify-between text-xs">
                                                <span className="text-slate-500 font-medium">Digital Wallet Credit:</span>
                                                <span className="font-black text-emerald-600">
                                                    +₹{totalPayoutRupees.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Destination Option 2: Offline Cash */}
                                <div
                                    onClick={() => setDestination('offline_cash')}
                                    className={`cursor-pointer rounded-2xl p-4 border-2 transition-all active:scale-[0.99] ${
                                        destination === 'offline_cash'
                                            ? 'border-amber-600 bg-amber-50/40 shadow-sm'
                                            : 'border-slate-200 hover:border-slate-300 bg-white'
                                    }`}
                                >
                                    <div className="flex items-start gap-3.5">
                                        <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
                                            destination === 'offline_cash' ? 'bg-amber-600 text-white' : 'bg-slate-100 text-slate-600'
                                        }`}>
                                            <Banknote size={20} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between gap-2">
                                                <p className="text-sm font-black text-slate-900">
                                                    Mark as Paid Offline (Cash / Wire)
                                                </p>
                                                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-amber-100 text-amber-800">
                                                    Manual Disbursal
                                                </span>
                                            </div>
                                            <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                                                Payout was completed physically outside the app. The digital wallet balance will <span className="font-bold text-amber-700">NOT</span> increase.
                                            </p>
                                            <div className="mt-3 pt-2.5 border-t border-slate-200/60 flex items-center justify-between text-xs">
                                                <span className="text-slate-500 font-medium">Digital Wallet Credit:</span>
                                                <span className="font-black text-slate-400">
                                                    ₹0.00 (NO CHANGE)
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        ) : (
                            /* STEP 2: DEDICATED CONFIRMATION */
                            <motion.div
                                key="step-confirm"
                                initial={{ opacity: 0, x: 10 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -10 }}
                                className="space-y-4"
                            >
                                {destination === 'wallet' ? (
                                    /* Wallet Settlement Confirmation */
                                    <div className="space-y-4">
                                        <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4 flex items-start gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center shrink-0 mt-0.5">
                                                <Wallet size={16} />
                                            </div>
                                            <div>
                                                <p className="text-xs font-black uppercase tracking-wider text-indigo-700">
                                                    Destination: Merchant Digital Wallet
                                                </p>
                                                <p className="text-[11px] text-indigo-900 mt-0.5 leading-relaxed font-medium">
                                                    Principal ₹{principalRupees.toLocaleString('en-IN')} and profit ₹{profitRupees.toLocaleString('en-IN')} will be credited atomically.
                                                </p>
                                            </div>
                                        </div>

                                        {/* Ledger Impact Breakdown */}
                                        <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/70 space-y-2.5 text-xs">
                                            <div className="flex justify-between items-center">
                                                <span className="text-slate-500 font-medium">Current Wallet Balance:</span>
                                                <span className="font-mono font-bold text-slate-800">
                                                    ₹{currentWalletRupees.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                                </span>
                                            </div>
                                            <div className="flex justify-between items-center text-emerald-600 font-bold">
                                                <span>Settlement Wallet Credit:</span>
                                                <span className="font-mono">
                                                    + ₹{totalPayoutRupees.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                                </span>
                                            </div>
                                            <div className="h-px bg-slate-200 my-1" />
                                            <div className="flex justify-between items-center">
                                                <span className="font-black text-slate-900">New Resulting Wallet Balance:</span>
                                                <span className="font-mono font-black text-indigo-600 text-sm">
                                                    ₹{resultingWalletRupees.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    /* Offline Cash Confirmation */
                                    <div className="space-y-4">
                                        <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-4 flex items-start gap-3">
                                            <AlertTriangle size={20} className="text-amber-600 shrink-0 mt-0.5" />
                                            <div>
                                                <p className="text-xs font-black uppercase tracking-wider text-amber-800">
                                                    Destination: Offline Cash / Bank Wire
                                                </p>
                                                <p className="text-[11px] text-amber-900 mt-1 leading-relaxed font-medium">
                                                    This records that ₹{totalPayoutRupees.toLocaleString('en-IN')} was paid to the merchant outside the digital platform. The merchant's digital wallet balance will <span className="font-bold underline">NOT</span> increase.
                                                </p>
                                            </div>
                                        </div>

                                        {/* Ledger Impact Breakdown */}
                                        <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/70 space-y-2.5 text-xs">
                                            <div className="flex justify-between items-center">
                                                <span className="text-slate-500 font-medium">Current Wallet Balance:</span>
                                                <span className="font-mono font-bold text-slate-800">
                                                    ₹{currentWalletRupees.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                                </span>
                                            </div>
                                            <div className="flex justify-between items-center text-slate-400 font-bold">
                                                <span>Digital Wallet Credit:</span>
                                                <span className="font-mono">₹0.00 (NONE)</span>
                                            </div>
                                            <div className="h-px bg-slate-200 my-1" />
                                            <div className="flex justify-between items-center">
                                                <span className="font-black text-slate-900">Resulting Wallet Balance:</span>
                                                <span className="font-mono font-black text-slate-700">
                                                    ₹{currentWalletRupees.toLocaleString('en-IN', { minimumFractionDigits: 2 })} (Unchanged)
                                                </span>
                                            </div>
                                        </div>

                                        {/* Mandatory Checkbox */}
                                        <label className="flex items-start gap-3 p-3.5 rounded-xl bg-amber-50/60 border border-amber-200 cursor-pointer select-none">
                                            <input
                                                type="checkbox"
                                                checked={acknowledgedCash}
                                                onChange={(e) => setAcknowledgedCash(e.target.checked)}
                                                className="mt-0.5 w-4 h-4 rounded text-amber-600 border-amber-300 focus:ring-amber-500"
                                            />
                                            <span className="text-xs font-bold text-amber-900 leading-snug">
                                                I confirm that ₹{totalPayoutRupees.toLocaleString('en-IN')} was paid offline and understand that this payout will NOT be added to the merchant's digital wallet.
                                            </span>
                                        </label>
                                    </div>
                                )}

                                {/* Admin Audit Note (Optional) */}
                                <div>
                                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1 block">
                                        Audit Reason / Reference Note (Optional)
                                    </label>
                                    <input
                                        type="text"
                                        value={notes}
                                        onChange={(e) => setNotes(e.target.value)}
                                        placeholder={destination === 'wallet' ? 'e.g. Matured plan settlement to digital wallet' : 'e.g. Cash disbursed in office / UTR-98234...'}
                                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:border-indigo-500 focus:outline-none bg-slate-50"
                                    />
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Footer Controls - Sticky Action Bar */}
                <div className="p-4 sm:p-5 border-t border-slate-100 bg-white flex items-center gap-3 shrink-0">
                    {step === 'confirm' ? (
                        <>
                            <button
                                type="button"
                                onClick={() => setStep('select')}
                                disabled={loading}
                                className="px-4 py-3.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-xs uppercase tracking-wider transition-all flex items-center gap-1.5 active:scale-95 disabled:opacity-50"
                            >
                                <ArrowLeft size={14} /> Back
                            </button>
                            <button
                                type="button"
                                onClick={handleExecuteSettlement}
                                disabled={loading || (destination === 'offline_cash' && !acknowledgedCash)}
                                className={`flex-1 py-3.5 px-4 rounded-xl font-black text-xs uppercase tracking-wider shadow-lg flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50 text-white ${
                                    destination === 'wallet'
                                        ? 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200'
                                        : 'bg-amber-600 hover:bg-amber-700 shadow-amber-200'
                                }`}
                            >
                                {loading ? (
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                ) : destination === 'wallet' ? (
                                    <>
                                        <Wallet size={16} /> Credit ₹{totalPayoutRupees.toLocaleString('en-IN')} to Wallet
                                    </>
                                ) : (
                                    <>
                                        <Banknote size={16} /> Mark ₹{totalPayoutRupees.toLocaleString('en-IN')} as Paid Offline
                                    </>
                                )}
                            </button>
                        </>
                    ) : (
                        <>
                            <button
                                type="button"
                                onClick={() => onClose()}
                                disabled={loading}
                                className="flex-1 py-3.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-xs uppercase tracking-wider transition-all active:scale-95"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={() => setStep('confirm')}
                                className="flex-[2] py-3.5 px-4 rounded-xl bg-slate-900 hover:bg-black text-white font-black text-xs uppercase tracking-wider shadow-lg flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                            >
                                Review Settlement <ArrowRight size={14} />
                            </button>
                        </>
                    )}
                </div>
            </motion.div>
        </motion.div>
    );
}
