import React, { useEffect, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { supabase } from '@/lib/supabaseClient';
import { motion, useReducedMotion } from 'framer-motion';
import { XCircle, RotateCcw, Home } from 'lucide-react';
import Link from 'next/link';

const FailurePage = () => {
    const router = useRouter();
    const { txnId, msg } = router.query;
    
    const [state, setState] = useState('loading'); // 'loading' | 'ready'
    const [transaction, setTransaction] = useState(null);
    const [fetchError, setFetchError] = useState(false);
    const shouldReduceMotion = useReducedMotion();

    useEffect(() => {
        if (!txnId) {
            setState('ready');
            return;
        }

        const verify = async () => {
            try {
                if (txnId.startsWith('WALLET_')) {
                    // Synthetic wallet txn — no DB record exists, skip fetch
                    setTransaction({
                        udf1: router.query.type || 'GIFT_CARD',
                        udf2: router.query.itemId || ''
                    });
                    setState('ready');
                    return;
                }

                const { data: { session } } = await supabase.auth.getSession();
                if (!session) {
                    setFetchError(true);
                    setState('ready');
                    return;
                }

                const res = await fetch(`/api/transaction/details?id=${txnId}`, {
                    headers: { Authorization: `Bearer ${session.access_token}` }
                });
                
                if (!res.ok) throw new Error(`Transaction fetch failed: ${res.status}`);
                const data = await res.json();

                if (data.transaction) {
                    setTransaction(data.transaction);
                } else {
                    setFetchError(true);
                }
            } catch (err) {
                console.error('[FailurePage] fetch error:', err);
                setFetchError(true);
            } finally {
                setState('ready');
            }
        };

        verify();
    }, [txnId, router.query]);

    const isFallbackWallet = !transaction && txnId && txnId.startsWith('WLT_');
    const isFallbackGiftCard = !transaction && txnId && txnId.startsWith('GC_');

    const handleTryAgain = () => {
        if (transaction?.udf1 === 'GIFT_CARD' && transaction?.udf2) {
            router.push(`/gift-cards/${transaction.udf2}`);
            return;
        }
        if (transaction?.udf1 === 'GIFT_CARD' || isFallbackGiftCard) {
            router.push('/gift-cards');
            return;
        }
        if (transaction?.udf1 === 'WALLET_TOPUP' || isFallbackWallet) {
            router.push('/wallet');
            return;
        }
        if (transaction?.udf1 === 'MERCHANT_TOPUP') {
            router.push('/merchant/wallet');
            return;
        }
        if (transaction?.udf1 === 'GOLD_SUBSCRIPTION') {
            router.push('/wallet');
            return;
        }
        router.push('/dashboard');
    };

    // ── Loading ──────────────────────────────────────────────────────────────
    if (state === 'loading') {
        return (
            <>
                <Head>
                    <title>Processing — InTrust India</title>
                    <meta name="robots" content="noindex, nofollow" />
                </Head>
                <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#f7f8fa] dark:bg-[#080a10]">
                    <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                        className="w-14 h-14 rounded-full border-4 border-slate-200 dark:border-white/10 border-t-red-500 mb-5"
                    />
                </div>
            </>
        );
    }

    // ── Ready ────────────────────────────────────────────────────────────────
    const errorMessage = msg ? decodeURIComponent(msg) : 'We could not process your transaction. Please check your payment details and try again.';

    return (
        <>
            <Head>
                <title>Payment Failed — InTrust India</title>
                <meta name="description" content="Your payment could not be processed." />
                <meta name="robots" content="noindex, nofollow" />
            </Head>

            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="fixed inset-0 z-[100] flex items-center justify-center bg-[#f7f8fa] dark:bg-[#080a10] p-4"
            >
                <motion.div
                    initial={shouldReduceMotion ? { opacity: 1 } : { scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: 'spring', stiffness: 200, damping: 20 }}
                    className="text-center w-full max-w-sm"
                >
                    {/* Animated Error Icon */}
                    <motion.div
                        initial={shouldReduceMotion ? { scale: 1 } : { scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: 'spring', stiffness: 300, damping: 15, delay: 0.1 }}
                        className="w-24 h-24 mx-auto mb-6 rounded-full flex items-center justify-center bg-red-600 shadow-[0_0_50px_rgba(220,38,38,0.3)]"
                    >
                        <motion.div
                            initial={shouldReduceMotion ? { opacity: 1 } : { scale: 0, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ delay: 0.3, duration: 0.4 }}
                        >
                            <XCircle size={48} className="text-white" strokeWidth={2.5} />
                        </motion.div>
                    </motion.div>

                    {/* Title */}
                    <motion.h1
                        initial={shouldReduceMotion ? { opacity: 1 } : { y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.3 }}
                        className="text-2xl font-black mb-3 text-slate-900 dark:text-white"
                    >
                        Payment Failed
                    </motion.h1>

                    {/* Subtitle / Message */}
                    <motion.p
                        initial={shouldReduceMotion ? { opacity: 1 } : { y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.4 }}
                        className="text-sm font-medium mb-6 text-slate-600 dark:text-white/60 leading-relaxed"
                    >
                        {errorMessage}
                    </motion.p>
                    
                    {fetchError && !transaction && (
                        <motion.p 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.5 }}
                            className="text-amber-700 dark:text-amber-400/80 text-xs font-bold bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-500/20 rounded-lg p-2 mb-6"
                        >
                            Unable to retrieve transaction details. You can retry from the relevant section.
                        </motion.p>
                    )}

                    {/* Ref ID */}
                    {txnId && (
                        <motion.div
                            initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.6 }}
                            className="mb-8"
                        >
                            <p className="inline-block bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-1.5 text-[10px] font-mono text-slate-500 dark:text-white/40 break-all">
                                Ref: {txnId}
                            </p>
                        </motion.div>
                    )}

                    {/* Actions */}
                    <motion.div 
                        initial={shouldReduceMotion ? { opacity: 1 } : { y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.7 }}
                        className="flex flex-col gap-3"
                    >
                        <button
                            onClick={handleTryAgain}
                            className="w-full flex items-center justify-center gap-2 py-4 rounded-xl font-black text-white bg-red-600 hover:bg-red-500 transition-colors shadow-lg shadow-red-600/20 active:scale-[0.98]"
                        >
                            <RotateCcw size={18} strokeWidth={2.5} />
                            Try Again
                        </button>
                        
                        <Link 
                            href="/dashboard"
                            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-slate-500 hover:text-slate-900 hover:bg-slate-100 border border-transparent hover:border-slate-200 dark:text-white/60 dark:hover:text-white dark:hover:bg-white/5 dark:hover:border-white/10 transition-all active:scale-[0.98]"
                        >
                            <Home size={16} />
                            Go to Dashboard
                        </Link>
                    </motion.div>

                </motion.div>
            </motion.div>
        </>
    );
};

export default FailurePage;
