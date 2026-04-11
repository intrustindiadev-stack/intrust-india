'use client';

import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ShieldCheck, Zap, Gift, Store, ChevronRight } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function KYCPopup({ isOpen, onClose, onSubmitSuccess }) {
    const router = useRouter();
    const sheetRef = useRef(null);

    // Close on outside tap
    const handleBackdropClick = (e) => {
        if (e.target === e.currentTarget) onClose();
    };

    // Prevent body scroll when open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => { document.body.style.overflow = ''; };
    }, [isOpen]);

    const handleRedirect = () => {
        if (onSubmitSuccess) {
            onSubmitSuccess();
        } else {
            onClose();
            router.push('/profile/kyc');
        }
    };

    const features = [
        { icon: ShieldCheck, title: "Verified Identity", desc: "Get the verified badge and boost your trust." },
        { icon: Zap, title: "Higher Limits", desc: "Unlock unlimited transactions and wallet balance." },
        { icon: Gift, title: "Premium Offers", desc: "Access high-discount gift cards & exclusive drops." },
        { icon: Store, title: "Merchant Tools", desc: "Become a merchant and sell your own inventory." }
    ];

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        key="kyc-backdrop"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.25 }}
                        onClick={handleBackdropClick}
                        className="fixed inset-0 z-[900] bg-black/60 backdrop-blur-sm"
                    />

                    {/* Centered modal on desktop, bottom sheet on mobile */}
                    <motion.div
                        key="kyc-sheet"
                        ref={sheetRef}
                        initial={{ y: '100%', opacity: 0, scale: 0.95 }}
                        animate={{ y: 0, opacity: 1, scale: 1 }}
                        exit={{ y: '100%', opacity: 0, scale: 0.95 }}
                        transition={{ type: 'spring', stiffness: 320, damping: 32 }}
                        className="fixed bottom-0 left-0 right-0 z-[910] md:bottom-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:max-w-[440px] md:w-full
                                   bg-white dark:bg-[#0f111a] rounded-t-[2.5rem] md:rounded-[2rem] shadow-2xl overflow-hidden border border-gray-100 dark:border-white/10"
                        style={{ maxHeight: '92vh' }}
                    >
                        {/* Drag handle (mobile) */}
                        <div className="flex justify-center pt-3 pb-1 md:hidden">
                            <div className="w-10 h-1 rounded-full bg-gray-200 dark:bg-white/10" />
                        </div>

                        {/* Banner Image / Graphic Area */}
                        <div className="relative w-full h-40 bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 flex items-center justify-center overflow-hidden">
                            <div className="absolute inset-0 opacity-20 mix-blend-overlay" style={{ backgroundImage: "url('https://www.transparenttextures.com/patterns/cubes.png')" }}></div>
                            
                            {/* Decorative glowing circles */}
                            <div className="absolute -top-10 -left-10 w-32 h-32 bg-blue-400 rounded-full mix-blend-screen filter blur-[40px] opacity-70"></div>
                            <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-purple-400 rounded-full mix-blend-screen filter blur-[40px] opacity-70"></div>

                            {/* Centered Graphic */}
                            <motion.div 
                                initial={{ scale: 0.5, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                transition={{ delay: 0.1, type: 'spring' }}
                                className="relative z-10 w-20 h-20 bg-white/10 backdrop-blur-md rounded-[1.5rem] p-0.5 border border-white/30 shadow-2xl"
                            >
                                <div className="w-full h-full bg-gradient-to-br from-white to-blue-50 rounded-[1.4rem] flex items-center justify-center text-blue-600 shadow-inner">
                                    <ShieldCheck size={40} className="drop-shadow-sm" />
                                </div>
                                <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-amber-400 rounded-full border-4 border-indigo-600 flex items-center justify-center text-white shadow-lg">
                                    <Zap size={14} className="fill-white" />
                                </div>
                            </motion.div>

                            {/* Close Button */}
                            <button
                                onClick={onClose}
                                className="absolute top-4 right-4 w-8 h-8 rounded-full bg-black/20 backdrop-blur-md flex items-center justify-center text-white hover:bg-black/40 transition-colors z-20"
                            >
                                <X size={16} />
                            </button>
                        </div>

                        <div className="px-6 pt-6 pb-2 text-center">
                            <h2 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight mb-2">
                                Unlock Intrust Premium
                            </h2>
                            <p className="text-sm font-medium text-gray-500 dark:text-gray-400 leading-relaxed">
                                Complete your KYC verification instantly to secure your account and unlock exclusive platform features.
                            </p>
                        </div>

                        {/* Features List */}
                        <div className="px-6 py-4 space-y-4">
                            {features.map((feat, idx) => (
                                <motion.div 
                                    key={idx}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.2 + (idx * 0.1) }}
                                    className="flex items-start gap-4"
                                >
                                    <div className="shrink-0 w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center text-blue-600 dark:text-blue-400 shadow-sm border border-blue-100 dark:border-blue-500/20">
                                        <feat.icon size={20} />
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100">{feat.title}</h3>
                                        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mt-0.5">{feat.desc}</p>
                                    </div>
                                </motion.div>
                            ))}
                        </div>

                        {/* Footer Action */}
                        <div className="px-6 pt-4 pb-8 md:pb-6">
                            <button
                                onClick={handleRedirect}
                                className="w-full relative group overflow-hidden bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black py-4 rounded-2xl transition-all shadow-xl shadow-blue-500/25 flex items-center justify-center gap-2"
                            >
                                <div className="absolute inset-0 w-full h-full bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.2),transparent)] -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]" />
                                <span>Complete KYC Now</span>
                                <ChevronRight size={18} className="translate-y-[1px]" />
                            </button>
                            <p className="text-center text-[11px] font-bold text-gray-400 mt-4 uppercase tracking-wider">
                                Takes less than 2 minutes ⏱️
                            </p>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
