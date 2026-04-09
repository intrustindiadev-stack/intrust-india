'use client';

import { useState, useRef } from 'react';
import { Search, Store, X, Sparkles, ChevronRight, BadgeCheck, Star } from 'lucide-react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import AdBannerCarousel from '@/components/customer/dashboard/AdBannerCarousel';
import HeroIllustrativeAd from '@/components/customer/shop/HeroIllustrativeAd';

// ── Accent palette ──────────────────────────────────────────────────────────
const ACCENTS = [
    { grad: 'from-indigo-500 to-blue-500', badge: 'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400' },
    { grad: 'from-emerald-500 to-teal-400', badge: 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' },
    { grad: 'from-rose-500 to-pink-400', badge: 'bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400' },
    { grad: 'from-amber-500 to-orange-400', badge: 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400' },
    { grad: 'from-violet-500 to-purple-400', badge: 'bg-violet-50 dark:bg-violet-500/10 text-violet-600 dark:text-violet-400' },
    { grad: 'from-sky-500 to-cyan-400', badge: 'bg-sky-50 dark:bg-sky-500/10 text-sky-600 dark:text-sky-400' },
    { grad: 'from-pink-500 to-fuchsia-400', badge: 'bg-pink-50 dark:bg-pink-500/10 text-pink-600 dark:text-pink-400' },
    { grad: 'from-lime-500 to-green-400', badge: 'bg-lime-50 dark:bg-lime-500/10 text-lime-600 dark:text-lime-400' },
];



const stagger = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.05 } },
};
const fadeUp = {
    hidden: { opacity: 0, y: 16 },
    show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 260, damping: 22 } },
};

// ── Featured Card (Intrust Official) – full-width ─────────────────────────
function FeaturedCard({ merchant }) {
    return (
        <motion.div variants={fadeUp} className="col-span-full mb-1">
            <Link href="/shop/official" className="group block">
                <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-600 via-blue-600 to-violet-600 p-5 md:p-7 shadow-xl shadow-indigo-500/25 hover:shadow-indigo-500/40 transition-shadow duration-400">
                    {/* Decorative rings */}
                    <div className="absolute -right-12 -top-12 w-44 h-44 rounded-full bg-white/10 pointer-events-none" />
                    <div className="absolute right-10 -bottom-10 w-32 h-32 rounded-full bg-white/5 pointer-events-none" />

                    <div className="relative z-10 flex items-center gap-4">
                        {/* Logo */}
                        <div className="shrink-0 w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-white shadow-xl overflow-hidden flex items-center justify-center ring-2 ring-white/30">
                            {merchant.user_profiles?.avatar_url ? (
                                <img src={merchant.user_profiles.avatar_url} alt="Intrust Official" className="w-full h-full object-contain p-1" referrerPolicy="no-referrer" />
                            ) : (
                                <span className="text-indigo-600 text-2xl font-black">IN</span>
                            )}
                        </div>

                        {/* Text */}
                        <div className="flex-1 min-w-0">
                            <span className="text-[9px] font-black uppercase tracking-[0.18em] text-indigo-200">✦ Featured · Platform Store</span>
                            <h2 className="text-xl md:text-2xl font-black text-white tracking-tight mt-0.5 mb-1">{merchant.business_name}</h2>
                            <p className="text-indigo-200 text-xs font-medium mb-3 line-clamp-1">Exclusive pricing & platform-wide inventory</p>
                            <span className="inline-flex items-center gap-1.5 bg-white text-indigo-600 text-xs font-black px-3.5 py-1.5 rounded-full shadow-md group-hover:bg-indigo-50 transition-colors">
                                Shop Now <ChevronRight size={12} strokeWidth={3} className="group-hover:translate-x-0.5 transition-transform" />
                            </span>
                        </div>
                    </div>
                </div>
            </Link>
        </motion.div>
    );
}

