'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '@/lib/contexts/ThemeContext';
import { AlertTriangle, X } from 'lucide-react';

export default function ConfirmModal({ 
    isOpen, 
    onConfirm, 
    onCancel, 
    title = "Confirm Action", 
    message = "Are you sure you want to proceed?", 
    confirmLabel = "Confirm", 
    cancelLabel = "Cancel" 
}) {
    const { theme } = useTheme();
    const isDark = theme === 'dark';

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onCancel}
                        className={`absolute inset-0 backdrop-blur-sm ${isDark ? 'bg-black/60' : 'bg-slate-900/20'}`}
                    />
                    <motion.div
                        initial={{ scale: 0.95, opacity: 0, y: 10 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.95, opacity: 0, y: 10 }}
                        className={`relative w-full max-w-sm rounded-2xl p-6 shadow-xl ${
                            isDark ? 'bg-[#12151c] border border-white/10' : 'bg-white border border-slate-100'
                        }`}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <button
                            onClick={onCancel}
                            className={`absolute top-4 right-4 p-1.5 rounded-lg transition-colors ${
                                isDark ? 'text-white/40 hover:text-white hover:bg-white/10' : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
                            }`}
                        >
                            <X size={18} />
                        </button>

                        <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-4 ${
                            isDark ? 'bg-amber-500/20 text-amber-500' : 'bg-amber-100 text-amber-600'
                        }`}>
                            <AlertTriangle size={24} />
                        </div>

                        <h3 className={`text-lg font-black mb-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                            {title}
                        </h3>
                        
                        <p className={`text-sm mb-6 ${isDark ? 'text-white/60' : 'text-slate-500'}`}>
                            {message}
                        </p>

                        <div className="flex gap-3">
                            <button
                                onClick={onCancel}
                                className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-colors ${
                                    isDark ? 'bg-white/5 hover:bg-white/10 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                                }`}
                            >
                                {cancelLabel}
                            </button>
                            <button
                                onClick={onConfirm}
                                className="flex-1 py-2.5 rounded-xl text-sm font-bold bg-blue-600 hover:bg-blue-700 text-white transition-colors"
                            >
                                {confirmLabel}
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
