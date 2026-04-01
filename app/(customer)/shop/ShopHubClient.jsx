'use client';

import { useState } from 'react';
import { Search, ChevronRight, Store, X } from 'lucide-react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import AdBannerCarousel from '@/components/customer/dashboard/AdBannerCarousel';

const containerVariants = {
    hidden: { opacity: 0 },
    show: {
        opacity: 1,
        transition: {
            staggerChildren: 0.05
        }
    }
};

const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } }
};

export default function ShopHubClient({ merchants = [] }) {
    const [searchQuery, setSearchQuery] = useState('');

    const filtered = merchants.filter((m) =>
        m.business_name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="relative z-10">
            {/* Premium Search Bar */}
            <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="relative group mb-6"
            >
                <div className="absolute inset-0 bg-blue-500/5 dark:bg-blue-500/10 rounded-2xl blur-xl group-focus-within:bg-blue-500/15 transition-all duration-300 pointer-events-none" />
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-white/30 group-focus-within:text-blue-500 transition-colors z-10" size={20} />
                <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search local brands and merchants..."
                    className="w-full pl-12 pr-10 py-4 rounded-2xl bg-white dark:bg-[#12151c] border border-slate-200 dark:border-white/[0.06] shadow-sm focus:shadow-md focus:shadow-blue-500/5 focus:border-blue-500/50 dark:focus:border-blue-500/30 outline-none font-bold text-sm md:text-base placeholder:text-slate-400 dark:placeholder:text-white/20 transition-all text-slate-900 dark:text-white relative z-0"
                />
                <AnimatePresence>
                    {searchQuery && (
                        <motion.button
                            initial={{ opacity: 0, scale: 0.7 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.7 }}
                            onClick={() => setSearchQuery('')}
                            className="absolute right-4 top-1/2 -translate-y-1/2 z-10 text-slate-400 hover:text-slate-600 dark:hover:text-white/60 transition-colors"
                        >
                            <X size={16} />
                        </motion.button>
                    )}
                </AnimatePresence>
            </motion.div>

            {/* Promotional Banner Carousel — only shown when not actively searching */}
            <AnimatePresence>
                {!searchQuery && (
                    <motion.div
                        key="bannerCarousel"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                        transition={{ duration: 0.35 }}
                        className="mb-8"
                    >
                        <AdBannerCarousel />
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Shop by Merchant Header */}
            <div className="flex items-end justify-between mb-5">
                <div>
                    <h2 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                        <span className="w-7 h-7 rounded-lg bg-blue-500/10 dark:bg-blue-500/20 flex items-center justify-center">
                            <Store size={15} className="text-blue-500" />
                        </span>
                        Explore Brands
                    </h2>
                    <p className="text-sm font-medium text-slate-500 dark:text-white/30 mt-1 ml-9">
                        {searchQuery
                            ? `${filtered.length} result${filtered.length !== 1 ? 's' : ''} for "${searchQuery}"`
                            : 'Shop directly from trusted local merchants'}
                    </p>
                </div>
            </div>

            {/* Merchant Grid */}
            {filtered.length === 0 ? (
                <motion.div
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="py-16 text-center bg-white dark:bg-[#12151c] rounded-3xl border border-slate-100 dark:border-white/[0.04]"
                >
                    <div className="w-14 h-14 bg-slate-100 dark:bg-white/[0.05] rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <Store size={24} className="text-slate-400 dark:text-white/30" />
                    </div>
                    <p className="text-slate-700 dark:text-white/60 font-bold mb-1">No merchants found</p>
                    <p className="text-slate-400 dark:text-white/25 text-sm">
                        Try a different search term
                    </p>
                    <button
                        onClick={() => setSearchQuery('')}
                        className="mt-4 text-blue-500 text-sm font-bold hover:underline"
                    >
                        Clear search
                    </button>
                </motion.div>
            ) : (
                <motion.div
                    variants={containerVariants}
                    initial="hidden"
                    animate="show"
                    className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-4"
                >
                    {filtered.map((merchant, idx) => {
                        const bgClasses = [
                            'from-blue-500 to-indigo-500',
                            'from-emerald-500 to-teal-500',
                            'from-rose-500 to-pink-500',
                            'from-amber-500 to-orange-500',
                            'from-violet-500 to-purple-500'
                        ];
                        const gradient = bgClasses[idx % bgClasses.length];
                        const avatarUrl = merchant.user_profiles?.avatar_url;

                        return (
                            <motion.div key={merchant.id} variants={itemVariants}>
                                <Link
                                    href={`/shop/${merchant.id}`}
                                    className="group flex flex-col h-full bg-white dark:bg-[#12151c] border border-slate-100 dark:border-white/[0.04] rounded-[1.25rem] md:rounded-3xl p-3 md:p-4 hover:shadow-xl hover:shadow-slate-200/50 dark:hover:shadow-black/50 hover:-translate-y-1 transition-all duration-300 relative overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                                >
                                    {/* Top Glow & Highlights */}
                                    <div className="absolute top-0 left-0 w-full h-[2px] opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-r from-transparent via-blue-400 to-transparent" />

                                    {/* Subtle Radial Glow */}
                                    <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full opacity-0 group-hover:opacity-[0.15] dark:group-hover:opacity-[0.1] blur-2xl transition-opacity duration-500 pointer-events-none bg-blue-500" />

                                    {/* Avatar/Logo Wrapper */}
                                    <div className="relative w-full aspect-square rounded-2xl mb-4 overflow-hidden flex items-center justify-center p-3">
                                        <div className="absolute inset-0 opacity-[0.15] dark:opacity-[0.08] transition-opacity duration-300 bg-gradient-to-br from-blue-100 to-blue-50 dark:from-blue-900/50 dark:to-blue-800/30" />

                                        <div className={`w-20 h-20 sm:w-24 sm:h-24 rounded-full flex items-center justify-center text-white text-2xl sm:text-3xl font-black shadow-lg bg-gradient-to-br ${gradient} group-hover:scale-[1.10] group-hover:rotate-3 transition-transform duration-500 ring-4 ring-white dark:ring-[#12151c] relative z-10 overflow-hidden`}>
                                            {avatarUrl ? (
                                                <img
                                                    src={avatarUrl}
                                                    alt={merchant.business_name}
                                                    className="w-full h-full object-cover"
                                                    referrerPolicy="no-referrer"
                                                />
                                            ) : (
                                                <span>{merchant.business_name.substring(0, 2).toUpperCase()}</span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Text & Action */}
                                    <div className="mt-auto flex items-end justify-between">
                                        <div>
                                            <h3 className="text-sm md:text-base font-black text-slate-800 dark:text-white/90 leading-tight group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-1">
                                                {merchant.business_name}
                                            </h3>
                                            <p className="text-[10px] md:text-xs font-bold text-slate-400 dark:text-white/30 mt-1 uppercase tracking-wider flex items-center gap-1">
                                                <Store size={10} /> Brand Store
                                            </p>
                                        </div>

                                        <div className="w-8 h-8 rounded-full bg-slate-50 dark:bg-white/[0.04] flex items-center justify-center text-slate-400 dark:text-white/30 group-hover:bg-blue-500 group-hover:text-white transition-all duration-300 shrink-0 transform group-hover:-translate-x-1 border border-slate-200 dark:border-white/[0.06]">
                                            <ChevronRight size={14} strokeWidth={3} />
                                        </div>
                                    </div>
                                </Link>
                            </motion.div>
                        );
                    })}
                </motion.div>
            )}
        </div>
    );
}
