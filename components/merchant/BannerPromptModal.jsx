'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Image as ImageIcon, ArrowRight, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useMerchant } from '@/hooks/useMerchant';

export default function BannerPromptModal() {
    const { merchant, loading } = useMerchant();
    const router = useRouter();
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        if (!loading && merchant) {
            const hasBanner = !!merchant.shopping_banner_url;
            const hasSeenPrompt = sessionStorage.getItem('bannerPromptSeen');

            if (!hasBanner && !hasSeenPrompt) {
                // Delay a little so it doesn't jarringly pop up immediately on mount
                const timer = setTimeout(() => setIsOpen(true), 3000);
                return () => clearTimeout(timer);
            }
        }
    }, [merchant, loading]);

    const handleClose = () => {
        setIsOpen(false);
        sessionStorage.setItem('bannerPromptSeen', 'true');
    };

    const handleAction = () => {
        handleClose();
        router.push('/merchant/profile');
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center px-4 pt-10 pb-20 text-center sm:p-0">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 transition-opacity bg-slate-900/40 backdrop-blur-sm"
                    onClick={handleClose}
                />

                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    className="relative inline-block w-full max-w-sm overflow-hidden text-left align-bottom transition-all transform bg-white dark:bg-[#0a0c14] rounded-[2rem] shadow-2xl sm:my-8 sm:align-middle border border-slate-100 dark:border-white/10 p-6 md:p-8"
                >
                    <button
                        onClick={handleClose}
                        className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 bg-slate-50 dark:bg-white/5 rounded-full transition-colors"
                    >
                        <X size={18} />
                    </button>

                    <div className="flex flex-col items-center text-center mt-2">
                        <div className="w-16 h-16 rounded-3xl bg-blue-50 dark:bg-blue-500/10 text-blue-600 flex items-center justify-center mb-6">
                            <ImageIcon size={32} />
                        </div>
                        
                        <h3 className="text-xl font-black text-slate-900 dark:text-slate-100 mb-2 font-[family-name:var(--font-outfit)]">
                            Missing Storefront Banner
                        </h3>
                        
                        <p className="text-sm text-slate-500 dark:text-slate-400 mb-8 max-w-[280px]">
                            Upload a beautiful banner to make your shop stand out to customers and increase trust.
                        </p>
                        
                        <button
                            onClick={handleAction}
                            className="w-full flex items-center justify-center gap-2 py-4 px-6 rounded-2xl bg-blue-600 text-white font-black transition-all hover:bg-blue-700 active:scale-95 group shadow-lg shadow-blue-600/20"
                        >
                            <span>Add Banner Now</span>
                            <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                        </button>
                        
                        <button
                            onClick={handleClose}
                            className="mt-4 text-xs font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                        >
                            I'll do it later
                        </button>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
