import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '@/lib/supabaseClient';
import { PaymentStatusLayout, StatusHeader, ReferenceBlock, ActionRow } from '@/components/payment/PaymentStatus';

const FailurePage = () => {
    const router = useRouter();
    const { txnId, msg } = router.query;
    const [transaction, setTransaction] = useState(null);
    const [fetchError, setFetchError] = useState(false);

    useEffect(() => {
        if (txnId) {
            supabase.auth.getSession().then(({ data: { session } }) => {
                if (!session) {
                    setFetchError(true);
                    return;
                }
                fetch(`/api/transaction/details?id=${txnId}`, {
                    headers: { Authorization: `Bearer ${session.access_token}` }
                })
                    .then(res => {
                        if (!res.ok) throw new Error(`Transaction fetch failed: ${res.status}`);
                        return res.json();
                    })
                    .then(data => {
                        if (data.transaction) {
                            setTransaction(data.transaction);
                        } else {
                            setFetchError(true);
                        }
                    })
                    .catch(err => {
                        console.error('[FailurePage] Transaction fetch error:', err);
                        setFetchError(true);
                    });
            }).catch(err => {
                console.error('[FailurePage] Session error:', err);
                setFetchError(true);
            });
        }
    }, [txnId]);

    const isFallbackWallet = !transaction && txnId && txnId.startsWith('WLT_');
    const isFallbackGiftCard = !transaction && txnId && txnId.startsWith('GC_');

    /**
     * Resolve retry destination strictly from known transaction intent.
     * Never falls back to /payment/checkout (legacy test-style page).
     */
    const handleTryAgain = () => {
        // Gift card with specific coupon ID
        if (transaction?.udf1 === 'GIFT_CARD' && transaction?.udf2) {
            router.push(`/gift-cards/${transaction.udf2}`);
            return;
        }

        // Gift card (generic, or fallback prefix)
        if (transaction?.udf1 === 'GIFT_CARD' || isFallbackGiftCard) {
            router.push('/gift-cards');
            return;
        }

        // Wallet top-up
        if (transaction?.udf1 === 'WALLET_TOPUP' || isFallbackWallet) {
            router.push('/wallet');
            return;
        }

        // Merchant wallet top-up
        if (transaction?.udf1 === 'MERCHANT_TOPUP') {
            router.push('/merchant/wallet');
            return;
        }

        // Gold subscription
        if (transaction?.udf1 === 'GOLD_SUBSCRIPTION') {
            router.push('/gold');
            return;
        }

        // Unknown transaction type or fetch failed — safe landing page
        router.push('/dashboard');
    };

    return (
        <PaymentStatusLayout variant="red" animateBg={false}>
            <StatusHeader
                title="PAYMENT FAILED"
                variant="red"
                icon={
                    <svg className="h-10 w-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                }
            />

            <div className="px-8 pb-10 text-center">
                <p className="text-gray-300 text-sm mb-8 leading-relaxed max-w-[280px] mx-auto">
                    {msg ? decodeURIComponent(msg) : 'We could not process your transaction. Please check your payment details and try again.'}
                </p>

                {fetchError && !transaction && (
                    <p className="text-yellow-400/80 text-xs mb-4">
                        Unable to retrieve transaction details. You can retry from the relevant section.
                    </p>
                )}

                {txnId && (
                    <ReferenceBlock
                        amount={transaction?.amount}
                        refId={txnId}
                        statusLabel="Failed"
                        variant="red"
                    />
                )}

                <ActionRow
                    primary={{ label: "TRY AGAIN", onClick: handleTryAgain, variant: "red", href: "#" }}
                    secondary={{ label: "Go to Dashboard", href: "/dashboard" }}
                />
            </div>
        </PaymentStatusLayout>
    );
};

export default FailurePage;
