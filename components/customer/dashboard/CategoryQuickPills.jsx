'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { 
    LayoutGrid,
    ShoppingCart,
    Gift,
    CreditCard,
    Wallet,
    ChevronRight, 
    ChevronLeft,
    Sparkles 
} from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { getCategorySlug, getCategoryIcon, getCategoryImage } from '@/lib/shopping/categories';

// ── 1. Top Circular Quick Action Items (Matching Reference Mock) ──
const CIRCLE_QUICK_ACTIONS = [
    {
        id: 'categories',
        label: 'Categories',
        icon: LayoutGrid,
        gradient: 'from-blue-600 to-indigo-600 shadow-blue-500/25',
        href: '/shop/category',
    },
    {
        id: 'mart',
        label: 'InTrust Mart',
        icon: ShoppingCart,
        gradient: 'from-rose-500 to-red-600 shadow-rose-500/25',
        href: '/shop',
    },
    {
        id: 'giftcards',
        label: 'Gift Cards',
        icon: Gift,
        gradient: 'from-amber-400 to-amber-600 shadow-amber-500/25',
        href: '/gift-cards',
    },
    {
        id: 'nfc',
        label: 'NFC Cards',
        icon: CreditCard,
        gradient: 'from-emerald-500 to-teal-600 shadow-emerald-500/25',
        href: '/services',
    },
    {
        id: 'wallet',
        label: 'Wallet',
        icon: Wallet,
        gradient: 'from-cyan-500 to-blue-600 shadow-cyan-500/25',
        href: '/wallet',
    },
];

// ── 2. Curated Categories for the Minimal Slider ──
const DEFAULT_CATEGORIES = [
    { label: 'Mobiles', slug: 'mobiles', image: getCategoryImage('mobiles') },
    { label: 'Electronics', slug: 'electronics', image: getCategoryImage('electronics') },
    { label: 'Fashion', slug: 'fashion', image: getCategoryImage('fashion') },
    { label: 'Home & Living', slug: 'home', image: getCategoryImage('home') },
    { label: 'Beauty & Care', slug: 'beauty', image: getCategoryImage('beauty') },
    { label: 'Groceries', slug: 'groceries', image: getCategoryImage('groceries') },
    { label: 'Sports & Fitness', slug: 'sports', image: getCategoryImage('sports') },
    { label: 'Solar Tech', slug: 'solar', image: getCategoryImage('solar') },
    { label: 'Health & Care', slug: 'health', image: getCategoryImage('health') },
    { label: 'Tools & Hardware', slug: 'tools', image: getCategoryImage('tools') },
];

