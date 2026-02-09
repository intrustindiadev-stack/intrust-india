'use client';

import { TrendingUp, Users, ShoppingBag } from 'lucide-react';
import { motion } from 'framer-motion';

export default function StatsBar() {
    const stats = [
        {
            icon: TrendingUp,
            value: '₹2.5Cr+',
            label: 'Total Savings',
            color: 'text-green-600'
        },
        {
            icon: Users,
            value: '50K+',
            label: 'Happy Customers',
            color: 'text-blue-600'
        },
        {
            icon: ShoppingBag,
            value: '1L+',
            label: 'Cards Sold',
            color: 'text-purple-600'
        }
    ];

    return (
        <div className="grid grid-cols-3 gap-3 sm:gap-6">
            {stats.map((stat, index) => (
                <motion.div
                    key={stat.label}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5, delay: index * 0.1 }}
                    className="text-center"
                >
                    <div className="flex items-center justify-center gap-2 mb-1">
                        <stat.icon size={18} className={stat.color} />
                        <div className={`text-2xl sm:text-3xl font-bold ${stat.color}`}>
                            {stat.value}
                        </div>
                    </div>
                    <div className="text-xs sm:text-sm text-gray-600 font-medium">{stat.label}</div>
                </motion.div>
            ))}
        </div>
    );
}
