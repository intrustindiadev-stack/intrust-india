'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, AlertCircle } from 'lucide-react';

export default function DisclaimerNote() {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        // Check local storage so we don't show it again if the user already dismissed it
        const hasDismissed = localStorage.getItem('disclaimer_dismissed');
        if (!hasDismissed) {
            // Optional: slight delay before showing
            const timer = setTimeout(() => setIsVisible(true), 1000);
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
                    initial={{ y: 100, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 100, opacity: 0 }}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    className="fixed bottom-20 left-4 right-4 z-50 md:bottom-6 md:left-auto md:right-6 md:w-[400px]"
                >
                    <div className="relative overflow-hidden bg-white/95 backdrop-blur-md border border-amber-200/50 shadow-[0_8px_30px_rgb(0,0,0,0.12)] rounded-2xl p-4">
                        {/* Decorative background glow */}
                        <div className="absolute top-0 right-0 -mr-8 -mt-8 w-24 h-24 rounded-full bg-amber-400/10 blur-2xl pointer-events-none" />
                        <div className="absolute bottom-0 left-0 -ml-8 -mb-8 w-24 h-24 rounded-full bg-amber-400/10 blur-2xl pointer-events-none" />

                        <div className="flex items-start gap-3 relative z-10">
                            <div className="bg-amber-100 rounded-full p-1.5 flex-shrink-0 mt-0.5">
                                <AlertCircle className="w-4 h-4 text-amber-600" />
                            </div>
                            
                            <div className="flex-1 pr-6">
                                <h4 className="text-sm font-semibold text-gray-900 mb-1">
                                    Important Notice
                                </h4>
                                <p className="text-xs text-gray-600 leading-relaxed">
                                    <span className="font-medium text-gray-800">Note:</span> We are not a loan provider company or NBFC bank, we are only processing your application based on your profile. We are not responsible for loan approval but we are helping you for your process. Thank You.
                                </p>
                            </div>
                            
                            <button 
                                onClick={handleDismiss}
                                className="absolute top-2 right-2 p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100/80 rounded-full transition-colors"
                                aria-label="Dismiss disclaimer"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
