'use client';

import { motion } from 'framer-motion';
import { Sparkles, Star } from 'lucide-react';

export default function HeroSection() {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="relative overflow-hidden bg-gradient-to-br from-[#92BCEA]/10 via-white dark:via-gray-800 to-[#AFB3F7]/10 rounded-3xl border border-gray-100 dark:border-gray-700 p-6 sm:p-8 mb-8"
        >
            {/* Animated Background */}
            <div className="absolute inset-0 overflow-hidden">
                <div className="absolute -top-24 -right-24 w-96 h-96 bg-gradient-to-br from-[#92BCEA]/20 to-[#AFB3F7]/20 rounded-full blur-3xl animate-pulse-slow" />
                <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-gradient-to-br from-[#AFB3F7]/20 to-[#92BCEA]/20 rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: '1s' }} />
            </div>

            {/* Content */}
            <div className="relative z-10 text-center">
                <div className="inline-flex items-center gap-2 bg-gradient-to-r from-[#92BCEA] to-[#AFB3F7] text-white px-4 py-2 rounded-full text-xs sm:text-sm font-bold mb-4 shadow-lg">
                    <Sparkles size={16} />
                    <span>India's Most Trusted Gift Card Marketplace</span>
                </div>

                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 dark:text-white mb-3 sm:mb-4">
                    Buy Gift Cards at{' '}
                    <span className="bg-gradient-to-r from-[#92BCEA] to-[#AFB3F7] bg-clip-text text-transparent">
                        Unbeatable Prices
                    </span>
                </h1>

                <p className="text-base sm:text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto mb-6">
                    Get verified gift cards from trusted merchants with instant delivery and save up to 20% on every purchase
                </p>

                {/* Trust Indicators */}
                <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 text-sm">
                    <div className="flex items-center gap-2">
                        <div className="flex -space-x-2">
                            {[1, 2, 3, 4].map((i) => (
                                <div key={i} className="w-8 h-8 rounded-full bg-gradient-to-br from-[#92BCEA] to-[#AFB3F7] border-2 border-white flex items-center justify-center text-white text-xs font-bold">
                                    {String.fromCharCode(64 + i)}
                                </div>
                            ))}
                        </div>
                        <span className="text-gray-700 dark:text-gray-300 font-semibold">50,000+ Happy Customers</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <div className="flex">
                            {[1, 2, 3, 4, 5].map((i) => (
                                <Star key={i} size={16} className="fill-yellow-400 text-yellow-400" />
                            ))}
                        </div>
                        <span className="text-gray-700 dark:text-gray-300 font-semibold">4.9/5 Rating</span>
                    </div>
                </div>
            </div>
        </motion.div>
    );
}
