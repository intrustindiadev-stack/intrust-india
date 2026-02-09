'use client';

import { motion } from 'framer-motion';
import { TrendingUp, ArrowRight, Sparkles } from 'lucide-react';
import Link from 'next/link';

export default function MerchantOpportunityBanner() {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-green-500 via-emerald-500 to-teal-500 p-1 shadow-xl"
        >
            {/* Animated background effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-green-400/20 to-emerald-400/20 animate-pulse" />

            <div className="relative bg-gradient-to-br from-green-600 to-emerald-600 rounded-xl p-6 sm:p-8">
                <div className="flex flex-col sm:flex-row items-center gap-6">
                    {/* Icon */}
                    <div className="flex-shrink-0">
                        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-white/10 backdrop-blur-sm border-2 border-white/20 flex items-center justify-center">
                            <TrendingUp size={36} className="text-white" />
                        </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 text-center sm:text-left">
                        <div className="flex items-center gap-2 justify-center sm:justify-start mb-2">
                            <Sparkles size={20} className="text-yellow-300" />
                            <span className="text-yellow-300 font-bold text-sm uppercase tracking-wide">
                                Earning Opportunity
                            </span>
                        </div>
                        <h3 className="text-2xl sm:text-3xl font-bold text-white mb-2">
                            Become a Merchant & Start Earning
                        </h3>
                        <p className="text-green-100 text-sm sm:text-base max-w-2xl">
                            Join 500+ merchants earning ₹50,000+ monthly by reselling gift cards. Get instant approval with verified KYC!
                        </p>
                    </div>

                    {/* CTA */}
                    <div className="flex-shrink-0">
                        <Link
                            href="/merchant-apply"
                            className="group inline-flex items-center gap-2 px-6 sm:px-8 py-3 sm:py-4 bg-white hover:bg-gray-100 text-green-600 font-bold rounded-xl transition-all shadow-lg hover:shadow-2xl hover:scale-105"
                        >
                            Apply Now
                            <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                        </Link>
                    </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-white/20">
                    <div className="text-center">
                        <div className="text-2xl sm:text-3xl font-bold text-white">500+</div>
                        <div className="text-xs sm:text-sm text-green-100">Active Merchants</div>
                    </div>
                    <div className="text-center">
                        <div className="text-2xl sm:text-3xl font-bold text-white">₹50K+</div>
                        <div className="text-xs sm:text-sm text-green-100">Avg. Monthly Earning</div>
                    </div>
                    <div className="text-center">
                        <div className="text-2xl sm:text-3xl font-bold text-white">Instant</div>
                        <div className="text-xs sm:text-sm text-green-100">Approval</div>
                    </div>
                </div>
            </div>
        </motion.div>
    );
}
