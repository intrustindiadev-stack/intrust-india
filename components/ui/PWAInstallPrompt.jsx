'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Download, Share } from 'lucide-react';

export default function PWAInstallPrompt() {
    const [deferredPrompt, setDeferredPrompt] = useState(null);
    const [isIOS, setIsIOS] = useState(false);
    const [isStandalone, setIsStandalone] = useState(false);
    const [showPrompt, setShowPrompt] = useState(false);

    useEffect(() => {
        // Detect if already installed (standalone mode)
        const checkStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone || document.referrer.includes('android-app://');
        setIsStandalone(checkStandalone);

        if (checkStandalone) return;

        // Detect iOS (including iPads which sometimes masquerade as Macs)
        const userAgent = window.navigator.userAgent.toLowerCase();
        const isIosDevice = /iphone|ipad|ipod/.test(userAgent) || (window.navigator.platform === 'MacIntel' && window.navigator.maxTouchPoints > 1);
        setIsIOS(isIosDevice);

        // Detect general mobile/tablet
        const isMobileOrTablet = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/.test(userAgent) || (window.navigator.platform === 'MacIntel' && window.navigator.maxTouchPoints > 1);

        // Listen for standard PWA install prompt (Android/Chrome)
        const handleBeforeInstallPrompt = (e) => {
            e.preventDefault();
            setDeferredPrompt(e);

            // Only show prompt on Android if they haven't dismissed it
            const hasSeenPrompt = localStorage.getItem('hasSeenInstallPrompt');
            if (!hasSeenPrompt) {
                setShowPrompt(true);
            }
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

        // Fallback: Show prompt after a short delay for iOS and browsers that don't support beforeinstallprompt
        if (isMobileOrTablet) {
            const timer = setTimeout(() => {
                const hasSeenPrompt = localStorage.getItem('hasSeenInstallPrompt');
                if (!hasSeenPrompt) {
                    setShowPrompt(true);
                }
            }, 3000);
            return () => clearTimeout(timer);
        }

        return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    }, []);

    const handleInstallClick = async () => {
        if (!deferredPrompt) return;

        // Show the install prompt
        deferredPrompt.prompt();

        // Wait for the user to respond to the prompt
        const { outcome } = await deferredPrompt.userChoice;

        if (outcome === 'accepted') {
            setShowPrompt(false);
        }

        // We no longer need the prompt. Clear it up.
        setDeferredPrompt(null);
    };

    const handleClose = () => {
        setShowPrompt(false);
        localStorage.setItem('hasSeenInstallPrompt', 'true');
    };

    if (!showPrompt) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0, y: 50, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 50, scale: 0.9 }}
                transition={{ type: "spring", bounce: 0.4, duration: 0.6 }}
                className="fixed bottom-24 sm:bottom-6 left-4 right-4 sm:left-auto sm:right-6 z-[100] max-w-sm mx-auto"
            >
                <div className="bg-white dark:bg-gray-800 rounded-3xl p-4 shadow-2xl border border-gray-100 dark:border-gray-700 relative overflow-hidden backdrop-blur-xl bg-opacity-95 dark:bg-opacity-95">
                    <button
                        onClick={handleClose}
                        className="absolute top-2 right-2 p-1.5 rounded-full text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors z-10"
                        aria-label="Close"
                    >
                        <X size={16} strokeWidth={2.5} />
                    </button>

                    <div className="flex gap-4 items-center">
                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#92BCEA] to-[#AFB3F7] p-[2px] shrink-0 shadow-lg">
                            <div className="w-full h-full bg-white rounded-[14px] overflow-hidden flex items-center justify-center p-1">
                                <img src="/icon.png" alt="Intrust Logo" className="w-full h-full object-contain" />
                            </div>
                        </div>

                        <div className="flex-1">
                            <h4 className="font-bold text-gray-900 dark:text-white text-[15px] mb-0.5 tracking-tight">Install INTRUST App</h4>

                            {isIOS ? (
                                <p className="text-xs text-gray-500 dark:text-gray-400 leading-snug pr-4">
                                    Tap <Share size={12} className="inline mx-0.5 text-blue-500" /> then <strong className="text-gray-700 dark:text-gray-200">"Add to Home Screen"</strong> for a native experience.
                                </p>
                            ) : (
                                <>
                                    <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-snug mb-2 pr-4">
                                        Add to homescreen for faster access and a seamless experience.
                                    </p>
                                    <button
                                        onClick={handleInstallClick}
                                        className="w-full py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold rounded-xl transition-all shadow-md active:scale-95 flex items-center justify-center gap-1.5"
                                    >
                                        <Download size={14} />
                                        Install Now
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </motion.div>
        </AnimatePresence>
    );
}
