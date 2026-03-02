'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Zap, Banknote, ShoppingBag, Headphones,
    Smartphone, Tv, Car, Flame, Wallet, CreditCard,
    Landmark, Gift, FileText, Heart, HelpCircle,
    Sparkles, Briefcase, Info, CheckCircle2, ChevronRight, Check, X,
    ShieldAlert
} from 'lucide-react';

const SERVICE_CATEGORIES = [
    {
        id: 'bills',
        label: 'Bills & Recharges',
        icon: Zap,
        color: 'text-blue-600 bg-blue-50',
        services: [
            { id: 'mobile', label: 'Mobile Recharge', icon: Smartphone },
            { id: 'dth', label: 'DTH', icon: Tv },
            { id: 'electricity', label: 'Electricity', icon: Zap },
            { id: 'fastag', label: 'FASTag', icon: Car },
            { id: 'gas', label: 'Gas Booking', icon: Flame }
        ]
    },
    {
        id: 'finance',
        label: 'Finance & Loans',
        icon: Banknote,
        color: 'text-emerald-600 bg-emerald-50',
        services: [
            { id: 'loans', label: 'Instant Loans', icon: Banknote },
            { id: 'business', label: 'Business Loans', icon: Landmark },
            { id: 'wallet', label: 'Digital Wallet', icon: Wallet },
            { id: 'cards', label: 'Credit Cards', icon: CreditCard }
        ]
    },
    {
        id: 'shopping',
        label: 'Shopping & Rewards',
        icon: ShoppingBag,
        color: 'text-pink-600 bg-pink-50',
        services: [
            { id: 'gift', label: 'Gift Cards', icon: Gift },
            { id: 'store', label: 'Online Store', icon: ShoppingBag },
            { id: 'coupons', label: 'My Coupons', icon: FileText },
            { id: 'rewards', label: 'Redeem Points', icon: Heart }
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
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-gray-950/80 backdrop-blur-xl">
            <motion.div
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                className="w-full max-w-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-[3rem] shadow-2xl overflow-hidden relative"
            >
                {/* Header Section */}
                <div className="bg-gray-50/50 dark:bg-gray-800/20 p-8 border-b border-gray-100 dark:border-gray-800 text-center relative overflow-hidden">
                    <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600"></div>

                    {/* Progress Bar */}
                    <div className="absolute top-4 left-1/2 -translate-x-1/2 flex gap-1.5">
                        {[1, 2, 3].map((i) => (
                            <motion.div
                                key={i}
                                initial={false}
                                animate={{
                                    width: step === i ? 32 : 8,
                                    backgroundColor: step >= i ? '#2563eb' : '#e2e8f0'
                                }}
                                className="h-1.5 rounded-full"
                            />
                        ))}
                    </div>

                    <div className="mx-auto w-14 h-14 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl flex items-center justify-center mb-5 rotate-3 shadow-lg shadow-blue-500/20">
                        <Sparkles className="w-8 h-8 text-white -rotate-3" />
                    </div>
                    <h2 className="text-3xl font-black text-gray-900 dark:text-white tracking-tighter italic uppercase">
                        Welcome to InTrust
                    </h2>
                    <p className="text-xs font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest mt-2">
                        {step === 1 ? 'Personalize Your Feed' : step === 2 ? 'Tell Us About You' : 'Unlock Your Reward'}
                    </p>
                </div>

                {/* Content Area */}
                <div className="p-8 max-h-[60vh] overflow-y-auto no-scrollbar">
                    <AnimatePresence mode="wait">
                        {step === 1 && (
                            <motion.div
                                key="step1"
                                initial={{ x: 30, opacity: 0 }}
                                animate={{ x: 0, opacity: 1 }}
                                exit={{ x: -30, opacity: 0 }}
                                className="space-y-8"
                            >
                                <div className="text-center">
                                    <h3 className="text-xl font-black text-gray-900 dark:text-white mb-2 tracking-tight">What triggers your interest? 🚀</h3>
                                    <p className="text-sm text-gray-500 font-medium">Pick services you use. We'll curate your dashboard.</p>
                                </div>

                                {SERVICE_CATEGORIES.map((category) => (
                                    <div key={category.id} className="space-y-4">
                                        <div className="flex items-center gap-2 px-2">
                                            <div className={`p-1.5 rounded-lg ${category.color}`}>
                                                <category.icon size={16} />
                                            </div>
                                            <span className="text-xs font-black uppercase tracking-widest text-gray-400">{category.label}</span>
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            {category.services.map((s) => (
                                                <button
                                                    key={s.id}
                                                    onClick={() => toggleService(s.id)}
                                                    className={`group relative p-4 rounded-2xl border-2 transition-all text-left overflow-hidden ${selectedServices.includes(s.id)
                                                        ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20 text-blue-600 shadow-md scale-[1.02]'
                                                        : 'border-gray-100 dark:border-gray-800 hover:border-gray-200 dark:hover:border-gray-700 text-gray-600 dark:text-gray-400'
                                                        }`}
                                                >
                                                    <div className="flex items-center gap-3 relative z-10">
                                                        <div className={`w-10 h-10 rounded-[12px] flex items-center justify-center transition-all ${selectedServices.includes(s.id) ? 'bg-blue-600 text-white rotate-6' : 'bg-gray-100 dark:bg-gray-800 group-hover:bg-gray-200'}`}>
                                                            {selectedServices.includes(s.id) ? <Check size={20} strokeWidth={3} /> : <s.icon size={20} />}
                                                        </div>
                                                        <span className="text-sm font-bold tracking-tight">{s.label}</span>
                                                    </div>
                                                    {selectedServices.includes(s.id) && (
                                                        <motion.div
                                                            layoutId="bg-spark"
                                                            className="absolute top-0 right-0 w-12 h-12 bg-blue-200/20 blur-2xl rounded-full"
                                                        />
                                                    )}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </motion.div>
                        )}

                        {step === 2 && (
                            <motion.div
                                key="step2"
                                initial={{ x: 30, opacity: 0 }}
                                animate={{ x: 0, opacity: 1 }}
                                exit={{ x: -30, opacity: 0 }}
                                className="space-y-8"
                            >
                                <div className="text-center">
                                    <div className="mx-auto w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-3xl flex items-center justify-center mb-4">
                                        <Briefcase className="w-8 h-8 text-blue-600" />
                                    </div>
                                    <h3 className="text-xl font-black text-gray-900 dark:text-white mb-2 tracking-tight">Tell us the vibe ✨</h3>
                                    <p className="text-sm text-gray-500 font-medium">A few more details to complete your profile.</p>
                                </div>

                                <div className="space-y-6">
                                    <div>
                                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-3 ml-2">What's your occupation?</label>
                                        <input
                                            type="text"
                                            value={occupation}
                                            onChange={(e) => setOccupation(e.target.value)}
                                            placeholder="e.g. Student, Founder, Pro Gamer"
                                            className="w-full px-6 py-5 bg-gray-50 dark:bg-gray-800/50 border-2 border-transparent rounded-[1.5rem] focus:bg-white dark:focus:bg-gray-800 focus:border-blue-600 outline-none transition-all dark:text-white font-bold placeholder:text-gray-300"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-3 ml-2">How'd you pull up to InTrust?</label>
                                        <div className="grid grid-cols-1 gap-2.5">
                                            {SOURCES.map((source) => (
                                                <button
                                                    key={source.id}
                                                    onClick={() => setReferralSource(source.id)}
                                                    className={`px-6 py-4 text-left text-sm font-bold rounded-[1.25rem] border-2 transition-all flex items-center justify-between ${referralSource === source.id
                                                        ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20 text-blue-600'
                                                        : 'border-gray-50 dark:border-gray-800/50 hover:border-gray-100 text-gray-500 dark:text-gray-400'
                                                        }`}
                                                >
                                                    {source.label}
                                                    {referralSource === source.id && <CheckCircle2 size={18} fill="currentColor" stroke="white" />}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {step === 3 && (
                            <motion.div
                                key="step3"
                                initial={{ x: 30, opacity: 0 }}
                                animate={{ x: 0, opacity: 1 }}
                                exit={{ x: -30, opacity: 0 }}
                                className="space-y-8 py-4"
                            >
                                <div className="text-center relative">
                                    <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-8 w-40 h-40 bg-emerald-500/10 blur-3xl rounded-full" />
                                    <div className="mx-auto w-20 h-20 bg-emerald-500/10 rounded-[2rem] flex items-center justify-center mb-6 border-b-4 border-emerald-500/20">
                                        <Gift className="w-10 h-10 text-emerald-500 animate-bounce" />
                                    </div>
                                    <h3 className="text-2xl font-black text-gray-900 dark:text-white mb-2 tracking-tighter">Claim your ₹100 stack 💰</h3>
                                    <p className="text-sm text-gray-500 font-medium">Enter a referral code to get paid instantly. No cap. 🧢</p>
                                </div>

                                <div className="relative group max-w-sm mx-auto">
                                    <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 rounded-[2rem] blur-lg opacity-25 group-focus-within:opacity-60 transition duration-500"></div>
                                    <input
                                        type="text"
                                        value={referralCode}
                                        onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                                        placeholder="CODE (OPTIONAL)"
                                        className="relative w-full px-1 py-7 bg-white dark:bg-gray-900 border-2 border-gray-100 dark:border-gray-800 rounded-[1.75rem] text-center text-3xl font-mono font-black tracking-[0.4em] outline-none transition-all dark:text-white placeholder:text-gray-200 dark:placeholder:text-gray-700 uppercase"
                                    />
                                </div>

                                {error && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="p-5 bg-rose-50 dark:bg-rose-900/20 rounded-2xl flex items-center gap-4 text-rose-600 text-sm font-bold border-2 border-rose-100 dark:border-rose-900/30"
                                    >
                                        <ShieldAlert size={20} className="shrink-0" />
                                        {error}
                                    </motion.div>
                                )}

                                {successMessage && (
                                    <motion.div
                                        initial={{ scale: 0.9, opacity: 0 }}
                                        animate={{ scale: 1, opacity: 1 }}
                                        className="p-8 bg-emerald-500 text-white rounded-[2rem] text-center shadow-xl shadow-emerald-500/30"
                                    >
                                        <CheckCircle2 size={32} className="mx-auto mb-3" />
                                        <h4 className="text-xl font-black tracking-tight">{successMessage}</h4>
                                        <p className="text-xs font-bold opacity-80 mt-1 uppercase tracking-widest">Redirecting to Dashboard...</p>
                                    </motion.div>
                                )}

                                <div className="bg-gray-50 dark:bg-gray-800/40 p-5 rounded-[1.5rem] border border-gray-100 dark:border-gray-800 flex gap-4">
                                    <Info className="w-6 h-6 text-blue-400 shrink-0 mt-0.5" />
                                    <p className="text-xs text-gray-500 font-medium leading-relaxed">
                                        Referral codes are case-sensitive. Both you and your friend will receive ₹100 in your InTrust Wallets immediately after successful registration.
                                    </p>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Footer Controls */}
                <div className="p-8 bg-gray-50/50 dark:bg-gray-800/20 border-t border-gray-100 dark:border-gray-800 flex gap-4">
                    {step > 1 && !successMessage && (
                        <button
                            onClick={handleBack}
                            className="px-8 py-5 text-sm font-black text-gray-400 hover:text-gray-900 dark:hover:text-white transition-all uppercase tracking-widest"
                        >
                            Back
                        </button>
                    )}
                    {!successMessage && (
                        <button
                            onClick={step === 3 ? handleSubmit : handleNext}
                            disabled={loading || (step === 1 && selectedServices.length === 0) || (step === 2 && (!occupation || !referralSource))}
                            className="flex-1 relative group overflow-hidden bg-gray-900 dark:bg-blue-600 text-white font-black py-5 rounded-[1.5rem] transition-all hover:translate-y-[-2px] hover:shadow-2xl active:translate-y-[1px] disabled:opacity-50 disabled:translate-y-0 shadow-lg shadow-gray-200 dark:shadow-blue-900/40"
                        >
                            <div className="flex items-center justify-center gap-3">
                                {loading ? (
                                    <>
                                        <div className="w-5 h-5 border-3 border-white/30 border-t-white rounded-full animate-spin" />
                                        <span className="uppercase tracking-widest">Saving...</span>
                                    </>
                                ) : (
                                    <>
                                        <span className="uppercase tracking-widest leading-none">
                                            {step === 3 ? 'Finish & Claim Reward' : 'Next Level'}
                                        </span>
                                        <ChevronRight size={20} strokeWidth={3} />
                                    </>
                                )}
                            </div>
                        </button>
                    )}
                </div>

                {/* Close Button - Only for Preview, hide for real onboarding? User said "remove bottomnav when modal is there", implies modal is mandatory */}
                {/* <button 
                    onClick={() => onComplete()}
                    className="absolute top-8 right-8 p-3 hover:bg-gray-100 rounded-2xl transition-all"
                >
                    <X size={20} className="text-gray-400" />
                </button> */}
            </motion.div>
        </div>
    );
}