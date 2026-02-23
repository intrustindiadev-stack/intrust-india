import React from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

export default function QuickServices({ services }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white/70 dark:bg-gray-800/40 backdrop-blur-xl rounded-2xl sm:rounded-3xl border border-white dark:border-white/5 p-4 sm:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)]"
        >
            <div className="flex items-center justify-between mb-5 sm:mb-8">
                <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-gray-100 tracking-tight">Quick Services</h2>
                <Link href="/services" className="text-blue-600 dark:text-blue-400 text-sm font-black hover:opacity-80 transition-opacity flex items-center gap-1 group/link">
                    View All
                    <ChevronRight size={14} className="group-hover/link:translate-x-1 transition-transform" />
                </Link>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-4 sm:gap-4">
                {services.map((service) => (
                    <Link href={service.href} key={service.id} className="flex flex-col items-center gap-3 group">
                        <div className={`relative w-14 h-14 sm:w-14 sm:h-14 rounded-2xl ${service.color} flex items-center justify-center transition-all duration-500 group-hover:scale-110 group-hover:shadow-lg shadow-gray-200/50 dark:shadow-none`}>
                            <service.icon size={26} className="sm:size-6" />
                            <div className="absolute inset-0 rounded-2xl ring-2 ring-transparent group-hover:ring-current transition-all opacity-20" />
                        </div>
                        <span className="text-[10px] sm:text-xs font-bold text-slate-600 dark:text-gray-400 group-hover:text-slate-900 dark:group-hover:text-white text-center line-clamp-1">{service.label}</span>
                    </Link>
                ))}
            </div>
        </motion.div>
    );
}
