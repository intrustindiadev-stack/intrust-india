'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Store, Star, MapPin, Phone, ShieldCheck, ArrowRight, Clock } from 'lucide-react';

export default function VerifiedStoresNearby({ merchants = [] }) {
    if (!merchants || merchants.length === 0) return null;

    return (
        <div className="w-full space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl sm:text-2xl font-black text-on-surface tracking-tight flex items-center gap-2">
                        <span>🏬 Nearby Verified Stores (Bhopal)</span>
                    </h2>
                    <p className="text-xs sm:text-sm text-on-surface-variant font-medium mt-0.5">
                        Order online and pick up in 2 hours with direct merchant contact.
                    </p>
                </div>
                <Link
                    href="/shop"
                    className="text-xs font-bold text-primary hover:text-blue-700 flex items-center gap-1 group"
                >
                    <span>All Stores</span>
                    <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {merchants.map((merchant) => {
                    const fallbackBanner = `https://images.unsplash.com/photo-1542838132-92c53300491e?w=600&auto=format&fit=crop&q=80`;
                    const banner = merchant.shopping_banner_url || fallbackBanner;
                    const merchantPhone = merchant.phone || merchant.business_phone || '+91 755 492 8840';

                    return (
                        <div
                            key={merchant.id}
                            className="group bg-surface-container-lowest hover:bg-surface-container-low rounded-3xl p-4 border border-outline-variant/30 hover:border-primary/40 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between"
                        >
                            <div>
                                {/* Banner */}
                                <div className="relative h-44 w-full rounded-2xl overflow-hidden bg-surface-container-low mb-4">
                                    <img
                                        src={banner}
                                        alt={merchant.business_name}
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

                                    {/* Open / 2-Hr Pickup badge */}
                                    <div className="absolute top-3 left-3 flex items-center gap-2">
                                        <span className="px-2.5 py-1 rounded-full bg-emerald-600 text-white text-[10px] font-black uppercase tracking-wider shadow-sm flex items-center gap-1">
                                            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                                            Open Now
                                        </span>
                                        <span className="px-2 py-1 rounded-full bg-black/50 backdrop-blur-md text-white text-[10px] font-bold">
                                            2-Hr Pickup
                                        </span>
                                    </div>

                                    {/* Rating */}
                                    <div className="absolute top-3 right-3 px-2 py-1 rounded-xl bg-white/95 backdrop-blur-md text-slate-900 text-xs font-black flex items-center gap-1 shadow-sm">
                                        <Star size={12} className="text-amber-500 fill-amber-500" />
                                        <span>4.8</span>
                                    </div>

                                    {/* Distance */}
                                    <div className="absolute bottom-3 left-3 flex items-center gap-1 text-white text-xs font-semibold">
                                        <MapPin size={13} className="text-[#D4AF37]" />
                                        <span>0.8 km • MP Nagar, Bhopal</span>
                                    </div>
                                </div>

                                {/* Store Title & Verified Badge */}
                                <div className="flex items-center gap-2 mb-1">
                                    <h3 className="font-extrabold text-base text-on-surface truncate group-hover:text-primary transition-colors">
                                        {merchant.business_name}
                                    </h3>
                                    <ShieldCheck size={16} className="text-[#D4AF37] shrink-0" title="Verified Merchant" />
                                </div>

                                <p className="text-xs text-on-surface-variant font-medium line-clamp-1 mb-3">
                                    {merchant.business_address || 'Electronics, Mobiles, Soundbars & Home Audio'}
                                </p>
                            </div>

                            {/* Store Action Bar with Merchant Phone */}
                            <div className="pt-3 border-t border-outline-variant/20 flex items-center justify-between gap-3">
                                <a
                                    href={`tel:${merchantPhone}`}
                                    className="px-3 py-2 rounded-xl bg-surface-container-low hover:bg-surface-container-high text-on-surface text-xs font-bold flex items-center gap-1.5 border border-outline-variant/20 transition-colors"
                                    title="Call Store"
                                >
                                    <Phone size={13} className="text-emerald-600" />
                                    <span>Call</span>
                                </a>

                                <Link
                                    href={`/shop/${merchant.slug || merchant.id}`}
                                    className="flex-1 py-2 px-3 rounded-xl bg-primary hover:bg-blue-700 text-white text-xs font-bold text-center flex items-center justify-center gap-1.5 shadow-md transition-all active:scale-95"
                                >
                                    <span>Explore Catalog</span>
                                    <ArrowRight size={13} />
                                </Link>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
