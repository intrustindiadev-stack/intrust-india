'use client';

import { MapPin, Star, Share2, ShieldCheck, Zap, Store, Sparkles } from 'lucide-react';
import Image from 'next/image';
import { useTheme } from '@/lib/contexts/ThemeContext';
import toast from 'react-hot-toast';

export default function MerchantProfileCard({ merchant, totalItems, isStoreOpen = true }) {
    const { theme } = useTheme();
    const isDark = theme === 'dark';
    
    const isOfficial = merchant?.id === 'official' || merchant?.slug === 'official' || merchant?.slug === 'intrust-official';
    const bannerImage = isOfficial
        ? '/images/intrust_mart_bg.png'
        : (merchant?.shopping_banner_url || '/images/default_merchant_banner.png');
    
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
            {/* Banner Cover with Light/Reduced Scrim */}
            <div className="relative w-full h-40 sm:h-52 md:h-60 bg-slate-900 overflow-hidden">
                <Image
                    src={bannerImage}
                    alt={businessName}
                    fill
                    priority
                    className="object-cover object-center"
                />
                {/* Reduced scrim so banner visuals remain crisp and bright */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/25 to-black/15" />

                {/* Top Badges & Actions Overlay */}
                <div className="absolute top-3 sm:top-4 left-3 sm:left-5 right-3 sm:right-5 flex items-center justify-between z-10">
                    <div className="flex items-center gap-2">
                        {isOfficial ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-600/90 text-white text-[11px] font-black uppercase tracking-wider shadow-md backdrop-blur-md">
                                <div className="w-4 h-4 rounded-full bg-white flex items-center justify-center overflow-hidden p-0.5">
                                    <Image src="/icons/intrustLogo.png" alt="InTrust" width={14} height={14} className="object-contain" />
                                </div>
                                InTrust Official
                            </span>
                        ) : (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/50 text-white text-[11px] font-black uppercase tracking-wider shadow-md backdrop-blur-md border border-white/20">
                                <svg className="w-3.5 h-3.5 text-[#0095F6] shrink-0" viewBox="0 0 24 24" fill="none">
                                    <circle cx="12" cy="12" r="10" fill="#0095F6" />
                                    <path d="M8.5 12.5L10.8 14.8L15.5 9.8" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                                Verified Store
                            </span>
                        )}

                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-black uppercase tracking-wider backdrop-blur-md shadow-md ${
                            isStoreOpen 
                                ? 'bg-emerald-500/30 border border-emerald-400/40 text-emerald-200'
                                : 'bg-rose-500/30 border border-rose-400/40 text-rose-200'
                        }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${isStoreOpen ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'}`} />
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
                    <div className="flex items-center gap-1.5 text-white/90 text-xs font-bold uppercase tracking-wider mb-1">
                        <Sparkles size={13} className="text-sky-300" />
                        <span>InTrust Direct Commerce • Same-Day Delivery</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight leading-tight drop-shadow-md">
                            {businessName}
                        </h1>
                        <svg className="w-5 h-5 text-[#0095F6] shrink-0 drop-shadow-sm" viewBox="0 0 24 24" fill="none">
                            <circle cx="12" cy="12" r="10" fill="#0095F6" />
                            <path d="M8.5 12.5L10.8 14.8L15.5 9.8" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </div>
                </div>
            </div>

            {/* Profile Identity & Stats Section */}
            <div className="p-3 sm:p-5 pt-2.5 sm:pt-4">
                {/* Mobile Title (visible on small mobile screens below banner) */}
                <div className="sm:hidden mb-2">
                    <div className="flex items-center gap-1.5">
                        <h1 className="text-lg font-black text-slate-900 dark:text-white tracking-tight leading-tight">
                            {businessName}
                        </h1>
                        <svg className="w-4 h-4 text-[#0095F6] shrink-0" viewBox="0 0 24 24" fill="none">
                            <circle cx="12" cy="12" r="10" fill="#0095F6" />
                            <path d="M8.5 12.5L10.8 14.8L15.5 9.8" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </div>
                </div>

                {/* Mobile Streamlined Metrics Strip (< 640px) */}
                <div className="sm:hidden flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5 text-xs">
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-amber-500/10 text-amber-800 dark:text-amber-300 font-bold shrink-0">
                        <Star size={12} className="fill-amber-500 text-amber-500" />
                        <span>{merchant?.rating?.avg_rating || (isOfficial ? '4.9' : '4.8')}</span>
                        <span className="text-[10px] text-amber-700/70 dark:text-amber-400/70">({merchant?.rating?.total_ratings || '120+'})</span>
                    </div>
                    <div className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-sky-500/10 text-sky-800 dark:text-sky-300 font-bold shrink-0">
                        <Zap size={12} className="fill-sky-500 text-sky-500" />
                        <span>Same-Day Delivery</span>
                    </div>
                    <div className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 font-bold shrink-0">
                        <ShieldCheck size={12} className="text-emerald-600 dark:text-emerald-400" />
                        <span>100% Genuine</span>
                    </div>
                </div>

                {/* Desktop Store Metrics 4-Pills Grid (>= 640px) */}
                <div className="hidden sm:grid sm:grid-cols-4 gap-2.5 sm:gap-3">
                    {/* Rating Pill */}
                    <div className="flex items-center gap-2.5 p-2.5 sm:p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-900 dark:text-amber-300">
                        <div className="w-8 h-8 rounded-xl bg-amber-500/20 flex items-center justify-center shrink-0">
                            <Star size={16} className="fill-amber-500 text-amber-500" />
                        </div>
                        <div className="min-w-0">
                            <div className="text-xs font-black leading-none">
                                {merchant?.rating?.avg_rating || (isOfficial ? '4.9' : '4.8')} ★
                            </div>
                            <div className="text-[10px] font-bold text-amber-700/80 dark:text-amber-400/80 mt-1 truncate">
                                {merchant?.rating?.total_ratings ? `${merchant.rating.total_ratings}+ ratings` : 'Verified Reviews'}
                            </div>
                        </div>
                    </div>

                    {/* Delivery Speed Pill */}
                    <div className="flex items-center gap-2.5 p-2.5 sm:p-3 rounded-2xl bg-sky-500/10 border border-sky-500/20 text-sky-900 dark:text-sky-300">
                        <div className="w-8 h-8 rounded-xl bg-sky-500/20 flex items-center justify-center shrink-0">
                            <Zap size={16} className="text-sky-500 fill-sky-500" />
                        </div>
                        <div className="min-w-0">
                            <div className="text-xs font-black leading-none">Same-Day</div>
                            <div className="text-[10px] font-bold text-sky-700/80 dark:text-sky-400/80 mt-1 truncate">
                                Guaranteed Delivery
                            </div>
                        </div>
                    </div>

                    {/* Location / Department Pill */}
                    <div className="flex items-center gap-2.5 p-2.5 sm:p-3 rounded-2xl bg-slate-100 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 text-slate-800 dark:text-slate-200">
                        <div className="w-8 h-8 rounded-xl bg-slate-200/70 dark:bg-white/10 flex items-center justify-center shrink-0">
                            <MapPin size={16} className="text-slate-600 dark:text-slate-400" />
                        </div>
                        <div className="min-w-0">
                            <div className="text-xs font-black leading-none truncate">
                                {merchant?.business_address || 'Express Storefront'}
                            </div>
                            <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 mt-1 truncate">
                                Verified Merchant
                            </div>
                        </div>
                    </div>

                    {/* Buyer Guarantee Pill */}
                    <div className="flex items-center gap-2.5 p-2.5 sm:p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-900 dark:text-emerald-300">
                        <div className="w-8 h-8 rounded-xl bg-emerald-500/20 flex items-center justify-center shrink-0">
                            <ShieldCheck size={16} className="text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <div className="min-w-0">
                            <div className="text-xs font-black leading-none">100% Original</div>
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
