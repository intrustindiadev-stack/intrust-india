import React from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';

const FailurePage = () => {
    const router = useRouter();
    const { txnId, msg } = router.query;

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-8 text-center">
                <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 mb-6">
                    <svg className="h-10 w-10 text-red-600" width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                    </svg>
                </div>

                <h2 className="text-2xl font-bold text-gray-900 mb-2">Payment Failed</h2>
                <p className="text-gray-600 mb-6">
                    {msg ? decodeURIComponent(msg) : 'We could not process your transaction.'}
                </p>

                {txnId && (
                    <div className="bg-gray-50 rounded p-3 mb-6">
                        <p className="text-xs text-gray-500">Transaction Ref:</p>
                        <p className="text-sm font-mono text-gray-800">{txnId}</p>
                    </div>
                )}

                <div className="flex flex-col space-y-3">
                    <button
                        onClick={() => router.push('/payment/checkout')}
                        className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700"
                    >
                        Try Again
                    </button>
                    <Link href="/dashboard/transactions" className="text-gray-600 hover:text-gray-500 text-sm font-medium">
                        Go to Dashboard
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default FailurePage;
