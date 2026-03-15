'use client';

import { memo } from 'react';
import { Star, Flame, Store, Clock, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import Image from 'next/image';
import VerifiedBadge from '@/components/ui/VerifiedBadge';

const GiftCardItem = memo(function GiftCardItem({ coupon, index = 0 }) {


    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: index * 0.05 }}
            className="h-full"
        >
            <Link
                href={`/gift-cards/${coupon.id}`}
                className="group relative bg-white dark:bg-gray-800 rounded-3xl overflow-hidden border border-gray-100 dark:border-gray-700 hover:border-[#92BCEA]/50 dark:hover:border-[#92BCEA]/50 transition-all duration-300 hover:shadow-2xl hover:shadow-[#92BCEA]/20 dark:hover:shadow-[#92BCEA]/10 hover:-translate-y-1 h-full flex flex-col cursor-pointer"
            >
                {/* Card Header - Adaptive Fintech Card Face */}
                <div className="relative h-36 sm:h-48 overflow-hidden bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-gray-800 dark:via-slate-800 dark:to-gray-900">

                    {/* Decorative radial glow orbs */}
                    <div className={`absolute -top-10 -right-10 w-40 h-40 rounded-full blur-3xl opacity-15 dark:opacity-20 ${coupon.gradient ? `bg-gradient-to-br ${coupon.gradient}` : 'bg-primary'}`} />
                    <div className={`absolute -bottom-10 -left-10 w-40 h-40 rounded-full blur-3xl opacity-15 dark:opacity-20 ${coupon.gradient ? `bg-gradient-to-tr ${coupon.gradient}` : 'bg-primary'}`} />

                    {/* Chip line accent */}
                    <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-[#92BCEA] to-[#AFB3F7]" />

                    {/* Decorative card-number dots */}
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 font-mono text-gray-400 dark:text-white/30 text-xs tracking-[0.3em] pointer-events-none z-10">
                        •••• •••• •••• ••••
                    </div>

                    {coupon.image_url ? (
                        <div className="relative w-full h-full flex items-center justify-center bg-transparent z-10 pb-6 sm:pb-8">
                            <div className="relative w-[140px] h-[72px] sm:w-[160px] sm:h-[84px] bg-white rounded-2xl shadow-sm border border-gray-100/80 filter drop-shadow-[0_4px_12px_rgba(0,0,0,0.05)] dark:drop-shadow-[0_4px_20px_rgba(0,0,0,0.4)] transition-all duration-500 group-hover:-translate-y-1 group-hover:scale-105">
                                <Image
                                    src={coupon.image_url}
                                    alt={coupon.title || coupon.brand}
                                    fill
                                    className="object-contain p-2 sm:p-2.5"
                                    priority={index < 4}
                                />
                            </div>
                        </div>
                    ) : (
                        <>
                            {/* Fallback to original design elements if no image */}

                            {/* Subtle Animated Background */}
                            <div className="absolute inset-0 opacity-20 pointer-events-none">
                                <div className="absolute top-0 right-0 w-40 h-40 bg-white rounded-full blur-3xl animate-pulse-slow" />
                            </div>

                            {/* Brand Logo - Premium */}
                            <div className="absolute top-4 left-4 w-14 h-14 bg-white rounded-2xl flex items-center justify-center text-2xl shadow-xl border border-gray-100 z-10">
                                {coupon.logo}
                            </div>
                        </>
                    )}

                    {/* Glassmorphism Overlay on Hover */}
                    <div className="absolute inset-0 bg-white/0 group-hover:bg-white/10 backdrop-blur-0 group-hover:backdrop-blur-sm transition-all duration-500 pointer-events-none z-10" />

                    {/* Frosted Glass Title Bar */}
                    <div className="absolute bottom-0 left-0 right-0 p-3 pt-6 flex items-end justify-between bg-gradient-to-t from-white/80 via-white/40 to-transparent dark:from-gray-900/80 dark:via-gray-900/40 dark:to-transparent backdrop-blur-sm z-20">
                        <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white drop-shadow-sm truncate pr-2">
                            {coupon.title || coupon.brand}
                        </h3>
                        {coupon.category && (
                            <span className="text-xs font-semibold px-2 py-1 rounded bg-black/5 dark:bg-white/10 text-gray-700 dark:text-gray-300 flex-shrink-0">
                                {coupon.category}
                            </span>
                        )}
                    </div>

                    {/* Discount Badge - Pulsing */}
                    {coupon.discount > 0 && (
                        <div className="absolute top-4 right-4 z-20">
                            <div className="relative">
                                <div className="absolute inset-0 bg-green-400 rounded-full blur-md opacity-50 animate-pulse" />
                                <div className="relative bg-gradient-to-r from-green-500 to-emerald-500 text-white px-3 py-1.5 rounded-full shadow-lg">
                                    <span className="text-xs font-bold">
                                        {coupon.discount}% OFF
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Top Left Badges - Stacked Vertically */}
                    <div className="absolute top-4 left-4 flex flex-col gap-2 z-20 items-start">
                        {/* Stock Warning - Urgent */}
                        {coupon.stock < 10 && coupon.stock > 0 && (
                            <div className="bg-gradient-to-r from-red-500 to-orange-500 text-white px-3 py-1.5 rounded-full text-xs font-bold shadow-lg flex items-center gap-1.5 animate-pulse">
                                <Flame size={12} />
                                Only {coupon.stock} left
                            </div>
                        )}
                        
                        {/* Pay Later / Request Badges */}
                        {coupon.requestStatus === 'pending' ? (
                            <div className="bg-blue-500/90 backdrop-blur-sm text-white px-3 py-1.5 rounded-full text-xs font-bold shadow-lg flex items-center gap-1.5 animate-pulse">
                                <Clock size={12} />
                                Request Sent
                            </div>
                        ) : coupon.requestStatus === 'approved' ? (
                            <div className="bg-green-500/90 backdrop-blur-sm text-white px-3 py-1.5 rounded-full text-xs font-bold shadow-lg flex items-center gap-1.5">
                                <CheckCircle2 size={12} />
                                Active Credit
                            </div>
                        ) : coupon.udhariEnabled ? (
                            <div className="bg-amber-500/90 backdrop-blur-sm text-white px-3 py-1.5 rounded-full text-xs font-bold shadow-lg flex items-center gap-1.5">
                                <Clock size={12} />
                                Store Credit
                            </div>
                        ) : null}
                    </div>

                    {/* Sold Out Overlay */}
                    {coupon.stock === 0 && (
                        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-30">
                            <div className="bg-white text-gray-900 px-6 py-2.5 rounded-2xl font-bold shadow-xl">
                                SOLD OUT
                            </div>
                        </div>
                    )}
                </div>

                {/* Card Body - Premium */}
                <div className="p-3 sm:p-5 flex-1 flex flex-col bg-white dark:bg-gray-900 border-t border-[#92BCEA]/20 dark:border-[#92BCEA]/30">
                    
                    {/* Card Title Label */}
                    <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-1 line-clamp-1">
                        {coupon.title || coupon.brand}
                    </div>

                    {/* Price Section */}
                    <div className="flex items-baseline justify-between mb-4">
                        <div>
                            <div className="text-xs text-gray-400 dark:text-gray-500 font-medium mb-1 line-through">₹{coupon.value}</div>
                            <div className="text-xl sm:text-3xl font-bold bg-gradient-to-r from-[#92BCEA] to-[#AFB3F7] bg-clip-text text-transparent">
                                ₹{coupon.sellingPrice}
                            </div>
                        </div>
                        <div className="text-right">
                            <div className="text-sm font-bold text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-500/10 px-2 py-1 rounded-lg">
                                Save ₹{(coupon.value - coupon.sellingPrice).toFixed(0)}
                            </div>
                        </div>
                    </div>

                    {/* Merchant Badge - Fintech Style */}
                    <div className="mb-3 bg-gray-50 dark:bg-gray-800 rounded-r-xl rounded-l-sm px-3 py-2 border-l-2 border-[#92BCEA]">
                        <div className="flex items-center gap-2">
                            <Store size={14} className="text-gray-500 dark:text-gray-400 flex-shrink-0" />
                            <span className="text-xs text-gray-500 dark:text-gray-400">Sold by</span>
                            <span className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                                {coupon.merchant}
                            </span>
                            {coupon.verified && (
                                <VerifiedBadge size="sm" className="flex-shrink-0" />
                            )}
                        </div>
                    </div>

                    {/* Rating and Sales Info */}
                    <div className="flex items-center gap-2 pb-4 border-b border-gray-100 dark:border-gray-700 mb-4">
                        <div className="flex items-center gap-1 bg-yellow-50 dark:bg-yellow-500/10 px-2 py-1 rounded-full">
                            <Star size={12} className="fill-yellow-400 text-yellow-500 dark:text-yellow-400" />
                            <span className="text-xs font-bold text-gray-900 dark:text-gray-100">{coupon.rating.toFixed(1)}</span>
                        </div>
                        <span className="text-gray-400 dark:text-gray-600 text-xs">•</span>
                        <span className="text-xs text-gray-600 dark:text-gray-400 font-medium">{coupon.sold} sold</span>
                    </div>

                    {/* CTA Button */}
                    <div className="w-full py-2 sm:py-3.5 bg-gradient-to-r from-[#92BCEA] to-[#AFB3F7] shadow-lg shadow-[#92BCEA]/30 dark:shadow-[#92BCEA]/20 text-white font-semibold tracking-wide text-sm rounded-2xl transition-all duration-300 hover:shadow-xl hover:shadow-[#92BCEA]/40 flex items-center justify-center gap-2 mt-auto relative z-20">
                        <span>Buy Now</span>
                        <span className="group-hover:translate-x-1 transition-transform">→</span>
                    </div>
                </div>
            </Link>
        </motion.div>
    );
});

export default GiftCardItem;
