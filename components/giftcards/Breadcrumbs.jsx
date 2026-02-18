'use client';

import { Home, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { motion } from 'framer-motion';

export default function Breadcrumbs({ items }) {
    return (
        <motion.nav
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="flex items-center gap-2 text-sm mb-6"
        >
<<<<<<< HEAD
            <Link href="/" className="flex items-center gap-1.5 text-gray-500 hover:text-gray-900 transition-colors">
=======
            <Link href="/" className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 transition-colors">
>>>>>>> origin/yogesh-final
                <Home size={16} />
                <span>Home</span>
            </Link>
            {items.map((item, index) => (
                <div key={index} className="flex items-center gap-2">
                    <ChevronRight size={16} className="text-gray-400" />
                    {item.href ? (
<<<<<<< HEAD
                        <Link href={item.href} className="text-gray-500 hover:text-gray-900 transition-colors">
                            {item.label}
                        </Link>
                    ) : (
                        <span className="text-gray-900 font-semibold">{item.label}</span>
=======
                        <Link href={item.href} className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 transition-colors">
                            {item.label}
                        </Link>
                    ) : (
                        <span className="text-gray-900 dark:text-gray-100 font-semibold">{item.label}</span>
>>>>>>> origin/yogesh-final
                    )}
                </div>
            ))}
        </motion.nav>
    );
}
