'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { Check, Home, ShieldCheck } from 'lucide-react';

// Confetti Component for Celebration
const Confetti = () => {
    return (
        <div className="fixed inset-0 pointer-events-none overflow-hidden select-none z-[110]">
            {[...Array(60)].map((_, i) => (
                <motion.div
                    key={i}
                    initial={{
                        top: -20,
                        left: Math.random() * 100 + "%",
                        scale: 0,
                    }}
                    animate={{
                        top: "100%",
                        scale: [0, 1, 0.5],
                        rotate: Math.random() * 360,
                    }}
                    transition={{
                        duration: Math.random() * 2 + 3,
                        delay: Math.random() * 0.8,
                        ease: "linear",
                        repeat: 0
                    }}
                    className="absolute w-3 h-3 rounded-full"
                    style={{
                        backgroundColor: ['#D4AF37', '#10B981', '#3B82F6', '#8B5CF6', '#EC4899'][Math.floor(Math.random() * 5)]
                    }}
                />
            ))}
        </div>
    );
};

/**
 * Full-page success overlay after KYC submission.
 *
 * @typedef {Object} SuccessScreenProps
 * @property {boolean} visible
 * @property {string} [status]
 */

/** @param {SuccessScreenProps} props */
export default function SuccessScreen({ visible, status }) {
    const router = useRouter();
    const isVerified = status === 'verified';

    return (
        <AnimatePresence>
            {visible && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.4 }}
                    className="fixed inset-0 z-[100] bg-white dark:bg-[#020617] flex flex-col items-center justify-center px-6 transition-colors"
                >
                    <Confetti />
                    {/* Background Accents */}
                    <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-30 dark:opacity-20">
                        <div className="absolute -top-24 -right-24 w-96 h-96 bg-[#D4AF37] rounded-full blur-[100px] animate-pulse-slow" />
                        <div className="absolute -bottom-24 -left-24 w-80 h-80 bg-blue-500 rounded-full blur-[100px] animate-pulse-slow delay-1000" />
                    </div>

                    <div className="relative z-10 flex flex-col items-center max-w-2xl w-full text-center">
                        {/* Animated Checkmark Icon Container */}
                        <div className="relative w-40 h-40 mb-12 flex items-center justify-center">
                            <motion.div
                                initial={{ scale: 0, rotate: -45 }}
                                animate={{ scale: 1, rotate: 0 }}
                                transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.2 }}
                                className="w-full h-full bg-gradient-to-tr from-[#D4AF37] to-[#B8860B] rounded-full flex items-center justify-center shadow-2xl shadow-[#D4AF37]/40 relative z-20"
                            >
                                <Check className="w-20 h-20 text-white stroke-[4px]" />
                            </motion.div>
                            
                            {/* Animated Rings */}
                            <motion.div
                                animate={{ scale: [1, 1.4, 1.4], opacity: [0.3, 0, 0] }}
                                transition={{ duration: 2, repeat: Infinity }}
                                className="absolute inset-0 bg-[#D4AF37] rounded-full -z-10"
                            />
                            <motion.div
                                animate={{ scale: [1, 1.6, 1.6], opacity: [0.2, 0, 0] }}
                                transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
                                className="absolute inset-0 bg-[#D4AF37] rounded-full -z-10"
                            />
                        </div>

                        {/* Title */}
                        <motion.h1
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.4 }}
                            className="text-5xl sm:text-6xl font-display font-black text-slate-900 dark:text-white mb-6 tracking-tight leading-none"
                        >
                            {isVerified ? 'All Set!' : 'Submitted!'}
                        </motion.h1>

                        {/* Subtitle / Description */}
                        <motion.p
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.55 }}
                            className="text-2xl sm:text-3xl text-slate-500 dark:text-slate-400 font-bold mb-14 leading-relaxed px-4"
                        >
                            {isVerified
                                ? <>Your identity has been <span className="text-[#D4AF37]">verified instantly</span>. You now have full access to all features.</>
                                : <>Your KYC is <span className="text-amber-500">under review</span>. We will verify your details within 24-48 hours.</>}
                        </motion.p>

                        {/* Action Component with Extra Accessibility */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.7 }}
                            className="w-full max-w-md px-4"
                        >
                            <button
                                onClick={() => router.push('/dashboard')}
                                className="w-full py-7 bg-[#D4AF37] hover:bg-opacity-90 text-[#020617] font-black rounded-3xl shadow-2xl shadow-[#D4AF37]/20 transition-all flex items-center justify-center gap-4 text-2xl gold-glow transform active:scale-[0.98]"
                            >
                                <Home size={32} />
                                Go to Dashboard
                            </button>
                            
                            {/* Trust Indicator */}
                            <div className="mt-8 flex items-center justify-center gap-2 text-slate-400 dark:text-slate-500">
                                <ShieldCheck size={20} />
                                <span className="text-sm font-bold uppercase tracking-widest">End-to-End Encrypted</span>
                            </div>
                        </motion.div>
                    </div>

                    <style jsx global>{`
                        .gold-glow {
                            box-shadow: 0 0 20px rgba(212, 175, 55, 0.2);
                        }
                        .animate-pulse-slow {
                            animation: pulse-slow 8s cubic-bezier(0.4, 0, 0.6, 1) infinite;
                        }
                        @keyframes pulse-slow {
                            0%, 100% { opacity: 0.3; transform: scale(1); }
                            50% { opacity: 0.5; transform: scale(1.1); }
                        }
                    `}</style>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
