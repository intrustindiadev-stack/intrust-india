'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Zap, X, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getQuickActions } from './quickActionsData';

export default function QuickActionsMobile({ shoppingStats }) {
    const [isOpen, setIsOpen] = useState(false);
    const router = useRouter();
    const actions = getQuickActions(shoppingStats);

    const pendingCount = Number(shoppingStats?.pendingOrders) || 0;

    // Handle Escape key to close drawer & lock background scroll
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape' && isOpen) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('keydown', handleKeyDown);
            document.body.style.overflow = 'hidden';
        }

        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    const handleNavigate = (href) => {
        setIsOpen(false);
        router.push(href);
    };

    return (
        <>
            {/* Floating Action Button (FAB) - Mobile Only */}
            <motion.button
                type="button"
                onClick={() => setIsOpen(true)}
                aria-label="Open Quick Actions"
                aria-haspopup="dialog"
                aria-expanded={isOpen}
                whileTap={{ scale: 0.92 }}
                className="fixed bottom-24 right-6 z-50 md:hidden w-14 h-14 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-xl shadow-blue-600/35 hover:shadow-2xl hover:scale-105 active:scale-95 transition-all focus:outline-none focus:ring-4 focus:ring-blue-500/30"
            >
                <Zap className="w-6 h-6 text-white fill-white/20" />
                {pendingCount > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-4 w-4">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-4 w-4 bg-amber-500 text-[9px] font-black text-white items-center justify-center">
                            {pendingCount}
                        </span>
                    </span>
                )}
            </motion.button>

            {/* Bottom Sheet Drawer & Backdrop */}
            <AnimatePresence>
                {isOpen && (
                    <div className="fixed inset-0 z-50 md:hidden">
                        {/* Semi-transparent Backdrop */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            onClick={() => setIsOpen(false)}
                            aria-hidden="true"
                            className="fixed inset-0 bg-black/50 backdrop-blur-xs"
                        />

                        {/* Bottom Sheet Modal / Drawer */}
                        <motion.div
                            role="dialog"
                            aria-modal="true"
                            aria-labelledby="quick-actions-mobile-title"
                            initial={{ y: '100%' }}
                            animate={{ y: 0 }}
                            exit={{ y: '100%' }}
                            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
                            onClick={(e) => e.stopPropagation()}
                            className="fixed bottom-0 inset-x-0 z-50 bg-white rounded-t-3xl border-t border-slate-100 shadow-2xl p-5 pb-8 max-h-[85vh] flex flex-col"
                        >
                            {/* Visual Drag Handle Pill */}
                            <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-3 shrink-0" />

                            {/* Header */}
                            <div className="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0">
                                <div className="flex items-center gap-2.5">
                                    <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shadow-xs">
                                        <Zap className="w-4 h-4 fill-blue-600/20" />
                                    </div>
                                    <div>
                                        <h2
                                            id="quick-actions-mobile-title"
                                            className="text-base font-bold text-slate-900 leading-tight"
                                        >
                                            Quick Actions
                                        </h2>
                                        <p className="text-xs text-slate-500">
                                            Instant administrative shortcuts
                                        </p>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setIsOpen(false)}
                                    aria-label="Close Quick Actions drawer"
                                    className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            {/* Menu List */}
                            <div className="flex flex-col gap-2 overflow-y-auto mt-3 py-1 pr-0.5">
                                {actions.map((action) => {
                                    const Icon = action.icon;
                                    return (
                                        <button
                                            key={action.id}
                                            type="button"
                                            onClick={() => handleNavigate(action.href)}
                                            className="w-full min-h-[52px] flex items-center justify-between p-3 rounded-2xl border border-slate-100 hover:border-slate-200 hover:bg-slate-50 active:bg-slate-100 active:scale-[0.99] transition-all text-left group"
                                        >
                                            <div className="flex items-center gap-3 min-w-0">
                                                <div
                                                    className={`w-10 h-10 rounded-xl bg-gradient-to-br ${action.gradient} text-white flex items-center justify-center text-lg shadow-md ${action.shadow} shrink-0 group-hover:scale-105 transition-transform`}
                                                >
                                                    {action.emoji || <Icon className="w-5 h-5" />}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors truncate">
                                                        {action.title}
                                                    </p>
                                                    <p className="text-xs text-slate-500 truncate mt-0.5">
                                                        {action.description}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2 shrink-0 ml-3">
                                                {action.badge !== null && action.badge !== undefined && (
                                                    <span className="px-2 py-0.5 text-[10px] font-extrabold bg-amber-500 text-white rounded-full">
                                                        {action.badge}
                                                    </span>
                                                )}
                                                <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-600 group-hover:translate-x-0.5 transition-all" />
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </>
    );
}
