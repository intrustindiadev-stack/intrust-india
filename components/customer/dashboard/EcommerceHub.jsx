'use client';

import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Star, ChevronRight, ChevronLeft, ArrowRight } from 'lucide-react';
import Link from 'next/link';

const FALLBACK_CATEGORIES = [
    { name: 'Electronics', icon: '💻', color: 'bg-blue-50 text-blue-600' },
    { name: 'Fashion', icon: '👗', color: 'bg-pink-50 text-pink-600' },
    { name: 'Home', icon: '🏠', color: 'bg-amber-50 text-amber-600' },
    { name: 'Beauty', icon: '✨', color: 'bg-purple-50 text-purple-600' },
    { name: 'Sports', icon: '⚽', color: 'bg-emerald-50 text-emerald-600' },
    { name: 'Books', icon: '📚', color: 'bg-rose-50 text-rose-600' },
    { name: 'Toys', icon: '🧸', color: 'bg-cyan-50 text-cyan-600' },
];

function getCategoryTheme(name, index) {
    const fallback = FALLBACK_CATEGORIES.find(c => c.name.toLowerCase() === name?.toLowerCase());
    if (fallback) return fallback;
    const colors = [
        'bg-blue-50 text-blue-600',
        'bg-pink-50 text-pink-600',
        'bg-amber-50 text-amber-600',
        'bg-purple-50 text-purple-600',
        'bg-emerald-50 text-emerald-600',
        'bg-rose-50 text-rose-600'
    ];
    return {
        icon: '🛍️',
        color: colors[index % colors.length]
    };
}

