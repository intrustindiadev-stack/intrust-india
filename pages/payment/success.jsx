import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';

const SuccessPage = () => {
    const router = useRouter();
    const { txnId } = router.query;
    const [transaction, setTransaction] = useState(null);

    useEffect(() => {
        if (txnId) {
            supabase.auth.getSession().then(({ data: { session } }) => {
                if (!session) return;
                fetch(`/api/transaction/details?id=${txnId}`, {
                    headers: { Authorization: `Bearer ${session.access_token}` }
                })
                    .then(res => res.json())
                    .then(data => {
                        if (data.transaction) setTransaction(data.transaction);
                    })
                    .catch(err => console.error(err));
            });
        }
    }, [txnId]);

    const isWalletTopup = transaction?.udf1 === 'WALLET_TOPUP';

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-white shadow-lg rounded-2xl p-8 text-center">
                {/* Success Icon */}
                <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-6">
                    <svg className="h-10 w-10 text-green-600" width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                    </svg>
                </div>

                <h2 className="text-2xl font-bold text-gray-900 mb-2">Payment Successful!</h2>
                <p className="text-gray-600 mb-2">
                    {isWalletTopup
                        ? 'Your wallet has been topped up successfully.'
                        : 'Your transaction has been completed successfully.'}
                </p>

                {txnId && (
                    <p className="text-sm text-gray-400 mb-6">
                        Transaction Ref: <span className="font-mono font-medium text-gray-600">{txnId}</span>
                    </p>
                )}

                {/* Transaction Details */}
                {transaction && (
                    <div className="mb-6 text-left bg-gray-50 rounded-xl p-4 space-y-2 text-sm">
                        {transaction.paid_amount && (
                            <div className="flex justify-between">
                                <span className="text-gray-500">Amount</span>
                                <span className="font-bold text-gray-900">₹{Number(transaction.paid_amount).toLocaleString('en-IN')}</span>
                            </div>
                        )}
                        {transaction.payment_mode && (
                            <div className="flex justify-between">
                                <span className="text-gray-500">Payment Mode</span>
                                <span className="font-medium text-gray-700">{transaction.payment_mode}</span>
                            </div>
                        )}
                        {transaction.sabpaisa_txn_id && (
                            <div className="flex justify-between">
                                <span className="text-gray-500">Gateway Ref</span>
                                <span className="font-mono text-xs text-gray-600">{transaction.sabpaisa_txn_id}</span>
                            </div>
                        )}
                    </div>
                )}

                <div className="flex flex-col space-y-3">
                    {isWalletTopup ? (
                        <Link
                            href="/merchant/wallet?topup=success"
                            className="w-full flex justify-center py-3 px-4 rounded-xl text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 transition-colors"
                        >
                            Go to My Wallet
                        </Link>
                    ) : (
                        <Link
                            href="/merchant/dashboard"
                            className="w-full flex justify-center py-3 px-4 rounded-xl text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors"
                        >
                            Go to Dashboard
                        </Link>
                    )}
                    <Link href="/" className="text-gray-500 hover:text-gray-700 text-sm font-medium transition-colors">
                        Return to Home
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default SuccessPage;
