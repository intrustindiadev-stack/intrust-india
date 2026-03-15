import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '@/lib/supabaseClient';
import dynamic from 'next/dynamic';
import { motion, useReducedMotion } from 'framer-motion';
import {
    PaymentStatusLayout,
    StatusHeader,
    ReferenceBlock,
    ActionRow
} from '@/components/payment/PaymentStatus';

const Confetti = dynamic(() => import('react-confetti'), { ssr: false });

const getPaymentConfig = (txnId, transaction, userRole) => {
    const isGoldSub = txnId?.startsWith('GOLD_') || transaction?.udf1 === 'GOLD_SUBSCRIPTION';
    const isGiftCard = txnId?.startsWith('GC_') || txnId?.startsWith('WALLET_') || transaction?.udf1 === 'GIFT_CARD';
    const isWalletTopup = txnId?.startsWith('WLT_') || transaction?.udf1 === 'WALLET_TOPUP';

    const dashboardLink = userRole === 'merchant' ? '/merchant/dashboard' : '/dashboard';

    if (isGoldSub) {
        return {
            variant: 'amber',
            title: 'ELITE GOLD ACTIVATED',
            description: 'Welcome to the inner circle. Your premium benefits and cashback are now active!',
            methodLabel: 'Wallet Pay',
            amount: transaction?.paid_amount || transaction?.amount,
            primary: { label: 'ENTER DASHBOARD', href: dashboardLink, variant: 'amber' },
            secondary: { label: 'Back to Home', href: dashboardLink, variant: 'amber' },
            tertiary: { label: 'Go to Dashboard', href: '/dashboard' }
        };
    } else if (isGiftCard) {
        return {
            variant: 'indigo',
            title: 'GIFT CARD SECURED',
            description: 'Your gift card has been secured and added to your wallet. Ready to redeem?',
            methodLabel: transaction?.payment_mode || 'Online Payment',
            amount: transaction?.paid_amount || transaction?.amount,
            primary: { label: 'VIEW MY CARDS', href: userRole === 'merchant' ? '/merchant/inventory' : '/my-giftcards', variant: 'indigo' },
            secondary: { label: 'View My Cards', href: '/my-giftcards', variant: 'indigo' }
        };
    } else if (isWalletTopup) {
        return {
            variant: 'blue',
            title: 'PAYMENT SUCCESSFUL',
            description: 'Funds added. Your wallet is loaded and ready for some serious spending.',
            methodLabel: transaction?.payment_mode || 'Online Payment',
            amount: transaction?.paid_amount || transaction?.amount,
            primary: { label: 'CHECK BALANCE', href: userRole === 'merchant' ? '/merchant/wallet' : '/wallet', variant: 'blue' },
            secondary: { label: 'Back to Home', href: dashboardLink }
        };
    } else {
        return {
            variant: 'blue',
            title: 'PAYMENT SUCCESSFUL',
            description: 'Transaction complete. Your digital goods are being served hot and fresh.',
            methodLabel: transaction?.payment_mode || 'Online Payment',
            amount: transaction?.paid_amount || transaction?.amount,
            primary: { label: 'VIEW ASSETS', href: dashboardLink, variant: 'blue' },
            secondary: { label: 'Back to Home', href: dashboardLink }
        };
    }
};

