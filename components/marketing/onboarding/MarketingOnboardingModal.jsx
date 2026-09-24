'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import { 
    ChevronRight, 
    ChevronLeft, 
    ShoppingBag, 
    Trophy, 
    ShieldCheck, 
    Gift, 
    Sparkles, 
    CheckCircle2,
    Megaphone
} from 'lucide-react';

const SLIDES = [
    {
        id: 'earn',
        tag: 'Step 1 • Product Marketing',
        tagColor: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800',
        title: 'Promote Products & Earn Direct Cashback',
        illustration: '/images/onboarding/product_marketing_earn.jpg',
        illustrationAlt: 'Promote Products & Earn Instant Cashback',
        description: 'Share exclusive merchant deals, electronics, groceries, and daily essentials with your network. Every time someone buys through your recommendation, instant promotional cashback credits to your InTrust wallet.',
        accentGradient: 'from-blue-600 to-indigo-600',
        icon: ShoppingBag,
        iconBg: 'bg-blue-500/10 text-blue-600',
        bulletPoints: [
            'Instant real-time wallet credits on successful orders',
            'Zero commission deductions or hidden platform fees',
            'Track clicks, views, and conversions on your Analytics page'
        ]
    },
    {
        id: 'challenge_freeze',
        tag: 'Step 2 • Daily Trivia & Streak Freeze',
        tagColor: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800',
        title: 'Daily Challenge & Automatic Streak Shield',
        illustration: '/images/onboarding/daily_trivia_streak.jpg',
        illustrationAlt: 'Daily Trivia Challenge & Streak Shield',
        description: 'Play a quick 10-question trivia quiz every morning. Answer correctly to pocket cash bonuses and grow your daily streak multiplier.',
        accentGradient: 'from-amber-500 to-orange-600',
        icon: Trophy,
        iconBg: 'bg-amber-500/10 text-amber-600',
        bulletPoints: [
            '10 daily questions testing trade, finance, and general knowledge',
            '1 Free Streak Freeze renewed on the 1st of every month',
            'Auto-Shielding: If you miss a day, your freeze deploys automatically to preserve your streak'
        ]
    },
    {
        id: 'mystery_boxes',
        tag: 'Step 3 • Milestone Mystery Crates',
        tagColor: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800',
        title: 'Dynamic Milestone Mystery Crates',
        illustration: '/images/onboarding/mystery_targets_prizes.jpg',
        illustrationAlt: 'Win Bulk Electronics, Appliances & Groceries',
        description: 'Hit performance milestones and level up your marketing score to reveal mystery prize crates. Win real 4K TVs, latest smartphones, gaming consoles, smart appliances, and luxury grocery hampers!',
        accentGradient: 'from-emerald-500 to-teal-600',
        icon: Gift,
        iconBg: 'bg-emerald-500/10 text-emerald-600',
        bulletPoints: [
            'Win real bulk electronics, gadgets, appliances & luxury grocery hampers',
            'Prizes are revealed directly upon claiming without confusing tiers',
            'Delivered seamlessly straight to your registered delivery address'
        ]
    },
    {
        id: 'sponsor_gst',
        tag: 'Step 4 • Merchant VIP Sponsorship',
        tagColor: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800',
        title: 'Sponsor Daily Challenge with 18% GST Billing',
        illustration: '/images/onboarding/merchant_sponsorship_billboard.jpg',
        illustrationAlt: 'Merchant VIP Sponsorship Spotlight',
        description: 'Merchants can sponsor the Daily Challenge to place their store and hero products in front of thousands of active shoppers across India.',
        accentGradient: 'from-purple-600 to-pink-600',
        icon: Megaphone,
        iconBg: 'bg-purple-500/10 text-purple-600',
        bulletPoints: [
            'Exclusive Billboard Spotlight at the top of the Quiz Arena',
            'Official GST Tax Invoice (SAC 998365) with 18% GST itemized breakdown',
            'Instant printable and downloadable compliance tax receipts'
        ]
    }
];

