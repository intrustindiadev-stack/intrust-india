'use client';

import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function BottomSheet({ isOpen, onClose, children, title, className = 'md:w-full md:max-w-md', noPadding = false }) {
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

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        key="bottomsheet-backdrop"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        onClick={handleBackdropClick}
                        className="fixed inset-0 z-[1000] bg-black/60 backdrop-blur-sm"
                    />

                    {/* Sheet */}
                    <motion.div
                        key="bottomsheet-content"
                        ref={sheetRef}
                        drag="y"
                        dragConstraints={{ top: 0, bottom: 0 }}
                        dragElastic={0.2}
                        onDragEnd={(e, info) => {
                            if (info.offset.y > 100 || info.velocity.y > 500) {
                                onClose();
                            }
                        }}
                        initial={{ y: '100%' }}
                        animate={{ y: 0 }}
                        exit={{ y: '100%' }}
                        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                        className={`fixed bottom-0 left-0 right-0 z-[1010] bg-white dark:bg-gray-900 rounded-t-[2rem] shadow-2xl overflow-hidden flex flex-col md:bottom-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-[2rem] ${className}`}
                        style={{ maxHeight: '90vh' }}
                    >
                        {/* Drag Handle (Mobile only) */}
                        <div className="w-full flex justify-center pt-3 pb-2 md:hidden shrink-0 touch-none">
                            <div className="w-12 h-1.5 rounded-full bg-gray-200 dark:bg-gray-700" />
                        </div>

                        {title && (
                            <div className="px-6 pb-2 pt-2 md:pt-6 shrink-0 text-center">
                                <h2 className="text-xl font-black text-gray-900 dark:text-white tracking-tight">
                                    {title}
                                </h2>
                            </div>
                        )}

                        {/* Scrollable Content Area */}
                        <div className={`flex-1 overflow-y-auto pb-safe ${noPadding ? '' : 'px-6'}`}>
                            {children}
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
