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
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4 font-[family-name:var(--font-outfit)]">
            <div className="max-w-md w-full bg-white shadow-2xl rounded-3xl overflow-hidden">
                {/* Top Gradient Banner */}
                <div className="h-32 bg-gradient-to-r from-[#92BCEA] to-[#AFB3F7] flex items-center justify-center relative">
                    <div className="absolute -bottom-10 bg-white p-4 rounded-full shadow-lg">
                        <div className="flex items-center justify-center h-12 w-12 rounded-full bg-green-500 text-white">
                            <svg className="h-8 w-8" width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path>
                            </svg>
                        </div>
                    </div>
                </div>

                <div className="pt-16 pb-10 px-8 text-center">
                    <h2 className="text-3xl font-bold text-gray-900 mb-2">Payment Successful!</h2>
                    <p className="text-gray-600 mb-6 px-4">
                        {isWalletTopup
                            ? 'Your wallet balance has been updated instantly. You can now use these funds for purchases.'
                            : 'Your transaction was completed successfully and recorded in your history.'}
                    </p>

                    {/* Transaction Details Card */}
                    {transaction && (
                        <div className="mb-8 text-left bg-gray-50 rounded-2xl p-6 border border-gray-100 space-y-4">
                            <div className="flex justify-between items-center pb-3 border-b border-gray-100">
                                <span className="text-gray-500 text-sm">Status</span>
                                <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold uppercase tracking-wider">Success</span>
                            </div>
                            {transaction.paid_amount && (
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-500 text-sm">Amount Paid</span>
                                    <span className="font-bold text-xl text-gray-900">₹{Number(transaction.paid_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                                </div>
                            )}
                            {transaction.payment_mode && (
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-500 text-sm">Payment via</span>
                                    <span className="font-medium text-gray-700 capitalize text-sm">{transaction.payment_mode}</span>
                                </div>
                            )}
                            {txnId && (
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-500 text-sm">Ref ID</span>
                                    <span className="font-mono text-[10px] text-gray-400 select-all">{txnId}</span>
                                </div>
                            )}
                        </div>
                    )}

                    <div className="flex flex-col space-y-4">
                        {isWalletTopup ? (
                            <Link
                                href="/merchant/wallet?topup=success"
                                className="w-full py-4 px-6 rounded-2xl text-sm font-bold text-white bg-gradient-to-r from-[#92BCEA] to-[#6B8FBF] shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all transform duration-200"
                            >
                                View My Wallet
                            </Link>
                        ) : (
                            <Link
                                href="/merchant/dashboard"
                                className="w-full py-4 px-6 rounded-2xl text-sm font-bold text-white bg-gradient-to-r from-indigo-500 to-blue-600 shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all transform duration-200"
                            >
                                Back to Dashboard
                            </Link>
                        )}
                        <Link href="/" className="text-gray-400 hover:text-gray-600 text-xs font-semibold uppercase tracking-widest transition-colors py-2">
                            Return to Home
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SuccessPage;
