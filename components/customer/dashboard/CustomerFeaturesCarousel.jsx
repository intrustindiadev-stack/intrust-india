'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Car, Smartphone, Zap, ShoppingBag, ShieldCheck, ArrowRight } from 'lucide-react';
import Link from 'next/link';

const carouselItems = [
    {
        id: 'fastag',
        title: 'Recharge Fastag instantly',
        description: 'Skip the queues and recharge your Fastag with a single tap. Earn instant cashback on every recharge.',
        icon: Car,
        color: 'from-orange-500 to-amber-600',
        bgLight: 'bg-orange-50',
        iconColor: 'text-orange-600',
        href: '/fastag',
        cta: 'Recharge Now'
    },
    {
        id: 'intrust-pay',
        title: 'Pay with InTrust Wallet',
        description: 'Secure, fast, and rewarding. Link your cards or top up your wallet for seamless checkout across the platform.',
        icon: Zap,
        color: 'from-blue-600 to-indigo-600',
        bgLight: 'bg-blue-50',
        iconColor: 'text-blue-600',
        href: '/wallet',
        cta: 'Top Up Wallet'
    },
    {
        id: 'nfc-card',
        title: 'Get your NFC Smart Card',
        description: 'Tap and pay at partner merchants. A premium physical card linked directly to your digital identity.',
        icon: Smartphone,
        color: 'from-purple-600 to-violet-600',
        bgLight: 'bg-purple-50',
        iconColor: 'text-purple-600',
        href: '/nfc-service',
        cta: 'Apply Now'
    }
];

export default function CustomerFeaturesCarousel() {
    const [currentIndex, setCurrentIndex] = useState(0);

    // Auto-advance the carousel every 5 seconds
    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentIndex((prev) => (prev + 1) % carouselItems.length);
        }, 5000);
        return () => clearInterval(timer);
    }, []);

    return (
        <div className="relative w-full rounded-[2rem] overflow-hidden bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-sm shadow-blue-500/5 mb-8">
            <div className="p-6 sm:p-8">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-sm font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
                        <ShieldCheck size={16} className="text-emerald-500" /> Discover InTrust
                    </h3>
                    
                    {/* Dots indicator */}
                    <div className="flex items-center gap-1.5">
                        {carouselItems.map((_, idx) => (
                            <button
                                key={idx}
                                onClick={() => setCurrentIndex(idx)}
                                className={`h-1.5 rounded-full transition-all duration-300 ${
                                    idx === currentIndex ? 'w-6 bg-slate-800 dark:bg-slate-200' : 'w-1.5 bg-slate-200 dark:bg-slate-700'
                                }`}
                                aria-label={`Go to slide ${idx + 1}`}
                            />
                        ))}
                    </div>
                </div>

                <div className="relative h-44 sm:h-40 overflow-hidden">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={currentIndex}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            transition={{ duration: 0.4, ease: "easeOut" }}
                            className="absolute inset-0 flex flex-col sm:flex-row items-start sm:items-center gap-5 sm:gap-8"
                        >
                            <div className={`w-16 h-16 sm:w-20 sm:h-20 rounded-2xl ${carouselItems[currentIndex].bgLight} dark:bg-gray-700 flex flex-shrink-0 items-center justify-center`}>
                                {(() => {
                                    const Icon = carouselItems[currentIndex].icon;
                                    return <Icon size={32} className={`${carouselItems[currentIndex].iconColor} dark:text-white`} />;
                                })()}
                            </div>
                            
                            <div className="flex-1 min-w-0">
                                <h4 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white tracking-tight mb-2">
                                    {carouselItems[currentIndex].title}
                                </h4>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 line-clamp-2">
                                    {carouselItems[currentIndex].description}
                                </p>
                                <Link 
                                    href={carouselItems[currentIndex].href}
                                    className={`inline-flex items-center gap-2 text-sm font-bold bg-gradient-to-r ${carouselItems[currentIndex].color} text-transparent bg-clip-text hover:opacity-80 transition-opacity`}
                                >
                                    {carouselItems[currentIndex].cta} <ArrowRight size={16} className={carouselItems[currentIndex].iconColor} />
                                </Link>
                            </div>
                        </motion.div>
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
}
