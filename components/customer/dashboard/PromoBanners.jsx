'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Gift, Zap, ShieldCheck } from 'lucide-react';
import Link from 'next/link';

export default function PromoBanners() {
    const banners = [
        {
            id: 1,
            title: 'Elite Gold',
            subtitle: 'Unlock Premium Benefits',
            color: 'from-amber-400 to-orange-500',
            icon: ShieldCheck,
            href: '/gold'
        },
        {
            id: 2,
            title: 'Festive Sale',
            subtitle: 'Up to 50% Off Electronics',
            color: 'from-indigo-500 to-purple-600',
            icon: Zap,
            href: '/shop'
        },
        {
            id: 3,
            title: 'Gift Cards',
            subtitle: 'Perfect for every occasion',
            color: 'from-emerald-400 to-teal-500',
            icon: Gift,
            href: '/gift-cards'
        }
    ];

    const [currentBanner, setCurrentBanner] = useState(0);

    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentBanner((prev) => (prev + 1) % banners.length);
        }, 5000);
        return () => clearInterval(timer);
    }, [banners.length]);

    const banner = banners[currentBanner];

    return (
        <div className="w-full relative h-[140px] sm:h-[160px] rounded-[2rem] overflow-hidden shadow-lg group">
            <AnimatePresence mode="wait">
                <motion.div
                    key={banner.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 1.05 }}
                    transition={{ duration: 0.5 }}
                    className={`absolute inset-0 bg-gradient-to-r ${banner.color} p-6 sm:p-8 flex items-center justify-between`}
                >
                    <div className="z-10 text-white space-y-1">
                        <motion.div
                            initial={{ y: 10, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.2 }}
                            className="inline-flex items-center gap-1.5 bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest mb-2"
                        >
                            <banner.icon size={12} />
                            Trending
                        </motion.div>
                        <motion.h3 
                            initial={{ x: -20, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            transition={{ delay: 0.3 }}
                            className="text-2xl sm:text-3xl font-black tracking-tight leading-none"
                        >
                            {banner.title}
                        </motion.h3>
                        <motion.p 
                            initial={{ x: -20, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            transition={{ delay: 0.4 }}
                            className="text-sm font-medium text-white/90"
                        >
                            {banner.subtitle}
                        </motion.p>
                        <motion.div
                            initial={{ y: 10, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.5 }}
                            className="pt-2"
                        >
                            <Link href={banner.href} className="inline-flex items-center text-xs font-bold bg-white text-slate-900 px-4 py-2 rounded-xl hover:scale-105 transition-transform shadow-md">
                                Explore Now
                            </Link>
                        </motion.div>
                    </div>
                    
                    {/* Decorative Elements */}
                    <div className="absolute right-0 top-1/2 -translate-y-1/2 opacity-20 pointer-events-none transition-transform duration-1000 group-hover:scale-110 group-hover:rotate-12">
                        <banner.icon size={120} />
                    </div>
                    <div className="absolute -left-10 -bottom-10 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none" />
                </motion.div>
            </AnimatePresence>
            
            {/* Dots */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5 z-20">
                {banners.map((_, idx) => (
                    <button 
                        key={idx}
                        onClick={() => setCurrentBanner(idx)}
                        className={`h-1.5 rounded-full transition-all duration-300 ${currentBanner === idx ? 'w-4 bg-white' : 'w-1.5 bg-white/50'}`}
                    />
                ))}
            </div>
        </div>
    );
}