export default function EcommerceHub({ merchants = [], categories = [] }) {
    const displayCategories = categories.length > 0 ? categories : FALLBACK_CATEGORIES.map(c => ({ name: c.name }));
    const scrollRef = useRef(null);

    const scroll = (direction) => {
        if (scrollRef.current) {
            const { current } = scrollRef;
            const scrollAmount = direction === 'left' ? -200 : 200;
            current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
        }
    };

    return (
        <div className="w-full space-y-10 font-[family-name:var(--font-outfit)] mt-8">
            
            {/* Search & Categories (Responsive & Premium 3D Aesthetic) */}
            <div className="space-y-6">
                <div className="flex items-center justify-between px-1">
                    <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                        Explore Categories
                    </h2>
                    <div className="flex items-center gap-2">
                        <button 
                            onClick={() => scroll('left')}
                            className="w-8 h-8 rounded-full bg-slate-50 dark:bg-gray-800 border border-slate-200 dark:border-gray-700 flex items-center justify-center text-slate-600 dark:text-gray-300 hover:bg-slate-100 dark:hover:bg-gray-700 transition-colors shadow-sm"
                        >
                            <ChevronLeft size={16} />
                        </button>
                        <button 
                            onClick={() => scroll('right')}
                            className="w-8 h-8 rounded-full bg-slate-50 dark:bg-gray-800 border border-slate-200 dark:border-gray-700 flex items-center justify-center text-slate-600 dark:text-gray-300 hover:bg-slate-100 dark:hover:bg-gray-700 transition-colors shadow-sm"
                        >
                            <ChevronRight size={16} />
                        </button>
                    </div>
                </div>

                <div className="relative group">
                    <div 
                        ref={scrollRef}
                        className="flex gap-4 sm:gap-6 overflow-x-auto hide-scrollbar pb-2 px-1 snap-x snap-mandatory"
                        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                    >
                        {displayCategories.map((cat, idx) => {
                            const theme = getCategoryTheme(cat.name, idx);
                            return (
                                <Link href={`/shop/category/${cat.name.toLowerCase().replace(/ /g, '-')}`} key={idx} className="snap-start shrink-0">
                                    <motion.button 
                                        whileHover={{ scale: 1.03, y: -2 }}
                                        whileTap={{ scale: 0.95 }}
                                        className="flex flex-col items-center gap-3 w-[85px] sm:w-[100px] group/btn"
                                    >
                                        <div className={`w-[85px] h-[85px] sm:w-[100px] sm:h-[100px] rounded-[2rem] flex items-center justify-center text-[2.5rem] sm:text-[3rem] shadow-[inset_0_-4px_10px_rgba(0,0,0,0.05),0_8px_20px_rgba(0,0,0,0.04)] dark:shadow-none border border-black/[0.03] dark:border-white/5 transition-all duration-300 group-hover/btn:shadow-lg ${theme.color} dark:bg-white/5`}>
                                            <span className="drop-shadow-lg group-hover/btn:scale-110 transition-transform duration-300">
                                                {cat.image_url ? (
                                                    <img src={cat.image_url} alt={cat.name} className="w-12 h-12 sm:w-16 sm:h-16 object-contain drop-shadow-md" />
                                                ) : theme.icon}
                                            </span>
                                        </div>
                                        <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-[0.15em] text-slate-600 dark:text-slate-400 group-hover/btn:text-slate-900 dark:group-hover/btn:text-white transition-colors">
                                            {cat.name}
                                        </span>
                                    </motion.button>
                                </Link>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Top Rated Stores (Responsive Layout) */}
            <div className="space-y-6 mt-12">
                <div className="flex items-center justify-between px-1">
                    <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2 tracking-tight">
                        <span className="w-8 h-8 rounded-full bg-rose-100 dark:bg-rose-900/30 text-rose-500 flex items-center justify-center"><Star size={16} className="fill-current" /></span>
                        Top Rated Stores
                    </h2>
                    <Link href="/shop" className="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-indigo-600 dark:text-indigo-400 flex items-center gap-1 hover:gap-2 transition-all">
                        View All <ChevronRight size={14} />
                    </Link>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {merchants.length > 0 ? merchants.map((merchant) => (
                        <Link href={`/shop/${merchant.slug}`} key={merchant.id} className="block h-full group">
                            <motion.div whileTap={{ scale: 0.98 }} className="bg-white dark:bg-gray-800 rounded-[2rem] p-4 shadow-sm hover:shadow-xl transition-all duration-300 group cursor-pointer border border-slate-100 dark:border-gray-700 flex flex-col h-full">
                                <div className="relative h-40 sm:h-48 w-full rounded-[1.5rem] overflow-hidden mb-5 bg-slate-100 dark:bg-slate-900">
                                    <img src={merchant.shopping_banner_url || `https://images.unsplash.com/photo-1542838132-92c53300491e?w=500&auto=format&fit=crop&q=60&random=${merchant.id}`} alt={merchant.business_name} className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-700" />
                                    <div className="absolute top-4 right-4 bg-white/90 backdrop-blur text-slate-900 text-xs font-black px-2.5 py-1.5 rounded-xl shadow-sm flex items-center gap-1.5">
                                        4.8 <Star size={12} className="text-amber-400 fill-amber-400" />
                                    </div>
                                    {!merchant.is_open && (
                                        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center">
                                            <span className="bg-rose-500 text-white text-sm font-black px-4 py-2 rounded-full uppercase tracking-widest shadow-lg">Closed</span>
                                        </div>
                                    )}
                                </div>
                                <div className="px-2 pb-1 flex-1 flex flex-col justify-end">
                                    <h3 className="font-black text-slate-900 dark:text-white truncate mb-1 text-lg sm:text-xl">{merchant.business_name}</h3>
                                    <p className="text-xs sm:text-sm font-medium text-slate-500 truncate">{merchant.business_address || 'Premium Local Merchant'}</p>
                                </div>
                            </motion.div>
                        </Link>
                    )) : (
                        <div className="w-full text-center py-12 text-slate-500 font-medium bg-slate-50 dark:bg-gray-800/50 rounded-[2rem]">No stores available right now.</div>
                    )}
                </div>
            </div>

            {/* View All Banner */}
            <div className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 rounded-[2rem] p-6 sm:p-8 text-white flex flex-col sm:flex-row items-center justify-between gap-6 shadow-xl shadow-indigo-500/20">
                <div className="text-center sm:text-left">
                    <h3 className="text-lg sm:text-xl font-black mb-1">Explore Entire Marketplace</h3>
                    <p className="text-xs sm:text-sm text-indigo-100 font-medium">Over 50,000+ products waiting for you.</p>
                </div>
                <Link href="/shop" className="w-full sm:w-auto whitespace-nowrap px-6 py-3.5 bg-white text-indigo-600 font-black rounded-xl hover:scale-105 transition-transform shadow-lg flex items-center justify-center gap-2">
                    Browse All <ArrowRight size={18} />
                </Link>
            </div>
        </div>
    );
}
