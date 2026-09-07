'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ShoppingCart,
    Wallet,
    CreditCard,
    Gift,
    Sun,
    TrendingUp,
    Check,
    Users,
    Store,
    Instagram,
    Search,
    MoreHorizontal,
    ArrowRight,
    ArrowLeft,
    FileText,
    Briefcase,
    ChevronDown,
    Lock
} from 'lucide-react';
import Image from 'next/image';

// Step 1: 6 Value propositions
const VALUE_PILLS = [
    {
        icon: ShoppingCart,
        title: 'InTrust Mart',
        subtitle: 'Online Shopping',
        iconBg: 'bg-blue-50 text-[#0052FF] dark:bg-blue-900/30 dark:text-blue-400'
    },
    {
        icon: Wallet,
        title: 'Smart Payments',
        subtitle: 'Secure & Easy',
        iconBg: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400'
    },
    {
        icon: CreditCard,
        title: 'NFC Cards',
        subtitle: 'Smart Business Cards',
        iconBg: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400'
    },
    {
        icon: Gift,
        title: 'Gift Cards',
        subtitle: 'For Every Occasion',
        iconBg: 'bg-rose-50 text-rose-500 dark:bg-rose-900/30 dark:text-rose-400'
    },
    {
        icon: Sun,
        title: 'Solar Solutions',
        subtitle: 'For a Better Tomorrow',
        iconBg: 'bg-amber-50 text-amber-500 dark:bg-amber-900/30 dark:text-amber-400'
    },
    {
        icon: TrendingUp,
        title: 'Business Opportunity',
        subtitle: 'Dukaan & Franchisee',
        iconBg: 'bg-violet-50 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400'
    }
];

// Step 2: 6 Exploration Services
const SERVICE_OPTIONS = [
    {
        id: 'local_stores',
        icon: ShoppingCart,
        title: 'Local Stores & Delivery',
        desc: 'Shop verified merchants with fast local delivery or pickup.',
        iconBg: 'bg-blue-50 text-[#0052FF] dark:bg-blue-900/40 dark:text-blue-400'
    },
    {
        id: 'digital_wallet',
        icon: Wallet,
        title: 'InTrust Wallet',
        desc: 'Instant payments and earn 5% coins on local purchases.',
        iconBg: 'bg-sky-50 text-sky-600 dark:bg-sky-900/40 dark:text-sky-400'
    },
    {
        id: 'gift_cards',
        icon: Gift,
        title: 'Gift Cards & Vouchers',
        desc: 'Discounts on 200+ top brands delivered to your app.',
        iconBg: 'bg-rose-50 text-rose-500 dark:bg-rose-900/40 dark:text-rose-400'
    },
    {
        id: 'store_credit',
        icon: FileText,
        title: 'Store Credit & Khata',
        desc: 'Buy now, pay later with zero fees at trusted stores.',
        iconBg: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-400'
    },
    {
        id: 'green_services',
        icon: Sun,
        title: 'Solar & Smart Devices',
        desc: 'Rooftop solar savings estimates & tap-and-pay NFC.',
        iconBg: 'bg-amber-50 text-amber-500 dark:bg-amber-900/40 dark:text-amber-400'
    },
    {
        id: 'business_opportunity',
        icon: TrendingUp,
        title: 'Business Opportunity',
        desc: 'Dukaan, agency & franchisee partnership options.',
        iconBg: 'bg-violet-50 text-violet-600 dark:bg-violet-900/40 dark:text-violet-400'
    }
];

// Step 3: Discovery Sources
const SOURCES = [
    { id: 'friend', label: 'Friend or Colleague', icon: Users },
    { id: 'local_store', label: 'Local Store', icon: Store },
    { id: 'social_media', label: 'Social Media', icon: Instagram },
    { id: 'google', label: 'Google Search', icon: Search },
    { id: 'other', label: 'Other', icon: MoreHorizontal }
];

const OCCUPATION_OPTIONS = [
    'Salaried Professional',
    'Business Owner / Merchant',
    'Freelancer / Consultant',
    'Student',
    'Homemaker',
    'Retired / Senior',
    'Other'
];