// ── Ultra-Premium Quick-Commerce Card (Zomato/Swiggy Style) ──────────────
function MerchantCard({ merchant, idx, rating }) {
    let avatarUrl = null;
    if (Array.isArray(merchant.user_profiles)) {
        avatarUrl = merchant.user_profiles[0]?.avatar_url;
    } else {
        avatarUrl = merchant.user_profiles?.avatar_url;
    }

    const initials = merchant.business_name.substring(0, 2).toUpperCase();
    const rawAddress = merchant.business_address || '';
    const addressLine = rawAddress ? rawAddress.split(',')[0]?.trim() : 'Premium Hub';
    
    // Use uploaded banner if it exists, otherwise fall back to the premium default banner
    const bannerImage = merchant.shopping_banner_url || '/images/default_merchant_banner.png';

    return (
        <motion.div variants={fadeUp} className="h-full">
            <Link
                href={`/shop/${merchant.slug}`}
                className="group flex flex-col h-full bg-white dark:bg-[#0c0e16] rounded-[2rem] overflow-hidden border border-slate-100/80 dark:border-white/[0.04] shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_20px_40px_rgb(0,0,0,0.08)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.5)] dark:hover:shadow-[0_20px_40px_rgba(0,0,0,0.7)] hover:-translate-y-1.5 transition-all duration-500 focus-visible:outline-none"
            >
                {/* ── Top Cover Image Area ── */}
                <div className="relative w-full h-[140px] sm:h-[160px] transition-transform duration-700 group-hover:scale-105 origin-top bg-slate-100 dark:bg-[#13161f]">
                    
                    {/* Render the shopping banner (Custom or Default) */}
                    <img 
                        src={bannerImage} 
                        alt={`${merchant.business_name} Banner`} 
                        className="absolute inset-0 w-full h-full object-cover z-0"
                    />

                    {/* Glassmorphic Overlay for ambient depth */}
                    <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/60 z-0" />

                    {/* Explicit HTML Brand Text if using default banner (to prevent stretched/AI botched text) */}
                    {!merchant.shopping_banner_url && (
                        <div className="absolute inset-0 flex items-center justify-center z-0 pointer-events-none">
                            <span className="font-[family-name:var(--font-manrope)] font-black text-2xl tracking-[0.2em] uppercase text-white/90 drop-shadow-[0_2px_10px_rgba(0,0,0,0.8)] mix-blend-overlay">
                                Intrust Mart
                            </span>
                        </div>
                    )}

                    {/* Floating Verified Pill (Zomato Pro style) */}
                    <div className="absolute top-4 left-4 z-10 flex items-center gap-1.5 bg-white/20 backdrop-blur-md border border-white/30 text-white px-3 py-1.5 rounded-full shadow-lg">
                        <BadgeCheck size={11} className="text-white" />
                        <span className="text-[10px] font-bold uppercase tracking-widest leading-none mt-[1px]">Partner</span>
                    </div>

                    {/* Dynamic 'Live' Indicator for Store Activity */}
                    <div className="absolute top-4 right-4 z-10 flex items-center justify-center w-8 h-8 rounded-full bg-white/20 backdrop-blur-md border border-white/30 shadow-lg group-hover:bg-white/30 transition-colors">
                        <Store size={12} className="text-white" />
                    </div>

                    {/* ── Overlapping Avatar (Stretching into the body) ── */}
                    <div className="absolute -bottom-8 left-5 z-20 flex justify-center">
                        <div className="w-[72px] h-[72px] rounded-[1.25rem] overflow-hidden bg-white dark:bg-[#13161f] p-1.5 shadow-[0_12px_24px_rgba(0,0,0,0.15)] ring-1 ring-black/5 dark:ring-white/10 group-hover:-translate-y-2 transition-transform duration-500">
                            <div className="w-full h-full rounded-xl overflow-hidden bg-slate-50 dark:bg-slate-800 flex items-center justify-center relative">
                                {avatarUrl ? (
                                    <img
                                        src={avatarUrl}
                                        alt={merchant.business_name}
                                        className="w-full h-full object-cover"
                                        referrerPolicy="no-referrer"
                                        onError={(e) => {
                                            e.currentTarget.style.display = 'none';
                                            const fallback = e.currentTarget.parentElement?.querySelector('.avatar-fallback');
                                            if (fallback) fallback.style.display = 'flex';
                                        }}
                                    />
                                ) : null}
                                <span
                                    className="avatar-fallback absolute inset-0 flex items-center justify-center font-[family-name:var(--font-manrope)] font-black text-xl text-slate-800 dark:text-white"
                                    style={{ display: avatarUrl ? 'none' : 'flex' }}
                                >
                                    {initials}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ── Store Body & Details ── */}
                <div className="relative flex flex-col flex-1 px-5 pt-11 pb-5 bg-white dark:bg-[#0c0e16] z-10">
                    
                    {/* Primary Info */}
                    <div className="flex justify-between items-start gap-4">
                        <div>
                            <h3 className="text-xl sm:text-2xl font-[family-name:var(--font-manrope)] font-extrabold text-slate-900 dark:text-white tracking-tight leading-tight line-clamp-1 group-hover:text-amber-500 dark:group-hover:text-amber-400 transition-colors">
                                {merchant.business_name}
                            </h3>
                            <p className="text-xs sm:text-sm font-[family-name:var(--font-inter)] font-semibold text-slate-500 dark:text-slate-400 mt-1 line-clamp-1 flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-600" />
                                {addressLine}
                            </p>
                        </div>
                        
                        {/* Rating / Explore node */}
                        <div className="shrink-0 flex items-center justify-center w-10 h-10 rounded-full bg-slate-50 dark:bg-slate-800/50 group-hover:bg-amber-500 group-hover:shadow-[0_0_20px_rgba(245,158,11,0.4)] transition-all duration-300">
                            <ChevronRight size={18} strokeWidth={2.5} className="text-slate-400 dark:text-slate-500 group-hover:text-white group-hover:translate-x-0.5 transition-all" />
                        </div>
                    </div>

                    <div className="flex-1" />

                    {/* Highly Subtle Footer Tags */}
                    <div className="mt-5 pt-4 border-t border-dashed border-slate-200 dark:border-white/[0.08] flex items-center gap-3">
                        <span className="flex items-center gap-1 text-[11px] font-bold text-amber-500">
                            <Star size={12} className={rating && rating.total_ratings > 0 ? "fill-amber-400 text-amber-400" : "text-amber-400"} />
                            {rating && rating.total_ratings > 0 ? parseFloat(rating.avg_rating).toFixed(1) : "0.0"}
                        </span>
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                            {rating && rating.total_ratings > 0 ? rating.total_ratings : "0"} {(rating && rating.total_ratings === 1) ? 'rating' : 'ratings'}
                        </span>
                        <div className="w-[1px] h-3 bg-slate-200 dark:bg-slate-700" />
                        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                            Tap to shop
                        </span>
                    </div>

                </div>
            </Link>
        </motion.div>
    );
}

