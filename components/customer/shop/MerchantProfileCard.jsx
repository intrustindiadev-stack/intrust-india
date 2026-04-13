'use client';

import { MapPin, BadgeCheck, Phone, Star } from 'lucide-react';
import RatingStars from '@/components/ui/RatingStars';
import { useTheme } from '@/lib/contexts/ThemeContext';

export default function MerchantProfileCard({ merchant, totalItems, isStoreOpen = true }) {
    const { theme } = useTheme();
    const isDark = theme === 'dark';
    
    const avatarUrl = merchant?.user_profiles?.avatar_url || (Array.isArray(merchant?.user_profiles) ? merchant?.user_profiles[0]?.avatar_url : null);
    const initials = merchant?.business_name?.substring(0, 2).toUpperCase() || 'S';
    
    return (
        <div className={`w-full relative overflow-hidden rounded-[2rem] ${isDark ? 'bg-white/[0.03] border border-white/[0.08]' : 'bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100'} p-5 sm:p-6 flex flex-col sm:flex-row gap-5 items-start sm:items-center`}>
            {/* Background Accent */}
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-blue-500/10 blur-3xl rounded-full" />
            
            {/* Avatar / Logo */}
            <div className="relative shrink-0 w-[84px] h-[84px] sm:w-[100px] sm:h-[100px] rounded-3xl p-1 bg-gradient-to-br from-blue-500 to-indigo-500 shadow-xl shadow-blue-500/20">
                <div className={`w-full h-full rounded-2xl overflow-hidden flex flex-col items-center justify-center font-black text-2xl ${isDark ? 'bg-[#0f111a] text-white' : 'bg-white text-slate-900'}`}>
                    {avatarUrl ? (
                         <img src={avatarUrl} alt={merchant?.business_name} loading="lazy" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                         <span>{initials}</span>
                    )}
                </div>
                <div className="absolute -bottom-2 -right-2 bg-white dark:bg-[#0f111a] rounded-full p-1 shadow-md">
                    <BadgeCheck size={20} className="text-blue-500" />
                </div>
            </div>

            {/* Merchant Details */}
            <div className="flex-1 min-w-0 w-full relative z-10 pt-1 sm:pt-0">
                <div className="flex flex-col gap-2.5">
                    <h1 className={`text-2xl sm:text-3xl font-[family-name:var(--font-manrope)] font-black tracking-tight leading-none ${isDark ? 'text-white' : 'text-slate-900'} truncate`}>
                        {merchant?.business_name}
                    </h1>
                    
                    <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                        {/* Rating Component */}
                        <div className={`flex items-center shrink-0 px-3 py-1.5 rounded-xl ${isDark ? 'bg-white/5 border border-white/10' : 'bg-white shadow-sm border border-slate-100'}`}>
                            <RatingStars rating={merchant?.rating?.avg_rating || 0} totalRatings={merchant?.rating?.total_ratings || 0} size={12} />
                        </div>

                        {/* Items Available Tag */}
                        <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1.5 rounded-lg ${isDark ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-50 text-blue-600'}`}>
                            {totalItems || 0} Items
                        </span>

                        {/* Store Status Badge */}
                        {!isStoreOpen && (
                            <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-1.5 rounded-lg bg-red-500 text-white shadow-sm flex items-center gap-1.5 animate-pulse">
                                <span className="w-1.5 h-1.5 bg-white rounded-full"></span>
                                Closed
                            </span>
                        )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-flow-col sm:auto-cols-max gap-2 sm:gap-6 mt-1">
                        {merchant?.business_address && (
                            <div className="flex items-center gap-2.5 text-xs sm:text-sm font-semibold text-slate-500 dark:text-slate-400 shrink-0">
                                <div className={`p-1.5 rounded-lg shrink-0 ${isDark ? 'bg-white/5 text-slate-300' : 'bg-slate-100 text-slate-600'}`}>
                                    <MapPin size={14} />
                                </div>
                                <span className="line-clamp-2 max-w-[240px] leading-snug">{merchant.business_address}</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
