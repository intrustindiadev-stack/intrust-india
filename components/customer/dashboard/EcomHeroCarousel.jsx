'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, ChevronLeft, Sparkles, ArrowRight } from 'lucide-react';

export const DEFAULT_SLIDES = [
    {
        id: 'official-brands',
        title: 'Top Brands. Unmatched Value.',
        subtitle: 'Shop your trusted brands — Apple, Adidas, DMart, IndiaMART, Samsung & more directly on InTrust India',
        tag: 'TOP BRANDS',
        badge: '100% Genuine',
        ctaText: 'Explore Brands',
        ctaHref: '/shop',
        image: '/banners/banner_official_brands_v2.jpeg',
    },
    {
        id: 'mart-deals',
        title: 'Top Brands, Best Deals - Up to 70% Off',
        subtitle: 'Shop your favourite electronics, fashion and essentials on InTrust Mart',
        tag: 'INTRUST MART',
        badge: 'Up to 70% Off',
        ctaText: 'Shop Now',
        ctaHref: '/shop',
        image: '/banners/banner_intrust_mart_deals_v2.jpeg',
    },
    {
        id: 'digital-wallet',
        title: 'Pay. Save. Do More.',
        subtitle: 'Faster, safer and smarter way to manage your money with InTrust Wallet',
        tag: 'DIGITAL WALLET',
        badge: 'Instant Rewards',
        ctaText: 'Activate Wallet',
        ctaHref: '/wallet',
        image: '/banners/banner_wallet_pay_save_v2.jpeg',
    },
    {
        id: 'solar-square',
        title: 'A Greener Brighter Tomorrow',
        subtitle: 'InTrust India partners with SolarSquare for clean energy solutions',
        tag: 'CLEAN ENERGY PARTNERSHIP',
        badge: 'Cost Savings',
        ctaText: 'Explore Solar',
        ctaHref: '/services',
        image: '/banners/banner_solarsquare_v2.jpeg',
    },
    {
        id: 'rewards-offers',
        title: 'Earn Real Cashback On Every Spend.',
        subtitle: 'Unlock scratch cards, double reward coins, and exclusive merchant discounts every day',
        tag: 'CASHBACK & REWARDS',
        badge: 'Instant Cashback',
        ctaText: 'Claim Rewards',
        ctaHref: '/rewards',
        image: '/banners/banner_rewards_offers_v2.jpeg',
    }
];

const swipeConfidenceThreshold = 10000;
const swipePower = (offset, velocity) => {
    return Math.abs(offset) * velocity;
};

const slideVariants = {
    enter: (direction) => ({
        zIndex: 2,
        opacity: 0,
        x: direction > 0 ? 60 : -60,
        scale: 1.015,
    }),
    center: {
        zIndex: 2,
        opacity: 1,
        x: 0,
        scale: 1,
        transition: {
            opacity: { duration: 0.4, ease: [0.25, 1, 0.5, 1] },
            x: { duration: 0.45, ease: [0.25, 1, 0.5, 1] },
            scale: { duration: 0.45, ease: [0.25, 1, 0.5, 1] }
        }
    },
    exit: (direction) => ({
        zIndex: 1,
        opacity: 0,
        x: direction > 0 ? -40 : 40,
        scale: 0.985,
        transition: {
            opacity: { duration: 0.35, ease: 'easeIn' },
            x: { duration: 0.4, ease: [0.25, 1, 0.5, 1] },
            scale: { duration: 0.4, ease: [0.25, 1, 0.5, 1] }
        }
    })
};

