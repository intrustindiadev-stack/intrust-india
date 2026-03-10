'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';

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
                    className="fixed inset-0 z-50 bg-white flex flex-col items-center justify-center px-6"
                >
                    {/* Animated checkmark */}
                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.2 }}
                        className="mb-8"
                    >
                        <svg
                            width="120"
                            height="120"
                            viewBox="0 0 120 120"
                            className="success-checkmark"
                        >
                            {/* Circle */}
                            <circle
                                cx="60"
                                cy="60"
                                r="54"
                                fill="none"
                                stroke="#22c55e"
                                strokeWidth="4"
                                className="checkmark-circle"
                            />
                            {/* Checkmark */}
                            <path
                                d="M35 62 L52 78 L85 42"
                                fill="none"
                                stroke="#22c55e"
                                strokeWidth="5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                className="checkmark-path"
                            />
                        </svg>
                    </motion.div>

                    {/* Text */}
                    <motion.h1
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5 }}
                        className="text-3xl font-extrabold text-slate-900 mb-3 text-center"
                        style={{ fontFamily: 'var(--font-sora)' }}
                    >
                        {isVerified ? 'KYC Verified!' : 'KYC Submitted!'}
                    </motion.h1>

                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.65 }}
                        className="text-slate-500 text-center max-w-sm mb-10"
                    >
                        {isVerified
                            ? "Your identity has been verified instantly. You now have full access to all platform features."
                            : "Your KYC is pending manual review. We'll verify your details within 24-48 hours. You'll receive a notification once verification is complete."}
                    </motion.p>

                    {/* Back to Dashboard button */}
                    <motion.button
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.8 }}
                        onClick={() => router.push('/dashboard')}
                        className="px-8 py-3.5 bg-electric hover:bg-electric-hover text-white font-bold rounded-xl shadow-lg shadow-electric/20 transition-colors"
                    >
                        Back to Dashboard
                    </motion.button>

                    {/* CSS for stroke animations */}
                    <style jsx>{`
            .checkmark-circle {
              stroke-dasharray: 340;
              stroke-dashoffset: 340;
              animation: drawCircle 0.6s ease-out 0.3s forwards;
            }
            .checkmark-path {
              stroke-dasharray: 100;
              stroke-dashoffset: 100;
              animation: drawCheck 0.4s ease-out 0.7s forwards;
            }
            @keyframes drawCircle {
              to {
                stroke-dashoffset: 0;
              }
            }
            @keyframes drawCheck {
              to {
                stroke-dashoffset: 0;
              }
            }
          `}</style>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
