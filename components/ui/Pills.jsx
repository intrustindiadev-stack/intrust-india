'use client';

import { motion } from 'framer-motion';

export default function Pills({ items, className = '' }) {
    if (!items || items.length === 0) return null;

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className={`flex flex-wrap items-center justify-center gap-3 ${className}`}
        >
            {items.map((item, index) => {
                const Icon = item.icon;
                return (
                    <motion.a
                        key={item.label}
                        href={item.href}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{
                            delay: 0.1 + index * 0.05,
                            duration: 0.4,
                            type: 'spring',
                            stiffness: 200,
                            damping: 20
                        }}
                        whileHover={{
                            scale: 1.05,
                            y: -2,
                            boxShadow: '0 8px 20px rgba(146, 188, 234, 0.15)',
                        }}
                        whileTap={{ scale: 0.98 }}
                        className={`flex items-center gap-2 md:gap-3 px-4 py-2 md:px-6 md:py-3 bg-white/60 dark:bg-gray-800/60 border border-white/80 dark:border-gray-700/80 rounded-xl hover:bg-white/95 dark:hover:bg-gray-700/95 hover:border-[#92BCEA]/50 transition-all group shadow-sm hover:shadow-md backdrop-blur-md relative ${item.comingSoon ? 'opacity-60 saturate-50 hover:opacity-80' : ''}`}
                    >
                        <motion.div
                            whileHover={{ rotate: 15 }}
                            transition={{ duration: 0.3 }}
                        >
                            <Icon size={18} className="text-[#617073] dark:text-gray-400 group-hover:text-[#92BCEA] transition-colors" strokeWidth={2} />
                        </motion.div>
                        <span className="text-sm font-medium text-[#171A21] dark:text-gray-100 tracking-wide">
                            {item.label}
                        </span>
                    </motion.a>
                );
            })}
        </motion.div>
    );
}
