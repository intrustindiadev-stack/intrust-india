'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ShoppingBag, Gift, HelpCircle,
    Sparkles, CheckCircle2, ChevronRight, Check, X,
    ShieldAlert, Briefcase
} from 'lucide-react';

const SERVICE_CATEGORIES = [
    {
        id: 'shopping',
        label: 'Shopping & Rewards',
        icon: ShoppingBag,
        color: 'text-pink-600 bg-pink-50',
        services: [
            { id: 'gift', label: 'Gift Cards', icon: Gift },
            { id: 'store', label: 'Online Store', icon: ShoppingBag },
        ]
    }
];

const SOURCES = [
    { id: 'google', label: 'Google Search' },
    { id: 'social_media', label: 'Social Media' },
    { id: 'friend', label: 'Friend or Colleague' },
    { id: 'advertisement', label: 'Advertisement' },
    { id: 'other', label: 'Other' }
];

export default function OnboardingModal({ userId, onComplete }) {
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [successMessage, setSuccessMessage] = useState(null);

    // Form State
    const [selectedServices, setSelectedServices] = useState([]);
    const [occupation, setOccupation] = useState('');
    const [referralSource, setReferralSource] = useState('');
    const [referralCode, setReferralCode] = useState('');

    const toggleService = (id) => {
        setSelectedServices(prev =>
            prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
        );
    };

    const handleNext = () => setStep(s => s + 1);
    const handleBack = () => setStep(s => Math.max(1, s - 1));

    const handleSubmit = async () => {
        if (!userId) return;

        setLoading(true);
        setError(null);

        try {
            const res = await fetch('/api/user/onboarding', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId,
                    services: selectedServices,
                    occupation,
                    referral_source: referralSource,
                    referral_code_entered: referralCode
                })
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Failed to save onboarding data');
            }

            if (data.referralApplied) {
                setSuccessMessage('🎉 Referral Bonus Applied! ₹100 added to your wallet.');
                setTimeout(() => onComplete(), 2500);
            } else {
                onComplete();
            }

        } catch (err) {
            console.error(err);
            setError(err.message);
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-md sm:p-4 transition-all duration-300">
            <motion.div
                initial={{ y: '100%', opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: '100%', opacity: 0 }}
                transition={{ type: "spring", damping: 25, stiffness: 200 }}
                className="w-full max-w-xl bg-white dark:bg-gray-900 border-t sm:border border-gray-200 dark:border-gray-800 rounded-t-[2rem] sm:rounded-[2rem] shadow-2xl overflow-hidden relative"
            >
                {/* Header Section */}
                <div className="relative overflow-hidden bg-gray-50/50 dark:bg-gray-800/30 px-6 py-6 sm:px-8 sm:py-8 border-b border-gray-100 dark:border-gray-800/60 flex flex-col items-center">
                    <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500"></div>

                    {/* Progress Bar (Mobile Optimized) */}
                    <div className="flex gap-1.5 mb-5 w-full justify-center">
                        {[1, 2, 3].map((i) => (
                            <motion.div
                                key={i}
                                initial={false}
                                animate={{
                                    width: step === i ? 40 : 12,
                                    backgroundColor: step >= i ? '#3b82f6' : '#e5e7eb'
                                }}
                                className="h-1.5 rounded-full"
                            />
                        ))}
                    </div>

                    <div className="w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center mb-4 rotate-3 shadow-lg shadow-blue-500/20">
                        <Sparkles className="w-6 h-6 sm:w-7 sm:h-7 text-white -rotate-3" />
                    </div>

                    <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight text-center">
                        {step === 1 ? 'Personalize Feed' : step === 2 ? 'Almost There' : 'Claim Reward!'}
                    </h2>
                    <p className="text-xs sm:text-sm font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-widest mt-1.5 text-center">
                        Step {step} of 3
                    </p>
                </div>

                {/* Content Area */}
                <div className="p-6 sm:p-8 max-h-[60vh] sm:max-h-[50vh] overflow-y-auto no-scrollbar scroll-smooth">
                    <AnimatePresence mode="wait">
                        {step === 1 && (
                            <motion.div
                                key="step1"
                                initial={{ x: 20, opacity: 0 }}
                                animate={{ x: 0, opacity: 1 }}
                                exit={{ x: -20, opacity: 0 }}
                                className="space-y-6 sm:space-y-8"
                            >
                                <div className="text-center mb-2">
                                    <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400 font-medium">Select the services you use most to curate your dashboard experience.</p>
                                </div>

                                {SERVICE_CATEGORIES.map((category) => (
                                    <div key={category.id} className="space-y-3">
                                        <div className="flex items-center gap-2">
                                            <div className={`p-1.5 rounded-md ${category.color}`}>
                                                <category.icon size={14} />
                                            </div>
                                            <span className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">{category.label}</span>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
                                            {category.services.map((s) => {
                                                const isSelected = selectedServices.includes(s.id);
                                                return (
                                                    <button
                                                        key={s.id}
                                                        onClick={() => toggleService(s.id)}
                                                        className={`relative flex flex-col sm:flex-row items-center sm:items-start gap-2.5 sm:gap-3 p-3 sm:p-4 rounded-xl sm:rounded-2xl border-2 transition-all duration-200 ease-out overflow-hidden text-center sm:text-left
                                                            ${isSelected
                                                                ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-900/10 shadow-sm scale-[1.02]'
                                                                : 'border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900/50 hover:bg-gray-50 dark:hover:bg-gray-800'
                                                            }`}
                                                    >
                                                        <div className={`shrink-0 w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center transition-colors
                                                            ${isSelected ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'}`}>
                                                            {isSelected ? <Check size={20} strokeWidth={3} /> : <s.icon size={20} />}
                                                        </div>
                                                        <span className={`text-xs sm:text-sm font-bold sm:mt-2.5 ${isSelected ? 'text-blue-700 dark:text-blue-400' : 'text-gray-700 dark:text-gray-300'}`}>
                                                            {s.label}
                                                        </span>
                                                    </button>
                                                )
                                            })}
                                        </div>
                                    </div>
                                ))}
                            </motion.div>
                        )}

                        {step === 2 && (
                            <motion.div
                                key="step2"
                                initial={{ x: 20, opacity: 0 }}
                                animate={{ x: 0, opacity: 1 }}
                                exit={{ x: -20, opacity: 0 }}
                                className="space-y-6 sm:space-y-8"
                            >
                                <div className="space-y-5">
                                    <div className="group">
                                        <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-2 pl-1">Your Occupation</label>
                                        <div className="relative">
                                            <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5 group-focus-within:text-blue-500 transition-colors" />
                                            <input
                                                type="text"
                                                value={occupation}
                                                onChange={(e) => setOccupation(e.target.value)}
                                                placeholder="e.g. Developer, Student, Designer"
                                                className="w-full pl-12 pr-4 py-4 sm:py-5 bg-gray-50 dark:bg-gray-800/50 border-2 border-transparent focus:bg-white dark:focus:bg-gray-900 focus:border-blue-500 rounded-2xl outline-none transition-all dark:text-white font-semibold placeholder:text-gray-400 placeholder:font-medium text-sm sm:text-base"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-3 pl-1">How did you find us?</label>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                                            {SOURCES.map((source) => {
                                                const isSelected = referralSource === source.id;
                                                return (
                                                    <button
                                                        key={source.id}
                                                        onClick={() => setReferralSource(source.id)}
                                                        className={`px-4 py-3 sm:py-4 text-left text-sm font-semibold rounded-xl border-2 transition-all flex items-center justify-between
                                                            ${isSelected
                                                                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400'
                                                                : 'border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/30 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                                                            }`}
                                                    >
                                                        {source.label}
                                                        {isSelected && <CheckCircle2 size={18} fill="currentColor" className="text-blue-500 dark:text-blue-400 bg-white dark:bg-transparent rounded-full" />}
                                                    </button>
                                                )
                                            })}
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {step === 3 && (
                            <motion.div
                                key="step3"
                                initial={{ x: 20, opacity: 0 }}
                                animate={{ x: 0, opacity: 1 }}
                                exit={{ x: -20, opacity: 0 }}
                                className="space-y-6 py-2"
                            >
                                <div className="text-center">
                                    <div className="mx-auto w-16 h-16 sm:w-20 sm:h-20 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mb-4 sm:mb-6 shadow-inner">
                                        <Gift className="w-8 h-8 sm:w-10 sm:h-10 text-emerald-600 dark:text-emerald-400 animate-bounce" />
                                    </div>
                                    <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 font-medium mb-6">Enter a friend's referral code to instantly receive <span className="font-bold text-emerald-600 dark:text-emerald-400">₹100</span> in your wallet.</p>
                                </div>

                                <div className="max-w-xs mx-auto">
                                    <input
                                        type="text"
                                        value={referralCode}
                                        onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                                        placeholder="ENTER CODE"
                                        className="w-full px-4 py-5 sm:py-6 bg-gray-50 dark:bg-gray-800/50 border-2 border-gray-200 dark:border-gray-700 hover:border-emerald-300 focus:border-emerald-500 focus:bg-white dark:focus:bg-gray-900 rounded-2xl text-center text-2xl sm:text-3xl font-mono font-bold tracking-[0.2em] outline-none transition-all dark:text-white placeholder:text-gray-300 dark:placeholder:text-gray-600 uppercase shadow-sm"
                                    />
                                    <p className="text-center text-xs text-gray-400 font-medium mt-3 uppercase tracking-wider">Optional</p>
                                </div>

                                <AnimatePresence>
                                    {error && (
                                        <motion.div
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: 'auto' }}
                                            exit={{ opacity: 0, height: 0 }}
                                            className="overflow-hidden"
                                        >
                                            <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-xl flex items-center gap-3 text-red-600 dark:text-red-400 text-sm font-semibold border border-red-100 dark:border-red-800/50 mt-4">
                                                <ShieldAlert size={18} className="shrink-0" />
                                                <p>{error}</p>
                                            </div>
                                        </motion.div>
                                    )}
                                    {successMessage && (
                                        <motion.div
                                            initial={{ scale: 0.95, opacity: 0 }}
                                            animate={{ scale: 1, opacity: 1 }}
                                            className="p-5 sm:p-6 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/50 rounded-2xl text-center mt-4"
                                        >
                                            <div className="flex justify-center mb-2">
                                                <div className="bg-emerald-500 rounded-full p-1 opacity-90">
                                                    <Check size={20} className="text-white" strokeWidth={3} />
                                                </div>
                                            </div>
                                            <h4 className="text-emerald-700 dark:text-emerald-400 font-bold sm:text-lg mb-1">{successMessage}</h4>
                                            <p className="text-xs font-semibold text-emerald-600/70 dark:text-emerald-500/70 uppercase tracking-widest mt-2 animate-pulse">Redirecting...</p>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Footer Controls */}
                <div className="p-4 sm:p-6 bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 flex gap-3 sm:gap-4 pb-safe">
                    {step > 1 && !successMessage && (
                        <button
                            onClick={handleBack}
                            className="px-6 sm:px-8 py-4 sm:py-5 text-sm font-bold text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl sm:rounded-2xl transition-colors uppercase tracking-wider"
                        >
                            Back
                        </button>
                    )}
                    {!successMessage && (
                        <button
                            onClick={step === 3 ? handleSubmit : handleNext}
                            disabled={loading || (step === 1 && selectedServices.length === 0) || (step === 2 && (!occupation || !referralSource))}
                            className="flex-1 relative overflow-hidden bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 sm:py-5 rounded-xl sm:rounded-2xl transition-all active:scale-[0.98] disabled:opacity-50 disabled:bg-gray-400 dark:disabled:bg-gray-700 disabled:active:scale-100 shadow-md shadow-blue-500/20 flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <>
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    <span className="uppercase tracking-wider text-sm sm:text-base">Saving...</span>
                                </>
                            ) : (
                                <>
                                    <span className="uppercase tracking-wider text-sm sm:text-base">
                                        {step === 3 ? 'Finish & Claim' : 'Continue'}
                                    </span>
                                    {step !== 3 && <ChevronRight size={18} strokeWidth={3} />}
                                </>
                            )}
                        </button>
                    )}
                </div>
            </motion.div>
        </div>
    );
}