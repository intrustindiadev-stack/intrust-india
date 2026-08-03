'use client';

import { Users, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function BulkActionBar({ 
    selectedCount, 
    totalMatchingCount,
    selectAllMatching, 
    onClearSelection, 
    onSelectAllMatching, 
    onOpenAssign 
}) {
    if (selectedCount === 0) return null;

    const isAllPageSelected = selectedCount > 0;
    const canSelectAllMatching = totalMatchingCount > selectedCount && !selectAllMatching;

    return (
        <AnimatePresence>
            <motion.div 
                initial={{ y: 100, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 100, opacity: 0 }}
                className="fixed bottom-[80px] lg:bottom-8 left-0 right-0 z-40 mx-4 lg:mx-auto lg:max-w-3xl"
            >
                <div className="bg-gray-900/95 backdrop-blur shadow-2xl rounded-2xl p-3 flex flex-col sm:flex-row items-center justify-between gap-3 border border-gray-700/50">
                    
                    <div className="flex items-center gap-3 w-full sm:w-auto px-2">
                        <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center shrink-0">
                            <span className="text-sm font-bold text-indigo-400">{selectAllMatching ? totalMatchingCount : selectedCount}</span>
                        </div>
                        <div className="text-sm">
                            <p className="font-bold text-white">Leads selected</p>
                            {canSelectAllMatching && (
                                <button 
                                    onClick={onSelectAllMatching}
                                    className="text-xs text-indigo-400 font-medium hover:text-indigo-300 transition-colors"
                                >
                                    Select all {totalMatchingCount} matching leads
                                </button>
                            )}
                            {selectAllMatching && (
                                <p className="text-xs text-indigo-300 font-medium">All matching leads selected</p>
                            )}
                        </div>
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto">
                        <button 
                            onClick={onClearSelection}
                            className="flex-1 sm:flex-none p-2.5 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition-colors flex justify-center"
                            aria-label="Clear selection"
                        >
                            <X size={18} />
                        </button>
                        <button 
                            onClick={onOpenAssign}
                            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 bg-indigo-500 hover:bg-indigo-400 text-white px-4 py-2.5 rounded-xl font-bold transition-all shadow-lg text-sm"
                        >
                            <Users size={16} />
                            Assign
                        </button>
                    </div>

                </div>
            </motion.div>
        </AnimatePresence>
    );
}
