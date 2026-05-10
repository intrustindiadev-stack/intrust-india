'use client';

import { Home, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { motion } from 'framer-motion';

export default function Breadcrumbs({ items }) {
    return (
        <motion.nav
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="flex items-center mb-8"
        >
            <div className="flex items-center gap-1 p-1.5 bg-white/40 dark:bg-white/5 backdrop-blur-xl rounded-full border border-white/40 dark:border-white/10 shadow-sm">
                <Link 
                    href="/dashboard" 
                    className="flex items-center justify-center w-8 h-8 rounded-full bg-white dark:bg-white/10 text-gray-500 dark:text-gray-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-all hover:scale-110 active:scale-95 shadow-sm"
                >
                    <Home size={14} />
                </Link>
                
                {items.map((item, index) => (
                    <div key={index} className="flex items-center gap-1">
                        <ChevronRight size={14} className="text-gray-300 dark:text-gray-600 mx-0.5" />
                        {item.href ? (
                            <Link 
                                href={item.href} 
                                className="px-3 py-1 rounded-full text-xs font-bold text-gray-500 dark:text-gray-400 hover:bg-white/50 dark:hover:bg-white/10 hover:text-gray-900 dark:hover:text-gray-200 transition-all"
                            >
                                {item.label}
                            </Link>
                        ) : (
                            <span className="px-4 py-1 rounded-full bg-emerald-500 text-white text-[10px] font-black uppercase tracking-widest shadow-lg shadow-emerald-500/20">
                                {item.label}
                            </span>
                        )}
                    </div>
                ))}
            </div>
        </motion.nav>
    );
}
