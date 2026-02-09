'use client';

import { motion } from 'framer-motion';
import { Zap, ArrowRight, Gift, Percent } from 'lucide-react';
import Link from 'next/link';

export default function DealsBanner({ deals = [] }) {
    const featuredDeal = deals[0] || {
        brand: 'Flipkart',
        discount: '15%',
        emoji: '🛒',
        gradient: 'from-blue-600 to-cyan-500'
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-purple-500 via-pink-500 to-red-500 p-1 shadow-xl"
        >
            {/* Animated background */}
            <div className="absolute inset-0">
                <div className="absolute inset-0 bg-gradient-to-r from-purple-400/30 to-pink-400/30 animate-pulse" />
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
            </div>

            <div className="relative bg-gradient-to-br from-purple-600 to-pink-600 rounded-xl p-6 sm:p-8">
                <div className="flex flex-col sm:flex-row items-center gap-6">
                    {/* Icon */}
                    <div className="flex-shrink-0">
                        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-white/10 backdrop-blur-sm border-2 border-white/20 flex items-center justify-center text-4xl">
                            {featuredDeal.emoji}
                        </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 text-center sm:text-left">
                        <div className="flex items-center gap-2 justify-center sm:justify-start mb-2">
                            <Zap size={20} className="text-yellow-300 fill-yellow-300" />
                            <span className="text-yellow-300 font-bold text-sm uppercase tracking-wide">
                                Hot Deals
                            </span>
                        </div>
                        <h3 className="text-2xl sm:text-3xl font-bold text-white mb-2">
                            Save up to {featuredDeal.discount} on {featuredDeal.brand}
                        </h3>
                        <p className="text-purple-100 text-sm sm:text-base">
                            Limited time offer! Grab amazing discounts on top brands
                        </p>
                    </div>

                    {/* CTA */}
                    <div className="flex-shrink-0">
                        <Link
                            href="/gift-cards"
                            className="group inline-flex items-center gap-2 px-6 sm:px-8 py-3 sm:py-4 bg-white hover:bg-gray-100 text-purple-600 font-bold rounded-xl transition-all shadow-lg hover:shadow-2xl hover:scale-105"
                        >
                            Shop Now
                            <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                        </Link>
                    </div>
                </div>

                {/* Quick Stats */}
                <div className="flex items-center justify-center sm:justify-start gap-6 mt-6 pt-6 border-t border-white/20">
                    <div className="flex items-center gap-2 text-white">
                        <Gift size={18} />
                        <span className="text-sm font-semibold">2,847 Cards Available</span>
                    </div>
                    <div className="flex items-center gap-2 text-white">
                        <Percent size={18} />
                        <span className="text-sm font-semibold">Up to 15% Off</span>
                    </div>
                </div>
            </div>
        </motion.div>
    );
}
