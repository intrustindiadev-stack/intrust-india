import React, { useEffect } from 'react';
import { X, Network, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export function RewardEventEditor({ eventInfo, eventData, onClose, onChange }) {
    // Prevent body scroll when drawer is open
    useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, []);

    const isRate = eventInfo.type === 'rate';
    const primaryKey = isRate ? 'rate_per_100rs' : 'direct';
    const primaryLabel = isRate ? 'Points per ₹100 spent' : 'Fixed points on completion';

    // Calculate total distributed example
    const primaryValue = eventData[primaryKey] || 0;
    const l1 = eventData.L1 || 0;
    const l2 = eventData.L2 || 0;
    const l3 = eventData.L3 || 0;
    const l4 = eventData.L4 || 0;
    const l5 = eventData.L5 || 0;
    const maxTotal = primaryValue + l1 + l2 + l3 + l4 + l5;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-end sm:justify-end">
                {/* Backdrop */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm"
                />

                {/* Drawer */}
                <motion.div
                    initial={{ x: '100%' }}
                    animate={{ x: 0 }}
                    exit={{ x: '100%' }}
                    transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                    className="relative w-full h-full sm:w-[480px] bg-white dark:bg-gray-800 shadow-2xl flex flex-col"
                >
                    {/* Header */}
                    <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-white dark:bg-gray-800 z-10 sticky top-0">
                        <div>
                            <h2 className="text-xl font-black text-gray-900 dark:text-white">{eventInfo.name}</h2>
                            <p className="text-sm text-gray-500">{eventInfo.description}</p>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                        >
                            <X size={20} className="text-gray-500" />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-8">
                        {/* Direct Recipient */}
                        <section>
                            <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                                Direct Recipient
                            </h3>
                            <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 rounded-2xl p-5">
                                <label className="block text-sm font-bold text-blue-900 dark:text-blue-300 mb-2">
                                    {primaryLabel}
                                </label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        min="0"
                                        value={primaryValue}
                                        onChange={(e) => onChange(primaryKey, Number(e.target.value))}
                                        className="w-full px-4 py-3 rounded-xl border border-blue-200 dark:border-blue-800 bg-white dark:bg-gray-900 text-gray-900 dark:text-white font-bold focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                                    />
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-gray-400">
                                        pts
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* Referral Upline */}
                        <section>
                            <div className="flex items-center gap-2 mb-4">
                                <Network size={18} className="text-violet-500" />
                                <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">
                                    Referral Upline
                                </h3>
                            </div>
                            
                            <div className="bg-gray-50 dark:bg-gray-900/50 rounded-2xl border border-gray-100 dark:border-gray-800 p-5 space-y-4">
                                <div className="p-3 bg-violet-50 dark:bg-violet-900/20 rounded-xl border border-violet-100 dark:border-violet-900/30">
                                    <p className="text-xs text-violet-700 dark:text-violet-300 font-medium">
                                        <strong>L1</strong> is the user who directly referred the recipient. L2+ are progressively higher uplines.
                                    </p>
                                </div>

                                {[
                                    { level: 'L1', label: 'L1 (Direct Referrer)' },
                                    { level: 'L2', label: 'L2 (2nd level)' },
                                    { level: 'L3', label: 'L3 (3rd level)' },
                                    { level: 'L4', label: 'L4 (4th level)' },
                                    { level: 'L5', label: 'L5 (5th level)' }
                                ].map(({ level, label }) => (
                                    <div key={level} className="flex items-center justify-between gap-4">
                                        <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 w-1/2">
                                            {label}
                                        </label>
                                        <div className="relative w-1/2">
                                            <input
                                                type="number"
                                                min="0"
                                                value={eventData[level] || 0}
                                                onChange={(e) => onChange(level, Number(e.target.value))}
                                                className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-medium focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 outline-none transition-all text-right pr-10"
                                            />
                                            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">
                                                pts
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>

                        {/* Summary */}
                        <section className="bg-amber-50 dark:bg-amber-900/10 rounded-2xl p-5 border border-amber-100 dark:border-amber-900/30">
                            <h4 className="text-sm font-bold text-amber-900 dark:text-amber-500 mb-2 flex items-center gap-2">
                                <AlertCircle size={16} /> Maximum Distribution Example
                            </h4>
                            <p className="text-xs text-amber-700 dark:text-amber-400 mb-3">
                                If a user with a full 5-level upline completes this action, the system will distribute up to:
                            </p>
                            <div className="text-2xl font-black text-amber-600 dark:text-amber-500">
                                {maxTotal} <span className="text-sm font-medium">total pts{isRate && ' / ₹100'}</span>
                            </div>
                        </section>
                    </div>

                    {/* Footer - Safe area aware */}
                    <div className="p-4 border-t border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 pb-safe">
                        <button
                            onClick={onClose}
                            className="w-full py-3 rounded-xl bg-violet-500 hover:bg-violet-600 text-white font-bold transition-colors"
                        >
                            Done Editing
                        </button>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