export default function OnboardingModal({ userId, onComplete }) {
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [successMessage, setSuccessMessage] = useState(null);

    // Form State (matching user_profiles schema)
    const [selectedServices, setSelectedServices] = useState([
        'local_stores',
        'digital_wallet',
        'store_credit'
    ]);
    const [occupation, setOccupation] = useState('');
    const [referralSource, setReferralSource] = useState('friend');
    const [referralCode, setReferralCode] = useState('');
    const [referralApplied, setReferralApplied] = useState(false);

    const scrollRef = useRef(null);

    // Auto reset scroll to top on every step transition
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = 0;
        }
    }, [step]);

    // Pre-fill referral code from sessionStorage if present
    useEffect(() => {
        const pending = sessionStorage.getItem('intrust_pending_ref');
        if (pending) {
            setReferralCode(pending.toUpperCase().trim());
            setReferralApplied(true);
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
            prev.includes(id)
                ? (prev.length > 1 ? prev.filter(s => s !== id) : prev)
                : [...prev, id]
        );
    };

    const handleApplyReferral = () => {
        if (!referralCode.trim()) return;
        setReferralApplied(true);
    };

    const handleSubmit = async () => {
        if (!userId || userId === 'preview-user-id') {
            setSuccessMessage('Welcome to InTrust! Welcome bonus ₹50 added to your coins balance.');
            setTimeout(() => handleDismiss(), 1200);
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
                    occupation: occupation || null,
                    referral_source: referralSource,
                    referral_code_entered: referralCode
                })
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Failed to save onboarding preferences');
            }

            sessionStorage.removeItem('intrust_pending_ref');
            try {
                localStorage.setItem('intrust_onboarding_completed', 'true');
            } catch (_) {}

            setSuccessMessage(
                data.rewardApplied
                    ? 'Welcome bonus ₹50 added to your InTrust Coins balance!'
                    : 'Account setup complete! Welcome to InTrust.'
            );
            setTimeout(() => handleDismiss(), 1400);

        } catch (err) {
            console.error(err);
            setError(err.message);
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-xl p-3 sm:p-4 overflow-y-auto">
            <motion.div
                initial={{ scale: 0.95, opacity: 0, y: 12 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 12 }}
                transition={{ type: 'spring', damping: 28, stiffness: 300 }}
                className="w-full max-w-[420px] bg-white dark:bg-[#0c101c] rounded-[2.5rem] shadow-[0_20px_70px_-10px_rgba(0,0,0,0.18)] border border-slate-100 dark:border-white/10 overflow-hidden relative flex flex-col text-slate-900 dark:text-white my-auto max-h-[min(94vh,680px)] h-[680px]"
            >
                {/* Clean Top Navigation Bar */}
                <div className="px-6 pt-5 pb-2 flex items-center justify-between shrink-0 bg-transparent z-20">
                    <div className="flex items-center gap-2">
                        <div className="relative w-8 h-8 flex items-center justify-center shrink-0">
                            <Image
                                src="/icons/intrustLogo.png"
                                alt="InTrust"
                                width={30}
                                height={30}
                                className="object-contain"
                                priority
                            />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-base font-black tracking-tight text-[#0f172a] dark:text-white font-sans leading-none">
                                InTrust
                            </span>
                            <span className="text-[9.5px] font-medium text-slate-400 dark:text-slate-400 mt-0.5">
                                A smarter everyday
                            </span>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={handleDismiss}
                        className="text-xs font-semibold text-slate-400 hover:text-slate-800 dark:text-slate-500 dark:hover:text-white transition-colors cursor-pointer px-2 py-1"
                    >
                        Skip
                    </button>
                </div>

                {/* Main Body - Hidden scrollbars, compact, class-leading layout */}
                <div
                    ref={scrollRef}
                    className="flex-1 overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden flex flex-col justify-between"
                >
                    <AnimatePresence mode="wait">
                        {/* ============================================================== */}
                        {/* SCREEN 1: Redesigned, Compact, EZ & Minimal Premium           */}
                        {/* ============================================================== */}
                        {step === 1 && (
                            <motion.div
                                key="screen1"
                                initial={{ opacity: 0, x: -14 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 14 }}
                                transition={{ duration: 0.2 }}
                                className="flex flex-col flex-1 justify-between px-6 pb-4 pt-1"
                            >
                                {/* Top Headline */}
                                <div>
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <h1 className="text-[23px] sm:text-[25px] font-black text-slate-900 dark:text-white leading-[1.15] tracking-tight">
                                                Shopping, Payments<br />& Growth
                                            </h1>
                                            <h2 className="text-base font-bold text-[#0052FF] dark:text-blue-400 mt-0.5">
                                                Ek App, Sab Kuch.
                                            </h2>
                                        </div>

                                        {/* Playful script badge */}
                                        <span className="text-[13px] font-black text-[#0052FF] dark:text-sky-400 -rotate-12 inline-block font-sans drop-shadow-xs tracking-tight select-none mt-1">
                                            Grow<br />Together
                                        </span>
                                    </div>

                                    <p className="text-[11.5px] text-slate-500 dark:text-slate-400 leading-snug mt-1">
                                        From daily shopping to smart payments — InTrust brings everything you need, together.
                                    </p>

                                    {/* 6 Value Pillars (Clean, elegant 2-column layout) */}
                                    <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 mt-2.5">
                                        {VALUE_PILLS.map((pill, idx) => {
                                            const Icon = pill.icon;
                                            return (
                                                <div
                                                    key={idx}
                                                    className="flex items-center gap-2 py-0.5"
                                                >
                                                    <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 shadow-2xs ${pill.iconBg}`}>
                                                        <Icon size={12} strokeWidth={2.4} />
                                                    </div>
                                                    <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200 truncate">
                                                        {pill.title}
                                                    </span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Free-Standing 3D Artwork (Spacious, seamless on canvas) */}
                                <div className="relative w-full h-[200px] sm:h-[215px] my-auto">
                                    <Image
                                        src="/banners/onboarding-1.png"
                                        alt="InTrust Mascot, Store & Shopping Cart"
                                        fill
                                        priority
                                        className="object-contain object-bottom pointer-events-none"
                                        sizes="(max-width: 430px) 400px"
                                    />
                                </div>

                                {/* Stats & Bottom Action Bar */}
                                <div>
                                    {/* Stats Row */}
                                    <div className="grid grid-cols-3 gap-2 text-center py-1.5 px-3 rounded-2xl bg-slate-50/90 dark:bg-white/5 border border-slate-100 dark:border-white/5">
                                        <div>
                                            <div className="text-[12px] font-black text-slate-900 dark:text-white">
                                                10K+
                                            </div>
                                            <div className="text-[8.5px] font-medium text-slate-400 dark:text-slate-400">
                                                Happy Users
                                            </div>
                                        </div>
                                        <div className="border-x border-slate-200/60 dark:border-white/10">
                                            <div className="text-[12px] font-black text-slate-900 dark:text-white">
                                                500+
                                            </div>
                                            <div className="text-[8.5px] font-medium text-slate-400 dark:text-slate-400">
                                                Local Stores
                                            </div>
                                        </div>
                                        <div>
                                            <div className="text-[12px] font-black text-slate-900 dark:text-white">
                                                100+
                                            </div>
                                            <div className="text-[8.5px] font-medium text-slate-400 dark:text-slate-400">
                                                Cities
                                            </div>
                                        </div>
                                    </div>

                                    {/* Bottom Controls */}
                                    <div className="mt-3 flex items-center justify-between px-1">
                                        {/* Pagination Dots */}
                                        <div className="flex items-center gap-1.5">
                                            <div className="w-5 h-1.5 rounded-full bg-[#0052FF] transition-all" />
                                            <div className="w-1.5 h-1.5 rounded-full bg-slate-200 dark:bg-white/20" />
                                            <div className="w-1.5 h-1.5 rounded-full bg-slate-200 dark:bg-white/20" />
                                        </div>

                                        {/* Next Button */}
                                        <button
                                            type="button"
                                            onClick={() => setStep(2)}
                                            className="px-6 py-2.5 bg-[#0052FF] hover:bg-blue-700 active:bg-blue-800 text-white font-bold rounded-2xl transition-all shadow-md shadow-blue-500/25 flex items-center gap-1.5 text-xs cursor-pointer"
                                        >
                                            <span>Next</span>
                                            <ArrowRight size={14} strokeWidth={2.6} />
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {/* ============================================================== */}
                        {/* SCREEN 2: Clean, Minimal, Classy — NO SLIDERS / NO SCROLLBARS  */}
                        {/* ============================================================== */}
                        {step === 2 && (
                            <motion.div
                                key="screen2"
                                initial={{ opacity: 0, x: 14 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -14 }}
                                transition={{ duration: 0.2 }}
                                className="flex flex-col flex-1 justify-between px-6 pb-4 pt-1"
                            >
                                <div>
                                    {/* Top 3-Dot Step Indicator */}
                                    <div className="flex items-center justify-center gap-1.5 mb-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-slate-200 dark:bg-white/20" />
                                        <div className="w-5 h-1.5 rounded-full bg-[#0052FF] transition-all" />
                                        <div className="w-1.5 h-1.5 rounded-full bg-slate-200 dark:bg-white/20" />
                                    </div>

                                    {/* Header Text */}
                                    <div className="text-left mb-3">
                                        <span className="text-[9.5px] font-black text-[#0052FF] dark:text-sky-400 tracking-wider uppercase">
                                            WHAT INTERESTS YOU?
                                        </span>
                                        <h2 className="text-[19px] sm:text-[20px] font-black text-slate-900 dark:text-white leading-tight mt-0.5">
                                            Pick what you&apos;d like<br />to explore on InTrust.
                                        </h2>
                                        <p className="text-[10.5px] font-medium text-slate-500 dark:text-slate-400 mt-0.5">
                                            You can choose multiple options.
                                        </p>
                                    </div>

                                    {/* 6 Minimal, Classy Cards (Zero slider, fits perfectly!) */}
                                    <div className="grid grid-cols-2 gap-2">
                                        {SERVICE_OPTIONS.map((card) => {
                                            const isSelected = selectedServices.includes(card.id);
                                            const Icon = card.icon;

                                            return (
                                                <button
                                                    key={card.id}
                                                    type="button"
                                                    onClick={() => toggleService(card.id)}
                                                    className={`p-2.5 rounded-2xl border text-left transition-all relative flex flex-col justify-between cursor-pointer min-h-[86px] ${
                                                        isSelected
                                                            ? 'border-[#0052FF] bg-blue-50/40 dark:bg-blue-950/20 shadow-xs ring-1 ring-[#0052FF]/30'
                                                            : 'border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900/60 hover:bg-slate-50 dark:hover:bg-slate-800/40 shadow-2xs'
                                                    }`}
                                                >
                                                    {/* Top row: Minimal Icon + Radio Circle */}
                                                    <div className="flex items-center justify-between w-full mb-1">
                                                        <div className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 ${card.iconBg}`}>
                                                            <Icon size={14} strokeWidth={2.4} />
                                                        </div>
                                                        <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center transition-all ${
                                                            isSelected
                                                                ? 'bg-[#0052FF] text-white shadow-2xs'
                                                                : 'border border-slate-300 dark:border-slate-600 bg-transparent'
                                                        }`}>
                                                            {isSelected && <Check size={8} strokeWidth={3.5} />}
                                                        </div>
                                                    </div>

                                                    {/* Content */}
                                                    <div>
                                                        <h3 className="text-[10.5px] font-bold text-slate-900 dark:text-white leading-tight">
                                                            {card.title}
                                                        </h3>
                                                        <p className="text-[8.5px] text-slate-500 dark:text-slate-400 leading-tight mt-0.5 line-clamp-2">
                                                            {card.desc}
                                                        </p>
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Bottom Controls Bar */}
                                <div className="pt-2 flex items-center justify-between">
                                    <button
                                        type="button"
                                        onClick={() => setStep(1)}
                                        className="text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white flex items-center gap-1 cursor-pointer"
                                    >
                                        <ArrowLeft size={13} />
                                        <span>Back</span>
                                    </button>

                                    {/* Pagination Dots */}
                                    <div className="flex items-center gap-1.5">
                                        <div className="w-1.5 h-1.5 rounded-full bg-slate-200 dark:bg-white/20" />
                                        <div className="w-5 h-1.5 rounded-full bg-[#0052FF] transition-all" />
                                        <div className="w-1.5 h-1.5 rounded-full bg-slate-200 dark:bg-white/20" />
                                    </div>

                                    <button
                                        type="button"
                                        onClick={() => setStep(3)}
                                        className="px-6 py-2.5 bg-[#0052FF] hover:bg-blue-700 active:bg-blue-800 text-white font-bold rounded-2xl transition-all shadow-md shadow-blue-500/25 flex items-center gap-1.5 text-xs cursor-pointer"
                                    >
                                        <span>Next</span>
                                        <ArrowRight size={14} strokeWidth={2.6} />
                                    </button>
                                </div>
                            </motion.div>
                        )}

                        {/* ============================================================== */}
                        {/* SCREEN 3: Copied Exactly from Reference Design                */}
                        {/* ============================================================== */}
                        {step === 3 && (
                            <motion.div
                                key="screen3"
                                initial={{ opacity: 0, x: 14 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -14 }}
                                transition={{ duration: 0.2 }}
                                className="flex flex-col flex-1 justify-between px-6 pb-4 pt-1"
                            >
                                <div className="space-y-2">
                                    {/* Free-Standing 3D Mascot Header (No box container!) */}
                                    <div className="relative w-full h-[155px] sm:h-[165px] shrink-0">
                                        <Image
                                            src="/banners/onbording-3.png"
                                            alt="Welcome to InTrust Mascot with Coin"
                                            fill
                                            priority
                                            className="object-contain object-center pointer-events-none"
                                            sizes="(max-width: 430px) 400px"
                                        />
                                    </div>

                                    {/* Floating Welcome Bonus Card */}
                                    <div className="p-2.5 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl text-center shadow-xs">
                                        <div className="flex items-center justify-center gap-1 text-[9.5px] font-black uppercase tracking-wider text-[#0052FF] dark:text-sky-400">
                                            <Gift size={11} />
                                            <span>WELCOME BONUS</span>
                                        </div>
                                        <div className="text-xl font-black text-slate-900 dark:text-white mt-0.5 leading-none">
                                            ₹50 Coins
                                        </div>
                                        <p className="text-[9.5px] text-slate-500 dark:text-slate-400 mt-0.5 font-medium">
                                            On us, to get you started!
                                        </p>
                                    </div>

                                    {/* Heading */}
                                    <div className="text-left pt-0.5">
                                        <h3 className="text-sm font-black text-slate-900 dark:text-white leading-tight">
                                            Just a few more details
                                        </h3>
                                        <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400 mt-0.5">
                                            This helps us personalize your experience and serve you better.
                                        </p>
                                    </div>

                                    {/* Referral Code Field */}
                                    <div className="space-y-0.5">
                                        <label className="block text-[10px] font-bold text-slate-700 dark:text-slate-300">
                                            Referral code (Optional)
                                        </label>
                                        <div className="flex items-center gap-2 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-1.5 bg-white dark:bg-slate-900/80 focus-within:border-[#0052FF] transition-all">
                                            <Gift size={14} className="text-slate-400 shrink-0" />
                                            <input
                                                type="text"
                                                value={referralCode}
                                                onChange={(e) => {
                                                    setReferralCode(e.target.value.toUpperCase());
                                                    setReferralApplied(false);
                                                }}
                                                placeholder="Enter referral code"
                                                className="flex-1 text-[11px] font-semibold outline-none bg-transparent placeholder:text-slate-400 placeholder:font-normal uppercase"
                                            />
                                            <button
                                                type="button"
                                                onClick={handleApplyReferral}
                                                disabled={!referralCode.trim() || referralApplied}
                                                className={`px-2.5 py-0.5 rounded-lg text-[10.5px] font-bold transition-all ${
                                                    referralApplied
                                                        ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400'
                                                        : 'bg-blue-50 text-[#0052FF] hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400 cursor-pointer'
                                                }`}
                                            >
                                                {referralApplied ? 'Applied' : 'Apply'}
                                            </button>
                                        </div>
                                    </div>

                                    {/* Occupation Dropdown */}
                                    <div className="space-y-0.5">
                                        <label className="block text-[10px] font-bold text-slate-700 dark:text-slate-300">
                                            What best describes you? (Optional)
                                        </label>
                                        <div className="relative flex items-center border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-1.5 bg-white dark:bg-slate-900/80">
                                            <Briefcase size={14} className="text-slate-400 shrink-0 mr-2" />
                                            <select
                                                value={occupation}
                                                onChange={(e) => setOccupation(e.target.value)}
                                                className="w-full text-[11px] font-medium text-slate-800 dark:text-slate-200 bg-transparent outline-none cursor-pointer appearance-none pr-6"
                                            >
                                                <option value="" className="text-slate-400">Select your occupation</option>
                                                {OCCUPATION_OPTIONS.map((occ) => (
                                                    <option key={occ} value={occ} className="text-slate-900 dark:text-white dark:bg-slate-900">
                                                        {occ}
                                                    </option>
                                                ))}
                                            </select>
                                            <ChevronDown size={13} className="text-slate-400 absolute right-3 pointer-events-none" />
                                        </div>
                                    </div>

                                    {/* Discovery Source */}
                                    <div className="space-y-1">
                                        <label className="block text-[10px] font-bold text-slate-700 dark:text-slate-300">
                                            Where did you hear about InTrust?
                                        </label>
                                        <div className="grid grid-cols-2 gap-1.5">
                                            {SOURCES.map((src) => {
                                                const isSelected = referralSource === src.id;
                                                const Icon = src.icon;

                                                return (
                                                    <button
                                                        key={src.id}
                                                        type="button"
                                                        onClick={() => setReferralSource(src.id)}
                                                        className={`px-2.5 py-1.5 rounded-xl text-[10.5px] font-semibold border flex items-center justify-between gap-1 transition-all cursor-pointer ${
                                                            isSelected
                                                                ? 'border-[#0052FF] bg-blue-50/80 dark:bg-blue-950/30 text-[#0052FF] dark:text-blue-400 font-bold'
                                                                : 'border-slate-200/90 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/40'
                                                        }`}
                                                    >
                                                        <div className="flex items-center gap-1.5 truncate">
                                                            <Icon size={12} className="shrink-0 text-slate-500 dark:text-slate-400" />
                                                            <span className="truncate">{src.label}</span>
                                                        </div>
                                                        {isSelected && (
                                                            <div className="w-3 h-3 rounded-full bg-[#0052FF] text-white flex items-center justify-center shrink-0">
                                                                <Check size={8} strokeWidth={3.5} />
                                                            </div>
                                                        )}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* Privacy Note */}
                                    <div className="flex items-center gap-1.5 text-[9px] text-slate-400 dark:text-slate-500 pt-0.5">
                                        <Lock size={10} className="shrink-0" />
                                        <span>
                                            Your information is safe with us and will only be used to improve your experience.
                                        </span>
                                    </div>

                                    {/* Feedback messages */}
                                    {error && (
                                        <div className="p-1.5 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/40 rounded-xl text-rose-600 dark:text-rose-400 text-[10px] font-medium">
                                            {error}
                                        </div>
                                    )}
                                    {successMessage && (
                                        <div className="p-2 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/40 rounded-xl text-emerald-700 dark:text-emerald-400 text-[11px] font-bold text-center">
                                            {successMessage}
                                        </div>
                                    )}
                                </div>

                                {/* Bottom Controls Bar */}
                                <div className="pt-2 flex items-center justify-between">
                                    <button
                                        type="button"
                                        onClick={() => setStep(2)}
                                        className="text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white flex items-center gap-1 cursor-pointer"
                                    >
                                        <ArrowLeft size={13} />
                                        <span>Back</span>
                                    </button>

                                    {/* Pagination Dots */}
                                    <div className="flex items-center gap-1.5">
                                        <div className="w-1.5 h-1.5 rounded-full bg-slate-200 dark:bg-white/20" />
                                        <div className="w-1.5 h-1.5 rounded-full bg-slate-200 dark:bg-white/20" />
                                        <div className="w-5 h-1.5 rounded-full bg-[#0052FF] transition-all" />
                                    </div>

                                    {!successMessage && (
                                        <button
                                            type="button"
                                            onClick={handleSubmit}
                                            disabled={loading}
                                            className="px-5 py-2.5 bg-[#0052FF] hover:bg-blue-700 active:bg-blue-800 text-white font-bold rounded-2xl transition-all shadow-md shadow-blue-500/25 flex items-center gap-1.5 text-xs cursor-pointer disabled:opacity-50"
                                        >
                                            {loading ? (
                                                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                            ) : (
                                                <>
                                                    <span>Start Exploring</span>
                                                    <ArrowRight size={14} strokeWidth={2.6} />
                                                </>
                                            )}
                                        </button>
                                    )}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </motion.div>
        </div>
    );
}
