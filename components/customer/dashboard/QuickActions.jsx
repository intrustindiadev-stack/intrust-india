import React from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { Gift, Package, ChevronRight, Sun } from 'lucide-react';

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
                <Link href="/refer" className="flex items-center gap-3 p-3 rounded-xl hover:bg-emerald-50 dark:hover:bg-emerald-900/30 group transition-colors text-emerald-600 dark:text-emerald-400">
                    <div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                        <Gift size={20} />
                    </div>
                    <div className="font-bold">Refer & Earn</div>
                    <ChevronRight size={16} className="ml-auto opacity-60" />
                </Link>
                <Link href="/solar" className="flex items-center gap-3 p-3 rounded-xl hover:bg-amber-50 dark:hover:bg-amber-900/30 group transition-colors">
                    <div className="w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-900/50 text-amber-600 dark:text-amber-400 flex items-center justify-center group-hover:bg-amber-500 group-hover:text-white transition-colors">
                        <Sun size={20} />
                    </div>
                    <div className="font-bold text-slate-700 dark:text-gray-300 group-hover:text-amber-700 dark:group-hover:text-amber-400">
                        Go Solar <span className="text-[10px] font-black bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 px-1.5 py-0.5 rounded-full ml-1 uppercase tracking-widest">Free</span>
                    </div>
                    <ChevronRight size={16} className="ml-auto text-slate-400" />
                </Link>
            </div>
        </motion.div>
    );
}
