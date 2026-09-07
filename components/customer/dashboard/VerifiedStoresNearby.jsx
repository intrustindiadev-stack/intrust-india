'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Store, Star, MapPin, Phone, ShieldCheck, ArrowRight, Clock } from 'lucide-react';

function VerifiedStoresNearby({ merchants = [] }) {
    const router = useRouter();
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
                    const merchantPhone = merchant.phone || merchant.business_phone;
                    const isOpen = merchant.is_open !== false;
                    const ratingVal = merchant.avg_rating || merchant.rating?.avg_rating;

                    const storeUrl = `/shop/${merchant.slug || merchant.id}`;

                    return (
                        <div
                            key={merchant.id}
                            onClick={() => router.push(storeUrl)}
                            className="group bg-white dark:bg-[#0c0e16] hover:bg-slate-50 dark:hover:bg-white/[0.02] rounded-3xl p-4 border border-slate-200/90 dark:border-white/[0.08] hover:border-blue-500/40 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between cursor-pointer"
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

                                    {/* Open / Direct Order badge */}
                                    <div className="absolute top-3 left-3 flex items-center gap-2">
                                        {isOpen ? (
                                            <span className="px-2.5 py-1 rounded-full bg-emerald-600 text-white text-[10px] font-black uppercase tracking-wider shadow-sm flex items-center gap-1">
                                                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                                                Open Now
                                            </span>
                                        ) : (
                                            <span className="px-2.5 py-1 rounded-full bg-slate-700 text-white text-[10px] font-bold uppercase tracking-wider shadow-sm">
                                                Closed
                                            </span>
                                        )}
                                        <span className="px-2 py-1 rounded-full bg-black/50 backdrop-blur-md text-white text-[10px] font-bold">
                                            Direct Order
                                        </span>
                                    </div>

                                    {/* Rating if present */}
                                    {ratingVal != null && (
                                        <div className="absolute top-3 right-3 px-2 py-1 rounded-xl bg-white/95 backdrop-blur-md text-slate-900 text-xs font-black flex items-center gap-1 shadow-sm">
                                            <Star size={12} className="text-amber-500 fill-amber-500" />
                                            <span>{Number(ratingVal).toFixed(1)}</span>
                                        </div>
                                    )}

                                    {/* Real Location */}
                                    {merchant.business_address && (
                                        <div className="absolute bottom-3 left-3 right-3 flex items-center gap-1 text-white text-xs font-semibold truncate">
                                            <MapPin size={13} className="text-[#D4AF37] shrink-0" />
                                            <span className="truncate">{merchant.business_address}</span>
                                        </div>
                                    )}
                                </div>

                                {/* Store Title & Verified Badge */}
                                <div className="flex items-center gap-2 mb-1">
                                    <h3 className="font-extrabold text-base text-slate-900 dark:text-white truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                        {merchant.business_name}
                                    </h3>
                                    <ShieldCheck size={16} className="text-[#D4AF37] shrink-0" title="Verified Merchant" />
                                </div>

                                {merchant.business_address && (
                                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium line-clamp-1 mb-3">
                                        {merchant.business_address}
                                    </p>
                                )}
                            </div>

                            {/* Store Action Bar with Merchant Phone */}
                            <div className="pt-3 border-t border-slate-100 dark:border-white/5 flex items-center justify-between gap-3">
                                {merchantPhone && (
                                    <a
                                        href={`tel:${merchantPhone}`}
                                        onClick={(e) => e.stopPropagation()}
                                        className="px-3 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/15 text-slate-800 dark:text-white text-xs font-bold flex items-center gap-1.5 border border-slate-200/80 dark:border-white/10 transition-colors"
                                        title="Call Store"
                                    >
                                        <Phone size={13} className="text-emerald-600 dark:text-emerald-400" />
                                        <span>Call</span>
                                    </a>
                                )}

                                <Link
                                    href={storeUrl}
                                    onClick={(e) => e.stopPropagation()}
                                    className="flex-1 py-2.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold text-center flex items-center justify-center gap-1.5 shadow-md transition-all active:scale-95"
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

export default React.memo(VerifiedStoresNearby);