const SuccessPage = () => {
    const router = useRouter();
    const { txnId } = router.query;

    const [verificationState, setVerificationState] = useState('loading'); // 'loading', 'verified', 'error'
    const [transaction, setTransaction] = useState(null);
    const [userRole, setUserRole] = useState(null);
    const [windowDimensions, setWindowDimensions] = useState({ width: 0, height: 0 });
    const [showConfetti, setShowConfetti] = useState(true);

    const shouldReduceMotion = useReducedMotion();

    useEffect(() => {
        setWindowDimensions({ width: window.innerWidth, height: window.innerHeight });
        const handleResize = () => setWindowDimensions({ width: window.innerWidth, height: window.innerHeight });
        window.addEventListener('resize', handleResize);

        // Shorten confetti duration and tie it to motion preferences
        if (!shouldReduceMotion) {
            const timer = setTimeout(() => setShowConfetti(false), 5000); // reduced from 8000
            return () => {
                window.removeEventListener('resize', handleResize);
                clearTimeout(timer);
            };
        } else {
            setShowConfetti(false); // disable confetti entirely for reduced motion
            return () => window.removeEventListener('resize', handleResize);
        }
    }, [shouldReduceMotion]);

    useEffect(() => {
        if (!txnId) return;

        const verifyTransaction = async () => {
            try {
                // If this is a synthetic wallet transaction from a direct balance deduction, skip backend fetch
                if (txnId.startsWith('WALLET_')) {
                    setTransaction({
                        status: 'SUCCESS',
                        amount: router.query.amount || 0,
                        payment_mode: 'Intrust Wallet',
                        udf1: router.query.type || 'GIFT_CARD'
                    });
                    setVerificationState('verified');
                    return;
                }

                const { data: { session } } = await supabase.auth.getSession();

                if (!session) {
                    router.replace(`/login?returnUrl=/payment/success?txnId=${txnId}`);
                    return;
                }

                // Fetch User Role
                const { data: roleData } = await supabase.from('user_profiles')
                    .select('role')
                    .eq('id', session.user.id)
                    .single();

                if (roleData) setUserRole(roleData.role);

                // Fetch Transaction
                const res = await fetch(`/api/transaction/details?id=${txnId}`, {
                    headers: { Authorization: `Bearer ${session.access_token}` }
                });

                const data = await res.json();

                if (!res.ok || !data.transaction) {
                    setVerificationState('error');
                    setTimeout(() => router.replace(`/payment/failure?txnId=${txnId}&msg=Transaction%20not%20found`), 2000);
                    return;
                }

                const tx = data.transaction;

                // Explicit Verification Gate
                if (tx.status === 'SUCCESS') {
                    setTransaction(tx);
                    setVerificationState('verified');
                } else if (tx.status === 'FAILED' || tx.status === 'ERROR') {
                    router.replace(`/payment/failure?txnId=${txnId}`);
                } else {
                    router.replace(`/payment/processing?txnId=${txnId}`);
                }

            } catch (err) {
                console.error(err);
                setVerificationState('error');
            }
        };

        verifyTransaction();
    }, [txnId, router]);

    if (verificationState === 'loading') {
        return (
            <PaymentStatusLayout variant="blue">
                <StatusHeader title="VERIFYING PAYMENT" isLoading={true} />
                <div className="px-8 pb-10 text-center">
                    <p className="text-gray-400 text-sm mb-8 leading-relaxed">
                        Hold on a second while we securely verify your transaction with the bank...
                    </p>
                </div>
            </PaymentStatusLayout>
        );
    }

    if (verificationState === 'error') {
        return (
            <PaymentStatusLayout variant="red">
                <StatusHeader
                    title="VERIFICATION ERROR"
                    variant="red"
                    icon={
                        <svg className="w-12 h-12 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    }
                />
                <div className="px-8 pb-10 text-center">
                    <p className="text-gray-400 text-sm mb-8 leading-relaxed">
                        We encountered an issue looking up your transaction. Redirecting...
                    </p>
                </div>
            </PaymentStatusLayout>
        );
    }

    const config = getPaymentConfig(txnId, transaction, userRole);

    // Responsive confetti pieces count
    const confettiPieces = windowDimensions.width < 768 ? 150 : 300;

    const confettiColors = config.variant === 'amber'
        ? ['#F59E0B', '#fbbf24', '#fcd34d', '#ffffff']
        : config.variant === 'indigo'
            ? ['#6366F1', '#818CF8', '#A78BFA', '#ffffff']
            : undefined;

    return (
        <PaymentStatusLayout variant={config.variant}>
            {showConfetti && !shouldReduceMotion && (
                <div className="fixed inset-0 pointer-events-none z-50">
                    <Confetti
                        width={windowDimensions.width}
                        height={windowDimensions.height}
                        recycle={false}
                        numberOfPieces={config.variant === 'amber' ? confettiPieces + 100 : confettiPieces}
                        gravity={0.15}
                        colors={confettiColors}
                    />
                </div>
            )}

            <StatusHeader
                title={config.title}
                variant={config.variant}
                icon={
                    <motion.svg
                        className="w-12 h-12 text-white"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                    >
                        <motion.path
                            initial={shouldReduceMotion ? { pathLength: 1 } : { pathLength: 0 }}
                            animate={{ pathLength: 1 }}
                            transition={{ duration: 0.6, delay: 0.5 }}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={3}
                            d="M5 13l4 4L19 7"
                        />
                    </motion.svg>
                }
            />

            <div className="px-8 pb-10 text-center">
                <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.6 }}
                    className="text-gray-400 text-sm mb-8 leading-relaxed max-w-[280px] mx-auto"
                >
                    {config.description}
                </motion.p>

                <div className={shouldReduceMotion ? '' : "transform-gpu"}>
                    <ReferenceBlock
                        amount={config.amount}
                        method={config.methodLabel}
                        refId={txnId}
                        statusLabel="Completed"
                        variant={config.variant}
                    />
                </div>

                <ActionRow {...config} />
            </div>
        </PaymentStatusLayout>
    );
};

export default SuccessPage;
