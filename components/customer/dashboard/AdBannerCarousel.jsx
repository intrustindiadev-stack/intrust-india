'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Gift, Users, Crown, Zap } from 'lucide-react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';

const banners = [
    {
        id: 1,
        title: 'Flat 20% OFF',
        subtitle: 'On All Gift Cards',
        description: 'Shop top brands at unbeatable prices. Limited time offer!',
        cta: 'Browse Gift Cards',
        href: '/gift-cards',
        icon: Gift,
        bg: 'linear-gradient(135deg, #7C3AED 0%, #4F46E5 50%, #3730A3 100%)',
        glowColor: 'shadow-purple-500/40',
        iconBg: 'bg-white/20',
    },
    {
        id: 2,
        title: 'Refer & Earn',
        subtitle: '₹100 Cashback',
        description: 'Invite friends and earn cashback on every successful referral.',
        cta: 'Start Referring',
        href: '/refer',
        icon: Users,
        bg: 'linear-gradient(135deg, #059669 0%, #0D9488 50%, #0891B2 100%)',
        glowColor: 'shadow-teal-500/40',
        iconBg: 'bg-white/20',
    },
    {
        id: 3,
        title: 'Upgrade to Gold',
        subtitle: 'Exclusive Benefits',
        description: 'Get priority support, extra cashback, and premium perks.',
        cta: 'Go Gold',
        href: '#gold',
        icon: Crown,
        bg: 'linear-gradient(135deg, #D97706 0%, #B45309 50%, #92400E 100%)',
        glowColor: 'shadow-amber-500/40',
        iconBg: 'bg-white/20',
    },
    {
        id: 4,
        title: 'Pay Bills Instantly',
        subtitle: 'Electricity, Fastag & More',
        description: 'Seamless bill payments with wallet balance. Zero hassle.',
        cta: 'Pay Now',
        href: '/services',
        icon: Zap,
        bg: 'linear-gradient(135deg, #E11D48 0%, #DB2777 50%, #A21CAF 100%)',
        glowColor: 'shadow-pink-500/40',
        iconBg: 'bg-white/20',
    },
];

const swipeThreshold = 50;

const slideVariants = {
    enter: (direction) => ({
        x: direction > 0 ? '35%' : '-35%',
        opacity: 0,
    }),
    center: {
        zIndex: 1,
        x: 0,
        opacity: 1,
    },
    exit: (direction) => ({
        zIndex: 0,
        x: direction < 0 ? '35%' : '-35%',
        opacity: 0,
    }),
};

