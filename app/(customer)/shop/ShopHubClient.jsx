'use client';

import { useState, useRef } from 'react';
import { Search, Store, X, Sparkles, ChevronRight, BadgeCheck, MapPin } from 'lucide-react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import AdBannerCarousel from '@/components/customer/dashboard/AdBannerCarousel';

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

// ── Regular Merchant Card ─────────────────────────────────────────────────
function MerchantCard({ merchant, idx }) {
    const accent = ACCENTS[idx % ACCENTS.length];
    const avatarUrl = merchant.user_profiles?.avatar_url;
    const initials = merchant.business_name.substring(0, 2).toUpperCase();

    // Clean address: take first meaningful segment (before first comma)
    const rawAddress = merchant.business_address || '';
    const addressLine = rawAddress
        ? rawAddress.split(',')[0]?.trim()
        : null;

    return (
        <motion.div variants={fadeUp} className="h-full">
            <Link
                href={`/shop/${merchant.id}`}
                className="group flex flex-col h-full bg-white dark:bg-[#13161f] rounded-2xl overflow-hidden border border-slate-100 dark:border-white/[0.05] shadow-sm hover:shadow-xl hover:shadow-slate-200/60 dark:hover:shadow-black/40 hover:-translate-y-0.5 transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            >
                {/* ── Top: coloured header with avatar centered inside ── */}
                <div className={`relative flex items-center justify-center bg-gradient-to-br ${accent.grad} h-[90px] sm:h-[100px] overflow-hidden shrink-0`}>
                    {/* Decorative blobs — inside header, fully contained */}
                    <div className="absolute top-0 right-0 w-20 h-20 rounded-full bg-white/10 -mr-8 -mt-8 pointer-events-none" />
                    <div className="absolute bottom-0 left-0 w-14 h-14 rounded-full bg-black/10 -ml-6 -mb-6 pointer-events-none" />

                    {/* Avatar — centered inside header, no overflow clipping */}
                    <div className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-xl overflow-hidden bg-white shadow-lg ring-2 ring-white/40 group-hover:scale-105 group-hover:rotate-1 transition-transform duration-300 z-10">
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
                            className={`avatar-fallback absolute inset-0 flex items-center justify-center text-white font-black text-base bg-gradient-to-br ${accent.grad}`}
                            style={{ display: avatarUrl ? 'none' : 'flex' }}
                        >
                            {initials}
                        </span>
                    </div>
                </div>

                {/* Body */}
                <div className="flex flex-col flex-1 px-3 pt-3 pb-3 gap-1.5">

                    {/* Store name */}
                    <h3 className="text-sm font-black text-slate-900 dark:text-white leading-tight line-clamp-2">
                        {merchant.business_name}
                    </h3>

                    {/* Address */}
                    {addressLine && (
                        <span className="flex items-center gap-1 text-[10px] font-semibold text-slate-400 dark:text-white/30 leading-tight line-clamp-1">
                            <MapPin size={9} className="shrink-0" />
                            {addressLine}
                        </span>
                    )}

                    {/* Always: Verified badge */}
                    <span className={`self-start inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full mt-0.5 ${accent.badge}`}>
                        <BadgeCheck size={9} />
                        Verified
                    </span>

                    <div className="flex-1" />

                    {/* Footer */}
                    <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-white/[0.05] mt-1">
                        <span className="text-[10px] font-bold text-slate-400 dark:text-white/30 flex items-center gap-1">
                            <Store size={9} />
                            Visit Store
                        </span>
                        <span className={`w-6 h-6 rounded-full bg-gradient-to-br ${accent.grad} flex items-center justify-center text-white shadow-sm group-hover:scale-110 transition-transform duration-200`}>
                            <ChevronRight size={12} strokeWidth={3} />
                        </span>
                    </div>
                </div>
            </Link>
        </motion.div>
    );
}

// ── Main Export ──────────────────────────────────────────────────────────────
export default function ShopHubClient({ merchants = [] }) {
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
                    className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3"
                >
                    {showFeatured && <FeaturedCard merchant={official} />}
                    {filtered.map((merchant, idx) => (
                        <MerchantCard key={merchant.id} merchant={merchant} idx={idx} />
                    ))}
                </motion.div>
            )}
        </div>
    );
}
