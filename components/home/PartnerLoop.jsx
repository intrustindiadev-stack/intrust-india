'use client';

import { motion } from 'framer-motion';

import {
    Building2, CreditCard, Landmark, Shield, Zap, TrendingUp, Sparkles, Users,
    Smartphone, ShoppingBag, Globe, Wifi, Store
} from 'lucide-react';

export default function PartnerLoop({ className = "", showBorder = true }) {


    // E-commerce/Digital Service Partners
    const partners = [
        { name: 'Amazon Pay', icon: ShoppingBag },
        { name: 'Google Play', icon: Smartphone },
        { name: 'Apple', icon: Smartphone },
        { name: 'Flipkart', icon: Store },
        { name: 'Netflix', icon: Wifi },
        { name: 'Swiggy', icon: ShoppingBag },
        { name: 'Zomato', icon: Store },
        { name: 'Myntra', icon: Sparkles },
    ];

    const marqueePartners = [...partners, ...partners, ...partners]; // Triple for smoothness

    return (
        <section className={`relative py-10 w-full overflow-hidden flex flex-col items-center justify-center ${showBorder ? 'bg-white dark:bg-gray-900 border-y border-slate-100 dark:border-gray-800' : ''} ${className}`}>

            {/* Main Content Container - Centered */}
            <div className="w-full max-w-7xl px-4 md:px-6 flex flex-col items-center relative z-10">

                {/* Heading - Centered */}
                <div className="text-center mb-2 md:mb-6 w-full">
                    <p className="text-[10px] md:text-sm font-bold text-slate-400 uppercase tracking-widest mb-1">
                        Trusted By Industry Leaders
                    </p>
                </div>

                {/* Infinite Marquee - Centered Container */}
                <div className="relative w-full overflow-hidden mask-linear-gradient flex justify-center">
                    <motion.div
                        className="flex gap-12 md:gap-20 w-max items-center"
                        animate={{ x: "-33.33%" }}
                        transition={{
                            duration: 40,
                            ease: "linear",
                            repeat: Infinity
                        }}
                    >
                        {marqueePartners.map((p, i) => (
                            <div key={i} className="flex items-center gap-3 opacity-70 hover:opacity-100 transition-opacity duration-300 grayscale hover:grayscale-0 cursor-pointer group">
                                <div className="p-3 rounded-xl bg-slate-100 group-hover:bg-[#92BCEA]/10 transition-colors">
                                    <p.icon size={28} className="text-slate-700 group-hover:text-[#6A85B6]" strokeWidth={1.5} />
                                </div>
                                <span className="text-lg font-bold text-slate-700 group-hover:text-slate-900">{p.name}</span>
                            </div>
                        ))}
                    </motion.div>
                </div>
            </div>

            {/* CSS Mask */}
            <style jsx global>{`
                .mask-linear-gradient {
                    mask-image: linear-gradient(to right, transparent, black 15%, black 85%, transparent);
                    -webkit-mask-image: linear-gradient(to right, transparent, black 15%, black 85%, transparent);
                }
            `}</style>
        </section>
    );
}
