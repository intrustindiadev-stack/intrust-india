'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ShoppingBag, Gift, Sparkles, CheckCircle2, ChevronRight, Check, X,
    ShieldAlert, Briefcase, MapPin, Wallet, Receipt, Sun, Store, Award
} from 'lucide-react';
import Image from 'next/image';

const SERVICE_PILLARS = [
    {
        id: 'local_stores',
        title: 'Local Stores & Express Delivery',
        desc: 'Shop verified Bhopal merchants with express local delivery or store pickup.',
        icon: Store,
        color: 'text-blue-600 bg-blue-50 dark:bg-blue-900/30'
    },
    {
        id: 'digital_wallet',
        title: 'InTrust Platform Wallet',
        desc: 'Instant digital payments and earn 5% coins on local purchases.',
        icon: Wallet,
        color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30'
    },
    {
        id: 'gift_cards',
        title: 'Instant Gift Cards & Vouchers',
        desc: 'Discounts on top brand gift cards delivered directly to your app.',
        icon: Gift,
        color: 'text-purple-600 bg-purple-50 dark:bg-purple-900/30'
    },
    {
        id: 'store_credit',
        title: 'Store Credit & Khata (Udhari)',
        desc: 'Zero-fee monthly ledger to purchase from trusted neighborhood stores.',
        icon: Receipt,
        color: 'text-amber-600 bg-amber-50 dark:bg-amber-900/30'
    },
    {
        id: 'green_services',
        title: 'Solar & Smart Devices',
        desc: 'Rooftop solar savings estimates & tap-and-pay NFC accessories.',
        icon: Sun,
        color: 'text-orange-600 bg-orange-50 dark:bg-orange-900/30'
    }
];

const BHOPAL_AREAS = [
    'MP Nagar',
    'New Market',
    'Arera Colony',
    'Kolar Road',
    'Indrapuri / BHEL',
    'Hoshangabad Road',
    'Ayodhya Bypass',
    'Shahpura'
];

const SOURCES = [
    { id: 'friend', label: 'Friend or Colleague' },
    { id: 'local_store', label: 'Local Store in Bhopal' },
    { id: 'social_media', label: 'Social Media / Instagram' },
    { id: 'google', label: 'Google Search' },
    { id: 'other', label: 'Other' }
];

