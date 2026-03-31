'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function MerchantSubscriptionPayButton({
    merchantId,
    businessName,
    payerName,
    payerEmail,
    payerMobile,
    isRenewal = false,
    subscriptionExpiresAt = null
}) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const currentExpiry = subscriptionExpiresAt ? new Date(subscriptionExpiresAt) : null;
    const isExpired = currentExpiry && currentExpiry < new Date();
    const nextBillingDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('en-IN', {
        day: 'numeric', month: 'short', year: 'numeric'
    });
    const expiryFormatted = currentExpiry
        ? currentExpiry.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
        : null;

    const handleSubscribe = async () => {
        setLoading(true);
        setError(null);

        try {
            const { data: { session }, error: sessionError } = await supabase.auth.getSession();
            if (sessionError || !session) {
                throw new Error('Session expired. Please log in again.');
            }

            // Generate a unique transaction ID starting with MSUB_
            const clientTxnId = `MSUB_${Date.now()}_${merchantId.slice(0, 8)}`;

            // Call SabPaisa Initiate API
            const res = await fetch('/api/sabpaisa/initiate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`,
                },
                body: JSON.stringify({
                    amount: '149.00',
                    clientTxnId,
                    payerName,
                    payerEmail,
                    payerMobile,
                    udf1: 'MERCHANT_SUBSCRIPTION',
                    udf2: merchantId,
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Failed to initiate payment');
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

            console.log('Redirecting to SabPaisa Secure Gateway for Merchant Subscription...');
            form.submit();
        } catch (err) {
            console.error('Subscription Payment Error:', err);
            setError(err.message || 'Payment processing failed');
            setLoading(false);
        }
    };

    return (
        <div className="w-full max-w-md">
            {/* Premium glassmorphic card */}
            <div className="relative bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl overflow-hidden">
                {/* Gold accent glow behind */}
                <div className="absolute inset-0 bg-gradient-to-br from-[#D4AF37]/20 to-transparent pointer-events-none opacity-50" />
                
                {/* Decorative circle */}
                <div className="absolute top-0 right-0 -mt-10 -mr-10 w-40 h-40 bg-[#D4AF37]/20 rounded-full blur-3xl pointer-events-none" />

                <div className="relative z-10">
                    {/* Logo / Icon */}
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#D4AF37] to-amber-600 flex items-center justify-center mb-6 shadow-lg">
                        <span className="material-icons-round text-white text-3xl">storefront</span>
                    </div>

                    <h1 className="text-2xl font-extrabold text-white mb-2">
                        {isRenewal && !isExpired ? 'Renew Your Subscription' : isExpired ? 'Subscription Expired' : 'Activate Your Store'}
                    </h1>
                    <p className="text-white/70 text-sm mb-6 pb-6 border-b border-white/10">
                        {isExpired
                            ? `${businessName} — Your subscription expired on ${expiryFormatted}. Renew now to restore access.`
                            : isRenewal
                            ? `${businessName} — Your subscription expires on ${expiryFormatted}. Renew now to keep your store live.`
                            : `${businessName} — Complete your monthly platform access fee to take your store live.`}
                    </p>

                    {/* Pricing Breakdown */}
                    <div className="bg-white/5 rounded-2xl p-5 mb-8 border border-[#D4AF37]/30 shadow-inner">
                        <div className="flex items-center justify-between mb-4">
                            <span className="text-white/80 font-medium">{isRenewal || isExpired ? 'Monthly Renewal Fee' : 'Platform Access Fee'}</span>
                            <span className="text-[#D4AF37] font-bold text-2xl">₹149<span className="text-sm font-medium text-white/50">/mo</span></span>
                        </div>
                        {(isRenewal || isExpired) && (
                            <div className="flex items-center justify-between mb-3 pb-3 border-b border-white/10 text-xs">
                                <span className="text-white/60">Next billing date</span>
                                <span className="text-[#D4AF37] font-bold">{nextBillingDate}</span>
                            </div>
                        )}
                        <div className="space-y-3">
                            {[
                                'Full Merchant Dashboard Access',
                                'Inventory & Product Listing',
                                'Order & Delivery Management',
                                'Store Front Customization'
                            ].map((feature, idx) => (
                                <div key={idx} className="flex items-center gap-3 text-white/80 text-sm">
                                    <span className="material-icons-round text-[#D4AF37] text-base">check_circle</span>
                                    {feature}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Error Prompt */}
                    {error && (
                        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-3">
                            <span className="material-icons-round text-red-400 text-xl shrink-0">error_outline</span>
                            <p className="text-red-300 text-sm">{error}</p>
                        </div>
                    )}

                    {/* Pay Button */}
                    <button
                        onClick={handleSubscribe}
                        disabled={loading}
                        className="group relative w-full py-4 rounded-2xl bg-gradient-to-r from-[#D4AF37] to-amber-500 text-slate-900 font-extrabold text-lg shadow-[0_0_20px_rgba(212,175,55,0.3)] hover:shadow-[0_0_30px_rgba(212,175,55,0.5)] transition-all duration-300 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-3 overflow-hidden"
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
                                <span>{isRenewal || isExpired ? 'Renew ₹149 / Month' : 'Pay ₹149 to Activate'}</span>
                            </>
                        )}
                    </button>

                    <div className="mt-6 flex items-center justify-center gap-2 text-white/40 text-xs font-medium">
                        <span className="material-icons-round text-sm">verified_user</span>
                        <span>Secured by SabPaisa • All payment methods accepted</span>
                    </div>
                </div>
            </div>
            
            {/* Shimmer animation defined in globals.css or inline */}
            <style jsx global>{`
                @keyframes shimmer {
                    100% {
                        transform: translateX(100%);
                    }
                }
                .animate-shimmer {
                    animation: shimmer 1.5s infinite;
                }
            `}</style>
        </div>
    );
}
