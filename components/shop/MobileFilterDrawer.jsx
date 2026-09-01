'use client';

import React from 'react';
import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function MobileFilterDrawer({ isOpen, onClose, children }) {
    // Prevent scrolling when drawer is open
    React.useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
                    />

                    {/* Drawer */}
                    <motion.div
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        transition={{ type: 'spring', bounce: 0, duration: 0.4 }}
                        className="fixed inset-y-0 right-0 z-50 w-full max-w-xs bg-white dark:bg-[#0c0e16] shadow-2xl flex flex-col lg:hidden"
                    >
                        <div className="flex items-center justify-between px-4 py-4 border-b border-gray-200 dark:border-white/10">
                            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Filters</h2>
                            <button
                                type="button"
                                className="p-2 -mr-2 text-gray-400 hover:text-gray-500 bg-white dark:bg-[#12141c] rounded-md transition-colors"
                                onClick={onClose}
                            >
                                <span className="sr-only">Close menu</span>
                                <X className="h-5 w-5" aria-hidden="true" />
                            </button>
                        </div>

                        {/* Filters container */}
                        <div className="flex-1 overflow-y-auto px-4 py-6">
                            {children}
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