const STORAGE_KEY = 'intrust_marketing_tour_seen_v1';

export default function MarketingOnboardingModal({ isOpen: controlledIsOpen, onClose: controlledOnClose }) {
    const [mounted, setMounted] = useState(false);
    const [internalOpen, setInternalOpen] = useState(false);
    const [currentSlide, setCurrentSlide] = useState(0);

    const isControlled = controlledIsOpen !== undefined;
    const open = isControlled ? controlledIsOpen : internalOpen;

    useEffect(() => {
        setMounted(true);
    }, []);

    // Check localStorage on mount if unmanaged
    useEffect(() => {
        if (!isControlled) {
            const seen = localStorage.getItem(STORAGE_KEY);
            if (!seen) {
                const timer = setTimeout(() => {
                    setInternalOpen(true);
                }, 800);
                return () => clearTimeout(timer);
            }
        }
    }, [isControlled]);

    // Listen for custom global event to open tour anytime
    useEffect(() => {
        const handleOpenTour = () => {
            setCurrentSlide(0);
            if (isControlled && controlledOnClose) {
                // let parent handle if controlled
            } else {
                setInternalOpen(true);
            }
        };

        window.addEventListener('open-marketing-onboarding', handleOpenTour);
        return () => window.removeEventListener('open-marketing-onboarding', handleOpenTour);
    }, [isControlled, controlledOnClose]);

    // Prevent body scroll when open
    useEffect(() => {
        if (open) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [open]);

    const handleClose = () => {
        try { localStorage.setItem(STORAGE_KEY, 'true'); } catch (_) {}
        if (isControlled) {
            controlledOnClose?.();
        } else {
            setInternalOpen(false);
        }
    };

    const handleNext = () => {
        if (currentSlide < SLIDES.length - 1) {
            setCurrentSlide(prev => prev + 1);
        } else {
            handleClose();
        }
    };

    const handlePrev = () => {
        if (currentSlide > 0) {
            setCurrentSlide(prev => prev - 1);
        }
    };

    if (!open || !mounted || typeof document === 'undefined') return null;

    const slide = SLIDES[currentSlide];
    const SlideIcon = slide.icon;
    const isLastSlide = currentSlide === SLIDES.length - 1;

    const modalContent = (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-0 sm:p-4">
            {/* Backdrop — non-dismissible per onboarding completion requirement */}
            <div 
                className="fixed inset-0 bg-slate-950/75 backdrop-blur-md transition-opacity"
            />

            {/* Modal Container: Fullscreen 100dvh on mobile, clean modal card on desktop */}
            <div className="relative w-full h-[100dvh] sm:h-auto sm:max-h-[90vh] sm:max-w-xl bg-white dark:bg-slate-900 sm:rounded-3xl shadow-2xl border-0 sm:border border-slate-200/80 dark:border-slate-800 flex flex-col z-10 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                {/* Header with Step indicator — NO X/CLOSE BUTTON */}
                <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50 shrink-0">
                    <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-pulse" />
                        <span className="text-[11px] font-black text-slate-800 dark:text-slate-200 uppercase tracking-widest">
                            InTrust Guide • Slide {currentSlide + 1} of {SLIDES.length}
                        </span>
                    </div>

                    <div className="flex items-center gap-2">
                        <span className="px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-black">
                            Step {currentSlide + 1}/{SLIDES.length}
                        </span>
                    </div>
                </div>

                {/* Body Content with Slide Animation */}
                <div className="flex-1 overflow-y-auto px-5 sm:px-8 py-6 sm:py-8 flex flex-col justify-between">
                    <div>
                        {/* Tag Pill */}
                        <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-extrabold border mb-4 shadow-2xs ${slide.tagColor}`}>
                            <Sparkles size={13} />
                            <span>{slide.tag}</span>
                        </div>

                        {/* Slide Illustration Showcase Card */}
                        {slide.illustration && (
                            <div className="relative w-full h-44 sm:h-52 rounded-2xl overflow-hidden shadow-md border border-slate-200/80 dark:border-slate-800 mb-5 bg-slate-100 dark:bg-slate-800 group">
                                <Image
                                    src={slide.illustration}
                                    alt={slide.illustrationAlt || slide.title}
                                    fill
                                    sizes="(max-width: 640px) 100vw, 550px"
                                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                                    priority={currentSlide === 0}
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent pointer-events-none" />
                                <div className="absolute bottom-2.5 left-3 right-3 flex items-center justify-between text-white text-[11px] font-bold drop-shadow">
                                    <span className="flex items-center gap-1 bg-black/45 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/20">
                                        <Sparkles size={11} className="text-amber-300" />
                                        {slide.tag}
                                    </span>
                                </div>
                            </div>
                        )}

                        {/* Slide Icon Presentation */}
                        <div className="flex items-center gap-3.5 mb-4">
                            <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center shrink-0 border border-slate-200/80 dark:border-slate-700 shadow-xs ${slide.iconBg}`}>
                                <SlideIcon size={24} className="sm:w-7 sm:h-7" />
                            </div>
                            <div>
                                <h2 className="text-base sm:text-lg md:text-xl font-black text-slate-900 dark:text-white leading-snug">
                                    {slide.title}
                                </h2>
                            </div>
                        </div>

                        {/* Description */}
                        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 font-medium leading-relaxed mb-5">
                            {slide.description}
                        </p>

                        {/* Key Benefits / Highlights Box */}
                        <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60 rounded-2xl p-4 space-y-2.5">
                            <div className="text-[10px] font-black text-slate-400 dark:text-slate-400 uppercase tracking-widest">
                                How it works
                            </div>
                            {slide.bulletPoints.map((point, idx) => (
                                <div key={idx} className="flex items-start gap-2.5">
                                    <div className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                                        <CheckCircle2 size={13} strokeWidth={3} />
                                    </div>
                                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 leading-snug">
                                        {point}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Streak Freeze Visual Callout for Slide 2 */}
                    {slide.id === 'challenge_freeze' && (
                        <div className="mt-4 p-3 rounded-xl bg-blue-50/80 border border-blue-200/60 flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0">
                                <ShieldCheck size={18} />
                            </div>
                            <div className="text-[11px] font-medium text-blue-900 leading-tight">
                                <strong className="font-extrabold text-blue-950">Streak Shield Active:</strong> Your free monthly freeze is ready. Miss a day worry-free!
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer Navigation Bar */}
                <div className="px-5 sm:px-8 py-4 sm:py-5 border-t border-slate-100 bg-slate-50/80 flex items-center justify-between shrink-0">
                    {/* Dots indicator */}
                    <div className="flex items-center gap-1.5">
                        {SLIDES.map((_, idx) => (
                            <button
                                key={idx}
                                onClick={() => setCurrentSlide(idx)}
                                aria-label={`Go to slide ${idx + 1}`}
                                className={`h-2 rounded-full transition-all ${
                                    idx === currentSlide 
                                        ? 'w-6 bg-blue-600' 
                                        : 'w-2 bg-slate-300 hover:bg-slate-400'
                                }`}
                            />
                        ))}
                    </div>

                    {/* Next / Back Buttons */}
                    <div className="flex items-center gap-2">
                        {currentSlide > 0 && (
                            <button
                                onClick={handlePrev}
                                className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors flex items-center gap-1"
                            >
                                <ChevronLeft size={16} />
                                <span className="hidden sm:inline">Back</span>
                            </button>
                        )}

                        <button
                            onClick={handleNext}
                            className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-98 text-white text-xs font-black shadow-md shadow-blue-500/25 transition-all flex items-center gap-1.5 cursor-pointer"
                        >
                            <span>{isLastSlide ? 'Finish & Get Started' : 'Next'}</span>
                            {isLastSlide ? <CheckCircle2 size={15} /> : <ChevronRight size={16} />}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );

    return createPortal(modalContent, document.body);
}
