import React, { useEffect, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { supabase } from '@/lib/supabaseClient';
import dynamic from 'next/dynamic';
import { motion, useReducedMotion } from 'framer-motion';
import { CheckCircle, Clock, Star, ShoppingBag, CreditCard, Wallet } from 'lucide-react';

const Confetti = dynamic(() => import('react-confetti'), { ssr: false });

// Returns display config based on transaction type
const getConfig = (txnId, transaction, userRole) => {
    const dashboardLink = userRole === 'merchant' ? '/merchant/dashboard' : '/dashboard';
    const type = transaction?.udf1;
    const isMerchantSub = txnId?.startsWith('MSUB_') || type === 'MERCHANT_SUBSCRIPTION';
    const isGoldSub = txnId?.startsWith('GOLD_') || type === 'GOLD_SUBSCRIPTION';
    const isGiftCard = txnId?.startsWith('GC_') || type === 'GIFT_CARD';
    const isWalletTopup = txnId?.startsWith('WLT_') || type === 'WALLET_TOPUP';
    const isCartCheckout = type === 'CART_CHECKOUT';
    const isUdhari = type === 'UDHARI_PAYMENT';

    if (isMerchantSub) return {
        icon: <Star size={48} className="text-white" strokeWidth={2.5} />,
        color: '#f59e0b',
        title: 'Store Activated! 🎉',
        subtitle: 'Your merchant subscription is now active. Welcome to your dashboard!',
        redirectTo: '/merchant/dashboard',
        redirectDelay: 4000,
        redirectLabel: 'Merchant Dashboard',
        showConfetti: true,
    };
    if (isGoldSub) return {
        icon: <Star size={48} className="text-white" strokeWidth={2.5} />,
        color: '#f59e0b',
        title: 'Elite Gold Activated! ⭐',
        subtitle: 'Your premium benefits and cashback are now active!',
        redirectTo: dashboardLink,
        redirectDelay: 4000,
        redirectLabel: 'Go to Dashboard',
        showConfetti: true,
    };
    if (isGiftCard) return {
        icon: <CreditCard size={48} className="text-white" strokeWidth={2.5} />,
        color: '#6366f1',
        title: 'Gift Card Secured! 💳',
        subtitle: 'Your gift card has been added to your account and is ready to use.',
        redirectTo: userRole === 'merchant' ? '/merchant/inventory' : '/my-giftcards',
        redirectDelay: 3500,
        redirectLabel: 'View My Cards',
        showConfetti: false,
    };
    if (isCartCheckout) return {
        icon: <ShoppingBag size={48} className="text-white" strokeWidth={2.5} />,
        color: '#2563eb',
        title: 'Order Placed! 🛍️',
        subtitle: 'Your order has been confirmed and is being processed.',
        redirectTo: '/orders?success=true',
        redirectDelay: 3000,
        redirectLabel: 'Track Your Order',
        showConfetti: false,
    };
    if (isUdhari) return {
        icon: <CheckCircle size={48} className="text-white" strokeWidth={2.5} />,
        color: '#10b981',
        title: 'Store Credit Paid! ✅',
        subtitle: 'Your store credit has been settled successfully.',
        redirectTo: dashboardLink,
        redirectDelay: 3500,
        redirectLabel: 'Go to Dashboard',
        showConfetti: false,
    };
    // Default: Wallet Topup or generic
    return {
        icon: <Wallet size={48} className="text-white" strokeWidth={2.5} />,
        color: '#2563eb',
        title: 'Payment Successful! ✅',
        subtitle: isWalletTopup
            ? 'Funds added. Your wallet is loaded and ready for some serious spending.'
            : 'Transaction complete. Your payment was processed successfully.',
        redirectTo: isWalletTopup
            ? (userRole === 'merchant' ? '/merchant/wallet' : '/wallet')
            : dashboardLink,
        redirectDelay: 3500,
        redirectLabel: isWalletTopup ? 'Check Balance' : 'Go to Dashboard',
        showConfetti: false,
    };
};

const SuccessPage = () => {
    const router = useRouter();
    const { txnId } = router.query;

    const [state, setState] = useState('loading'); // 'loading' | 'verified' | 'error'
    const [transaction, setTransaction] = useState(null);
    const [userRole, setUserRole] = useState(null);
    const [windowSize, setWindowSize] = useState({ width: 0, height: 0 });
    const shouldReduceMotion = useReducedMotion();

    // Track window size for confetti
    useEffect(() => {
        const update = () => setWindowSize({ width: window.innerWidth, height: window.innerHeight });
        update();
        window.addEventListener('resize', update);
        return () => window.removeEventListener('resize', update);
    }, []);

    // Verify transaction
    useEffect(() => {
        if (!txnId) return;

        const verify = async () => {
            try {
                // Synthetic wallet txns (direct balance deduction)
                if (txnId.startsWith('WALLET_')) {
                    setTransaction({
                        status: 'SUCCESS',
                        amount: router.query.amount || 0,
                        payment_mode: 'Intrust Wallet',
                        udf1: router.query.type || 'GIFT_CARD'
                    });
                    setState('verified');
                    return;
                }

                const { data: { session } } = await supabase.auth.getSession();
                if (!session) {
                    router.replace(`/login?returnUrl=/payment/success?txnId=${txnId}`);
                    return;
                }

                const { data: roleData } = await supabase
                    .from('user_profiles')
                    .select('role')
                    .eq('id', session.user.id)
                    .single();
                if (roleData) setUserRole(roleData.role);

                const res = await fetch(`/api/transaction/details?id=${txnId}`, {
                    headers: { Authorization: `Bearer ${session.access_token}` }
                });
                const data = await res.json();

                if (!res.ok || !data.transaction) {
                    setState('error');
                    setTimeout(() => router.replace(`/payment/failure?txnId=${txnId}&msg=Transaction%20not%20found`), 2000);
                    return;
                }

                const tx = data.transaction;
                if (tx.status === 'SUCCESS') {
                    setTransaction(tx);
                    setState('verified');
                } else if (tx.status === 'FAILED' || tx.status === 'ERROR') {
                    router.replace(`/payment/failure?txnId=${txnId}`);
                } else {
                    router.replace(`/payment/processing?txnId=${txnId}`);
                }
            } catch (err) {
                console.error(err);
                setState('error');
            }
        };

        verify();
    }, [txnId, router]);

    // Auto-redirect on verified
    useEffect(() => {
        if (state !== 'verified' || !transaction) return;
        const config = getConfig(txnId, transaction, userRole);
        const timer = setTimeout(() => router.replace(config.redirectTo), config.redirectDelay);
        return () => clearTimeout(timer);
    }, [state, transaction, txnId, userRole, router]);

    // ── Loading ──────────────────────────────────────────────────────────────
    if (state === 'loading') {
        return (
            <>
                <Head>
                    <title>Verifying Payment — InTrust India</title>
                    <meta name="robots" content="noindex, nofollow" />
                </Head>
                <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#f7f8fa] dark:bg-[#080a10]">
                    <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                        className="w-14 h-14 rounded-full border-4 border-slate-200 dark:border-white/10 border-t-blue-500 mb-5"
                    />
                    <p className="text-slate-500 dark:text-white/40 text-sm font-bold">Verifying payment…</p>
                </div>
            </>
        );
    }

    // ── Error ────────────────────────────────────────────────────────────────
    if (state === 'error') {
        return (
            <>
                <Head>
                    <title>Verification Error — InTrust India</title>
                    <meta name="robots" content="noindex, nofollow" />
                </Head>
                <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#f7f8fa] dark:bg-[#080a10]">
                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: 'spring', stiffness: 300, damping: 12 }}
                        className="w-20 h-20 mx-auto mb-5 rounded-full bg-red-600 flex items-center justify-center shadow-[0_0_40px_rgba(220,38,38,0.3)]"
                    >
                        <CheckCircle size={40} className="text-white" strokeWidth={2.5} />
                    </motion.div>
                    <h1 className="text-slate-900 dark:text-white text-xl font-black mb-2">Verification Error</h1>
                    <p className="text-slate-500 dark:text-white/30 text-sm font-medium">Redirecting…</p>
                </div>
            </>
        );
    }

    // ── Verified ─────────────────────────────────────────────────────────────
    const config = getConfig(txnId, transaction, userRole);
    const progressDuration = config.redirectDelay / 1000;

    return (
        <>
            <Head>
                <title>Payment Successful — InTrust India</title>
                <meta name="description" content="Your payment was processed successfully by InTrust India." />
                <meta name="robots" content="noindex, nofollow" />
            </Head>

            {/* Confetti for subscription payments */}
            {config.showConfetti && !shouldReduceMotion && (
                <div className="fixed inset-0 pointer-events-none z-[200]">
                    <Confetti
                        width={windowSize.width}
                        height={windowSize.height}
                        recycle={false}
                        numberOfPieces={windowSize.width < 768 ? 180 : 320}
                        gravity={0.15}
                        colors={['#f59e0b', '#fbbf24', '#fcd34d', '#ffffff']}
                    />
                </div>
            )}

            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="fixed inset-0 z-[100] flex items-center justify-center bg-[#f7f8fa] dark:bg-[#080a10]"
            >
                <motion.div
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.2 }}
                    className="text-center px-8 max-w-sm w-full"
                >
                    {/* Animated Icon Circle */}
                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: 'spring', stiffness: 300, damping: 12, delay: 0.4 }}
                        className="w-24 h-24 mx-auto mb-6 rounded-full flex items-center justify-center"
                        style={{
                            background: config.color,
                            boxShadow: `0 0 50px ${config.color}50`
                        }}
                    >
                        <motion.div
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ delay: 0.65, duration: 0.4 }}
                        >
                            {config.icon}
                        </motion.div>
                    </motion.div>

                    {/* Title */}
                    <motion.h1
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.6 }}
                        className="text-2xl font-black mb-2 text-slate-900 dark:text-white"
                    >
                        {config.title}
                    </motion.h1>

                    {/* Subtitle */}
                    <motion.p
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.75 }}
                        className="text-sm font-medium mb-3 text-slate-500 dark:text-white/40 leading-relaxed"
                    >
                        {config.subtitle}
                    </motion.p>

                    {/* Transaction ID */}
                    {txnId && (
                        <motion.p
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.9 }}
                            className="text-[10px] font-mono text-slate-400 dark:text-white/20 mb-8 break-all"
                        >
                            Ref: {txnId}
                        </motion.p>
                    )}

                    {/* Progress bar */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.8 }}
                        className="w-full h-1 rounded-full overflow-hidden bg-slate-200 dark:bg-white/[0.06]"
                    >
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: '100%' }}
                            transition={{ delay: 0.5, duration: progressDuration, ease: 'linear' }}
                            className="h-full rounded-full"
                            style={{ background: config.color }}
                        />
                    </motion.div>

                    <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 1 }}
                        className="text-[10px] font-bold text-slate-400 dark:text-white/20 mt-3 uppercase tracking-widest"
                    >
                        Redirecting to {config.redirectLabel}…
                    </motion.p>
                </motion.div>
            </motion.div>
        </>
    );
};

export default SuccessPage;