export default function OnboardingModal({ userId, onComplete }) {
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [successMessage, setSuccessMessage] = useState(null);

    // Form State
    const [selectedServices, setSelectedServices] = useState(['local_stores', 'digital_wallet']);
    const [preferredArea, setPreferredArea] = useState('MP Nagar');
    const [occupation, setOccupation] = useState('');
    const [referralSource, setReferralSource] = useState('local_store');
    const [referralCode, setReferralCode] = useState('');

    // Pre-fill referral code from URL attribution stored in sessionStorage
    useEffect(() => {
        const pending = sessionStorage.getItem('intrust_pending_ref');
        if (pending) {
            setReferralCode(pending.toUpperCase().trim());
        }
    }, []);

    const handleDismiss = () => {
        try {
            localStorage.setItem('intrust_onboarding_completed', 'true');
            sessionStorage.setItem('intrust_onboarding_dismissed', 'true');
        } catch (_) {}
        if (onComplete) onComplete();
    };

    const toggleService = (id) => {
        setSelectedServices(prev =>
            prev.includes(id) ? (prev.length > 1 ? prev.filter(s => s !== id) : prev) : [...prev, id]
        );
    };

    const handleNext = () => setStep(s => s + 1);
    const handleBack = () => setStep(s => Math.max(1, s - 1));

    const handleSubmit = async () => {
        if (!userId) {
            handleDismiss();
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const res = await fetch('/api/user/onboarding', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId,
                    services: selectedServices,
                    occupation: `${occupation || 'Member'} (${preferredArea})`,
                    referral_source: referralSource,
                    referral_code_entered: referralCode
                })
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Failed to save onboarding data');
            }

            sessionStorage.removeItem('intrust_pending_ref');
            try {
                localStorage.setItem('intrust_onboarding_completed', 'true');
            } catch (_) {}

            setSuccessMessage(data.rewardApplied 
                ? 'Welcome bonus ₹50 added to your InTrust Coins balance!' 
                : 'Account setup complete! Welcome to InTrust.'
            );
            setTimeout(() => handleDismiss(), 1800);

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
                className="w-full max-w-xl bg-white dark:bg-[#0c101c] border-t sm:border border-slate-200 dark:border-white/10 rounded-t-[2.5rem] sm:rounded-3xl shadow-2xl overflow-hidden relative text-slate-900 dark:text-white"
            >
                {/* 3D Visual Header Banner */}
                <div className="relative w-full h-44 bg-slate-50 dark:bg-slate-900 overflow-hidden flex items-center justify-center border-b border-slate-100 dark:border-white/5">
                    <Image
                        src="/images/customer_onboarding_hero.jpg"
                        alt="Welcome to InTrust"
                        fill
                        priority
                        className="object-cover object-center"
                        sizes="(max-width: 640px) 100vw, 576px"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />

                    {/* Step Indicators */}
                    <div className="absolute top-4 left-5 z-10 flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/90 dark:bg-black/70 backdrop-blur-md text-blue-600 dark:text-sky-400 border border-white/20 shadow-sm text-[11px] font-black uppercase tracking-wider">
                        <Sparkles size={12} className="text-amber-500" />
                        <span>Step {step} of 3</span>
                    </div>

                    {/* Close / Skip button */}
                    <button
                        type="button"
                        onClick={handleDismiss}
                        className="absolute top-4 right-4 z-20 w-8 h-8 rounded-full bg-black/40 hover:bg-black/60 backdrop-blur-md flex items-center justify-center text-white transition-all active:scale-90"
                        title="Skip for now"
                    >
                        <X size={17} strokeWidth={2.5} />
                    </button>

                    {/* Headline overlay */}
                    <div className="absolute bottom-3 left-5 right-5 z-10 text-white">
                        <h2 className="text-xl sm:text-2xl font-black tracking-tight leading-tight">
                            {step === 1 ? 'Personalize Your Shopping' : step === 2 ? 'Localize Your Delivery' : 'Claim ₹50 Welcome Reward'}
                        </h2>
                        <p className="text-[11px] text-sky-200 font-semibold mt-0.5">
                            {step === 1 ? 'Select your primary interests' : step === 2 ? 'Choose your primary Bhopal neighborhood' : 'Unlock bonus coins for your wallet'}
                        </p>
                    </div>
                </div>

                {/* Progress bar */}
                <div className="h-1 w-full bg-slate-100 dark:bg-white/5 overflow-hidden">
                    <motion.div
                        className="h-full bg-blue-600"
                        initial={{ width: '33%' }}
                        animate={{ width: `${(step / 3) * 100}%` }}
                        transition={{ duration: 0.3 }}
                    />
                </div>

                {/* Content Area */}
                <div className="p-5 sm:p-6 max-h-[55vh] sm:max-h-[48vh] overflow-y-auto no-scrollbar scroll-smooth">
                    <AnimatePresence mode="wait">
                        {/* STEP 1: Services Selection */}
                        {step === 1 && (
                            <motion.div
                                key="step1"
                                initial={{ x: 20, opacity: 0 }}
                                animate={{ x: 0, opacity: 1 }}
                                exit={{ x: -20, opacity: 0 }}
                                className="space-y-3"
                            >
                                <div className="space-y-2.5">
                                    {SERVICE_PILLARS.map((pillar) => {
                                        const isSelected = selectedServices.includes(pillar.id);
                                        const Icon = pillar.icon;

                                        return (
                                            <button
                                                key={pillar.id}
                                                type="button"
                                                onClick={() => toggleService(pillar.id)}
                                                className={`w-full flex items-start gap-3 p-3 rounded-2xl border-2 text-left transition-all duration-200 ${
                                                    isSelected
                                                        ? 'border-blue-600 bg-blue-50/70 dark:bg-blue-950/30 shadow-xs'
                                                        : 'border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/60 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                                                }`}
                                            >
                                                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${pillar.color}`}>
                                                    <Icon size={19} />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center justify-between">
                                                        <h4 className={`text-xs font-bold ${isSelected ? 'text-blue-700 dark:text-blue-400' : 'text-slate-900 dark:text-slate-200'}`}>
                                                            {pillar.title}
                                                        </h4>
                                                        <div className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 ml-2 border ${
                                                            isSelected ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-300 dark:border-slate-700'
                                                        }`}>
                                                            {isSelected && <Check size={11} strokeWidth={3} />}
                                                        </div>
                                                    </div>
                                                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug mt-0.5">
                                                        {pillar.desc}
                                                    </p>
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            </motion.div>
                        )}

                        {/* STEP 2: City & Area Selection */}
                        {step === 2 && (
                            <motion.div
                                key="step2"
                                initial={{ x: 20, opacity: 0 }}
                                animate={{ x: 0, opacity: 1 }}
                                exit={{ x: -20, opacity: 0 }}
                                className="space-y-4"
                            >
                                <div>
                                    <label className="block text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                                        Preferred Bhopal Area (For 2-Hour Delivery)
                                    </label>
                                    <div className="grid grid-cols-2 gap-2">
                                        {BHOPAL_AREAS.map((area) => {
                                            const isSelected = preferredArea === area;
                                            return (
                                                <button
                                                    key={area}
                                                    type="button"
                                                    onClick={() => setPreferredArea(area)}
                                                    className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all text-left flex items-center justify-between ${
                                                        isSelected
                                                            ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                                                            : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/30 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
                                                    }`}
                                                >
                                                    <span className="truncate">{area}</span>
                                                    {isSelected && <CheckCircle2 size={13} className="text-blue-600 dark:text-blue-400 shrink-0" />}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                                        Your Occupation (Optional)
                                    </label>
                                    <div className="relative">
                                        <Briefcase className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                                        <input
                                            type="text"
                                            value={occupation}
                                            onChange={(e) => setOccupation(e.target.value)}
                                            placeholder="e.g. Professional, Business Owner, Student"
                                            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 focus:border-blue-500 focus:bg-white dark:focus:bg-slate-900 rounded-xl outline-none text-xs font-semibold transition-all"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                                        How did you discover InTrust?
                                    </label>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                        {SOURCES.map((src) => {
                                            const isSelected = referralSource === src.id;
                                            return (
                                                <button
                                                    key={src.id}
                                                    type="button"
                                                    onClick={() => setReferralSource(src.id)}
                                                    className={`px-3 py-2 text-xs font-semibold rounded-xl border transition-all text-left flex items-center justify-between ${
                                                        isSelected
                                                            ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 font-bold'
                                                            : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/20 text-slate-600 dark:text-slate-400'
                                                    }`}
                                                >
                                                    <span>{src.label}</span>
                                                    {isSelected && <Check size={12} className="text-blue-600 dark:text-blue-400" />}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {/* STEP 3: Welcome Reward & Referral Code */}
                        {step === 3 && (
                            <motion.div
                                key="step3"
                                initial={{ x: 20, opacity: 0 }}
                                animate={{ x: 0, opacity: 1 }}
                                exit={{ x: -20, opacity: 0 }}
                                className="space-y-4 text-center py-2"
                            >
                                <div className="mx-auto w-14 h-14 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-center justify-center shadow-inner">
                                    <Award className="w-8 h-8 text-amber-500" />
                                </div>

                                <div>
                                    <h3 className="text-base font-black text-slate-900 dark:text-white">Claim Your Welcome Reward</h3>
                                    <p className="text-xs text-slate-600 dark:text-slate-400 font-medium mt-1 max-w-sm mx-auto">
                                        Have a friend&apos;s invite code? Enter it below to unlock extra signup coins for your InTrust Wallet.
                                    </p>
                                </div>

                                <div className="max-w-xs mx-auto">
                                    <input
                                        type="text"
                                        value={referralCode}
                                        onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                                        placeholder="ENTER CODE"
                                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/60 border-2 border-slate-200 dark:border-slate-700 hover:border-blue-400 focus:border-blue-500 focus:bg-white dark:focus:bg-slate-900 rounded-xl text-center text-lg font-mono font-bold tracking-[0.2em] outline-none transition-all dark:text-white placeholder:text-slate-300 dark:placeholder:text-slate-600 uppercase shadow-xs"
                                    />
                                    <p className="text-[11px] font-semibold mt-2">
                                        {referralCode ? (
                                            <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                                                🎁 Referral code entered — bonus coins will be added!
                                            </span>
                                        ) : (
                                            <span className="text-slate-400">
                                                No referral code? Tap finish to activate your account!
                                            </span>
                                        )}
                                    </p>
                                </div>

                                <AnimatePresence>
                                    {error && (
                                        <div className="p-3 bg-rose-50 dark:bg-rose-950/30 rounded-xl flex items-center gap-2.5 text-rose-600 dark:text-rose-400 text-xs font-semibold border border-rose-200 dark:border-rose-900/40">
                                            <ShieldAlert size={16} className="shrink-0" />
                                            <p className="text-left">{error}</p>
                                        </div>
                                    )}
                                    {successMessage && (
                                        <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/40 rounded-2xl text-center">
                                            <p className="text-xs font-bold text-emerald-700 dark:text-emerald-400">{successMessage}</p>
                                        </div>
                                    )}
                                </AnimatePresence>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Footer Controls */}
                <div className="p-4 sm:p-5 bg-slate-50 dark:bg-slate-900/60 border-t border-slate-200 dark:border-white/5 flex gap-3">
                    {step > 1 && !successMessage && (
                        <button
                            type="button"
                            onClick={handleBack}
                            className="px-5 py-3 text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl border border-slate-200 dark:border-slate-700 transition-colors uppercase tracking-wider"
                        >
                            Back
                        </button>
                    )}
                    {!successMessage && (
                        <button
                            type="button"
                            onClick={step === 3 ? handleSubmit : handleNext}
                            disabled={loading || (step === 1 && selectedServices.length === 0)}
                            className="flex-1 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-black py-3 rounded-xl transition-all active:scale-[0.98] disabled:opacity-50 shadow-md shadow-blue-500/25 flex items-center justify-center gap-2 text-xs sm:text-sm uppercase tracking-wider"
                        >
                            {loading ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    <span>Activating...</span>
                                </>
                            ) : (
                                <>
                                    <span>{step === 3 ? 'Finish & Start Shopping' : 'Continue'}</span>
                                    {step !== 3 && <ChevronRight size={16} strokeWidth={2.5} />}
                                </>
                            )}
                        </button>
                    )}
                </div>
            </motion.div>
        </div>
    );
}
