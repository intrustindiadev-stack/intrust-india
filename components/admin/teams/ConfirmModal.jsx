'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, X, Check } from 'lucide-react';

export default function ConfirmModal({
    isOpen,
    title = 'Confirm Action',
    message = 'Are you sure you want to proceed?',
    confirmText = 'Confirm',
    confirmVariant = 'danger', // 'danger' | 'primary'
    requireReason = false,
    reasonPlaceholder = 'Please enter a reason...',
    onClose,
    onConfirm,
    loading = false
}) {
    const [reason, setReason] = useState('');
    const [error, setError] = useState('');

    if (!isOpen) return null;

    const handleConfirm = () => {
        if (requireReason && (!reason || !reason.trim())) {
            setError('A valid reason is required to proceed.');
            return;
        }
        setError('');
        onConfirm(reason.trim());
    };

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-slate-100 relative space-y-5"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="modal-title"
                >
                    <button
                        onClick={onClose}
                        disabled={loading}
                        className="absolute top-5 right-5 p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors"
                        aria-label="Close modal"
                    >
                        <X size={18} />
                    </button>

                    <div className="flex items-start gap-4">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
                            confirmVariant === 'danger' ? 'bg-rose-50 text-rose-600' : 'bg-indigo-50 text-indigo-600'
                        }`}>
                            <AlertTriangle size={24} />
                        </div>

                        <div>
                            <h3 id="modal-title" className="text-xl font-black text-slate-900 tracking-tight">
                                {title}
                            </h3>
                            <p className="text-sm text-slate-500 mt-1 leading-relaxed">
                                {message}
                            </p>
                        </div>
                    </div>

                    {requireReason && (
                        <div className="space-y-2">
                            <label className="text-xs font-extrabold uppercase tracking-wider text-slate-600">
                                Reason <span className="text-rose-500">*</span>
                            </label>
                            <textarea
                                value={reason}
                                onChange={(e) => {
                                    setReason(e.target.value);
                                    if (error) setError('');
                                }}
                                placeholder={reasonPlaceholder}
                                rows={3}
                                className="w-full px-4 py-3 rounded-2xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all resize-none text-slate-900"
                            />
                            {error && (
                                <p className="text-xs font-semibold text-rose-600">{error}</p>
                            )}
                        </div>
                    )}

                    <div className="flex items-center justify-end gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={loading}
                            className="px-5 py-2.5 rounded-2xl text-sm font-bold text-slate-600 hover:bg-slate-100 transition-colors border border-slate-200"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={handleConfirm}
                            disabled={loading}
                            className={`px-5 py-2.5 rounded-2xl text-sm font-bold text-white shadow-lg transition-all flex items-center gap-2 ${
                                confirmVariant === 'danger'
                                    ? 'bg-rose-600 hover:bg-rose-500 shadow-rose-500/25'
                                    : 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-500/25'
                            } ${loading ? 'opacity-60 cursor-not-allowed' : ''}`}
                        >
                            {loading ? (
                                <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            ) : (
                                <Check size={16} />
                            )}
                            {confirmText}
                        </button>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