function EcomHeroCarousel({ banners = DEFAULT_SLIDES }) {
    const slides = Array.isArray(banners) && banners.length > 0 ? banners : DEFAULT_SLIDES;
    const [[page, direction], setPage] = useState([0, 0]);
    const [isPaused, setIsPaused] = useState(false);

    const safeIdx = ((page % slides.length) + slides.length) % slides.length;
    const slide = slides[safeIdx];

    const paginate = useCallback((newDirection) => {
        setPage(([prevPage]) => [prevPage + newDirection, newDirection]);
    }, []);

    const goToSlide = useCallback((targetIdx) => {
        setPage(([prevPage]) => {
            const currentMod = ((prevPage % slides.length) + slides.length) % slides.length;
            const diff = targetIdx - currentMod;
            return [prevPage + diff, diff >= 0 ? 1 : -1];
        });
    }, [slides.length]);

    useEffect(() => {
        if (slides.length <= 1 || isPaused) return;
        const timer = setInterval(() => {
            paginate(1);
        }, 5000);
        return () => clearInterval(timer);
    }, [slides.length, isPaused, paginate]);

    if (!slide) return null;

    return (
        <div
            className="relative w-full rounded-2xl sm:rounded-3xl overflow-hidden shadow-sm border border-slate-200/80 dark:border-white/10 bg-slate-100 dark:bg-surface-container-lowest group select-none"
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
        >
            <div className="relative w-full aspect-[16/9] overflow-hidden bg-slate-900/5 dark:bg-black/30">
                <AnimatePresence initial={false} custom={direction}>
                    <motion.div
                        key={page}
                        custom={direction}
                        variants={slideVariants}
                        initial="enter"
                        animate="center"
                        exit="exit"
                        drag="x"
                        dragConstraints={{ left: 0, right: 0 }}
                        dragElastic={0.2}
                        onDragEnd={(e, { offset, velocity }) => {
                            const swipe = swipePower(offset.x, velocity.x);
                            if (swipe < -swipeConfidenceThreshold) {
                                paginate(1);
                            } else if (swipe > swipeConfidenceThreshold) {
                                paginate(-1);
                            }
                        }}
                        className="absolute inset-0 w-full h-full flex items-center justify-center cursor-grab active:cursor-grabbing"
                    >
                        <Link
                            href={slide.ctaHref || '/shop'}
                            className="block relative w-full h-full"
                            aria-label={slide.title}
                        >
                            {/* High Resolution Banner Image — 16:9 native aspect ratio for a perfect fit across all screens */}
                            <img
                                src={slide.image}
                                alt={slide.title}
                                className="w-full h-full object-cover object-center pointer-events-none transition-transform duration-500 ease-out group-hover:scale-[1.01]"
                                loading="eager"
                                draggable={false}
                            />
                        </Link>
                    </motion.div>
                </AnimatePresence>
            </div>

            {/* Left Navigation Arrow */}
            {slides.length > 1 && (
                <button
                    type="button"
                    onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        paginate(-1);
                    }}
                    aria-label="Previous Slide"
                    className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-black/40 hover:bg-black/75 text-white backdrop-blur-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 hover:scale-105 shadow-md z-20 border border-white/20 active:scale-95"
                >
                    <ChevronLeft size={20} />
                </button>
            )}

            {/* Right Navigation Arrow */}
            {slides.length > 1 && (
                <button
                    type="button"
                    onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        paginate(1);
                    }}
                    aria-label="Next Slide"
                    className="absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-black/40 hover:bg-black/75 text-white backdrop-blur-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 hover:scale-105 shadow-md z-20 border border-white/20 active:scale-95"
                >
                    <ChevronRight size={20} />
                </button>
            )}

            {/* Indicator Dots */}
            {slides.length > 1 && (
                <div className="absolute bottom-2.5 sm:bottom-4 lg:bottom-5 left-1/2 -translate-x-1/2 flex items-center gap-1.5 sm:gap-2 px-3 py-1 sm:px-3.5 sm:py-1.5 rounded-full bg-black/45 backdrop-blur-md border border-white/20 z-20 shadow-lg">
                    {slides.map((_, idx) => (
                        <button
                            key={idx}
                            type="button"
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                goToSlide(idx);
                            }}
                            aria-label={`Go to slide ${idx + 1}`}
                            className={`h-1.5 sm:h-2 rounded-full transition-all duration-300 cursor-pointer ${
                                idx === safeIdx
                                    ? 'w-6 sm:w-8 bg-white shadow-sm'
                                    : 'w-1.5 sm:w-2 bg-white/40 hover:bg-white/70'
                            }`}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

export default React.memo(EcomHeroCarousel);
