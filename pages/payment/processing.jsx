import React, { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '@/lib/supabaseClient';
import { PaymentStatusLayout, StatusHeader, ActionRow, ReferenceBlock } from '@/components/payment/PaymentStatus';

const ProcessingPage = () => {
    const router = useRouter();
    const { txnId } = router.query;
    const [timedOut, setTimedOut] = useState(false);
    const pollCountRef = useRef(0);

    const checkStatus = async () => {
        if (!txnId) return;
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const accessToken = session?.access_token;

            if (!accessToken) {
                console.error("No active session found");
                router.replace('/login');
                return;
            }

            const response = await fetch(`/api/payment/verify?clientTxnId=${txnId}`, {
                headers: {
                    'Authorization': `Bearer ${accessToken}`
                }
            });
            const data = await response.json();

            if (data.latestStatus === 'SUCCESS') {
                router.replace(`/payment/success?txnId=${txnId}`);
            } else if (data.latestStatus === 'FAILED') {
                router.replace(`/payment/failure?txnId=${txnId}`);
            } else {
                pollCountRef.current += 1;
                if (pollCountRef.current >= 6) {
                    setTimedOut(true);
                } else {
                    setTimeout(checkStatus, 5000);
                }
            }
        } catch (e) {
            console.error('Check status error', e);
            pollCountRef.current += 1;
            if (pollCountRef.current >= 6) {
                setTimedOut(true);
            } else {
                setTimeout(checkStatus, 5000);
            }
        }
    };

    useEffect(() => {
        if (!txnId) return;
        pollCountRef.current = 0;
        const timer = setTimeout(checkStatus, 2000);
        return () => clearTimeout(timer);
    }, [txnId, router]);

    const handleCheckAgain = () => {
        setTimedOut(false);
        pollCountRef.current = 5; // Allow one more poll cycle
        checkStatus();
    };

    return (
        <PaymentStatusLayout variant="indigo" animateBg={!timedOut}>
            {!timedOut ? (
                <>
                    <StatusHeader
                        title="PROCESSING PAYMENT"
                        variant="indigo"
                        isLoading={true}
                    />
                    <div className="px-8 pb-10 text-center">
                        <p className="text-gray-400 text-sm mb-8 leading-relaxed">
                            Please wait while we confirm your payment. <br /> Do not close or refresh this window.
                        </p>
                        {txnId && (
                            <div className="bg-black/40 border border-white/5 rounded-2xl p-4">
                                <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">Transaction Ref</p>
                                <p className="text-xs font-mono text-gray-300 truncate">{txnId}</p>
                            </div>
                        )}
                    </div>
                </>
            ) : (
                <>
                    <StatusHeader
                        title="TAKING LONGER THAN EXPECTED"
                        variant="amber"
                        icon={
                            <svg className="h-10 w-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                        }
                    />
                    <div className="px-8 pb-10 text-center">
                        <p className="text-gray-400 text-sm mb-6 leading-relaxed">
                            If your payment was debited, please contact support with your reference ID.
                        </p>

                        {txnId && (
                            <ReferenceBlock refId={txnId} variant="amber" />
                        )}

                        <ActionRow
                            primary={{ label: "CHECK AGAIN", onClick: handleCheckAgain, variant: "blue", href: "#" }}
                            secondary={{ label: "Go to Dashboard", href: "/dashboard" }}
                        />
                    </div>
                </>
            )}
        </PaymentStatusLayout>
    );
};

export default ProcessingPage;
