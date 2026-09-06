'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, ChevronRight, ChevronLeft, ArrowRight, Zap, ShieldCheck, Clock, Gift, Percent } from 'lucide-react';

const SLIDES = [
    {
        id: 1,
        tag: 'FESTIVE TECH BONANZA',
        title: 'Up to 60% Off on Top Electronics',
        subtitle: 'Shop top electronics and gadgets with guaranteed 5% direct cash deposit straight back into your InTrust Wallet.',
        badge: 'Bhopal Exclusives',
        ctaText: 'Shop Tech Deals',
        ctaHref: '/shop?category=electronics',
        highlight: '+5% Wallet Cashback',
        image: '/banners/festive_tech_sale.jpg',
        bgGradient: 'from-slate-950/95 via-slate-900/80 to-blue-950/40',
        accentColor: 'text-[#D4AF37]',
        borderColor: 'border-blue-500/30'
    },
    {
        id: 2,
        tag: 'FAST 2-HOUR PICKUP',
        title: 'Local Store Pickups Across Bhopal',
        subtitle: 'Skip shipping delays! Reserve products online and pick up in 2 hours at verified neighborhood electronics & retail stores.',
        badge: '100% Buyer Protected',
        ctaText: 'Find Nearby Stores',
        ctaHref: '/shop',
        highlight: 'Zero Processing Fees',
        image: '/banners/local_fast_delivery.jpg',
        bgGradient: 'from-slate-950/95 via-slate-900/80 to-indigo-950/40',
        accentColor: 'text-emerald-400',
        borderColor: 'border-emerald-500/30'
    },
    {
        id: 3,
        tag: 'DIGITAL GIFT CARDS',
        title: 'Save Instant 2% - 15% On Top Brands',
        subtitle: 'Zomato, Swiggy, Amazon, Myntra & MakeMyTrip vouchers with instant PIN reveal and lifetime validity.',
        badge: 'Instant Delivery',
        ctaText: 'Explore Gift Cards',
        ctaHref: '/gift-cards',
        highlight: 'Instant Digital PIN',
        image: '/banners/digital_rewards_cards.jpg',
        bgGradient: 'from-slate-950/95 via-purple-950/80 to-slate-950/40',
        accentColor: 'text-purple-300',
        borderColor: 'border-purple-500/30'
    }
];

export default function EcomHeroCarousel() {
    const [currentIdx, setCurrentIdx] = useState(0);

    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentIdx((prev) => (prev + 1) % SLIDES.length);
        }, 6000);
        return () => clearInterval(timer);
    }, []);

    const slide = SLIDES[currentIdx];

    return (
        <div className="relative w-full rounded-3xl overflow-hidden shadow-xl border border-outline-variant/30 bg-slate-950">
            <AnimatePresence mode="wait">
                <motion.div
                    key={slide.id}
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 1.02 }}
                    transition={{ duration: 0.5 }}
                    className="relative p-7 sm:p-10 text-white flex flex-col justify-between min-h-[300px] sm:min-h-[360px] overflow-hidden"
                >
                    {/* Background Banner Image */}
                    <div 
                        className="absolute inset-0 bg-cover bg-center transition-all duration-700 transform scale-105"
                        style={{ backgroundImage: `url(${slide.image})` }}
                    />
                    
                    {/* Directional Vignette Gradient Overlay for Crisp Text Readability */}
                    <div className={`absolute inset-0 bg-gradient-to-r ${slide.bgGradient} sm:w-3/4 w-full`} />
                    <div className="absolute inset-0 bg-slate-950/40" />

                    {/* Ambient Glows */}
                    <div className="absolute -right-20 -top-20 w-80 h-80 rounded-full bg-blue-500/20 blur-3xl pointer-events-none" />
                    <div className="absolute -left-20 -bottom-20 w-72 h-72 rounded-full bg-indigo-500/20 blur-3xl pointer-events-none" />

                    {/* Top Tags */}
                    <div className="relative z-10 flex flex-wrap items-center justify-between gap-3 mb-4">
                        <div className="flex items-center gap-2">
                            <span className="px-3 py-1 rounded-full bg-slate-900/70 backdrop-blur-md text-[11px] font-black uppercase tracking-wider text-[#D4AF37] border border-white/15 flex items-center gap-1.5">
                                <Sparkles size={13} className="text-[#D4AF37]" />
                                {slide.tag}
                            </span>
                            <span className="px-2.5 py-1 rounded-full bg-white/10 backdrop-blur-md text-white/90 text-[11px] font-bold border border-white/10">
                                {slide.badge}
                            </span>
                        </div>

                        {/* Navigation dots */}
                        <div className="flex items-center gap-1.5 bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10">
                            {SLIDES.map((_, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => setCurrentIdx(idx)}
                                    aria-label={`Slide ${idx + 1}`}
                                    className={`h-2 rounded-full transition-all ${
                                        idx === currentIdx ? 'w-6 bg-white' : 'w-2 bg-white/40 hover:bg-white/70'
                                    }`}
                                />
                            ))}
                        </div>
                    </div>

                    {/* Main Headline */}
                    <div className="relative z-10 max-w-xl my-auto py-2">
                        <h2 className="text-2xl sm:text-4xl lg:text-5xl font-black tracking-tight text-white leading-tight drop-shadow-md">
                            {slide.title}
                        </h2>
                        <p className="text-sm sm:text-base text-slate-200 mt-3 leading-relaxed max-w-lg font-medium drop-shadow">
                            {slide.subtitle}
                        </p>
                    </div>

                    {/* Bottom Action Ribbon */}
                    <div className="relative z-10 pt-6 flex flex-wrap items-center justify-between gap-4 border-t border-white/15">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-slate-900/80 backdrop-blur-md flex items-center justify-center border border-white/20 shadow-md">
                                <Zap size={18} className="text-[#D4AF37]" />
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-300">Wallet Advantage</span>
                                <span className={`text-sm font-extrabold ${slide.accentColor}`}>{slide.highlight}</span>
                            </div>
                        </div>

                        <Link
                            href={slide.ctaHref}
                            className="px-6 py-3 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm flex items-center gap-2 shadow-lg shadow-blue-600/40 hover:scale-105 active:scale-95 transition-all backdrop-blur-sm"
                        >
                            <span>{slide.ctaText}</span>
                            <ArrowRight size={16} />
                        </Link>
                    </div>
                </motion.div>
            </AnimatePresence>
        </div>
    );
}
