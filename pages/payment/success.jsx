import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import dynamic from 'next/dynamic';
import { motion } from 'framer-motion';

// Next.js dynamic import to prevent hydration mismatch with browser window
const Confetti = dynamic(() => import('react-confetti'), {
    ssr: false
});

const SuccessPage = () => {
    const router = useRouter();
    const { txnId } = router.query;
    const [transaction, setTransaction] = useState(null);
    const [userRole, setUserRole] = useState(null);
    const [windowDimensions, setWindowDimensions] = useState({ width: 0, height: 0 });
    const [showConfetti, setShowConfetti] = useState(true);

    useEffect(() => {
        // Handle window dimensions safely for the Confetti component
        setWindowDimensions({ width: window.innerWidth, height: window.innerHeight });

        const handleResize = () => {
            setWindowDimensions({ width: window.innerWidth, height: window.innerHeight });
        };
        window.addEventListener('resize', handleResize);

        // Stop confetti after 5 seconds for a minimal effect
        const timer = setTimeout(() => setShowConfetti(false), 5000);

        return () => {
            window.removeEventListener('resize', handleResize);
            clearTimeout(timer);
        };
    }, []);

    useEffect(() => {
        if (txnId) {
            supabase.auth.getSession().then(({ data: { session } }) => {
                if (!session) return;

                // Fetch User profile to determine role (customer vs merchant)
                supabase.from('user_profiles')
                    .select('role')
                    .eq('id', session.user.id)
                    .single()
                    .then(({ data }) => {
                        if (data) setUserRole(data.role);
                    });

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

    // Compute link destinations based on role
    const walletLink = userRole === 'merchant' ? '/merchant/wallet' : '/wallet';
    const giftCardsLink = userRole === 'merchant' ? '/merchant/inventory' : '/my-giftcards';
    const browseLink = userRole === 'merchant' ? '/merchant/purchase' : '/gift-cards';

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4 font-[family-name:var(--font-outfit)]">

            {showConfetti && (
                <Confetti
                    width={windowDimensions.width}
                    height={windowDimensions.height}
                    recycle={false}
                    numberOfPieces={200}
                    gravity={0.2}
                    style={{ position: 'fixed', top: 0, left: 0, zIndex: 50, pointerEvents: 'none' }}
                />
            )}

            <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.4, ease: "easeOut" }}
                className="max-w-md w-full bg-white shadow-2xl rounded-3xl overflow-hidden relative z-10"
            >
                {/* Top Gradient Banner */}
                <div className="h-32 bg-gradient-to-r from-[#92BCEA] to-[#AFB3F7] flex items-center justify-center relative">
                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.2 }}
                        className="absolute -bottom-10 bg-white p-4 rounded-full shadow-lg"
                    >
                        <div className="flex items-center justify-center h-12 w-12 rounded-full bg-green-500 text-white">
                            <motion.svg
                                className="h-8 w-8"
                                width="24"
                                height="24"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <motion.path
                                    initial={{ pathLength: 0 }}
                                    animate={{ pathLength: 1 }}
                                    transition={{ duration: 0.5, delay: 0.4, ease: "easeInOut" }}
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth="3"
                                    d="M5 13l4 4L19 7"
                                />
                            </motion.svg>
                        </div>
                    </motion.div>
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
                                    <span className="font-mono text-[10px] text-gray-400 select-all max-w-[150px] truncate" title={txnId}>{txnId}</span>
                                </div>
                            )}
                        </div>
                    )}

                    <div className="flex flex-col space-y-4">
                        {isWalletTopup ? (
                            <Link
                                href={walletLink}
                                className="w-full py-4 px-6 rounded-2xl text-sm font-bold text-white bg-gradient-to-r from-[#92BCEA] to-[#6B8FBF] shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all transform duration-200 block"
                            >
                                View My Wallet
                            </Link>
                        ) : (
                            <Link
                                href={giftCardsLink}
                                className="w-full py-4 px-6 rounded-2xl text-sm font-bold text-white bg-gradient-to-r from-indigo-500 to-blue-600 shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all transform duration-200 block"
                            >
                                View My Gift Cards
                            </Link>
                        )}
                        <Link href={browseLink} className="text-gray-400 hover:text-gray-600 text-xs font-semibold uppercase tracking-widest transition-colors py-2 block w-full text-center">
                            Browse More Gift Cards
                        </Link>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

export default SuccessPage;
