'use client';

import { useState, useEffect, useRef } from 'react';
import { Search, Store, X, Sparkles, ChevronRight, BadgeCheck, Star, MapPin, Heart } from 'lucide-react';
import Link from 'next/link';
import { createClient } from '@/lib/supabaseClient';
import { motion, AnimatePresence } from 'framer-motion';
import AdBannerCarousel from '@/components/customer/dashboard/AdBannerCarousel';
import HeroIllustrativeAd from '@/components/customer/shop/HeroIllustrativeAd';
import MerchantCardSkeleton from '@/components/customer/shop/MerchantCardSkeleton';
import RatingStars from '@/components/ui/RatingStars';

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
    const supabase = createClient();
    const [isOpen, setIsOpen] = useState(merchant.is_open !== false);

    useEffect(() => {
        const fetchStatus = async () => {
            const { data } = await supabase.from('platform_settings').select('value').eq('key', 'platform_store').single();
            if (data?.value) {
                try {
                    const parsed = JSON.parse(data.value);
                    setIsOpen(parsed.is_open);
                } catch (e) {}
            }
        };
        fetchStatus();

        const channel = supabase
            .channel('hub_platform_sync')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'platform_settings', filter: 'key=eq.platform_store' }, (payload) => {
                if (payload.new?.value) {
                    try {
                        const parsed = JSON.parse(payload.new.value);
                        setIsOpen(parsed.is_open);
                    } catch (e) {}
                }
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, []);

    return (
        <motion.div variants={fadeUp} className="col-span-full mb-4">
            <Link href="/shop/official" className="group block focus-visible:outline-none">
                <div className="relative overflow-hidden rounded-[2.5rem] bg-slate-950 p-8 md:p-12 shadow-[0_32px_64px_rgba(0,0,0,0.2)] hover:shadow-[0_48px_96px_rgba(0,0,0,0.3)] transition-all duration-700 min-h-[280px] md:min-h-[340px] flex flex-col justify-end">
                    
                    {/* Hero Background with Parallax-like effect */}
                    <img
                        src="/images/intrust_mart_bg.png"
                        alt="Intrust Mart"
                        className="absolute inset-0 w-full h-full object-cover scale-100 group-hover:scale-110 transition-transform duration-[2000ms] opacity-60"
                    />
                    
                    {/* Cinematic Gradient Overlays */}
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />
                    <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 via-transparent to-transparent" />

                    <div className="relative z-10">
                        <div className="flex items-center gap-4 mb-6">
                            <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-white/10 backdrop-blur-2xl border border-white/20 shadow-2xl flex items-center justify-center overflow-hidden">
                                {merchant.user_profiles?.avatar_url ? (
                                    <img src={merchant.user_profiles.avatar_url} alt="Official" className="w-full h-full object-contain p-2" />
                                ) : (
                                    <Sparkles className="text-white w-8 h-8" />
                                )}
                            </div>
                            <div>
                                <div className="flex items-center gap-2 mb-1.5">
                                    <span className="bg-emerald-500 text-black text-[9px] font-black px-2.5 py-1 rounded-lg uppercase tracking-widest shadow-lg shadow-emerald-500/20">Official Store</span>
                                    <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg backdrop-blur-xl border ${isOpen ? 'bg-black/40 border-white/10' : 'bg-rose-500/20 border-rose-500/30'}`}>
                                        <span className={`w-1.5 h-1.5 rounded-full ${isOpen ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'}`} />
                                        <span className="text-[9px] font-black text-white/90 uppercase tracking-widest">{isOpen ? 'Live' : 'Closed'}</span>
                                    </div>
                                </div>
                                <h2 className="text-4xl md:text-6xl font-black text-white tracking-tighter leading-none mb-3">Intrust Mart</h2>
                                <RatingStars 
                                    rating={merchant.rating?.avg_rating || 4.9} 
                                    totalRatings={merchant.rating?.total_ratings || 50000} 
                                    size={16} 
                                />
                            </div>
                        </div>

                        <p className="text-white/60 text-base md:text-lg font-medium max-w-lg leading-relaxed mb-8">
                            Experience the future of shopping with platform-verified products and lightning-fast fulfillment.
                        </p>

                        <div className="flex items-center gap-4">
                            <div className="inline-flex items-center gap-3 bg-white text-black px-8 py-4 rounded-2xl font-black text-sm uppercase tracking-widest shadow-[0_20px_40px_rgba(255,255,255,0.2)] group-hover:bg-emerald-400 group-hover:shadow-emerald-500/40 transition-all active:scale-95">
                                Start Shopping <ChevronRight size={18} />
                            </div>
                        </div>
                    </div>

                    {/* Decorative Elements */}
                    <div className="absolute -bottom-12 -right-12 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
                </div>
            </Link>
        </motion.div>
    );
}

// ── Ultra-Premium Quick-Commerce Card (Zomato/Swiggy Style) ──────────────
function MerchantCard({ merchant, rating }) {
    let avatarUrl = null;
    if (Array.isArray(merchant.user_profiles)) {
        avatarUrl = merchant.user_profiles[0]?.avatar_url;
    } else {
        avatarUrl = merchant.user_profiles?.avatar_url;
    }

    const initials = merchant.business_name.substring(0, 2).toUpperCase();
    const rawAddress = merchant.business_address || '';
    const addressLine = rawAddress ? rawAddress.split(',')[0]?.trim() : 'Premium Hub';

    const bannerImage = merchant.shopping_banner_url || '/images/default_merchant_banner.png';
    const [isOpen, setIsOpen] = useState(merchant.is_open !== false);
    const supabase = createClient();

    useEffect(() => {
        if (!merchant.id) return;
        const channel = supabase
            .channel(`hub_merchant_${merchant.id}`)
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'merchants', filter: `id=eq.${merchant.id}` }, (payload) => {
                if (payload.new) setIsOpen(payload.new.is_open !== false);
            })
            .subscribe();
        return () => { supabase.removeChannel(channel); };
    }, [merchant.id]);

    return (
        <motion.div variants={fadeUp} className="h-full">
            <Link
                href={`/shop/${merchant.slug}`}
                className="group relative flex flex-col h-full bg-white dark:bg-[#0c0e16] rounded-[2.5rem] overflow-hidden border border-slate-100 dark:border-white/[0.04] shadow-[0_4px_20px_rgba(0,0,0,0.03)] hover:shadow-[0_24px_48px_rgba(0,0,0,0.1)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.4)] dark:hover:shadow-[0_24px_48px_rgba(0,0,0,0.6)] hover:-translate-y-2 transition-all duration-500 focus-visible:outline-none"
            >
                {/* ── Visual Area ── */}
                <div className="relative w-full h-[180px] sm:h-[200px] overflow-hidden">
                    <img
                        src={bannerImage}
                        alt={merchant.business_name}
                        loading="lazy"
                        className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000"
                    />
                    
                    {/* Vignette & Depth Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20" />

                    {/* Floating Badges */}
                    <div className="absolute top-4 left-4 z-10 flex flex-col gap-2">
                        <div className="flex items-center gap-1.5 bg-white/20 backdrop-blur-xl border border-white/30 text-white px-3 py-1.5 rounded-full shadow-lg">
                            <BadgeCheck size={11} className="text-emerald-400 fill-emerald-400/20" />
                            <span className="text-[10px] font-black uppercase tracking-widest leading-none mt-[1px]">Partner</span>
                        </div>
                    </div>

                    <div className="absolute top-4 right-4 z-10">
                        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full backdrop-blur-xl border shadow-lg transition-colors ${isOpen ? 'bg-black/40 border-white/20' : 'bg-rose-500/80 border-rose-400/50'}`}>
                            {isOpen ? (
                                <>
                                    <span className="relative flex h-1.5 w-1.5">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                                        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                    </span>
                                    <span className="text-[9px] font-black uppercase tracking-widest leading-none mt-[1px] text-white">LIVE</span>
                                </>
                            ) : (
                                <span className="text-[9px] font-black uppercase tracking-widest leading-none mt-[1px] text-white">CLOSED</span>
                            )}
                        </div>
                    </div>

                    {/* Branding Overlay (if default banner) */}
                    {!merchant.shopping_banner_url && (
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <span className="font-black text-2xl tracking-[0.2em] uppercase text-white/40 mix-blend-overlay">
                                InTrust
                            </span>
                        </div>
                    )}
                </div>

                {/* ── Content Area ── */}
                <div className="relative flex flex-col flex-1 px-6 pt-12 pb-6 bg-white dark:bg-[#0c0e16]">
                    {/* Floating Avatar (Large) */}
                    <div className="absolute -top-10 left-6 z-20">
                        <div className="w-20 h-20 rounded-[1.5rem] overflow-hidden bg-white dark:bg-[#13161f] p-1.5 shadow-2xl ring-1 ring-black/5 dark:ring-white/10 group-hover:-translate-y-2 transition-transform duration-500">
                            <div className="w-full h-full rounded-2xl overflow-hidden bg-slate-50 dark:bg-slate-800 flex items-center justify-center">
                                {avatarUrl ? (
                                    <img src={avatarUrl} alt={merchant.business_name} className="w-full h-full object-cover" />
                                ) : (
                                    <span className="font-black text-2xl text-slate-400">{initials}</span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Store Title & Quick Info */}
                    <div className="flex justify-between items-start gap-3 mb-4">
                        <div className="flex-1 min-w-0">
                            <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight leading-none mb-2 truncate group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                                {merchant.business_name}
                            </h3>
                            <div className="mt-2 mb-3">
                                <RatingStars 
                                    rating={rating?.avg_rating || 0} 
                                    totalRatings={rating?.total_ratings || 0} 
                                    size={14} 
                                />
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-[11px] font-bold text-slate-500 dark:text-white/40 truncate max-w-[120px]">
                                    {addressLine}
                                </span>
                                <span className="text-[10px] font-bold text-slate-400 dark:text-white/30 uppercase tracking-widest">•</span>
                                <div className="flex items-center gap-1 bg-emerald-500/10 px-1.5 py-0.5 rounded-md">
                                    <Sparkles size={10} className="text-emerald-500" />
                                    <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">
                                        Fast Delivery
                                    </span>
                                </div>
                            </div>
                            
                            {/* Zomato-style detailed info */}
                            <div className="flex items-center gap-3 mt-3">
                                <div className="flex items-center gap-1 text-[10px] font-bold text-slate-500 dark:text-slate-400">
                                    <span className="w-1 h-1 rounded-full bg-slate-300" />
                                    <span>Fast Delivery</span>
                                </div>
                                <div className="flex items-center gap-1 text-[10px] font-bold text-slate-500 dark:text-slate-400">
                                    <span className="w-1 h-1 rounded-full bg-slate-300" />
                                    <span>Premium Quality</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex-1" />

                    {/* Zomato-style CTA Button (Now spans full width) */}
                    <div className="mt-6">
                        <div className="w-full h-12 rounded-2xl bg-slate-900 dark:bg-white/[0.05] border border-slate-800 dark:border-white/10 flex items-center justify-center gap-2 group-hover:bg-emerald-500 group-hover:border-emerald-400 group-hover:text-black transition-all duration-300 shadow-xl group-hover:shadow-emerald-500/25">
                            <span className="text-xs font-black uppercase tracking-[0.1em] text-white group-hover:text-black">Shop Now</span>
                            <ChevronRight size={16} className="text-white/50 group-hover:text-black transition-colors" />
                        </div>
                    </div>
                </div>
            </Link>
        </motion.div>
    );
}

// ── Main Export ──────────────────────────────────────────────────────────────
export default function ShopHubClient({ merchants = [], ratingsMap = {} }) {
    const [isGridLoaded, setIsGridLoaded] = useState(false);
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

            {/* ── Sticky Search bar ─────────────────────────── */}
            <div className="sticky top-[148px] md:top-[164px] z-30 pt-4 pb-6 -mx-4 px-4 md:-mx-8 md:px-8 bg-[#f7f8fa]/80 dark:bg-[#080a10]/80 backdrop-blur-2xl">
                <div className="relative group max-w-4xl mx-auto">
                    <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500/20 to-blue-500/20 rounded-[2rem] blur opacity-0 group-focus-within:opacity-100 transition duration-500" />
                    <div className="relative">
                        <Search
                            size={18}
                            className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-white/20 z-10 pointer-events-none group-focus-within:text-emerald-500 transition-colors"
                        />
                        <input
                            ref={inputRef}
                            type="text"
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            placeholder="Search for stores, items or cuisines…"
                            className="w-full pl-12 pr-12 py-4 rounded-[1.5rem] bg-white dark:bg-[#13161f] border border-slate-200 dark:border-white/[0.08] shadow-[0_4px_12px_rgba(0,0,0,0.03)] focus:shadow-[0_8px_30px_rgba(0,0,0,0.06)] dark:focus:shadow-[0_8px_30px_rgba(0,0,0,0.4)] focus:border-emerald-500/30 outline-none font-bold text-base placeholder:text-slate-400 dark:placeholder:text-white/20 text-slate-900 dark:text-white transition-all"
                        />
                        <AnimatePresence>
                            {searchQuery && (
                                <motion.button
                                    initial={{ opacity: 0, scale: 0.7 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.7 }}
                                    onClick={() => { setSearchQuery(''); inputRef.current?.focus(); }}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 z-10 w-6 h-6 rounded-full bg-slate-100 dark:bg-white/10 flex items-center justify-center text-slate-500 dark:text-white/50 hover:bg-slate-200 dark:hover:bg-white/20 transition-colors"
                                >
                                    <X size={12} />
                                </motion.button>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </div>

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
                    onAnimationComplete={() => setIsGridLoaded(true)}
                    className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5"
                >
                    {!isGridLoaded && !showFeatured && !searchQuery && (
                        Array.from({ length: 4 }).map((_, i) => (
                            <MerchantCardSkeleton key={`skel-${i}`} />
                        ))
                    )}
                    {showFeatured && <FeaturedCard merchant={official} />}
                    {filtered.map((merchant) => (
                        <MerchantCard key={merchant.id} merchant={merchant} rating={ratingsMap[merchant.id]} />
                    ))}
                </motion.div>
            )}
        </div>
    );
}
