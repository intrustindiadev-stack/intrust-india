'use client';

import { useState } from 'react';
import { Star, ShieldCheck, Heart, Eye, Flame } from 'lucide-react';
import Link from 'next/link';
import { motion } from 'framer-motion';

export default function GiftCardItem({ coupon, index = 0 }) {
    const [isFavorite, setIsFavorite] = useState(false);
    const viewingCount = Math.floor(Math.random() * 5) + 2; // Random 2-6

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: index * 0.05 }}
            className="h-full"
        >
            <div className="group relative bg-white rounded-3xl overflow-hidden border border-gray-100 hover:border-[#92BCEA]/50 transition-all duration-500 hover:shadow-2xl hover:shadow-[#92BCEA]/20 hover:-translate-y-2 h-full flex flex-col">
                {/* Card Header - Premium Gradient */}
                <div className={`relative h-48 bg-gradient-to-br ${coupon.gradient} overflow-hidden`}>
                    {/* Subtle Animated Background */}
                    <div className="absolute inset-0 opacity-20">
                        <div className="absolute top-0 right-0 w-40 h-40 bg-white rounded-full blur-3xl animate-pulse-slow" />
                    </div>

                    {/* Glassmorphism Overlay on Hover */}
                    <div className="absolute inset-0 bg-white/0 group-hover:bg-white/10 backdrop-blur-0 group-hover:backdrop-blur-sm transition-all duration-500" />

                    {/* Brand Logo - Premium */}
                    <div className="absolute top-4 left-4 w-14 h-14 bg-white rounded-2xl flex items-center justify-center text-2xl shadow-xl border border-gray-100">
                        {coupon.logo}
                    </div>

                    {/* Favorite Button */}
                    <button
                        onClick={(e) => {
                            e.preventDefault();
                            setIsFavorite(!isFavorite);
                        }}
                        className="absolute top-4 right-4 w-10 h-10 bg-white/95 backdrop-blur-sm rounded-full flex items-center justify-center shadow-lg hover:scale-110 transition-all z-10"
                    >
                        <Heart
                            size={18}
                            className={`transition-colors ${isFavorite ? 'fill-red-500 text-red-500' : 'text-gray-700'}`}
                        />
                    </button>

                    {/* Discount Badge - Pulsing */}
                    {coupon.discount > 0 && (
                        <div className="absolute top-16 right-4">
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

                    {/* Stock Warning - Urgent */}
                    {coupon.stock < 10 && coupon.stock > 0 && (
                        <div className="absolute bottom-4 left-4 bg-gradient-to-r from-red-500 to-orange-500 text-white px-3 py-1.5 rounded-full text-xs font-bold shadow-lg flex items-center gap-1.5 animate-pulse">
                            <Flame size={12} />
                            Only {coupon.stock} left
                        </div>
                    )}

                    {/* Live Viewing Indicator */}
                    {coupon.stock > 0 && (
                        <div className="absolute bottom-4 right-4 bg-white/95 backdrop-blur-sm text-gray-700 px-3 py-1.5 rounded-full text-xs font-semibold shadow-md flex items-center gap-1.5">
                            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                            {viewingCount} viewing
                        </div>
                    )}

                    {/* Sold Out Overlay */}
                    {coupon.stock === 0 && (
                        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center">
                            <div className="bg-white text-gray-900 px-6 py-2.5 rounded-2xl font-bold shadow-xl">
                                SOLD OUT
                            </div>
                        </div>
                    )}

                    {/* Brand Name */}
                    <div className="absolute bottom-4 left-4">
                        <h3 className="text-2xl font-bold text-white drop-shadow-lg">
                            {coupon.brand}
                        </h3>
                    </div>

                    {/* Quick View Overlay (Desktop) */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 hidden sm:flex items-end justify-center pb-6">
                        <button className="bg-white text-gray-900 px-5 py-2.5 rounded-full font-bold flex items-center gap-2 shadow-xl hover:scale-105 transition-transform text-sm">
                            <Eye size={16} />
                            Quick View
                        </button>
                    </div>
                </div>

                {/* Card Body - Premium */}
                <div className="p-5 flex-1 flex flex-col bg-gradient-to-b from-white to-gray-50/50">
                    {/* Price Section */}
                    <div className="flex items-baseline justify-between mb-4">
                        <div>
                            <div className="text-xs text-gray-400 font-medium mb-1 line-through">₹{coupon.value}</div>
                            <div className="text-3xl font-bold bg-gradient-to-r from-[#92BCEA] to-[#AFB3F7] bg-clip-text text-transparent">
                                ₹{coupon.sellingPrice}
                            </div>
                        </div>
                        <div className="text-right">
                            <div className="text-sm font-bold text-green-600 bg-green-50 px-2 py-1 rounded-lg">
                                Save ₹{(coupon.value - coupon.sellingPrice).toFixed(0)}
                            </div>
                        </div>
                    </div>

                    {/* Merchant Info - Trust Focused */}
                    <div className="flex items-center gap-2 pb-4 border-b border-gray-100 mb-4">
                        <div className="flex-1 min-w-0">
                            <div className="text-sm font-semibold text-gray-900 truncate flex items-center gap-1.5 mb-1">
                                {coupon.merchant}
                                {coupon.verified && (
                                    <div className="flex-shrink-0 bg-blue-100 rounded-full p-0.5">
                                        <ShieldCheck size={12} className="text-blue-600" />
                                    </div>
                                )}
                            </div>
                            <div className="flex items-center gap-2 text-xs">
                                <div className="flex items-center gap-1 bg-yellow-50 px-2 py-0.5 rounded-full">
                                    <Star size={11} className="fill-yellow-400 text-yellow-400" />
                                    <span className="font-bold text-gray-900">{coupon.rating}</span>
                                </div>
                                <span className="text-gray-400">•</span>
                                <span className="text-gray-600 font-medium">{coupon.sold} sold</span>
                            </div>
                        </div>
                    </div>

                    {/* CTA Button - Premium */}
                    <Link
                        href={`/gift-cards/${coupon.id}`}
                        className="w-full py-3.5 bg-gradient-to-r from-gray-900 to-gray-800 hover:from-[#92BCEA] hover:to-[#AFB3F7] text-white font-bold text-sm rounded-2xl transition-all duration-300 hover:shadow-xl hover:shadow-[#92BCEA]/30 flex items-center justify-center gap-2 group/btn mt-auto"
                    >
                        <span>Buy Now</span>
                        <span className="group-hover/btn:translate-x-1 transition-transform">→</span>
                    </Link>
                </div>
            </div>
        </motion.div>
    );
}
