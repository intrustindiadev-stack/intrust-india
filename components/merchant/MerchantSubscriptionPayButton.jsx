'use client';

import { useState, useEffect, useMemo } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import { validatePayerContact } from '@/lib/merchant/validatePayerContact';
import { normalizePayerMobile } from '@/lib/merchant/payerContactRules';
import PayerContactHelpTooltip from './PayerContactHelpTooltip';
import toast from 'react-hot-toast';

const FIELD_META = {
    email: {
        label: 'Email',
        profileFocus: 'business_email',
        serverField: 'payerEmail',
    },
    phone: {
        label: 'Mobile Number',
        profileFocus: 'business_phone',
        serverField: 'payerMobile',
    },
};

function fieldFromServerField(field) {
    if (field === 'payerEmail') return 'email';
    if (field === 'payerMobile') return 'phone';
    return null;
}

export default function MerchantSubscriptionPayButton({
    merchantId,
    businessName,
    payerName,
    payerEmail,
    payerMobile,
    isRenewal = false,
    subscriptionExpiresAt = null,
    plans = [],
    phonePrompt = null,
    contactPrompt = null,
    disablePay = false,
    onRequestInlineEdit = null,
    onServerFieldError = null,
    onClose = null
}) {
    const [loading, setLoading] = useState(false);
    const [payingWallet, setPayingWallet] = useState(false);
    const [error, setError] = useState(null);
    const [recoveryError, setRecoveryError] = useState(null);
    const [selectedPlan, setSelectedPlan] = useState(plans[0] || null);
    const [paymentMethod, setPaymentMethod] = useState('WALLET');
    const [walletBalancePaise, setWalletBalancePaise] = useState(null);
    const [walletLoading, setWalletLoading] = useState(true);
    const [walletPaymentSuccess, setWalletPaymentSuccess] = useState(null);

    const router = useRouter();
    const pathname = usePathname();

    const clientValidation = useMemo(
        () => validatePayerContact({ email: payerEmail, phone: payerMobile }),
        [payerEmail, payerMobile]
    );
    const invalidFields = Object.entries(clientValidation.errors);
    const firstInvalidField = invalidFields[0]?.[0] || null;
    
    // Ensure a plan is selected if the plans prop updates or initializes
    useEffect(() => {
        if (!selectedPlan && plans.length > 0) {
            setSelectedPlan(plans[0]);
        }
    }, [plans, selectedPlan]);

    // Fetch authoritative merchant wallet balance
    useEffect(() => {
        let isMounted = true;
        async function fetchBalance() {
            try {
                setWalletLoading(true);
                const res = await fetch('/api/wallet/balance');
                if (res.ok) {
                    const data = await res.json();
                    if (isMounted && data?.wallet) {
                        const paise = data.wallet.balance_paise !== undefined
                            ? Number(data.wallet.balance_paise)
                            : Math.round(Number(data.wallet.balance || 0) * 100);
                        setWalletBalancePaise(paise);
                    }
                }
            } catch (err) {
                console.error('[MerchantSub] Failed to load wallet balance:', err);
            } finally {
                if (isMounted) setWalletLoading(false);
            }
        }
        fetchBalance();
        return () => { isMounted = false; };
    }, []);

    const currentExpiry = subscriptionExpiresAt ? new Date(subscriptionExpiresAt) : null;
    const isExpired = currentExpiry && currentExpiry < new Date();
    const expiryFormatted = currentExpiry
        ? currentExpiry.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
        : null;

    // Financial calculations
    const planPricePaise = selectedPlan ? Math.round(selectedPlan.price * 100) : 0;
    const hasWalletData = walletBalancePaise !== null;
    const isSufficient = hasWalletData && walletBalancePaise >= planPricePaise;
    const shortfallPaise = isSufficient ? 0 : Math.max(0, planPricePaise - (walletBalancePaise || 0));
    const balanceAfterPaise = hasWalletData ? (walletBalancePaise - planPricePaise) : 0;

    // ── Wallet Payment Handler ──
    const handleWalletPay = async () => {
        if (!selectedPlan) {
            setError('Please select a subscription plan.');
            return;
        }

        if (!isSufficient) {
            setError('Insufficient wallet balance for this plan.');
            return;
        }

        setPayingWallet(true);
        setError(null);
        setRecoveryError(null);

        try {
            const { data: { session } } = await supabase.auth.getSession();
            const clientTxnId = `WALLET-MSUB-${Date.now()}-${merchantId.slice(0, 8)}`;

            const res = await fetch('/api/merchant/subscription/pay-wallet', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(session?.access_token ? { 'Authorization': `Bearer ${session.access_token}` } : {})
                },
                body: JSON.stringify({
                    planCode: selectedPlan.key,
                    idempotencyKey: clientTxnId
                })
            });

            const data = await res.json();

            if (!res.ok || !data.success) {
                const message = data.message || data.error || 'Wallet payment could not be completed. No funds were deducted.';
                throw new Error(message);
            }

            setWalletPaymentSuccess(data);
            setWalletBalancePaise(data.walletBalancePaise);
            toast.success(data.isRenewal ? 'Subscription renewed successfully! 🎉' : 'Store activated successfully! 🎉');

            // Refresh state after 1.5s
            setTimeout(() => {
                router.refresh();
                if (onClose) onClose();
                else window.location.reload();
            }, 1800);

        } catch (err) {
            console.error('Wallet Payment Error:', err);
            setError(err.message || 'Wallet payment failed. No funds were deducted.');
            toast.error(err.message || 'Payment failed');
        } finally {
            setPayingWallet(false);
        }
    };

    // ── SabPaisa Payment Handler ──
    const handleSabPaisaSubscribe = async () => {
        if (!clientValidation.ok) {
            const field = firstInvalidField || 'phone';
            onRequestInlineEdit?.(field);
            toast.error(clientValidation.errors[field]);
            setRecoveryError({
                field,
                message: clientValidation.errors[field],
            });
            setError(null);
            return;
        }

        if (!selectedPlan) {
            setError('Please select a subscription plan.');
            return;
        }

        setLoading(true);
        setError(null);
        setRecoveryError(null);

        try {
            const { data: { session }, error: sessionError } = await supabase.auth.getSession();
            if (sessionError || !session) {
                throw new Error('Session expired. Please log in again.');
            }

            // Generate a unique transaction ID starting with MSUB_
            const clientTxnId = `MSUB_${Date.now()}_${merchantId.slice(0, 8)}`;

            // Call SabPaisa Initiate API — pass selected plan amount and key via udf3
            const res = await fetch('/api/sabpaisa/initiate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`,
                },
                body: JSON.stringify({
                    amount: selectedPlan.priceFormatted,
                    clientTxnId,
                    payerName,
                    payerEmail,
                    payerMobile: normalizePayerMobile(payerMobile).slice(-10),
                    udf1: 'MERCHANT_SUBSCRIPTION',
                    udf2: merchantId,
                    udf3: selectedPlan.key,
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                const field = data.error === 'INVALID_PAYER_CONTACT'
                    ? fieldFromServerField(data.field)
                    : null;

                if (field) {
                    const message = data.message || clientValidation.errors[field] || 'Please update your saved contact details.';
                    onServerFieldError?.(field, message);
                    setRecoveryError({ field, message });
                    setLoading(false);
                    return;
                }
                throw new Error(data.message || data.error || 'Failed to initiate payment');
            }

            if (!data.encData || !data.paymentUrl || !data.clientCode) {
                throw new Error('Invalid response from payment server');
            }

            // Build hidden form dynamically and submit to SabPaisa
            const form = document.createElement('form');
            form.method = 'POST';
            form.action = data.paymentUrl;

            const encInput = document.createElement('input');
            encInput.type = 'hidden';
            encInput.name = 'encData';
            encInput.value = data.encData;
            form.appendChild(encInput);

            const ccInput = document.createElement('input');
            ccInput.type = 'hidden';
            ccInput.name = 'clientCode';
            ccInput.value = data.clientCode;
            form.appendChild(ccInput);

            document.body.appendChild(form);

            console.log(`Redirecting to SabPaisa for Merchant Subscription (${selectedPlan.key} @ ₹${selectedPlan.price})...`);
            form.submit();
        } catch (err) {
            console.error('Subscription Payment Error:', err);
            setError(err.message || 'Payment processing failed');
            if (!recoveryError) {
                toast.error(err.message || 'Couldn\'t reach payment gateway — please try again.');
            }
            setLoading(false);
        }
    };

    const openProfile = (field) => {
        const focus = FIELD_META[field]?.profileFocus || 'business_phone';
        const currentPath = typeof window !== 'undefined'
            ? `${window.location.pathname}${window.location.search}`
            : pathname || '/merchant/settings';
        const returnPath = currentPath || '/merchant/settings?tab=subscription';
        router.push(`/merchant/profile?focus=${focus}&return=${encodeURIComponent(returnPath)}`);
    };

    const headingText = isRenewal && !isExpired
        ? 'Renew Your Subscription'
        : isExpired
            ? 'Subscription Expired'
            : 'Activate Your Store';

    const subtitleText = isExpired
        ? `${businessName} — Your subscription expired on ${expiryFormatted}. Renew now to restore access.`
        : isRenewal
            ? `${businessName} — Your subscription expires on ${expiryFormatted}. Renew now to keep your store live.`
            : `${businessName} — Complete platform access fee to take your store live.`;

    // ── Success State View ──
    if (walletPaymentSuccess) {
        const formattedExpiry = new Date(walletPaymentSuccess.subscriptionExpiresAt).toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        });

        return (
            <div className="w-full max-w-lg relative">
                <div className="relative bg-white dark:bg-slate-900/90 dark:backdrop-blur-xl border border-slate-200 dark:border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl overflow-hidden text-center">
                    <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 flex items-center justify-center mx-auto mb-4">
                        <span className="material-icons-round text-3xl">check_circle</span>
                    </div>

                    <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-2">
                        {walletPaymentSuccess.isRenewal ? 'Subscription Renewed!' : 'Store Activated!'}
                    </h2>
                    <p className="text-slate-600 dark:text-white/70 text-sm mb-6">
                        Payment successfully deducted from your Merchant Wallet.
                    </p>

                    <div className="bg-slate-50 dark:bg-white/5 rounded-2xl p-4 mb-6 border border-slate-200 dark:border-white/10 text-left space-y-3 text-sm">
                        <div className="flex justify-between items-center py-1 border-b border-slate-200/60 dark:border-white/5">
                            <span className="text-slate-500 dark:text-white/60">Selected Plan</span>
                            <span className="font-bold text-slate-900 dark:text-white">{selectedPlan?.label}</span>
                        </div>
                        <div className="flex justify-between items-center py-1 border-b border-slate-200/60 dark:border-white/5">
                            <span className="text-slate-500 dark:text-white/60">Payment Method</span>
                            <span className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                                <span className="material-icons-round text-sm">account_balance_wallet</span>
                                Merchant Wallet
                            </span>
                        </div>
                        <div className="flex justify-between items-center py-1 border-b border-slate-200/60 dark:border-white/5">
                            <span className="text-slate-500 dark:text-white/60">Amount Deducted</span>
                            <span className="font-extrabold text-slate-900 dark:text-white">
                                ₹{(walletPaymentSuccess.amountPaidPaise / 100).toLocaleString('en-IN')}
                            </span>
                        </div>
                        <div className="flex justify-between items-center py-1 border-b border-slate-200/60 dark:border-white/5">
                            <span className="text-slate-500 dark:text-white/60">New Expiry Date</span>
                            <span className="font-bold text-[#D4AF37]">{formattedExpiry}</span>
                        </div>
                        <div className="flex justify-between items-center py-1">
                            <span className="text-slate-500 dark:text-white/60">Remaining Wallet Balance</span>
                            <span className="font-bold text-slate-700 dark:text-white/80">
                                ₹{(walletPaymentSuccess.walletBalancePaise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={() => {
                            if (onClose) onClose();
                            else window.location.href = '/merchant/dashboard';
                        }}
                        className="w-full py-3.5 bg-gradient-to-r from-[#D4AF37] to-amber-500 text-white sm:text-slate-900 font-extrabold rounded-2xl shadow-lg hover:shadow-xl transition-all"
                    >
                        Go to Dashboard →
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full max-w-lg relative">
            {/* Light/Dark mode premium card */}
            <div className="relative bg-white dark:bg-slate-900/90 dark:backdrop-blur-xl border border-slate-200 dark:border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl overflow-hidden">
                {/* Close Button at top-right */}
                {onClose && (
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 p-2 bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/20 rounded-full text-slate-500 dark:text-white/70 hover:text-slate-800 dark:hover:text-white transition-colors z-20"
                    >
                        <span className="material-icons-round text-sm">close</span>
                    </button>
                )}

                {/* Gold accent glow */}
                <div className="absolute inset-0 bg-gradient-to-br from-[#D4AF37]/5 dark:from-[#D4AF37]/20 to-transparent pointer-events-none opacity-50" />
                <div className="absolute top-0 right-0 -mt-10 -mr-10 w-40 h-40 bg-[#D4AF37]/10 dark:bg-[#D4AF37]/20 rounded-full blur-3xl pointer-events-none" />

                <div className="relative z-10">
                    {/* Icon */}
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#D4AF37] to-amber-600 flex items-center justify-center mb-6 shadow-lg">
                        <span className="material-icons-round text-white text-3xl">storefront</span>
                    </div>

                    <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white mb-2 pr-8">{headingText}</h1>
                    <p className="text-slate-600 dark:text-white/70 text-sm mb-6 pb-6 border-b border-slate-200 dark:border-white/10">{subtitleText}</p>

                    {/* Contact prompts injected by the modal (for SabPaisa) */}
                    {paymentMethod === 'SABPAISA' && (contactPrompt || phonePrompt)}

                    {paymentMethod === 'SABPAISA' && !clientValidation.ok && (
                        <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200">
                            <div className="flex items-start gap-3">
                                <span className="material-icons-round mt-0.5 text-lg text-amber-500">warning_amber</span>
                                <div className="min-w-0 flex-1">
                                    <p className="font-bold">
                                        Heads up — your saved {FIELD_META[firstInvalidField]?.label.toLowerCase() || 'contact detail'} won&apos;t be accepted by the payment gateway. Update it below.
                                    </p>
                                    <p className="mt-1 text-xs text-amber-700 dark:text-amber-300">
                                        {clientValidation.errors[firstInvalidField]}
                                    </p>
                                    <div className="mt-3 flex flex-wrap gap-2">
                                        <button
                                            type="button"
                                            onClick={() => onRequestInlineEdit?.(firstInvalidField)}
                                            className="rounded-xl bg-amber-500 px-3 py-2 text-xs font-black text-white transition-colors hover:bg-amber-600"
                                        >
                                            Update {FIELD_META[firstInvalidField]?.label || 'Contact'}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => openProfile(firstInvalidField)}
                                            className="rounded-xl border border-amber-300 bg-white px-3 py-2 text-xs font-black text-amber-700 transition-colors hover:bg-amber-100 dark:border-amber-500/30 dark:bg-slate-900/40 dark:text-amber-200"
                                        >
                                            Open Profile →
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ── 1. Plan Selector ── */}
                    <div className="mb-6">
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-white/60 mb-2">
                            1. Select Plan
                        </label>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            {plans.length === 0 ? (
                                <div className="col-span-1 sm:col-span-3 flex flex-col sm:flex-row items-center justify-between p-4 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl">
                                    <div className="flex flex-col gap-2">
                                        <div className="text-sm font-semibold text-slate-700 dark:text-white/80">Loading plans...</div>
                                        <div className="text-xs text-slate-500 dark:text-white/50">Please wait or try refreshing.</div>
                                    </div>
                                    <button type="button" onClick={() => window.location.reload()} className="mt-4 sm:mt-0 px-4 py-2 bg-slate-200 dark:bg-white/10 hover:bg-slate-300 dark:hover:bg-white/20 text-slate-800 dark:text-white text-sm font-bold rounded-xl transition-colors">
                                        Retry
                                    </button>
                                </div>
                            ) : (
                                plans.map((plan) => {
                                    const isActive = selectedPlan?.key === plan.key;
                                    return (
                                        <button
                                            key={plan.key}
                                            type="button"
                                            onClick={() => setSelectedPlan(plan)}
                                            className={[
                                                'relative flex flex-row sm:flex-col items-center sm:justify-center justify-between rounded-2xl p-4 border transition-all duration-200 cursor-pointer focus:outline-none min-h-[72px]',
                                                isActive
                                                    ? 'bg-[#D4AF37]/10 dark:bg-[#D4AF37]/20 border-[#D4AF37] shadow-[0_0_16px_rgba(212,175,55,0.15)] dark:shadow-[0_0_16px_rgba(212,175,55,0.25)]'
                                                    : 'bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 hover:border-[#D4AF37]/50 dark:hover:border-white/30 hover:bg-slate-50 dark:hover:bg-white/10',
                                            ].join(' ')}
                                        >
                                            {/* Badge */}
                                            {plan.description && (
                                                <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 whitespace-nowrap bg-[#D4AF37] text-white sm:text-slate-900 text-[10px] font-bold px-2 py-0.5 rounded-full z-10 shadow-sm">
                                                    {plan.description}
                                                </span>
                                            )}

                                            <div className="flex flex-col items-start sm:items-center">
                                                <span className={`text-xs font-semibold mb-1 ${isActive ? 'text-[#D4AF37]' : 'text-slate-500 dark:text-white/60'}`}>
                                                    {plan.label}
                                                </span>
                                                <span className={`text-xl font-extrabold leading-none ${isActive ? 'text-[#D4AF37]' : 'text-slate-900 dark:text-white'}`}>
                                                    ₹{plan.price.toLocaleString('en-IN')}
                                                </span>
                                            </div>

                                            {/* Selected checkmark */}
                                            {isActive && (
                                                <span className="material-icons-round text-[#D4AF37] text-base sm:mt-2 leading-none">check_circle</span>
                                            )}
                                        </button>
                                    );
                                })
                            )}
                        </div>
                    </div>

                    {/* ── 2. Payment Method Selector ── */}
                    <div className="mb-6">
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-white/60 mb-2">
                            2. Choose Payment Method
                        </label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {/* Merchant Wallet Card */}
                            <button
                                type="button"
                                onClick={() => {
                                    setPaymentMethod('WALLET');
                                    setError(null);
                                }}
                                className={`p-4 rounded-2xl border text-left flex items-start justify-between transition-all duration-200 cursor-pointer ${
                                    paymentMethod === 'WALLET'
                                        ? 'bg-[#D4AF37]/10 dark:bg-[#D4AF37]/20 border-[#D4AF37] shadow-[0_0_16px_rgba(212,175,55,0.15)]'
                                        : 'bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 hover:border-[#D4AF37]/50'
                                }`}
                            >
                                <div className="flex items-start gap-3 min-w-0">
                                    <div className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                                        paymentMethod === 'WALLET' ? 'border-[#D4AF37] bg-[#D4AF37]' : 'border-slate-300 dark:border-white/20'
                                    }`}>
                                        {paymentMethod === 'WALLET' && <div className="w-2 h-2 rounded-full bg-white dark:bg-slate-900" />}
                                    </div>
                                    <div className="min-w-0">
                                        <div className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                                            <span>Merchant Wallet</span>
                                        </div>
                                        <div className="text-xs text-slate-500 dark:text-white/60 mt-0.5 truncate">
                                            {walletLoading
                                                ? 'Loading balance...'
                                                : `Balance: ₹${((walletBalancePaise || 0) / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                                            }
                                        </div>
                                        {hasWalletData && !isSufficient && (
                                            <div className="text-[11px] font-bold text-red-600 dark:text-red-400 mt-1">
                                                Shortfall: ₹{(shortfallPaise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <span className="material-icons-round text-slate-400 shrink-0 text-xl ml-2">account_balance_wallet</span>
                            </button>

                            {/* SabPaisa Gateway Card */}
                            <button
                                type="button"
                                onClick={() => {
                                    setPaymentMethod('SABPAISA');
                                    setError(null);
                                }}
                                className={`p-4 rounded-2xl border text-left flex items-start justify-between transition-all duration-200 cursor-pointer ${
                                    paymentMethod === 'SABPAISA'
                                        ? 'bg-[#D4AF37]/10 dark:bg-[#D4AF37]/20 border-[#D4AF37] shadow-[0_0_16px_rgba(212,175,55,0.15)]'
                                        : 'bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 hover:border-[#D4AF37]/50'
                                }`}
                            >
                                <div className="flex items-start gap-3 min-w-0">
                                    <div className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                                        paymentMethod === 'SABPAISA' ? 'border-[#D4AF37] bg-[#D4AF37]' : 'border-slate-300 dark:border-white/20'
                                    }`}>
                                        {paymentMethod === 'SABPAISA' && <div className="w-2 h-2 rounded-full bg-white dark:bg-slate-900" />}
                                    </div>
                                    <div className="min-w-0">
                                        <div className="text-sm font-bold text-slate-900 dark:text-white">
                                            SabPaisa
                                        </div>
                                        <div className="text-xs text-slate-500 dark:text-white/60 mt-0.5 truncate">
                                            UPI / Card / Net Banking
                                        </div>
                                    </div>
                                </div>
                                <span className="material-icons-round text-slate-400 shrink-0 text-xl ml-2">payment</span>
                            </button>
                        </div>
                    </div>

                    {/* ── 3. Wallet Payment Breakdown (When Wallet Selected) ── */}
                    {paymentMethod === 'WALLET' && selectedPlan && (
                        <div className="bg-slate-50 dark:bg-white/5 rounded-2xl p-4 mb-6 border border-slate-200 dark:border-white/10 text-xs sm:text-sm space-y-2">
                            <div className="flex justify-between items-center py-1">
                                <span className="text-slate-600 dark:text-white/70">Plan Duration</span>
                                <span className="font-bold text-slate-900 dark:text-white">{selectedPlan.label}</span>
                            </div>
                            <div className="flex justify-between items-center py-1">
                                <span className="text-slate-600 dark:text-white/70">Subscription Amount</span>
                                <span className="font-extrabold text-slate-900 dark:text-white">
                                    ₹{selectedPlan.price.toLocaleString('en-IN')}
                                </span>
                            </div>
                            <div className="flex justify-between items-center py-1">
                                <span className="text-slate-600 dark:text-white/70">Wallet Balance</span>
                                <span className="font-bold text-slate-700 dark:text-white/80">
                                    ₹{((walletBalancePaise || 0) / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                            </div>
                            <div className="border-t border-slate-200/80 dark:border-white/10 pt-2 flex justify-between items-center font-bold">
                                <span className="text-slate-800 dark:text-white">
                                    {isSufficient ? 'Balance After Payment' : 'Shortfall Needed'}
                                </span>
                                <span className={isSufficient ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}>
                                    ₹{(Math.abs(isSufficient ? balanceAfterPaise : shortfallPaise) / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                            </div>
                        </div>
                    )}

                    {/* ── 4. Insufficient Wallet Balance Alert & Action ── */}
                    {paymentMethod === 'WALLET' && hasWalletData && !isSufficient && selectedPlan && (
                        <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-200">
                            <div className="flex items-start gap-3">
                                <span className="material-icons-round mt-0.5 text-lg text-red-500 shrink-0">account_balance_wallet</span>
                                <div className="min-w-0 flex-1">
                                    <p className="font-bold">Insufficient Wallet Balance</p>
                                    <p className="mt-1 text-xs text-red-700 dark:text-red-300">
                                        You need ₹{(shortfallPaise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })} more to pay from your wallet.
                                    </p>
                                    <div className="mt-3 flex flex-wrap gap-2">
                                        <Link
                                            href="/merchant/wallet"
                                            className="rounded-xl bg-gradient-to-r from-[#D4AF37] to-amber-500 px-3.5 py-2 text-xs font-black text-white sm:text-slate-900 transition-colors shadow-sm inline-flex items-center gap-1"
                                        >
                                            <span className="material-icons-round text-sm">add_circle</span>
                                            Add Money
                                        </Link>
                                        <button
                                            type="button"
                                            onClick={() => setPaymentMethod('SABPAISA')}
                                            className="rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-black text-slate-700 transition-colors hover:bg-slate-100 dark:border-white/20 dark:bg-slate-800 dark:text-white"
                                        >
                                            Choose SabPaisa →
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Feature List */}
                    <div className="bg-slate-50 dark:bg-white/5 rounded-2xl p-4 mb-6 border border-slate-200 dark:border-[#D4AF37]/30 shadow-inner space-y-2.5">
                        {[
                            'Full Merchant Dashboard Access',
                            'Inventory & Product Listing',
                            'Order & Delivery Management',
                            'Store Front Customization',
                        ].map((feature, idx) => (
                            <div key={idx} className="flex items-center gap-2.5 text-slate-700 dark:text-white/80 text-xs sm:text-sm">
                                <span className="material-icons-round text-[#D4AF37] text-sm">check_circle</span>
                                {feature}
                            </div>
                        ))}
                    </div>

                    {/* Error Prompt */}
                    {recoveryError && (
                        <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-200">
                            <div className="flex items-start gap-3">
                                <span className="material-icons-round mt-0.5 text-lg text-red-500">error_outline</span>
                                <div className="min-w-0 flex-1">
                                    <p className="font-black">Couldn&apos;t process payment</p>
                                    <p className="mt-1 text-xs text-red-700 dark:text-red-300">{recoveryError.message}</p>
                                    <div className="mt-3 flex flex-wrap gap-2">
                                        <button
                                            type="button"
                                            onClick={() => onRequestInlineEdit?.(recoveryError.field)}
                                            className="rounded-xl bg-red-600 px-3 py-2 text-xs font-black text-white transition-colors hover:bg-red-700"
                                        >
                                            Fix Here
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => openProfile(recoveryError.field)}
                                            className="rounded-xl border border-red-300 bg-white px-3 py-2 text-xs font-black text-red-700 transition-colors hover:bg-red-100 dark:border-red-500/30 dark:bg-slate-900/40 dark:text-red-200"
                                        >
                                            Open Profile →
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                    {error && (
                        <div className="mb-6 p-4 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-xl flex items-start gap-3">
                            <span className="material-icons-round text-red-500 dark:text-red-400 text-xl shrink-0">error_outline</span>
                            <p className="text-red-700 dark:text-red-300 text-sm">{error}</p>
                        </div>
                    )}

                    {/* ── 5. Pay Button ── */}
                    {paymentMethod === 'WALLET' ? (
                        <button
                            onClick={handleWalletPay}
                            disabled={payingWallet || !selectedPlan || disablePay || !isSufficient || walletLoading}
                            className="group relative w-full py-4 rounded-2xl bg-gradient-to-r from-[#D4AF37] to-amber-500 text-white sm:text-slate-900 font-extrabold text-lg shadow-[0_0_15px_rgba(212,175,55,0.4)] dark:shadow-[0_0_20px_rgba(212,175,55,0.3)] hover:shadow-[0_0_20px_rgba(212,175,55,0.6)] dark:hover:shadow-[0_0_30px_rgba(212,175,55,0.5)] transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-3 overflow-hidden cursor-pointer"
                        >
                            {/* Button hover gleam */}
                            <div className="absolute inset-0 -translate-x-full group-hover:animate-shimmer bg-gradient-to-r from-transparent via-white/40 to-transparent pointer-events-none" />

                            {payingWallet ? (
                                <>
                                    <svg className="animate-spin h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    <span>Paying from Wallet...</span>
                                </>
                            ) : (
                                <>
                                    <span className="material-icons-round text-xl">account_balance_wallet</span>
                                    <span>
                                        {selectedPlan
                                            ? `Pay ₹${selectedPlan.price.toLocaleString('en-IN')} from Wallet`
                                            : 'Select a Plan'
                                        }
                                    </span>
                                </>
                            )}
                        </button>
                    ) : (
                        <button
                            onClick={handleSabPaisaSubscribe}
                            disabled={loading || !selectedPlan || disablePay || !clientValidation.ok}
                            className="group relative w-full py-4 rounded-2xl bg-gradient-to-r from-[#D4AF37] to-amber-500 text-white sm:text-slate-900 font-extrabold text-lg shadow-[0_0_15px_rgba(212,175,55,0.4)] dark:shadow-[0_0_20px_rgba(212,175,55,0.3)] hover:shadow-[0_0_20px_rgba(212,175,55,0.6)] dark:hover:shadow-[0_0_30px_rgba(212,175,55,0.5)] transition-all duration-300 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-3 overflow-hidden cursor-pointer"
                        >
                            {/* Button hover gleam */}
                            <div className="absolute inset-0 -translate-x-full group-hover:animate-shimmer bg-gradient-to-r from-transparent via-white/40 to-transparent pointer-events-none" />

                            {loading ? (
                                <>
                                    <svg className="animate-spin h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    <span>Securing Payment...</span>
                                </>
                            ) : (
                                <>
                                    <span className="material-icons-round text-xl">lock</span>
                                    <span>
                                        {selectedPlan ? `Pay ₹${selectedPlan.price.toLocaleString('en-IN')} — ${selectedPlan.label}` : 'Select a Plan'}
                                    </span>
                                    <PayerContactHelpTooltip field={firstInvalidField || 'phone'} />
                                </>
                            )}
                        </button>
                    )}

                    <div className="mt-6 flex items-center justify-center gap-2 text-slate-500 dark:text-white/40 text-xs font-medium">
                        <span className="material-icons-round text-sm">
                            {paymentMethod === 'WALLET' ? 'account_balance_wallet' : 'verified_user'}
                        </span>
                        <span>
                            {paymentMethod === 'WALLET'
                                ? 'Instant activation from Merchant Wallet • Zero gateway fees'
                                : 'Secured by SabPaisa • All payment methods accepted'
                            }
                        </span>
                    </div>
                </div>
            </div>

            <style jsx global>{`
                @keyframes shimmer {
                    100% { transform: translateX(100%); }
                }
                .animate-shimmer {
                    animation: shimmer 1.5s infinite;
                }
            `}</style>
        </div>
    );
}
