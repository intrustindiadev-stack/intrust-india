'use client';

import { useState } from 'react';
import { PayerContactError, usePayment } from '@/hooks/usePayment';
import { usePayerContact } from '@/hooks/usePayerContact';
import { supabase } from '@/lib/supabaseClient';
import { Loader2, ArrowRight, X } from 'lucide-react';
import { toast } from 'react-hot-toast';
import PayerContactRecoveryPanel from '@/components/payment/PayerContactRecoveryPanel';

const PRESET_AMOUNTS = [500, 1000, 2000, 5000];

export default function WalletTopup({ user, isMerchant, onSuccess, onCancel }) {
    const [amount, setAmount] = useState('');
    const [serverContactError, setServerContactError] = useState(null);
    const { initiatePayment, loading } = usePayment();
    const payerContact = usePayerContact({ requireMerchant: isMerchant });

    const firstInvalidField = Object.keys(payerContact.validation.errors).filter(k => k !== 'phone')[0] || null;
    const recoveryField = serverContactError?.field || firstInvalidField;
    const hasContactIssue = Boolean(recoveryField);

    const savePayerContact = async (nextValue, field) => {
        const updates = field === 'phone' ? { phone: nextValue } : { email: nextValue };
        const profileId = payerContact.profile?.id || payerContact.authUser?.id || user?.id;
        if (!profileId) throw new Error('Please log in again to update your contact details.');

        const writes = [
            supabase.from('user_profiles').update(updates).eq('id', profileId),
        ];

        if (isMerchant && payerContact.merchant?.id) {
            writes.push(
                supabase
                    .from('merchants')
                    .update(field === 'phone' ? { business_phone: nextValue } : { business_email: nextValue })
                    .eq('id', payerContact.merchant.id)
            );
        }

        const results = await Promise.all(writes);
        const failed = results.find(result => result.error);
        if (failed?.error) throw failed.error;
        setServerContactError(null);
        await payerContact.refresh();
    };

    const handleTopup = async () => {
        const value = parseInt(amount);
        if (!value || value < 100) {
            toast.error('Minimum topup amount is ₹100');
            return;
        }

        try {
            await initiatePayment({
                amount: value,
                payerName: payerContact.payerName || user?.user_metadata?.full_name || user?.email || 'User',
                payerEmail: payerContact.payerEmail,
                payerMobile: payerContact.payerPhone,
                udf1: isMerchant ? 'MERCHANT_TOPUP' : 'WALLET_TOPUP',
                udf2: user?.id || ''
            });
            // initiatePayment redirects to Sabpaisa — if it returns, it failed
        } catch (error) {
            console.error(error);
            if (error instanceof PayerContactError) {
                setServerContactError({ field: error.field || 'phone', message: error.message });
                return;
            }
            toast.error(error.message || 'Failed to initiate topup');
        }
    };

    return (
        <div className={isMerchant ? "w-full" : "bg-white rounded-2xl p-6 shadow-lg border-2 border-blue-200"}>
            <div className="flex items-start sm:items-center justify-between mb-8">
                <div className="flex items-center gap-3 sm:gap-4">
                    {isMerchant && (
                        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-[1rem] bg-[#D4AF37]/10 flex items-center justify-center border border-[#D4AF37]/20 shrink-0">
                            <span className="material-icons-round text-[#D4AF37] text-xl">account_balance_wallet</span>
                        </div>
                    )}
                    <div>
                        <h3 className={`font-display text-xl sm:text-2xl font-black tracking-tight ${isMerchant ? 'text-slate-800 dark:text-slate-100' : 'text-gray-900'}`}>
                            Add Money to Wallet
                        </h3>
                        {isMerchant && (
                            <p className="text-[10px] sm:text-xs text-slate-500 uppercase tracking-widest font-bold mt-1">Top-up your premium balance</p>
                        )}
                    </div>
                </div>
                {onCancel && !isMerchant && (
                    <button
                        onClick={onCancel}
                        className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500"
                    >
                        <X size={18} />
                    </button>
                )}
            </div>

            <div className="space-y-6 sm:space-y-8">
                {hasContactIssue && (
                    <PayerContactRecoveryPanel
                        field={recoveryField}
                        message={serverContactError?.message || payerContact.validation.errors[recoveryField]}
                        currentValue={recoveryField === 'email' ? payerContact.payerEmail : payerContact.payerPhone}
                        onSave={savePayerContact}
                        profileDeepLinkBase={isMerchant ? '/merchant/profile' : '/profile'}
                        returnPath={isMerchant ? '/merchant/wallet' : '/wallet'}
                        merchantContext={isMerchant}
                    />
                )}

                {/* Amount Input */}
                <div className={isMerchant ? "bg-white/40 dark:bg-white/5 p-5 sm:p-6 rounded-[2rem] border border-black/5 dark:border-white/5 relative overflow-hidden" : ""}>
                    {isMerchant && (
                        <div className="absolute top-0 right-0 w-32 h-32 bg-[#D4AF37]/5 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none" />
                    )}
                    <label className={`block text-[11px] sm:text-xs font-bold uppercase tracking-widest mb-3 ${isMerchant ? 'text-slate-500' : 'text-gray-700 font-medium text-sm'}`}>
                        Enter Amount
                    </label>
                    <div className="relative group">
                        <span className={`absolute left-5 top-1/2 -translate-y-1/2 font-black text-2xl sm:text-3xl ${isMerchant ? 'text-[#D4AF37]' : 'text-gray-400'}`}>₹</span>
                        <input
                            type="number"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            placeholder="0"
                            min="100"
                            className={`w-full pl-14 pr-6 py-4 sm:py-5 text-3xl sm:text-4xl font-black rounded-2xl outline-none transition-all ${
                                isMerchant 
                                ? 'bg-white/80 dark:bg-black/20 border-2 border-transparent text-slate-800 dark:text-white focus:border-[#D4AF37]/50 focus:bg-white dark:focus:bg-black/40 shadow-sm' 
                                : 'border border-gray-200 bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900'
                            }`}
                        />
                    </div>
                    <p className={`text-[10px] sm:text-xs mt-3 font-bold ${isMerchant ? 'text-slate-400 uppercase tracking-widest' : 'text-gray-400'}`}>Minimum ₹100</p>
                </div>

                {/* Preset Amounts */}
                <div className="flex flex-wrap gap-2 sm:gap-3">
                    {PRESET_AMOUNTS.map((amt) => (
                        <button
                            key={amt}
                            onClick={() => setAmount(amt.toString())}
                            className={`px-3 sm:px-6 py-3 sm:py-3.5 rounded-xl font-black text-xs sm:text-sm transition-all active:scale-95 flex-1 min-w-[70px] sm:min-w-[80px] sm:flex-none text-center justify-center flex items-center ${
                                amount === amt.toString()
                                ? (isMerchant ? 'bg-[#D4AF37] text-black shadow-[0_0_15px_rgba(212,175,55,0.4)]' : 'bg-blue-600 text-white shadow-md shadow-blue-200')
                                : (isMerchant ? 'bg-white/60 dark:bg-white/5 border border-black/5 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-white/10 shadow-sm hover:border-[#D4AF37]/30' : 'bg-gray-100 hover:bg-gray-200 text-gray-700')
                            }`}
                        >
                            + ₹{amt.toLocaleString('en-IN')}
                        </button>
                    ))}
                </div>

                {/* Submit Button */}
                <button
                    onClick={handleTopup}
                    disabled={loading || payerContact.loading || hasContactIssue || !amount || parseInt(amount) < 100}
                    className={`w-full py-4 sm:py-5 rounded-2xl font-black text-sm uppercase tracking-widest transition-all flex items-center justify-center gap-3 active:scale-95 mt-4 ${
                        (loading || payerContact.loading || hasContactIssue || !amount || parseInt(amount) < 100)
                        ? (isMerchant ? 'bg-slate-200 dark:bg-white/5 text-slate-400 cursor-not-allowed border border-transparent' : 'bg-gray-300 text-gray-500 cursor-not-allowed')
                        : (isMerchant ? 'bg-gradient-to-r from-[#D4AF37] to-[#e6cf73] hover:to-[#D4AF37] text-black shadow-[0_0_20px_rgba(212,175,55,0.3)] hover:shadow-[0_0_25px_rgba(212,175,55,0.4)]' : 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-200')
                    }`}
                >
                    {loading || payerContact.loading
                        ? <><Loader2 className="animate-spin" size={20} /> Processing...</>
                        : <>Proceed to Pay <span className="material-icons-round text-lg">arrow_forward</span></>
                    }
                </button>

                <div className={`flex items-center justify-center gap-2 ${isMerchant ? 'opacity-80' : ''}`}>
                    <span className="material-icons-round text-sm text-green-600 dark:text-green-500">lock</span>
                    <p className={`text-[10px] sm:text-xs font-bold ${isMerchant ? 'text-slate-500 uppercase tracking-widest' : 'text-gray-400 text-center'}`}>
                        Secure payment via Sabpaisa Gateway
                    </p>
                </div>
            </div>
        </div>
    );
}
