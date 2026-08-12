'use client';

import { motion } from 'framer-motion';
import { ShoppingCart, Sun, Gift, Smartphone, Zap } from 'lucide-react';
import Link from 'next/link';

export default function FintechServiceGrid() {
    const services = [
        { id: 'shop', label: 'E-Commerce', icon: ShoppingCart, color: 'text-indigo-600 bg-indigo-50 dark:text-indigo-400 dark:bg-indigo-900/30', href: '/shop' },
        { id: 'solar', label: 'Solar', icon: Sun, color: 'text-amber-600 bg-amber-50 dark:text-amber-400 dark:bg-amber-900/30', href: '/solar' },
        { id: 'giftcards', label: 'Gift Cards', icon: Gift, color: 'text-pink-600 bg-pink-50 dark:text-pink-400 dark:bg-pink-900/30', href: '/gift-cards' },
        { id: 'nfc', label: 'NFC Service', icon: Smartphone, color: 'text-emerald-600 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-900/30', href: '/nfc-service' },
        { id: 'rewards', label: 'Rewards', icon: Zap, color: 'text-cyan-600 bg-cyan-50 dark:text-cyan-400 dark:bg-cyan-900/30', href: '/rewards' },
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
        <div className="bg-white dark:bg-gray-800 rounded-[2rem] p-6 sm:p-8 shadow-xl shadow-gray-200/40 dark:shadow-none border border-gray-100 dark:border-gray-700">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-black text-gray-900 dark:text-white tracking-tight">Our Services</h3>
                <Link href="/services" className="text-xs font-bold text-indigo-600 hover:text-indigo-500 transition-colors">
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
                            className="flex flex-col items-center gap-2 sm:gap-3 group"
                        >
                            <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl sm:rounded-[1.25rem] flex items-center justify-center transition-all duration-300 group-hover:scale-110 shadow-sm border border-transparent group-hover:border-white/20 ${service.color}`}>
                                <service.icon size={22} className="sm:w-6 sm:h-6" strokeWidth={2.5} />
                            </div>
                            <span className="text-[10px] sm:text-[11px] font-black text-gray-600 dark:text-gray-400 text-center uppercase tracking-widest group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                                {service.label}
                            </span>
                        </Link>
                    </motion.div>
                ))}
            </motion.div>
        </div>
    );
}
