'use client';

import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Shield, CheckCircle } from 'lucide-react';
import KYCForm from './KYCForm';

const STEPS = ['Personal Info', 'Identity', 'Done'];

export default function KYCPopup({ isOpen, onClose, onSubmitSuccess, initialData = {}, currentStep = 0 }) {

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

    const handleSubmit = async (formData) => {
        if (onSubmitSuccess) await onSubmitSuccess(formData);
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        key="kyc-backdrop"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.25 }}
                        onClick={handleBackdropClick}
                        className="fixed inset-0 z-[900] bg-black/60 backdrop-blur-sm"
                    />

                    {/* Bottom sheet on mobile, centered modal on desktop */}
                    <motion.div
                        key="kyc-sheet"
                        ref={sheetRef}
                        initial={{ y: '100%', opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: '100%', opacity: 0 }}
                        transition={{ type: 'spring', stiffness: 320, damping: 32 }}
                        className="fixed bottom-0 left-0 right-0 z-[910] md:bottom-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:max-w-lg md:w-full
                                   bg-white dark:bg-[#0f111a] rounded-t-[2.5rem] md:rounded-[2.5rem] shadow-2xl overflow-hidden"
                        style={{ maxHeight: '92vh' }}
                    >
                        {/* Drag handle (mobile) */}
                        <div className="flex justify-center pt-3 pb-1 md:hidden">
                            <div className="w-10 h-1 rounded-full bg-gray-200 dark:bg-white/10" />
                        </div>

                        {/* Header */}
                        <div className="flex items-center justify-between px-6 pt-4 pb-3 border-b border-gray-100 dark:border-white/5">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
                                    <Shield size={18} className="text-white" />
                                </div>
                                <div>
                                    <h2 className="text-base font-black text-gray-900 dark:text-white leading-tight">Verify Your Account</h2>
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Bank-grade security</p>
                                </div>
                            </div>
                            <button
                                onClick={onClose}
                                className="w-9 h-9 rounded-full bg-gray-100 dark:bg-white/10 flex items-center justify-center text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/20 transition-colors active:scale-90"
                            >
                                <X size={16} />
                            </button>
                        </div>

                        {/* Step indicator */}
                        <div className="flex items-center gap-0 px-6 py-3">
                            {STEPS.map((step, i) => (
                                <div key={step} className="flex items-center gap-0 flex-1">
                                    <div className="flex flex-col items-center gap-1">
                                        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-black transition-all duration-300
                                            ${i < currentStep ? 'bg-blue-500 text-white' :
                                              i === currentStep ? 'bg-blue-500 text-white ring-4 ring-blue-500/20' :
                                              'bg-gray-100 dark:bg-white/10 text-gray-400'}`}>
                                            {i < currentStep ? <CheckCircle size={14} /> : i + 1}
                                        </div>
                                        <span className={`text-[9px] font-bold whitespace-nowrap transition-colors ${i <= currentStep ? 'text-blue-500' : 'text-gray-400'}`}>
                                            {step}
                                        </span>
                                    </div>
                                    {i < STEPS.length - 1 && (
                                        <div className={`flex-1 h-0.5 mb-4 mx-1 rounded-full transition-all duration-500 ${i < currentStep ? 'bg-blue-500' : 'bg-gray-100 dark:bg-white/10'}`} />
                                    )}
                                </div>
                            ))}
                        </div>

                        {/* Promo banner */}
                        <div className="mx-6 mb-3 px-4 py-3 rounded-2xl bg-blue-50 dark:bg-blue-500/10 border border-blue-100 dark:border-blue-500/20">
                            <p className="text-xs font-bold text-blue-700 dark:text-blue-300 leading-relaxed">
                                🔒 Complete KYC to unlock <span className="text-blue-600 dark:text-blue-400 font-black">full wallet access</span>, merchant features &amp; priority support.
                            </p>
                        </div>

                        {/* Scrollable form content */}
                        <div className="overflow-y-auto px-6 pb-8" style={{ maxHeight: 'calc(92vh - 200px)' }}>
                            <KYCForm
                                onSubmit={handleSubmit}
                                initialData={initialData}
                            />
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