export default function AdBannerCarousel() {
    const [[page, direction], setPage] = useState([0, 0]);
    const [isHovered, setIsHovered] = useState(false);
    const [hasInteracted, setHasInteracted] = useState(false);
    const [dynamicBanners, setDynamicBanners] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchBanners = async () => {
            try {
                const { data, error } = await supabase
                    .from('platform_banners')
                    .select('*')
                    .eq('is_active', true)
                    .eq('audience', 'customer')
                    .order('sort_order', { ascending: true })
                    .order('created_at', { ascending: false });

                if (!error && data) {
                    setDynamicBanners(data);
                }
            } catch (err) {
                console.error("Error fetching dynamic banners:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchBanners();
    }, []);

    // Use dynamic banners if available, else static
    const activeBanners = dynamicBanners.length > 0 ? dynamicBanners : banners;

    const currentIndex = ((page % activeBanners.length) + activeBanners.length) % activeBanners.length;

    const paginate = useCallback((newDirection) => {
        setPage(([prev]) => [prev + newDirection, newDirection]);
    }, []);

    // Auto-play
    useEffect(() => {
        if (isHovered) return;
        const timer = setInterval(() => {
            paginate(1);
        }, 5000);
        return () => clearInterval(timer);
    }, [isHovered, paginate]);

    const banner = activeBanners[currentIndex];
    const isDynamic = dynamicBanners.length > 0;
    const IconComponent = !isDynamic ? banner.icon : null;

    // Skeleton while banners are loading
    if (loading) return (
        <div className="relative w-full mb-6 sm:mb-10">
            <div className="relative w-full rounded-xl sm:rounded-3xl overflow-hidden" style={{ aspectRatio: '16/9' }}>
                <div className="absolute inset-0 bg-gradient-to-r from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-800 animate-pulse" />
                <div className="absolute inset-0 flex items-center justify-center">
                    <div className="flex flex-col items-center gap-3">
                        <div className="h-4 w-32 bg-white/30 rounded-full" />
                        <div className="h-6 w-48 bg-white/30 rounded-full" />
                        <div className="h-3 w-40 bg-white/20 rounded-full" />
                        <div className="h-8 w-28 bg-white/30 rounded-xl mt-2" />
                    </div>
                </div>
            </div>
        </div>
    );

    return (
        <div
            className="relative w-full mb-6 sm:mb-10"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            {/* 16:9 aspect-ratio shell — guarantees identical dimensions on all screen sizes */}
            <div
                className={`relative w-full overflow-hidden rounded-xl sm:rounded-3xl shadow-xl ${banner.glowColor} transition-shadow duration-500`}
                style={{ aspectRatio: '16/9' }}
            >
                <AnimatePresence initial={false} custom={direction} mode="wait">
                    <motion.div
                        key={page}
                        custom={direction}
                        variants={slideVariants}
                        initial={hasInteracted ? 'enter' : false}
                        animate="center"
                        exit="exit"
                        transition={{
                            x: { type: 'tween', duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] },
                            opacity: { duration: 0.25 },
                        }}
                        drag="x"
                        dragConstraints={{ left: 0, right: 0 }}
                        dragElastic={0.2}
                        onDragEnd={(e, { offset }) => {
                            setHasInteracted(true);
                            if (offset.x < -swipeThreshold) {
                                paginate(1);
                            } else if (offset.x > swipeThreshold) {
                                paginate(-1);
                            }
                        }}
                        className="absolute inset-0 cursor-grab active:cursor-grabbing"
                        style={{ background: banner.bg, touchAction: 'pan-y' }}
                    >
                        {isDynamic ? (
                            // Dynamic Image Render — fills the 16:9 box completely
                            <Link href={banner.target_url || '#'} className="absolute inset-0">
                                <img
                                    src={banner.image_url}
                                    alt={banner.title}
                                    className="w-full h-full object-cover"
                                />
                            </Link>
                        ) : (
                            // Static Render — absolutely positioned inside the 16:9 box
                            <>
                                {/* Decorative Elements */}
                                <div className="absolute top-0 right-0 w-40 h-40 sm:w-64 sm:h-64 rounded-full opacity-20 blur-3xl pointer-events-none"
                                    style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.3) 0%, transparent 70%)' }}
                                />
                                <div className="absolute bottom-0 left-0 w-32 h-32 sm:w-48 sm:h-48 rounded-full opacity-10 blur-2xl pointer-events-none"
                                    style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.4) 0%, transparent 70%)' }}
                                />

                                {/* Floating shapes */}
                                <div className="absolute top-4 right-8 w-2 h-2 bg-white/20 rounded-full animate-pulse" />
                                <div className="absolute top-12 right-16 w-1.5 h-1.5 bg-white/15 rounded-full animate-pulse delay-300" />
                                <div className="absolute bottom-8 right-12 w-3 h-3 bg-white/10 rounded-full animate-pulse delay-700" />

                                {/* Content — fills absolute 16:9 container */}
                                <div className="absolute inset-0 z-10 flex items-center justify-between p-4 sm:p-8 lg:p-10">
                                    <div className="flex-1 pr-2 sm:pr-4">
                                        <div className="flex items-center gap-2 mb-1.5 sm:mb-2">
                                            <span className="text-[9px] sm:text-xs font-bold uppercase tracking-[0.15em] text-white/80 bg-white/10 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full backdrop-blur-sm">
                                                {banner.subtitle}
                                            </span>
                                        </div>
                                        <h3 className="text-lg sm:text-3xl lg:text-4xl font-black text-white mb-1 sm:mb-2 tracking-tight leading-tight">
                                            {banner.title}
                                        </h3>
                                        <p className="text-white/70 text-[11px] sm:text-sm lg:text-base mb-2.5 sm:mb-5 max-w-md leading-relaxed line-clamp-2">
                                            {banner.description}
                                        </p>
                                        <Link
                                            href={banner.href}
                                            className="inline-flex items-center gap-1.5 sm:gap-2 bg-white/20 hover:bg-white/30 active:bg-white/40 backdrop-blur-md text-white text-[11px] sm:text-sm font-bold py-2 px-4 sm:py-3 sm:px-6 rounded-lg sm:rounded-xl transition-all duration-200 border border-white/20 shadow-lg"
                                        >
                                            {banner.cta}
                                            <ChevronRight size={12} className="sm:w-3.5 sm:h-3.5" />
                                        </Link>
                                    </div>

                                    {/* Icon */}
                                    <div className={`flex items-center justify-center w-12 h-12 sm:w-20 sm:h-20 lg:w-28 lg:h-28 rounded-xl sm:rounded-2xl lg:rounded-3xl ${banner.iconBg} backdrop-blur-sm border border-white/10 shadow-2xl flex-shrink-0`}>
                                        <IconComponent className="w-6 h-6 sm:w-10 sm:h-10 lg:w-14 lg:h-14 text-white/90" strokeWidth={1.5} />
                                    </div>
                                </div>
                            </>
                        )}
                    </motion.div>
                </AnimatePresence>

                {/* Navigation Arrows */}
                <button
                    onClick={() => { setHasInteracted(true); paginate(-1); }}
                    className="absolute left-1.5 sm:left-3 top-1/2 -translate-y-1/2 z-20 bg-black/25 hover:bg-black/45 active:bg-black/60 backdrop-blur-md text-white p-1 sm:p-2 rounded-full transition-all duration-200 hover:scale-110 border border-white/10 hidden sm:flex"
                    aria-label="Previous banner"
                >
                    <ChevronLeft size={18} />
                </button>
                <button
                    onClick={() => { setHasInteracted(true); paginate(1); }}
                    className="absolute right-1.5 sm:right-3 top-1/2 -translate-y-1/2 z-20 bg-black/25 hover:bg-black/45 active:bg-black/60 backdrop-blur-md text-white p-1 sm:p-2 rounded-full transition-all duration-200 hover:scale-110 border border-white/10 hidden sm:flex"
                    aria-label="Next banner"
                >
                    <ChevronRight size={18} />
                </button>
            </div>

            {/* Dots Indicator */}
            <div className="flex items-center justify-center gap-1.5 sm:gap-2 mt-2.5 sm:mt-4">
                {activeBanners.map((_, index) => (
                    <button
                        key={index}
                        onClick={() => {
                            setHasInteracted(true);
                            const newDirection = index > currentIndex ? 1 : -1;
                            setPage([index, newDirection]);
                        }}
                        className={`transition-all duration-300 rounded-full ${index === currentIndex
                            ? 'w-5 sm:w-8 h-[6px] sm:h-2.5 bg-gradient-to-r from-indigo-500 to-purple-500 shadow-sm shadow-indigo-500/30'
                            : 'w-[6px] sm:w-2.5 h-[6px] sm:h-2.5 bg-slate-300 dark:bg-slate-600 hover:bg-slate-400 dark:hover:bg-slate-500'
                            }`}
                        aria-label={`Go to banner ${index + 1}`}
                    />
                ))}
            </div>
        </div>
    );
}
