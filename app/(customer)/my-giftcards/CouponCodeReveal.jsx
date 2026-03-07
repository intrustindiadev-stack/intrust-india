'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff, Copy, Check, Loader2 } from 'lucide-react';

export default function CouponCodeReveal({ couponId }) {
    const [revealedCode, setRevealedCode] = useState(null);
    const [isDecrypting, setIsDecrypting] = useState(false);
    const [isCopied, setIsCopied] = useState(false);

    const toggleReveal = async () => {
        if (revealedCode) {
            setRevealedCode(null);
            return;
        }

        try {
            setIsDecrypting(true);
            const response = await fetch(`/api/my-coupons/${couponId}/decrypt`);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to decrypt code');
            }

            setRevealedCode(data.encrypted_code);
        } catch (err) {
            console.error('Error decrypting code:', err);
            alert(err instanceof Error ? err.message : 'Failed to decrypt code');
        } finally {
            setIsDecrypting(false);
        }
    };

    const copyCode = () => {
        if (!revealedCode) return;
        navigator.clipboard.writeText(revealedCode);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
    };

    return (
        <div className="mb-6">
            <div className="text-xs uppercase tracking-widest text-gray-500 dark:text-gray-400 font-semibold mb-2">
                Coupon Code
            </div>
            <div className="flex items-center gap-2">
                {/* Code display */}
                <div className="flex-1 px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl font-mono text-base font-bold text-gray-900 dark:text-gray-100 overflow-hidden truncate">
                    {revealedCode ? revealedCode : '••••••••••••'}
                </div>

                {/* Eye toggle */}
                <button
                    onClick={toggleReveal}
                    className="p-3 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-2xl transition-all disabled:opacity-50"
                    disabled={isDecrypting}
                    aria-label={revealedCode ? 'Hide code' : 'Reveal code'}
                >
                    {isDecrypting ? (
                        <Loader2 size={20} className="animate-spin text-gray-600 dark:text-gray-300" />
                    ) : revealedCode ? (
                        <EyeOff size={20} className="text-gray-600 dark:text-gray-300" />
                    ) : (
                        <Eye size={20} className="text-gray-600 dark:text-gray-300" />
                    )}
                </button>

                {/* Copy button */}
                <AnimatePresence>
                    {revealedCode && (
                        <motion.button
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.8 }}
                            onClick={copyCode}
                            className="p-3 bg-[#92BCEA]/10 dark:bg-[#92BCEA]/20 hover:bg-[#92BCEA]/25 dark:hover:bg-[#92BCEA]/30 text-[#92BCEA] dark:text-[#92BCEA] rounded-2xl transition-all"
                            aria-label="Copy code"
                        >
                            <AnimatePresence mode="wait">
                                {isCopied ? (
                                    <motion.span
                                        key="check"
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        exit={{ scale: 0 }}
                                        transition={{ duration: 0.15 }}
                                        className="flex"
                                    >
                                        <Check size={20} />
                                    </motion.span>
                                ) : (
                                    <motion.span
                                        key="copy"
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        exit={{ scale: 0 }}
                                        transition={{ duration: 0.15 }}
                                        className="flex"
                                    >
                                        <Copy size={20} />
                                    </motion.span>
                                )}
                            </AnimatePresence>
                        </motion.button>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
