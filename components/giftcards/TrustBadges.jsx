'use client';

import { Shield, Zap, Award, HeadphonesIcon, TrendingUp, Users, ShoppingBag } from 'lucide-react';
import { motion } from 'framer-motion';

export default function TrustBadges() {
    const badges = [
        {
            icon: Shield,
            title: '100% Verified',
            subtitle: 'All merchants verified',
            color: 'from-blue-500 to-cyan-500'
        },
        {
            icon: Zap,
            title: 'Instant Delivery',
            subtitle: 'Get codes instantly',
            color: 'from-orange-500 to-amber-500'
        },
        {
            icon: Award,
            title: 'Best Prices',
            subtitle: 'Save up to 20%',
            color: 'from-green-500 to-emerald-500'
        },
        {
            icon: HeadphonesIcon,
            title: '24/7 Support',
            subtitle: 'Always here to help',
            color: 'from-purple-500 to-pink-500'
        }
    ];

    return (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {badges.map((badge, index) => (
                <motion.div
                    key={badge.title}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: index * 0.1 }}
                    className="bg-white rounded-2xl p-4 border border-gray-100 hover:border-gray-200 transition-all hover:shadow-lg group"
                >
                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${badge.color} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
                        <badge.icon size={20} className="text-white" />
                    </div>
                    <h3 className="font-bold text-gray-900 text-sm mb-0.5">{badge.title}</h3>
                    <p className="text-xs text-gray-500">{badge.subtitle}</p>
                </motion.div>
            ))}
        </div>
    );
}
