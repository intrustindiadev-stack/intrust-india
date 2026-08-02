import React from 'react';
import { Save, X, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export function RewardUnsavedChangesBar({ isDirty, onSave, onDiscard, isSaving }) {
    return (
        <AnimatePresence>
            {isDirty && (
                <motion.div
                    initial={{ opacity: 0, y: 50 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 50 }}
                    className="fixed bottom-0 left-0 right-0 z-50 p-4 pb-safe pointer-events-none"
                >
                    <div className="max-w-5xl mx-auto flex justify-center">
                        <div className="bg-slate-900 dark:bg-slate-800 text-white px-6 py-4 rounded-2xl shadow-2xl flex flex-col sm:flex-row items-center gap-4 sm:gap-6 pointer-events-auto border border-white/10 w-full sm:w-auto">
                            <div className="flex-1 text-center sm:text-left">
                                <p className="font-bold text-sm">Unsaved Changes</p>
                                <p className="text-slate-400 text-xs">You have modified configuration settings.</p>
                            </div>
                            <div className="flex items-center gap-3 w-full sm:w-auto">
                                <button
                                    onClick={onDiscard}
                                    disabled={isSaving}
                                    className="flex-1 sm:flex-none px-4 py-2 rounded-xl text-sm font-bold text-slate-300 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-50"
                                >
                                    Discard
                                </button>
                                <button
                                    onClick={onSave}
                                    disabled={isSaving}
                                    className="flex-1 sm:flex-none px-6 py-2 rounded-xl text-sm font-bold bg-violet-500 hover:bg-violet-400 text-white transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                                    {isSaving ? 'Saving...' : 'Save Changes'}
                                </button>
                            </div>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
