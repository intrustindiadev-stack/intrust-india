'use client';

import { motion } from 'framer-motion';
import { ShoppingCart, Sun, Gift, Smartphone, Zap } from 'lucide-react';
import Link from 'next/link';

export default function FintechServiceGrid() {
    const services = [
        { id: 'shop', label: 'E-Commerce', icon: ShoppingCart, color: 'text-blue-600 bg-blue-100', href: '/shop' },
        { id: 'solar', label: 'Solar', icon: Sun, color: 'text-amber-500 bg-amber-100', href: '/solar' },
        { id: 'giftcards', label: 'Gift Cards', icon: Gift, color: 'text-purple-600 bg-purple-100', href: '/gift-cards' },
        { id: 'nfc', label: 'NFC Service', icon: Smartphone, color: 'text-indigo-600 bg-indigo-100', href: '/nfc-service' },
        { id: 'rewards', label: 'Rewards', icon: Zap, color: 'text-emerald-600 bg-emerald-100', href: '/rewards' },
    ];

    const containerVariants = {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: { staggerChildren: 0.05 }
        }
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 10 },
        show: { opacity: 1, y: 0 }
    };

    return (
        <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 sm:p-8 shadow-xl shadow-gray-200/40 dark:shadow-black/20 border border-gray-100 dark:border-gray-700/50">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-black text-gray-900 dark:text-white">Our Services</h3>
                <Link href="/services" className="text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 px-3 py-1.5 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors">
                    View All
                </Link>
            </div>

            <motion.div 
                variants={containerVariants} 
                initial="hidden" 
                animate="show"
                className="grid grid-cols-4 sm:grid-cols-5 gap-y-6 gap-x-2 sm:gap-x-4"
            >
                {services.map((service) => (
                    <motion.div key={service.id} variants={itemVariants}>
                        <Link 
                            href={service.href}
                            className="flex flex-col items-center gap-3 group"
                        >
                            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110 shadow-sm ${service.color}`}>
                                <service.icon size={26} strokeWidth={2.5} />
                            </div>
                            <span className="text-[11px] sm:text-xs font-bold text-gray-700 dark:text-gray-300 text-center leading-tight">
                                {service.label}
                            </span>
                        </Link>
                    </motion.div>
                ))}
            </motion.div>
        </div>
    );
}