// ── Main Export ──────────────────────────────────────────────────────────────
export default function ShopHubClient({ merchants = [], ratingsMap = {} }) {
    const [searchQuery, setSearchQuery] = useState('');
    const inputRef = useRef(null);

    const official = merchants.find(m => m.id === 'official');
    const rest = merchants.filter(m => m.id !== 'official');

    const filtered = rest.filter(m =>
        m.business_name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const showFeatured = !searchQuery && official;

    return (
        <div className="space-y-5">

            {/* ── Search bar ─────────────────────────────────── */}
            <div className="relative group">
                <div className="absolute inset-0 rounded-2xl bg-blue-500/5 dark:bg-blue-500/10 blur-xl opacity-0 group-focus-within:opacity-100 transition-opacity pointer-events-none" />
                <Search
                    size={17}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-white/25 z-10 pointer-events-none group-focus-within:text-blue-500 transition-colors"
                />
                <input
                    ref={inputRef}
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Search stores and brands…"
                    className="w-full pl-10 pr-10 py-3.5 rounded-2xl bg-white dark:bg-[#13161f] border border-slate-200 dark:border-white/[0.06] shadow-sm focus:shadow-md focus:shadow-blue-500/5 focus:border-blue-400/50 dark:focus:border-blue-500/30 outline-none font-semibold text-sm placeholder:text-slate-400 dark:placeholder:text-white/20 text-slate-900 dark:text-white transition-all"
                />
                <AnimatePresence>
                    {searchQuery && (
                        <motion.button
                            initial={{ opacity: 0, scale: 0.7 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.7 }}
                            onClick={() => { setSearchQuery(''); inputRef.current?.focus(); }}
                            className="absolute right-3.5 top-1/2 -translate-y-1/2 z-10 w-5 h-5 rounded-full bg-slate-200 dark:bg-white/10 flex items-center justify-center text-slate-500 dark:text-white/50 hover:bg-slate-300 dark:hover:bg-white/20 transition-colors"
                        >
                            <X size={11} />
                        </motion.button>
                    )}
                </AnimatePresence>
            </div>

            {/* ── Illustrative Ad Component ──────────────────────── */}
            <AnimatePresence>
                {!searchQuery && (
                    <motion.div
                        key="categories"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0, overflow: 'hidden' }}
                        transition={{ duration: 0.25 }}
                    >
                        <HeroIllustrativeAd />
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ── Banner Carousel ────────────────────────────── */}
            <AnimatePresence>
                {!searchQuery && (
                    <motion.div
                        key="carousel"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0, height: 0, overflow: 'hidden' }}
                        transition={{ duration: 0.25 }}
                    >
                        <AdBannerCarousel />
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ── Section header ─────────────────────────────── */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-indigo-500/10 flex items-center justify-center">
                        <Sparkles size={13} className="text-indigo-500" />
                    </span>
                    <div>
                        <p className="text-sm font-black text-slate-900 dark:text-white leading-none">
                            {searchQuery ? `"${searchQuery}"` : 'All Stores'}
                        </p>
                        <p className="text-[10px] font-medium text-slate-400 dark:text-white/30 mt-0.5">
                            {searchQuery
                                ? `${filtered.length} result${filtered.length !== 1 ? 's' : ''}`
                                : `${rest.length + (official ? 1 : 0)} merchants available`}
                        </p>
                    </div>
                </div>

                {/* Live indicator */}
                <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-800/30">
                    <span className="relative flex h-1.5 w-1.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    </span>
                    <span className="text-[9px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">Live</span>
                </span>
            </div>

            {/* ── Content ────────────────────────────────────── */}
            {!showFeatured && filtered.length === 0 ? (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="py-16 text-center bg-white dark:bg-[#13161f] rounded-2xl border border-slate-100 dark:border-white/[0.04]"
                >
                    <div className="w-14 h-14 bg-slate-100 dark:bg-white/5 rounded-2xl flex items-center justify-center mx-auto mb-3">
                        <Store size={22} className="text-slate-400" />
                    </div>
                    <p className="font-black text-slate-800 dark:text-white/60 mb-1">No stores found</p>
                    <p className="text-sm text-slate-400 mb-4">Try a different search</p>
                    <button
                        onClick={() => setSearchQuery('')}
                        className="px-5 py-2 bg-indigo-500 text-white text-sm font-black rounded-full shadow-lg shadow-indigo-500/25 hover:bg-indigo-600 transition-colors"
                    >
                        Clear search
                    </button>
                </motion.div>
            ) : (
                <motion.div
                    variants={stagger}
                    initial="hidden"
                    animate="show"
                    className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5"
                >
                    {showFeatured && <FeaturedCard merchant={official} />}
                    {filtered.map((merchant, idx) => (
                        <MerchantCard key={merchant.id} merchant={merchant} idx={idx} rating={ratingsMap[merchant.id]} />
                    ))}
                </motion.div>
            )}
        </div>
    );
}
