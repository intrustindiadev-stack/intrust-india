import React from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { Gift, Package, ChevronRight } from 'lucide-react';

export default function QuickActions() {
    return (
        <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-white dark:bg-gray-800 rounded-3xl border border-slate-100 dark:border-gray-700 p-6 shadow-sm"
        >
            <h3 className="font-bold text-slate-900 dark:text-gray-100 mb-4">Quick Actions</h3>
            <div className="space-y-2">
                <Link href="/gift-cards" className="flex items-center gap-3 p-3 rounded-xl hover:bg-blue-50 dark:hover:bg-blue-900/30 group transition-colors">
                    <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-colors">
                        <Gift size={20} />
                    </div>
                    <div className="font-bold text-slate-700 dark:text-gray-300 group-hover:text-blue-700 dark:group-hover:text-blue-400">Buy Gift Cards</div>
                    <ChevronRight size={16} className="ml-auto text-slate-400" />
                </Link>
                <Link href="/my-giftcards" className="flex items-center gap-3 p-3 rounded-xl hover:bg-purple-50 dark:hover:bg-purple-900/30 group transition-colors">
                    <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/50 text-purple-600 dark:text-purple-400 flex items-center justify-center group-hover:bg-purple-600 group-hover:text-white transition-colors">
                        <Package size={20} />
                    </div>
                    <div className="font-bold text-slate-700 dark:text-gray-300 group-hover:text-purple-700 dark:group-hover:text-purple-400">My Orders</div>
                    <ChevronRight size={16} className="ml-auto text-slate-400" />
                </Link>
            </div>
        </motion.div>
    );
}
