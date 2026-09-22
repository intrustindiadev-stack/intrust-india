'use client';

import { useState, useEffect } from 'react';
import { 
    X, 
    ChevronRight, 
    ChevronLeft, 
    ShoppingBag, 
    Trophy, 
    ShieldCheck, 
    Gift, 
    Megaphone, 
    FileText, 
    Sparkles, 
    Flame, 
    CheckCircle2, 
    HelpCircle,
    ArrowRight
} from 'lucide-react';

const SLIDES = [
    {
        id: 'earn',
        tag: 'Step 1 • Product Marketing',
        tagColor: 'bg-blue-50 text-blue-700 border-blue-200',
        title: 'Promote Products & Earn Direct Cashback',
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
        tagColor: 'bg-amber-50 text-amber-700 border-amber-200',
        title: 'Daily Challenge & Automatic Streak Shield',
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
        tagColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        title: 'Dynamic Milestone Mystery Crates',
        description: 'Hit performance milestones and level up your marketing score to reveal mystery prize crates. Surprise drops include executive gadgets, premium accessories, and special milestone cash drops.',
        accentGradient: 'from-emerald-500 to-teal-600',
        icon: Gift,
        iconBg: 'bg-emerald-500/10 text-emerald-600',
        bulletPoints: [
            'Mystery drops unlock as you achieve referral and sales volume targets',
            'Prizes are revealed directly upon claiming without confusing tiers',
            'Delivered seamlessly straight to your registered delivery address'
        ]
    },
    {
        id: 'sponsor_gst',
        tag: 'Step 4 • Merchant VIP Sponsorship',
        tagColor: 'bg-purple-50 text-purple-700 border-purple-200',
        title: 'Sponsor Daily Challenge with 18% GST Billing',
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
    const [internalOpen, setInternalOpen] = useState(false);
    const [currentSlide, setCurrentSlide] = useState(0);

    const isControlled = controlledIsOpen !== undefined;
    const open = isControlled ? controlledIsOpen : internalOpen;

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
        localStorage.setItem(STORAGE_KEY, 'true');
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

    if (!open) return null;

    const slide = SLIDES[currentSlide];
    const SlideIcon = slide.icon;
    const isLastSlide = currentSlide === SLIDES.length - 1;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
            {/* Backdrop */}
            <div 
                className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
                onClick={handleClose}
            />

            {/* Modal Container: Fullscreen 100dvh on mobile, clean modal card on desktop */}
            <div className="relative w-full h-[100dvh] sm:h-auto sm:max-h-[90vh] sm:max-w-xl bg-white sm:rounded-3xl shadow-2xl border-0 sm:border border-slate-200/80 flex flex-col z-10 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                {/* Header with Step indicator and Skip/Close */}
                <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-slate-100 bg-slate-50/70 shrink-0">
                    <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
                        <span className="text-[11px] font-black text-slate-700 uppercase tracking-widest">
                            InTrust Guide • Slide {currentSlide + 1} of {SLIDES.length}
                        </span>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleClose}
                            className="w-8 h-8 rounded-full bg-slate-200/70 hover:bg-slate-200 flex items-center justify-center text-slate-600 transition-colors"
                            aria-label="Close Guide"
                        >
                            <X size={16} />
                        </button>
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

                        {/* Slide Icon Presentation */}
                        <div className="flex items-center gap-4 mb-5">
                            <div className={`w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center shrink-0 border border-slate-200/80 shadow-xs ${slide.iconBg}`}>
                                <SlideIcon size={28} className="sm:w-8 sm:h-8" />
                            </div>
                            <div>
                                <h2 className="text-lg sm:text-xl font-black text-slate-900 leading-snug">
                                    {slide.title}
                                </h2>
                            </div>
                        </div>

                        {/* Description */}
                        <p className="text-xs sm:text-sm text-slate-600 font-medium leading-relaxed mb-6">
                            {slide.description}
                        </p>

                        {/* Key Benefits / Highlights Box */}
                        <div className="bg-slate-50 border border-slate-200/70 rounded-2xl p-4 space-y-3">
                            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                How it works
                            </div>
                            {slide.bulletPoints.map((point, idx) => (
                                <div key={idx} className="flex items-start gap-2.5">
                                    <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
                                        <CheckCircle2 size={13} strokeWidth={3} />
                                    </div>
                                    <span className="text-xs font-semibold text-slate-700 leading-snug">
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
                            className="px-5 py-2 sm:py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-98 text-white text-xs font-black shadow-md shadow-blue-500/25 transition-all flex items-center gap-1.5"
                        >
                            <span>{isLastSlide ? 'Get Started' : 'Next'}</span>
                            {isLastSlide ? <CheckCircle2 size={15} /> : <ChevronRight size={16} />}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
