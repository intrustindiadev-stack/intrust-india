'use client';

import { MapPin, BadgeCheck, Star, Share2, ShieldCheck, Zap, Store, Sparkles } from 'lucide-react';
import Image from 'next/image';
import { useTheme } from '@/lib/contexts/ThemeContext';
import { useState } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';

export default function MerchantProfileCard({ merchant, totalItems, isStoreOpen = true }) {
    const { theme } = useTheme();
    const isDark = theme === 'dark';
    
    const isOfficial = merchant?.id === 'official' || merchant?.slug === 'official';
    const bannerImage = isOfficial
        ? '/images/intrust_mart_bg.png'
        : (merchant?.shopping_banner_url || '/images/default_merchant_banner.png');
    
    const avatarUrl = isOfficial
        ? '/icons/intrustLogo.png'
        : (merchant?.user_profiles?.avatar_url || (Array.isArray(merchant?.user_profiles) ? merchant?.user_profiles[0]?.avatar_url : null));

    const businessName = isOfficial
        ? 'InTrust Official'
        : (merchant?.business_name || 'Intrust Partner Store');

    const handleShare = async () => {
        try {
            if (typeof navigator !== 'undefined' && navigator.share) {
                await navigator.share({
                    title: businessName,
                    text: `Shop directly from ${businessName} on InTrust!`,
                    url: window.location.href,
                });
            } else if (typeof navigator !== 'undefined' && navigator.clipboard) {
                await navigator.clipboard.writeText(window.location.href);
                toast.success('Store link copied to clipboard!');
            }
        } catch (err) {
            if (err.name !== 'AbortError') {
                console.error('Error sharing store:', err);
            }
        }
    };
    
    return (
        <div className="w-full relative overflow-hidden rounded-3xl bg-white dark:bg-[#0c0e16] shadow-sm border border-slate-200/90 dark:border-white/[0.08] transition-all">
            {/* Banner Cover */}
            <div className="relative w-full h-36 sm:h-48 md:h-56 bg-slate-900 overflow-hidden">
                <Image
                    src={bannerImage}
                    alt={businessName}
                    fill
                    priority
                    className="object-cover object-center"
                />
                {/* Visual dark scrim for contrast */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-black/30" />

                {/* Top Badges & Actions Overlay */}
                <div className="absolute top-3 sm:top-4 left-3 sm:left-5 right-3 sm:right-5 flex items-center justify-between z-10">
                    <div className="flex items-center gap-2">
                        {isOfficial ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-600/95 text-white text-[11px] font-black uppercase tracking-wider shadow-md backdrop-blur-md">
                                <BadgeCheck size={14} className="fill-white text-blue-600" />
                                Official Store
                            </span>
                        ) : (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-600/95 text-white text-[11px] font-black uppercase tracking-wider shadow-md backdrop-blur-md">
                                <BadgeCheck size={14} className="fill-white text-emerald-600" />
                                Verified Partner
                            </span>
                        )}

                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-black uppercase tracking-wider backdrop-blur-md shadow-md ${
                            isStoreOpen 
                                ? 'bg-emerald-500/25 border border-emerald-400/40 text-emerald-300'
                                : 'bg-red-500/25 border border-red-400/40 text-red-300'
                        }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${isStoreOpen ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'}`} />
                            {isStoreOpen ? 'Open Now' : 'Closed'}
                        </span>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={handleShare}
                            title="Share Store"
                            className="w-9 h-9 rounded-full bg-black/40 hover:bg-black/60 text-white border border-white/20 flex items-center justify-center backdrop-blur-md transition-all active:scale-95 shadow-sm"
                        >
                            <Share2 size={16} />
                        </button>
                    </div>
                </div>


                {/* Overlaid Title on Banner Bottom for Large Screens */}
                <div className="absolute bottom-3 left-3 sm:left-5 right-3 sm:right-5 hidden sm:block z-10">
                    <p className="text-white/80 text-xs font-bold uppercase tracking-wider flex items-center gap-1 mb-0.5">
                        <Sparkles size={12} className="text-amber-400" />
                        InTrust Direct Commerce
                    </p>
                    <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight leading-tight drop-shadow-md">
                        {businessName}
                    </h1>
                </div>
            </div>

            {/* Profile Identity & Stats Section */}
            <div className="p-4 sm:p-5 pt-3 sm:pt-4">
                {/* Mobile Title (visible on small mobile screens below banner) */}
                <div className="sm:hidden mb-3">
                    <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">
                        {businessName}
                    </h1>
                </div>

                {/* Store Metrics Pills Bar */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
                    {/* Rating Pill */}
                    <div className="flex items-center gap-2.5 p-2.5 sm:p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-900 dark:text-amber-300">
                        <div className="w-8 h-8 rounded-xl bg-amber-500/20 flex items-center justify-center shrink-0">
                            <Star size={16} className="fill-amber-500 text-amber-500" />
                        </div>
                        <div className="min-w-0">
                            <div className="text-xs font-black leading-none">
                                {merchant?.rating?.avg_rating || (isOfficial ? '4.9' : '4.2')} ★
                            </div>
                            <div className="text-[10px] font-bold text-amber-700/80 dark:text-amber-400/80 mt-1 truncate">
                                {merchant?.rating?.total_ratings ? `${merchant.rating.total_ratings}+ ratings` : '50,000+ ratings'}
                            </div>
                        </div>
                    </div>

                    {/* Delivery Speed Pill */}
                    <div className="flex items-center gap-2.5 p-2.5 sm:p-3 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-900 dark:text-blue-300">
                        <div className="w-8 h-8 rounded-xl bg-blue-500/20 flex items-center justify-center shrink-0">
                            <Zap size={16} className="text-blue-500 fill-blue-500" />
                        </div>
                        <div className="min-w-0">
                            <div className="text-xs font-black leading-none">Express</div>
                            <div className="text-[10px] font-bold text-blue-700/80 dark:text-blue-400/80 mt-1 truncate">
                                Live Tracking
                            </div>
                        </div>
                    </div>

                    {/* Location Pill */}
                    <div className="flex items-center gap-2.5 p-2.5 sm:p-3 rounded-2xl bg-slate-100 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 text-slate-800 dark:text-slate-200">
                        <div className="w-8 h-8 rounded-xl bg-slate-200/70 dark:bg-white/10 flex items-center justify-center shrink-0">
                            <MapPin size={16} className="text-slate-600 dark:text-slate-400" />
                        </div>
                        <div className="min-w-0">
                            <div className="text-xs font-black leading-none truncate">
                                {merchant?.business_address || 'Bhopal Hub'}
                            </div>
                            <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 mt-1 truncate">
                                Verified Hub
                            </div>
                        </div>
                    </div>

                    {/* Buyer Guarantee Pill */}
                    <div className="flex items-center gap-2.5 p-2.5 sm:p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-900 dark:text-emerald-300">
                        <div className="w-8 h-8 rounded-xl bg-emerald-500/20 flex items-center justify-center shrink-0">
                            <ShieldCheck size={16} className="text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <div className="min-w-0">
                            <div className="text-xs font-black leading-none">100% Protected</div>
                            <div className="text-[10px] font-bold text-emerald-700/80 dark:text-emerald-400/80 mt-1 truncate">
                                InTrust Guarantee
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