function CategoryQuickPills() {
    const [categories, setCategories] = useState(DEFAULT_CATEGORIES);
    const sliderRef = useRef(null);
    const [canScrollLeft, setCanScrollLeft] = useState(false);
    const [canScrollRight, setCanScrollRight] = useState(true);

    const updateScrollButtons = () => {
        if (!sliderRef.current) return;
        const { scrollLeft, scrollWidth, clientWidth } = sliderRef.current;
        setCanScrollLeft(scrollLeft > 10);
        setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
    };

    const handleScroll = (direction) => {
        if (!sliderRef.current) return;
        const scrollAmount = direction === 'left' ? -260 : 260;
        sliderRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    };

    useEffect(() => {
        const fetchCategories = async () => {
            try {
                const { data, error } = await supabase
                    .from('shopping_categories')
                    .select('*')
                    .eq('is_active', true)
                    .order('display_order', { ascending: true });

                if (!error && data && data.length > 0) {
                    const mapped = data.map((cat) => {
                        const slug = getCategorySlug(cat);
                        const label = cat.name || cat.label || slug;
                        const image = cat.image_url || getCategoryImage(cat);
                        const Icon = getCategoryIcon(label);

                        return {
                            id: cat.id,
                            label,
                            slug,
                            href: `/shop/category/${slug}`,
                            image,
                            icon: Icon,
                        };
                    });
                    setCategories(mapped);
                }
            } catch (err) {
                console.error('Error fetching dashboard categories:', err);
            }
        };
        fetchCategories();
    }, []);

    useEffect(() => {
        const el = sliderRef.current;
        if (!el) return;
        updateScrollButtons();
        el.addEventListener('scroll', updateScrollButtons, { passive: true });
        return () => el.removeEventListener('scroll', updateScrollButtons);
    }, [categories]);

    return (
        <section className="w-full space-y-4">
            {/* ── SECTION 1: Premium Circle Action Icons (No Ellipsis Clipping) ── */}
            <div className="w-full bg-surface-container-lowest border border-outline-variant/25 rounded-3xl p-3.5 sm:p-5 shadow-xs">
                <div className="grid grid-cols-5 gap-1.5 sm:gap-4 max-w-2xl mx-auto">
                    {CIRCLE_QUICK_ACTIONS.map((item) => {
                        const Icon = item.icon;
                        return (
                            <Link
                                key={item.id}
                                href={item.href}
                                className="flex flex-col items-center gap-1.5 sm:gap-2 group text-center focus:outline-none"
                            >
                                <motion.div
                                    whileHover={{ scale: 1.08, y: -2 }}
                                    whileTap={{ scale: 0.94 }}
                                    className={`w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-gradient-to-br ${item.gradient} flex items-center justify-center text-white shadow-md transition-shadow group-hover:shadow-lg relative overflow-hidden`}
                                >
                                    <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                                    <Icon className="w-5 h-5 sm:w-7 sm:h-7 stroke-[2.2]" />
                                </motion.div>
                                <span className="text-[10px] sm:text-xs font-bold text-on-surface group-hover:text-primary transition-colors text-center leading-tight px-0.5">
                                    {item.label}
                                </span>
                            </Link>
                        );
                    })}
                </div>
            </div>

            {/* ── SECTION 2: Top Categories (Smooth Minimal Slider with Swiper & Left/Right Buttons) ── */}
            <div className="space-y-2.5">
                <div className="flex items-center justify-between px-1">
                    <h2 className="text-base sm:text-lg font-black text-on-surface tracking-tight flex items-center gap-1.5">
                        <span>Top Categories</span>
                    </h2>

                    <div className="flex items-center gap-2 sm:gap-3">
                        {/* Minimal Slider Arrow Controls */}
                        <div className="flex items-center gap-1">
                            <button
                                type="button"
                                onClick={() => handleScroll('left')}
                                disabled={!canScrollLeft}
                                aria-label="Previous categories"
                                className="w-7 h-7 rounded-full bg-surface-container-low hover:bg-surface-container-high text-on-surface disabled:opacity-30 disabled:pointer-events-none flex items-center justify-center transition-all border border-outline-variant/30 active:scale-90"
                            >
                                <ChevronLeft size={15} />
                            </button>
                            <button
                                type="button"
                                onClick={() => handleScroll('right')}
                                disabled={!canScrollRight}
                                aria-label="Next categories"
                                className="w-7 h-7 rounded-full bg-surface-container-low hover:bg-surface-container-high text-on-surface disabled:opacity-30 disabled:pointer-events-none flex items-center justify-center transition-all border border-outline-variant/30 active:scale-90"
                            >
                                <ChevronRight size={15} />
                            </button>
                        </div>

                        <span className="text-outline-variant/60 hidden sm:inline">•</span>

                        <Link
                            href="/shop/category"
                            className="text-xs font-bold text-primary hover:text-blue-700 flex items-center gap-0.5 group"
                        >
                            <span>View All</span>
                            <ChevronRight size={13} className="transition-transform group-hover:translate-x-0.5" />
                        </Link>
                    </div>
                </div>

                {/* Smooth Minimal Swiper Slider with Touch Scroll Snap */}
                <div
                    ref={sliderRef}
                    className="flex gap-2.5 sm:gap-3.5 overflow-x-auto pb-1 scrollbar-none snap-x snap-mandatory scroll-smooth -mx-1 px-1 touch-pan-x"
                >
                    {categories.map((cat) => {
                        const href = cat.href || `/shop/category/${cat.slug}`;
                        const Icon = cat.icon || getCategoryIcon(cat.label);

                        return (
                            <motion.div
                                key={cat.slug || cat.id}
                                whileHover={{ y: -3, scale: 1.02 }}
                                whileTap={{ scale: 0.96 }}
                                transition={{ type: 'spring', stiffness: 350, damping: 22 }}
                                className="snap-start shrink-0 w-23 sm:w-28"
                            >
                                <Link
                                    href={href}
                                    className="flex flex-col items-center p-2.5 rounded-2xl bg-surface-container-lowest border border-outline-variant/25 shadow-xs hover:shadow-md transition-all text-center group h-full overflow-hidden"
                                >
                                    {/* Clean Rounded Image / Icon Container */}
                                    <div className="w-13 h-13 sm:w-16 sm:h-16 rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-800/80 p-1 flex items-center justify-center relative shadow-inner group-hover:scale-105 transition-transform duration-300">
                                        {cat.image ? (
                                            <img
                                                src={cat.image}
                                                alt={cat.label}
                                                className="w-full h-full object-cover rounded-xl"
                                                onError={(e) => {
                                                    e.currentTarget.style.display = 'none';
                                                    const fallbackEl = e.currentTarget.nextSibling;
                                                    if (fallbackEl) fallbackEl.style.display = 'flex';
                                                }}
                                            />
                                        ) : null}
                                        <div 
                                            className="w-full h-full items-center justify-center text-primary"
                                            style={{ display: cat.image ? 'none' : 'flex' }}
                                        >
                                            <Icon size={24} strokeWidth={2} />
                                        </div>
                                    </div>

                                    {/* Clean Single Line Label */}
                                    <span className="mt-2 text-[11px] sm:text-xs font-bold text-on-surface truncate w-full group-hover:text-primary transition-colors">
                                        {cat.label}
                                    </span>
                                </Link>
                            </motion.div>
                        );
                    })}
                </div>
            </div>
        </section>
    );
}

export default React.memo(CategoryQuickPills);
