'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Gift, Zap, ShieldCheck } from 'lucide-react';
import Link from 'next/link';

export default function PromoBanners() {
    const banners = [
        {
            id: 1,
            title: 'Elite Gold Member',
            subtitle: 'Unlock 5% extra cashback on all purchases',
            bg: 'bg-gradient-to-r from-amber-500 to-orange-500',
            icon: ShieldCheck,
            href: '/dashboard', // Adjust to point to package modal if needed
            btnText: 'Upgrade Now'
        },
        {
            id: 2,
            title: 'Flash Sale Live!',
            subtitle: 'Get up to 20% off on premium Gift Cards.',
            bg: 'bg-gradient-to-r from-purple-600 to-indigo-600',
            icon: Gift,
            href: '/gift-cards',
            btnText: 'Shop Now'
        },
        {
            id: 3,
            title: 'Solar Investments',
            subtitle: 'Earn up to 12% p.a. returns with Solar.',
            bg: 'bg-gradient-to-r from-blue-500 to-cyan-500',
            icon: Zap,
            href: '/solar',
            btnText: 'Explore Solar'
        }
    ];

    const [currentIndex, setCurrentIndex] = useState(0);

    // Auto scroll
    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentIndex((prev) => (prev + 1) % banners.length);
        }, 5000);
        return () => clearInterval(timer);
    }, [banners.length]);

    const handleNext = () => setCurrentIndex((prev) => (prev + 1) % banners.length);
    const handlePrev = () => setCurrentIndex((prev) => (prev - 1 + banners.length) % banners.length);

    return (
        <div className="relative mt-6 sm:mt-8 overflow-hidden rounded-3xl group shadow-xl shadow-gray-200/40 dark:shadow-black/20">
            <div className="w-full h-40 sm:h-48 relative">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={currentIndex}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.3 }}
                        className={`absolute inset-0 ${banners[currentIndex].bg} p-6 sm:p-8 flex items-center justify-between`}
                    >
                        {/* Background pattern */}
                        <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] pointer-events-none mix-blend-overlay" />
                        
                        <div className="relative z-10 w-2/3">
                            <h3 className="text-xl sm:text-2xl font-black text-white mb-2 leading-tight tracking-tight">
                                {banners[currentIndex].title}
                            </h3>
                            <p className="text-white/80 text-xs sm:text-sm font-medium mb-4">
                                {banners[currentIndex].subtitle}
                            </p>
                            <Link 
                                href={banners[currentIndex].href}
                                className="inline-block bg-white/20 hover:bg-white/30 backdrop-blur-md text-white text-xs font-bold uppercase tracking-wider px-4 py-2 rounded-xl transition-all"
                            >
                                {banners[currentIndex].btnText}
                            </Link>
                        </div>
                        
                        <div className="relative z-10 w-1/3 flex justify-end">
                            <div className="w-16 h-16 sm:w-24 sm:h-24 rounded-full bg-white/10 flex items-center justify-center backdrop-blur-md shadow-2xl">
                                {(() => {
                                    const Icon = banners[currentIndex].icon;
                                    return <Icon size={32} className="text-white sm:w-12 sm:h-12" />;
                                })()}
                            </div>
                        </div>
                    </motion.div>
                </AnimatePresence>
            </div>

            {/* Controls */}
            <button 
                onClick={handlePrev}
                className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/20 text-white flex items-center justify-center backdrop-blur-md opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/40"
            >
                <ChevronLeft size={16} />
            </button>
            <button 
                onClick={handleNext}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/20 text-white flex items-center justify-center backdrop-blur-md opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/40"
            >
                <ChevronRight size={16} />
            </button>

            {/* Dots */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 z-20">
                {banners.map((_, idx) => (
                    <button
                        key={idx}
                        onClick={() => setCurrentIndex(idx)}
                        className={`w-1.5 h-1.5 rounded-full transition-all ${idx === currentIndex ? 'bg-white w-4' : 'bg-white/40 hover:bg-white/60'}`}
                    />
                ))}
            </div>
        </div>
    );
}
