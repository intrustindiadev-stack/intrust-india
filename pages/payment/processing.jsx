import React, { useEffect } from 'react';
import { useRouter } from 'next/router';

const ProcessingPage = () => {
    const router = useRouter();
    const { txnId } = router.query;

    useEffect(() => {
        if (!txnId) return;

        // Poll for status update or just wait and verify
        const checkStatus = async () => {
            try {
                // Wait a bit or verify status
                const response = await fetch(`/api/payment/verify?clientTxnId=${txnId}`);
                const data = await response.json();

                if (data.latestStatus === 'SUCCESS') {
                    router.replace(`/payment/success?txnId=${txnId}`);
                } else if (data.latestStatus === 'FAILED') {
                    router.replace(`/payment/failure?txnId=${txnId}`);
                } else {
                    // Still pending, maybe show refresh button or keep polling
                    // For now, just stay here or refresh after 5s
                    setTimeout(checkStatus, 5000);
                }
            } catch (e) {
                console.error('Check status error', e);
            }
        };

        const timer = setTimeout(checkStatus, 2000);
        return () => clearTimeout(timer);
    }, [txnId, router]);

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mb-4"></div>
            <h2 className="text-xl font-semibold text-gray-700">Processing Payment...</h2>
            <p className="text-gray-500 mt-2">Please do not close this window.</p>
            {txnId && <p className="text-xs text-gray-400 mt-4">Ref: {txnId}</p>}
        </div>
    );
};

export default ProcessingPage;
