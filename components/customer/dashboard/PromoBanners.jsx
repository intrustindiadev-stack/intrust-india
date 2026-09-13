'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Coins, 
    Flame, 
    Gift, 
    Share2, 
    ChevronRight, 
    ChevronLeft, 
    ArrowUpRight,
    Sparkles 
} from 'lucide-react';
import Link from 'next/link';

const PROMO_SLIDES = [
    {
        id: 'rewards',
        tag: 'Instant Cashback',
        title: 'Earn Real Cash On Every Spend',
        subtitle: 'Guaranteed cashback and instant scratch cards with every wallet transaction.',
        ctaText: 'Claim Cashback',
        href: '/rewards',
        gradient: 'from-emerald-900/90 via-teal-950/80 to-slate-950',
        accentBorder: 'border-emerald-500/30',
        accentGlow: 'bg-emerald-500/20',
        icon: Coins,
        iconColor: 'text-emerald-400',
        badgeBg: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/25',
    },
    {
        id: 'flash-deals',
        tag: 'Top Brands & Deals',
        title: 'Mega Brands: Up to 70% Off',
        subtitle: 'Shop Apple, Adidas, Samsung & verified stores with direct warranty.',
        ctaText: 'Shop Deals',
        href: '/shop',
        gradient: 'from-indigo-950/90 via-violet-950/80 to-slate-950',
        accentBorder: 'border-indigo-500/30',
        accentGlow: 'bg-indigo-500/20',
        icon: Flame,
        iconColor: 'text-indigo-400',
        badgeBg: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/25',
    },
    {
        id: 'gift-cards',
        tag: 'Instant Digital Cards',
        title: '200+ Brand Vouchers',
        subtitle: 'Amazon, Flipkart, Myntra & Reliance with instant wallet cashback.',
        ctaText: 'Get Vouchers',
        href: '/gift-cards',
        gradient: 'from-amber-950/90 via-orange-950/80 to-slate-950',
        accentBorder: 'border-amber-500/30',
        accentGlow: 'bg-amber-500/20',
        icon: Gift,
        iconColor: 'text-amber-400',
        badgeBg: 'bg-amber-500/15 text-amber-300 border-amber-500/25',
    },
    {
        id: 'refer-earn',
        tag: 'Invite & Earn',
        title: 'Invite Friends, Earn Rewards',
        subtitle: 'Share your referral code and earn instant bonuses on their first transaction.',
        ctaText: 'Share & Earn',
        href: '/refer',
        gradient: 'from-cyan-950/90 via-blue-950/80 to-slate-950',
        accentBorder: 'border-cyan-500/30',
        accentGlow: 'bg-cyan-500/20',
        icon: Share2,
        iconColor: 'text-cyan-400',
        badgeBg: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/25',
    }
];

function PromoBanners() {
    const [current, setCurrent] = useState(0);
    const [isPaused, setIsPaused] = useState(false);
    const [direction, setDirection] = useState(1);

    const paginate = useCallback((newDir) => {
        setDirection(newDir);
        setCurrent((prev) => (prev + newDir + PROMO_SLIDES.length) % PROMO_SLIDES.length);
    }, []);

    useEffect(() => {
        if (isPaused) return;
        const timer = setInterval(() => {
            paginate(1);
        }, 5500);
        return () => clearInterval(timer);
    }, [isPaused, paginate]);

    const slide = PROMO_SLIDES[current];
    const Icon = slide.icon;

    return (
        <div
            className="w-full relative h-[165px] sm:h-[185px] rounded-3xl overflow-hidden shadow-lg group select-none border border-slate-200/80 dark:border-white/10"
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
        >
            <AnimatePresence initial={false} custom={direction} mode="wait">
                <motion.div
                    key={slide.id}
                    initial={{ opacity: 0, x: direction * 40 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: direction * -40 }}
                    transition={{ duration: 0.35, ease: 'easeOut' }}
                    className={`absolute inset-0 bg-gradient-to-br ${slide.gradient} p-5 sm:p-7 flex flex-col justify-between overflow-hidden text-white`}
                >
                    {/* Ambient Glow */}
                    <div className={`absolute -right-8 -top-8 w-44 h-44 rounded-full blur-3xl pointer-events-none ${slide.accentGlow}`} />
                    <div className="absolute -left-8 -bottom-8 w-40 h-40 bg-white/5 rounded-full blur-2xl pointer-events-none" />

                    {/* Decorative 3D Icon Accent */}
                    <motion.div 
                        animate={{ y: [0, -6, 0] }}
                        transition={{ repeat: Infinity, duration: 4, ease: 'easeInOut' }}
                        className="absolute right-4 sm:right-8 top-1/2 -translate-y-1/2 pointer-events-none opacity-25 group-hover:opacity-40 transition-opacity duration-300"
                    >
                        <Icon size={110} className={slide.iconColor} strokeWidth={1.2} />
                    </motion.div>

                    {/* Content Section */}
                    <div className="relative z-10 space-y-1.5 max-w-md">
                        <div className="flex items-center gap-2">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${slide.badgeBg}`}>
                                <Sparkles size={10} />
                                {slide.tag}
                            </span>
                        </div>

                        <h3 className="text-lg sm:text-2xl font-black tracking-tight text-white leading-tight">
                            {slide.title}
                        </h3>

                        <p className="text-xs sm:text-sm font-medium text-slate-300/90 line-clamp-1 leading-snug">
                            {slide.subtitle}
                        </p>
                    </div>

                    {/* Interactive CTA Link */}
                    <div className="relative z-10 flex items-center justify-between pt-1">
                        <Link
                            href={slide.href}
                            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white text-slate-900 hover:bg-white/90 text-xs font-black shadow-md hover:scale-105 active:scale-95 transition-all duration-200 group/btn"
                        >
                            <span>{slide.ctaText}</span>
                            <ArrowUpRight size={14} className="group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5 transition-transform" />
                        </Link>

                        {/* Interactive Pagination Indicators */}
                        <div className="flex items-center gap-1.5">
                            {PROMO_SLIDES.map((s, idx) => (
                                <button
                                    key={s.id}
                                    type="button"
                                    onClick={() => {
                                        setDirection(idx > current ? 1 : -1);
                                        setCurrent(idx);
                                    }}
                                    aria-label={`Go to slide ${idx + 1}`}
                                    className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${
                                        current === idx ? 'w-5 bg-white' : 'w-1.5 bg-white/35 hover:bg-white/60'
                                    }`}
                                />
                            ))}
                        </div>
                    </div>
                </motion.div>
            </AnimatePresence>

            {/* Quick Left / Right Controls on Hover */}
            <button
                type="button"
                onClick={() => paginate(-1)}
                aria-label="Previous promo"
                className="absolute left-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/40 hover:bg-black/70 text-white backdrop-blur-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 border border-white/10 z-20 active:scale-90"
            >
                <ChevronLeft size={16} />
            </button>
            <button
                type="button"
                onClick={() => paginate(1)}
                aria-label="Next promo"
                className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/40 hover:bg-black/70 text-white backdrop-blur-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 border border-white/10 z-20 active:scale-90"
            >
                <ChevronRight size={16} />
            </button>
        </div>
    );
}

export default React.memo(PromoBanners);
