'use client';

import { motion } from 'framer-motion';
import { ShoppingBag, Laptop, Carrot, Pill, Shirt, Coffee, Utensils } from 'lucide-react';

const CATEGORIES = [
    { id: 'groceries', name: 'Groceries', icon: Carrot, color: 'bg-emerald-50 text-emerald-600', ring: 'ring-emerald-500/20' },
    { id: 'electronics', name: 'Electronics', icon: Laptop, color: 'bg-blue-50 text-blue-600', ring: 'ring-blue-500/20' },
    { id: 'pharmacy', name: 'Pharmacy', icon: Pill, color: 'bg-rose-50 text-rose-600', ring: 'ring-rose-500/20' },
    { id: 'fashion', name: 'Fashion', icon: Shirt, color: 'bg-indigo-50 text-indigo-600', ring: 'ring-indigo-500/20' },
    { id: 'daily', name: 'Daily Needs', icon: ShoppingBag, color: 'bg-amber-50 text-amber-600', ring: 'ring-amber-500/20' },
    { id: 'cafe', name: 'Cafe & Tea', icon: Coffee, color: 'bg-orange-50 text-orange-600', ring: 'ring-orange-500/20' },
    { id: 'restaurants', name: 'Restaurants', icon: Utensils, color: 'bg-red-50 text-red-600', ring: 'ring-red-500/20' },
];

export default function ShopCategoriesCarousel() {
    return (
        <div className="py-2 -mx-4 px-4 sm:mx-0 sm:px-0">
            <h3 className="text-slate-800 dark:text-slate-200 font-black text-sm uppercase tracking-widest mb-3 flex items-center gap-2">
                <span className="w-1.5 h-4 bg-blue-500 rounded-full"></span>
                Shop By Category
            </h3>
            
            <div className="overflow-x-auto custom-scrollbar pb-2 pt-1 -mx-2 px-2">
                <div className="flex items-center gap-4 min-w-max">
                    {CATEGORIES.map((cat, i) => {
                        const Icon = cat.icon;
                        return (
                            <motion.button
                                key={cat.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.05 }}
                                className="flex flex-col items-center group focus:outline-none"
                            >
                                <div className={`w-14 h-14 sm:w-16 sm:h-16 rounded-[1.2rem] flex items-center justify-center transform transition-all duration-300 group-hover:scale-105 group-active:scale-95 shadow-sm group-hover:shadow-md ${cat.color} ring-1 ${cat.ring}`}>
                                    <Icon size={24} strokeWidth={2.5} className="transition-transform duration-300 group-hover:-translate-y-0.5" />
                                </div>
                                <span className="mt-2 text-[10px] sm:text-xs font-bold text-slate-600 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-slate-200 transition-colors">
                                    {cat.name}
                                </span>
                            </motion.button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
