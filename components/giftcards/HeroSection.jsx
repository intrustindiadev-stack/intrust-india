'use client';

import { motion } from 'framer-motion';

export default function HeroSection() {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="w-full relative overflow-hidden rounded-[2rem] border border-gray-100 dark:border-gray-800 shadow-lg mb-8 group"
        >
            <div className="aspect-[16/9] sm:aspect-[21/9] md:aspect-[3/1] relative w-full overflow-hidden bg-gray-900">
                <img 
                    src="/images/giftcard_banner_premium.png" 
                    alt="Premium Gift Cards" 
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
                
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none" />
                
                <div className="absolute bottom-6 left-6 right-6 sm:bottom-8 sm:left-8">
                    <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-md text-white border border-white/30 px-3 py-1 rounded-full text-[10px] sm:text-xs font-bold mb-3 shadow-lg">
                        ✨ India's Most Trusted
                    </div>
                    <h1 className="text-3xl sm:text-4xl font-extrabold text-white mb-1.5 tracking-tight drop-shadow-lg">
                        Premium Gift Cards
                    </h1>
                    <p className="text-white/80 text-sm sm:text-base font-medium max-w-md drop-shadow">
                        Shop verified gift cards at unbeatable prices with instant digital delivery.
                    </p>
                </div>
            </div>
        </motion.div>
    );
}
