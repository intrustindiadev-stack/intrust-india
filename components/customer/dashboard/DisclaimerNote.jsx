'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ShieldCheck } from 'lucide-react';

export default function DisclaimerNote() {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const hasDismissed = localStorage.getItem('disclaimer_dismissed');
        if (!hasDismissed) {
            const timer = setTimeout(() => setIsVisible(true), 1200);
            return () => clearTimeout(timer);
        }
    }, []);

    const handleDismiss = () => {
        setIsVisible(false);
        localStorage.setItem('disclaimer_dismissed', 'true');
    };

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ y: 80, opacity: 0, scale: 0.97 }}
                    animate={{ y: 0, opacity: 1, scale: 1 }}
                    exit={{ y: 80, opacity: 0, scale: 0.97 }}
                    transition={{ type: 'spring', stiffness: 280, damping: 28 }}
                    className="fixed bottom-20 left-3 right-3 z-50 md:bottom-6 md:left-auto md:right-6 md:w-[420px]"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="disclaimer-title"
                >
                    {/* Card */}
                    <div className="relative overflow-hidden rounded-2xl border border-[#92BCEA]/30 dark:border-[#92BCEA]/20 bg-white/[0.97] dark:bg-[#0F1419]/[0.97] backdrop-blur-xl shadow-[0_8px_40px_rgba(122,147,172,0.18)] dark:shadow-[0_8px_40px_rgba(0,0,0,0.45)]">

                        {/* Top gradient accent line */}
                        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-[#7A93AC] via-[#92BCEA] to-[#AFB3F7]" />

                        {/* Subtle background glow orbs */}
                        <div className="absolute top-0 right-0 -mr-10 -mt-10 w-32 h-32 rounded-full bg-[#92BCEA]/8 blur-2xl pointer-events-none" />
                        <div className="absolute bottom-0 left-0 -ml-10 -mb-10 w-32 h-32 rounded-full bg-[#AFB3F7]/8 blur-2xl pointer-events-none" />

                        <div className="px-4 py-4 relative z-10">
                            {/* Header Row */}
                            <div className="flex items-start gap-3">
                                {/* Icon */}
                                <div className="flex-shrink-0 mt-0.5 w-9 h-9 rounded-xl bg-gradient-to-br from-[#7A93AC]/15 to-[#AFB3F7]/15 dark:from-[#7A93AC]/20 dark:to-[#AFB3F7]/20 border border-[#92BCEA]/25 flex items-center justify-center">
                                    <ShieldCheck className="w-4.5 h-4.5 text-[#7A93AC] dark:text-[#92BCEA]" size={18} />
                                </div>

                                {/* Text */}
                                <div className="flex-1 min-w-0 pr-7">
                                    {/* Badge + Title */}
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-gradient-to-r from-[#92BCEA]/15 to-[#AFB3F7]/15 border border-[#92BCEA]/20 text-[10px] font-semibold tracking-widest text-[#7A93AC] dark:text-[#92BCEA] uppercase">
                                            INTRUST
                                        </span>
                                        <h4
                                            id="disclaimer-title"
                                            className="text-[13px] font-semibold text-[#171A21] dark:text-gray-100 leading-none"
                                        >
                                            Service Disclaimer
                                        </h4>
                                    </div>

                                    {/* Divider */}
                                    <div className="h-px w-full bg-gradient-to-r from-[#92BCEA]/20 via-[#AFB3F7]/15 to-transparent mb-2.5" />

                                    {/* Message */}
                                    <p className="text-[12px] leading-relaxed text-[#617073] dark:text-gray-400">
                                        INTRUST India is an integrated platform specializing in{' '}
                                        <span className="font-medium text-[#171A21] dark:text-gray-200">
                                            E-commerce, Digital Gift Cards, and Premium NFC Services.
                                        </span>{' '}
                                        We facilitate the processing of your orders and service requests to ensure a seamless experience. Our role is to assist you throughout the transaction and service journey.
                                    </p>
                                </div>

                                {/* Close button */}
                                <button
                                    onClick={handleDismiss}
                                    id="disclaimer-close-btn"
                                    className="absolute top-3 right-3 p-1.5 rounded-lg text-[#617073] dark:text-gray-500 hover:text-[#171A21] dark:hover:text-gray-200 hover:bg-[#92BCEA]/10 dark:hover:bg-white/8 transition-all duration-200"
                                    aria-label="Dismiss disclaimer"
                                >
                                    <X className="w-3.5 h-3.5" />
                                </button>
                            </div>

                            {/* Footer */}
                            <div className="mt-3 pt-2.5 border-t border-[#92BCEA]/15 dark:border-white/8 flex items-center justify-between">
                                <span className="text-[10.5px] text-[#617073]/70 dark:text-gray-600 font-medium tracking-wide">
                                    © INTRUST India Pvt. Ltd. — All rights reserved
                                </span>
                                <button
                                    onClick={handleDismiss}
                                    id="disclaimer-acknowledge-btn"
                                    className="text-[10.5px] font-semibold text-[#7A93AC] dark:text-[#92BCEA] hover:text-[#92BCEA] dark:hover:text-[#AFB3F7] transition-colors duration-200 tracking-wide"
                                >
                                    Acknowledge →
                                </button>
                            </div>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
