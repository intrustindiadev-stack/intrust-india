'use client';

import React from 'react';
import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function MobileFilterDrawer({ 
    isOpen, 
    onClose, 
    onClearAll, 
    hasActiveFilters = false, 
    resultsCount, 
    children 
}) {
    // Prevent scrolling behind drawer when open
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
                        className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs lg:hidden"
                        aria-hidden="true"
                    />

                    {/* Drawer */}
                    <motion.div
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        transition={{ type: 'spring', damping: 28, stiffness: 280 }}
                        className="fixed inset-y-0 right-0 z-50 w-[88vw] max-w-[340px] sm:max-w-sm bg-white dark:bg-[#0c0e16] shadow-2xl flex flex-col border-l border-slate-200 dark:border-white/10 lg:hidden"
                        role="dialog"
                        aria-modal="true"
                        aria-label="Filter products"
                    >
                        {/* Sticky Header */}
                        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200/80 dark:border-white/10 bg-white/95 dark:bg-[#0c0e16]/95 backdrop-blur-sm shrink-0">
                            <h2 className="text-base font-bold tracking-tight text-slate-900 dark:text-white">
                                Filters
                            </h2>
                            <button
                                type="button"
                                className="w-8 h-8 flex items-center justify-center -mr-1.5 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
                                onClick={onClose}
                                aria-label="Close filter drawer"
                            >
                                <X size={18} strokeWidth={2.5} />
                            </button>
                        </div>

                        {/* Scrollable filters container */}
                        <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-3">
                            {children}
                        </div>

                        {/* Sticky Bottom Action Area */}
                        <div className="p-4 border-t border-slate-200/80 dark:border-white/10 bg-white/95 dark:bg-[#0c0e16]/95 backdrop-blur-sm flex items-center gap-2.5 shrink-0">
                            <button
                                type="button"
                                onClick={onClearAll}
                                disabled={!hasActiveFilters}
                                className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition-all border text-center ${
                                    hasActiveFilters
                                        ? 'border-slate-300 dark:border-white/20 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5 active:scale-95 cursor-pointer'
                                        : 'border-slate-200 dark:border-white/5 text-slate-400 dark:text-slate-600 opacity-60 cursor-not-allowed'
                                }`}
                            >
                                Clear All
                            </button>
                            <button
                                type="button"
                                onClick={onClose}
                                className="flex-1 py-2.5 px-3 rounded-xl text-xs font-bold text-white bg-sky-500 hover:bg-sky-600 active:scale-95 transition-all shadow-sm shadow-sky-500/20 text-center cursor-pointer"
                            >
                                {resultsCount !== undefined ? `Apply (${resultsCount})` : 'Apply Filters'}
                            </button>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}

