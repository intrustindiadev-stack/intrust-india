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
    const { txnId, amount: queryAmount } = router.query;
    const [transaction, setTransaction] = useState(null);
    const [userRole, setUserRole] = useState(null);
    const [windowDimensions, setWindowDimensions] = useState({ width: 0, height: 0 });
    const [showConfetti, setShowConfetti] = useState(true);

    useEffect(() => {
        setWindowDimensions({ width: window.innerWidth, height: window.innerHeight });
        const handleResize = () => setWindowDimensions({ width: window.innerWidth, height: window.innerHeight });
        window.addEventListener('resize', handleResize);
        const timer = setTimeout(() => setShowConfetti(false), 8000);
        return () => {
            window.removeEventListener('resize', handleResize);
            clearTimeout(timer);
        };
    }, []);

    useEffect(() => {
        if (txnId) {
            supabase.auth.getSession().then(({ data: { session } }) => {
                if (!session) return;
                supabase.from('user_profiles')
                    .select('role')
                    .eq('id', session.user.id)
                    .single()
                    .then(({ data }) => { if (data) setUserRole(data.role); });

                fetch(`/api/transaction/details?id=${txnId}`, {
                    headers: { Authorization: `Bearer ${session.access_token}` }
                })
                    .then(res => res.json())
                    .then(data => { if (data.transaction) setTransaction(data.transaction); })
                    .catch(err => console.error(err));
            });
        }
    }, [txnId]);

    const isGoldSub = txnId?.startsWith('GOLD_') || transaction?.udf1 === 'GOLD_SUBSCRIPTION';
    const isWalletTopup = txnId?.startsWith('WLT_') || transaction?.udf1 === 'WALLET_TOPUP';
    const isGiftCard = txnId?.startsWith('GC_') || txnId?.startsWith('WALLET_') || transaction?.udf1 === 'GIFT_CARD' || router.query.type === 'GIFT_CARD';

    const dashboardLink = userRole === 'merchant' ? '/merchant/dashboard' : '/dashboard';
    const primaryLink = isGoldSub
        ? dashboardLink
        : isGiftCard
            ? (userRole === 'merchant' ? '/merchant/inventory' : '/my-giftcards')
            : isWalletTopup
                ? (userRole === 'merchant' ? '/merchant/wallet' : '/wallet')
                : dashboardLink;

    return (
        <div className="min-h-screen bg-[#020617] flex items-center justify-center p-4 sm:p-6 font-[family-name:var(--font-outfit)] overflow-hidden relative">
            {/* Animated Background Gradients */}
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/20 blur-[120px] rounded-full animate-pulse" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-600/20 blur-[120px] rounded-full animate-pulse" style={{ animationDelay: '1s' }} />
            {isGoldSub && <div className="absolute top-[30%] right-[10%] w-[30%] h-[30%] bg-amber-500/10 blur-[100px] rounded-full" />}
            {isGiftCard && <div className="absolute top-[30%] left-[10%] w-[30%] h-[30%] bg-indigo-500/10 blur-[100px] rounded-full" />}

            {showConfetti && (
                <Confetti
                    width={windowDimensions.width}
                    height={windowDimensions.height}
                    recycle={false}
                    numberOfPieces={isGoldSub ? 400 : (isGiftCard ? 300 : 200)}
                    gravity={0.15}
                    colors={isGoldSub ? ['#F59E0B', '#fbbf24', '#fcd34d', '#ffffff'] : (isGiftCard ? ['#6366F1', '#818CF8', '#A78BFA', '#ffffff'] : undefined)}
                />
            )}

            <motion.div
                initial={{ opacity: 0, y: 30, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                className="max-w-lg w-full bg-white/5 backdrop-blur-3xl border border-white/10 rounded-[2.5rem] overflow-hidden shadow-2xl relative z-10"
            >
                {/* Success Header Area */}
                <div className={`h-48 flex flex-col items-center justify-center relative overflow-hidden bg-gradient-to-b ${isGoldSub ? 'from-amber-500/20 to-transparent' : isGiftCard ? 'from-indigo-500/20 to-transparent' : 'from-blue-500/20 to-transparent'}`}>
                    <motion.div
                        initial={{ scale: 0, rotate: -45 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{ type: "spring", damping: 12, stiffness: 100, delay: 0.2 }}
                        className={`w-24 h-24 rounded-3xl ${isGoldSub ? 'bg-amber-500 shadow-[0_0_40px_rgba(245,158,11,-0.3)]' : isGiftCard ? 'bg-indigo-600 shadow-[0_0_40px_rgba(99,102,241,0.3)]' : 'bg-blue-600 shadow-[0_0_40px_rgba(37,99,235,0.3)]'} flex items-center justify-center mb-4 border border-white/20`}
                    >
                        <motion.svg
                            className="w-12 h-12 text-white"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                        >
                            <motion.path
                                initial={{ pathLength: 0 }}
                                animate={{ pathLength: 1 }}
                                transition={{ duration: 0.6, delay: 0.5 }}
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={3}
                                d="M5 13l4 4L19 7"
                            />
                        </motion.svg>
                    </motion.div>

                    <motion.h2
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}
                        className={`text-4xl md:text-6xl font-black italic tracking-tighter mb-2 ${isGoldSub ? 'text-amber-500' : isGiftCard ? 'text-indigo-400' : 'text-blue-500'}`}
                    >
                        {isGoldSub ? 'ELITE GOLD ACTIVATED' : isGiftCard ? 'GIFT CARD SECURED' : 'PAYMENT SUCCESSFUL'}
                    </motion.h2>
                </div>

                <div className="px-8 pb-10 text-center">
                    <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.6 }}
                        className="text-gray-400 text-sm mb-8 leading-relaxed max-w-[280px] mx-auto"
                    >
                        {isGoldSub
                            ? 'Welcome to the inner circle. Your premium benefits and cashback are now active!'
                            : isGiftCard
                                ? 'Your gift card has been secured and added to your wallet. Ready to redeem?'
                                : isWalletTopup
                                    ? 'Funds added. Your wallet is loaded and ready for some serious spending.'
                                    : 'Transaction complete. Your digital goods are being served hot and fresh.'}
                    </motion.p>

                    {/* Minimalist Receipt Card */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.7 }}
                        className="bg-black/40 border border-white/5 rounded-3xl p-6 mb-10 text-left relative group overflow-hidden"
                    >
                        <div className="absolute top-0 right-0 w-16 h-16 bg-white/5 rounded-full -mr-8 -mt-8 blur-xl" />

                        <div className="flex justify-between items-end mb-6">
                            <div>
                                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Total Amount</p>
                                <h3 className="text-3xl font-black text-white italic tracking-tight">
                                    ₹{Number(transaction?.amount || transaction?.paid_amount || queryAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                </h3>
                            </div>
                            <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter ${isGoldSub ? 'bg-amber-500/20 text-amber-500' : isGiftCard ? 'bg-indigo-500/20 text-indigo-400' : 'bg-blue-500/20 text-blue-400'}`}>
                                Completed
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/5">
                            <div>
                                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Method</p>
                                <p className="text-sm font-bold text-gray-200">{transaction?.payment_mode || (isGoldSub ? 'Wallet Pay' : 'Online Payment')}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Ref ID</p>
                                <p className="text-[10px] font-mono text-gray-400 truncate max-w-[120px] ml-auto">{txnId}</p>
                            </div>
                        </div>
                    </motion.div>

                    <div className="space-y-4">
                        <motion.div
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                        >
                            <Link
                                href={primaryLink}
                                className={`w-full py-5 rounded-2xl text-sm font-black text-white shadow-2xl transition-all block tracking-widest italic ${isGoldSub ? 'bg-gradient-to-r from-amber-500 to-orange-600 shadow-amber-500/20' : isGiftCard ? 'bg-gradient-to-r from-indigo-600 to-purple-700 shadow-indigo-500/20' : 'bg-gradient-to-r from-blue-600 to-indigo-600 shadow-blue-500/20'}`}
                            >
                                {isGoldSub ? 'ENTER DASHBOARD' : (isWalletTopup ? 'CHECK BALANCE' : (isGiftCard ? 'VIEW MY CARDS' : 'VIEW ASSETS'))}
                            </Link>
                        </motion.div>

                        <div className="flex flex-col sm:flex-row gap-4 items-center justify-center">
                            <Link
                                href={isGiftCard ? "/my-giftcards" : userRole === 'merchant' ? "/merchant/dashboard" : "/dashboard"}
                                className={`px-10 py-4 rounded-3xl font-black text-xs uppercase tracking-widest transition-all ${isGoldSub
                                    ? 'bg-amber-500 text-black hover:bg-amber-400'
                                    : isGiftCard
                                        ? 'bg-indigo-600 text-white hover:bg-indigo-500'
                                        : 'bg-white text-black hover:bg-gray-200'
                                    } shadow-2xl shadow-white/5`}
                            >
                                {isGiftCard ? "View My Cards" : "Back to Home"}
                            </Link>
                            {isGoldSub && (
                                <Link href="/dashboard" className="text-white/40 hover:text-white text-[10px] font-bold uppercase tracking-widest transition-colors">
                                    Go to Dashboard
                                </Link>
                            )}
                        </div>
                    </div>
                </div>
            </motion.div>

            {/* Visual Flair */}
            <div className="fixed bottom-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-blue-500/20 to-transparent" />
        </div>
    );
};

export default SuccessPage;
