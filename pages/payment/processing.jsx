import React, { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '@/lib/supabaseClient';

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
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
            {!timedOut ? (
                <>
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mb-4"></div>
                    <h2 className="text-xl font-semibold text-gray-700 text-center">Processing Payment...</h2>
                    <p className="text-gray-500 mt-2 text-center">Please do not close this window.</p>
                </>
            ) : (
                <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-8 text-center">
                    <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-yellow-100 mb-6">
                        <svg className="h-8 w-8 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                    </div>
                    <h2 className="text-xl font-bold text-gray-900 mb-2">Payment status is taking longer than expected.</h2>
                    <p className="text-gray-600 mb-6 text-sm">
                        If your payment was debited, please contact support with your reference ID.
                    </p>
                    <button
                        onClick={handleCheckAgain}
                        className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 mb-4"
                    >
                        Check Again
                    </button>
                </div>
            )}
            {txnId && <p className="text-xs text-gray-400 mt-4 text-center">Ref: {txnId}</p>}
        </div>
    );
};

export default ProcessingPage;
