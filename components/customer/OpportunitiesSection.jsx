'use client';

import { motion } from 'framer-motion';
import { ShieldCheck, Zap, TrendingUp, Users, Gift, ArrowRight } from 'lucide-react';
import Link from 'next/link';

const features = [
    {
        icon: ShieldCheck,
        title: 'Verified Sellers',
        description: 'All merchants are KYC verified',
        color: 'from-green-500 to-emerald-500'
    },
    {
        icon: Zap,
        title: 'Instant Delivery',
        description: 'Get your gift card codes immediately',
        color: 'from-yellow-500 to-orange-500'
    },
    {
        icon: TrendingUp,
        title: 'Best Prices',
        description: 'Save up to 15% on every purchase',
        color: 'from-blue-500 to-cyan-500'
    },
    {
        icon: Users,
        title: 'Trusted by 10K+',
        description: 'Join thousands of happy customers',
        color: 'from-purple-500 to-pink-500'
    }
];

const opportunities = [
    {
        title: 'Buy Gift Cards',
        description: 'Browse 2,847+ cards from top brands at discounted prices',
        icon: Gift,
        color: 'from-blue-500 to-cyan-500',
        link: '/gift-cards',
        cta: 'Start Shopping'
    },
    {
        title: 'Become a Merchant',
        description: 'Earn ₹50K+ monthly by reselling gift cards',
        icon: TrendingUp,
        color: 'from-green-500 to-emerald-500',
        link: '/merchant-apply',
        cta: 'Apply Now',
        badge: 'Instant Approval'
    }
];

export default function CustomerOpportunitiesSection() {
    return (
        <div className="space-y-12">
            {/* Features Grid */}
            <div>
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="text-center mb-8"
                >
                    <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-gray-100 mb-3">
                        Why Choose InTrust?
                    </h2>
                    <p className="text-gray-600 text-lg">
                        The most trusted gift card marketplace in India
                    </p>
                </motion.div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {features.map((feature, index) => {
                        const Icon = feature.icon;
                        return (
                            <motion.div
                                key={feature.title}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.5, delay: index * 0.1 }}
                                className="bg-white dark:bg-gray-800 rounded-2xl border-2 border-gray-200 dark:border-gray-700 p-6 hover:shadow-xl transition-all hover:-translate-y-1"
                            >
                                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-4 shadow-lg`}>
                                    <Icon size={24} className="text-white" />
                                </div>
                                <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">{feature.title}</h3>
                                <p className="text-sm text-gray-600 dark:text-gray-400">{feature.description}</p>
                            </motion.div>
                        );
                    })}
                </div>
            </div>

            {/* Opportunities Cards */}
            <div>
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.4 }}
                    className="text-center mb-8"
                >
                    <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-gray-100 mb-3">
                        Explore Opportunities
                    </h2>
                    <p className="text-gray-600 text-lg">
                        Save money or earn money - the choice is yours
                    </p>
                </motion.div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {opportunities.map((opportunity, index) => {
                        const Icon = opportunity.icon;
                        return (
                            <motion.div
                                key={opportunity.title}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.5, delay: 0.5 + index * 0.1 }}
                                className="group relative overflow-hidden rounded-2xl bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 hover:border-transparent hover:shadow-2xl transition-all"
                            >
                                {/* Gradient overlay on hover */}
                                <div className={`absolute inset-0 bg-gradient-to-br ${opportunity.color} opacity-0 group-hover:opacity-5 transition-opacity`} />

                                <div className="relative p-8">
                                    <div className="flex items-start justify-between mb-4">
                                        <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${opportunity.color} flex items-center justify-center shadow-lg`}>
                                            <Icon size={28} className="text-white" />
                                        </div>
                                        {opportunity.badge && (
                                            <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full border-2 border-green-200">
                                                {opportunity.badge}
                                            </span>
                                        )}
                                    </div>

                                    <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">{opportunity.title}</h3>
                                    <p className="text-gray-600 dark:text-gray-400 mb-6">{opportunity.description}</p>

                                    <Link
                                        href={opportunity.link}
                                        className={`group/btn inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r ${opportunity.color} hover:opacity-90 text-white font-bold rounded-xl transition-all shadow-lg hover:shadow-xl`}
                                    >
                                        {opportunity.cta}
                                        <ArrowRight size={20} className="group-hover/btn:translate-x-1 transition-transform" />
                                    </Link>
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
