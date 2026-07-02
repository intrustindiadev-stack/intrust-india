'use client';

import { MapPin, BadgeCheck, Phone, Star, Heart, ArrowLeft, Search, Share2 } from 'lucide-react';
import Image from 'next/image';
import RatingStars from '@/components/ui/RatingStars';
import { useTheme } from '@/lib/contexts/ThemeContext';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import toast from 'react-hot-toast';

export default function MerchantProfileCard({ merchant, totalItems, isStoreOpen = true }) {
    const { theme } = useTheme();
    const isDark = theme === 'dark';
    const router = useRouter();
    const [isSaved, setIsSaved] = useState(false);
    
    const bannerImage = merchant?.shopping_banner_url || '/images/default_merchant_banner.png';
    
    const handleShare = async () => {
        try {
            if (navigator.share) {
                await navigator.share({
                    title: merchant?.business_name || 'Intrust Store',
                    text: 'Check out this store on Intrust!',
                    url: window.location.href,
                });
            } else {
                navigator.clipboard.writeText(window.location.href);
                toast.success('Store link copied!');
            }
        } catch (err) {
            console.error('Error sharing', err);
        }
    };
    
    return (
        <div className={`w-full relative overflow-hidden rounded-[2.5rem] bg-white dark:bg-[#0c0e16] shadow-[0_8px_30px_rgb(0,0,0,0.06)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.1)] border border-slate-100 dark:border-white/[0.04]`}>
            {/* Banner Image Area */}
            <div className="relative w-full aspect-[16/9] sm:aspect-[21/9] bg-slate-200 dark:bg-gray-800">
                <Image
                    src={merchant?.id === 'official' ? "/images/intrust_mart_bg.png" : bannerImage}
                    alt={merchant?.business_name || 'Store'}
                    fill
                    className="object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/30" />

                {/* Top Nav Actions overlaid on image */}
                <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-10">
                    <button 
                        onClick={() => router.back()}
                        className="w-11 h-11 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white transition-all hover:bg-white/40 shadow-sm"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div className="flex items-center gap-3">
                        <button 
                            onClick={() => router.push('/shop')}
                            className="w-11 h-11 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white transition-all hover:bg-white/40 shadow-sm"
                        >
                            <Search size={20} />
                        </button>
                        <button 
                            onClick={handleShare}
                            className="w-11 h-11 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white transition-all hover:bg-white/40 shadow-sm"
                        >
                            <Share2 size={20} />
                        </button>
                    </div>
                </div>

                {/* Merchant Title & Badges overlaid on bottom of image */}
                <div className="absolute bottom-5 left-5 right-5 z-10 flex items-end justify-between">
                    <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1.5">
                            <div className="bg-emerald-500 text-white text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded flex items-center gap-1 shadow-sm">
                                <BadgeCheck size={12} /> VERIFIED
                            </div>
                            {!isStoreOpen && (
                                <div className="bg-red-500 text-white text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded shadow-sm">
                                    CLOSED
                                </div>
                            )}
                        </div>
                        <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight leading-none drop-shadow-md">
                            {merchant?.business_name || 'Intrust Store'}
                        </h1>
                    </div>
                    <button 
                        onClick={() => setIsSaved(!isSaved)}
                        className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center transition-all hover:bg-white/40 shadow-lg shrink-0 ml-4 z-10"
                    >
                        <Heart size={24} className={isSaved ? "fill-red-500 text-red-500" : "text-white"} />
                    </button>
                </div>
            </div>

            {/* Merchant Details Bar */}
            <div className="flex flex-wrap items-center justify-between gap-4 p-5 sm:px-6 sm:py-5 border-t border-slate-100 dark:border-white/[0.04]">
                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2">
                        <Star size={20} className="fill-[#ffb703] text-[#ffb703]" />
                        <div className="flex flex-col">
                            <span className="text-[15px] font-black text-slate-900 dark:text-white leading-none">
                                {merchant?.rating?.avg_rating || (merchant?.id === 'official' ? 4.9 : 4.2)}
                            </span>
                            <span className="text-[11px] font-bold text-slate-500">
                                {merchant?.rating?.total_ratings || 0}+ ratings
                            </span>
                        </div>
                    </div>
                    
                    <div className="w-px h-8 bg-slate-200 dark:bg-slate-700/50 hidden sm:block" />

                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center">
                            <MapPin size={16} className="text-blue-500" />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[13px] font-bold text-slate-900 dark:text-white max-w-[120px] sm:max-w-[180px] truncate leading-none">
                                {merchant?.business_address || 'Premium Hub'}
                            </span>
                            <span className="text-[11px] font-bold text-slate-500">
                                2.5 km away
                            </span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className="bg-slate-100 dark:bg-white/5 px-4 py-2 rounded-xl flex flex-col items-center justify-center">
                        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Delivery</span>
                        <span className="text-[14px] font-black text-slate-900 dark:text-white">15-25 min</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
