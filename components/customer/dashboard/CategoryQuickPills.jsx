'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { 
    Headphones, 
    Smartphone, 
    Shirt, 
    Home, 
    ShoppingBasket, 
    Sun, 
    Gift,
    CreditCard
} from 'lucide-react';

const CATEGORIES = [
    { label: 'All Items', slug: '', icon: ShoppingBasket, color: 'bg-blue-600 text-white' },
    { label: 'Electronics & Audio', slug: 'electronics', icon: Headphones, color: 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' },
    { label: 'Mobiles & Tablets', slug: 'mobiles', icon: Smartphone, color: 'bg-purple-50 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400' },
    { label: 'Fashion & Wear', slug: 'fashion', icon: Shirt, color: 'bg-pink-50 text-pink-600 dark:bg-pink-900/30 dark:text-pink-400' },
    { label: 'Home & Kitchen', slug: 'home', icon: Home, color: 'bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400' },
    { label: 'Solar Subsidy', slug: 'solar', href: '/solar', icon: Sun, color: 'bg-yellow-50 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400' },
    { label: 'Brand Gift Cards', slug: 'gift-cards', href: '/gift-cards', icon: Gift, color: 'bg-rose-50 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400' },
    { label: 'Smart NFC Pass', slug: 'nfc', href: '/nfc-service', icon: CreditCard, color: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400' },
];

export default function CategoryQuickPills() {
    return (
        <div className="w-full">
            <div className="flex items-center gap-2.5 overflow-x-auto pb-2 scrollbar-none">
                {CATEGORIES.map((cat, idx) => {
                    const Icon = cat.icon;
                    const href = cat.href || (cat.slug ? `/shop?category=${cat.slug}` : '/shop');

                    return (
                        <Link
                            key={idx}
                            href={href}
                            className="shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-surface-container-lowest hover:bg-surface-container-low text-on-surface border border-outline-variant/30 hover:border-primary/40 shadow-sm transition-all hover:scale-105 active:scale-95 text-xs font-bold"
                        >
                            <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${cat.color}`}>
                                <Icon size={14} />
                            </div>
                            <span>{cat.label}</span>
                        </Link>
                    );
                })}
            </div>
        </div>
    );
}
