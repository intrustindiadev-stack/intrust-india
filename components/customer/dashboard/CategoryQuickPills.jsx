'use client';

import React from 'react';
import Link from 'next/link';
import { 
    LayoutGrid,
    ShoppingCart,
    Gift,
    CreditCard,
    Wallet,
    ChevronRight,
    Flame
} from 'lucide-react';
import { getCategoryImage } from '@/lib/shopping/categories';

// ── 1. Quick Action Pills with Distinct Vibrant Colors ──
const QUICK_ACTION_PILLS = [
    {
        id: 'categories',
        label: 'Categories',
        icon: LayoutGrid,
        gradient: 'from-blue-600 to-indigo-600 shadow-blue-500/25',
        href: '/shop/category',
    },
    {
        id: 'mart',
        label: 'InTrust Mart',
        icon: ShoppingCart,
        gradient: 'from-rose-500 to-red-600 shadow-rose-500/25',
        href: '/shop',
    },
    {
        id: 'giftcards',
        label: 'Gift Cards',
        icon: Gift,
        gradient: 'from-amber-400 to-amber-600 shadow-amber-500/25',
        href: '/gift-cards',
    },
    {
        id: 'nfc',
        label: 'NFC Cards',
        icon: CreditCard,
        gradient: 'from-emerald-500 to-teal-600 shadow-emerald-500/25',
        href: '/services',
    },
    {
        id: 'wallet',
        label: 'Wallet',
        icon: Wallet,
        gradient: 'from-cyan-500 to-blue-600 shadow-cyan-500/25',
        href: '/wallet',
    },
];

// ── 2. Top 4 Curated Categories (Static 4-Card Grid, Zero Horizontal Scroll Trapping) ──
const TOP_4_CATEGORIES = [
    {
        id: 'mobiles',
        label: 'Mobiles & Tabs',
        slug: 'mobiles',
        badge: '5G & Gadgets',
        image: getCategoryImage('mobiles'),
        href: '/shop/category/mobiles',
    },
    {
        id: 'electronics',
        label: 'Electronics',
        slug: 'electronics',
        badge: 'Audio & Tech',
        image: getCategoryImage('electronics'),
        href: '/shop/category/electronics',
    },
    {
        id: 'fashion',
        label: 'Fashion & Wear',
        slug: 'fashion',
        badge: 'Trending Styles',
        image: getCategoryImage('fashion'),
        href: '/shop/category/fashion',
    },
    {
        id: 'groceries',
        label: 'Mart & Groceries',
        slug: 'groceries',
        badge: 'Daily Essentials',
        image: getCategoryImage('groceries'),
        href: '/shop/category/groceries',
    },
];

export default function CategoryQuickPills() {
    return (
        <section className="w-full space-y-6">
            {/* ── 1. Vibrant Multi-Color Quick Action Pills (Fixed Spacing, Non-Collapsing) ── */}
            <div className="grid grid-cols-5 gap-1.5 xs:gap-2 sm:gap-4 p-3 sm:p-5 rounded-2xl sm:rounded-3xl bg-surface-container-lowest border border-outline-variant/30 shadow-xs">
                {QUICK_ACTION_PILLS.map((item) => {
                    const Icon = item.icon;
                    return (
                        <Link
                            key={item.id}
                            href={item.href}
                            className="flex flex-col items-center min-w-0 w-full group text-center focus:outline-none px-0.5"
                        >
                            <div className={`w-11 h-11 xs:w-12 xs:h-12 sm:w-14 sm:h-14 rounded-[18px] sm:rounded-2xl bg-gradient-to-br ${item.gradient} flex items-center justify-center text-white shadow-md group-hover:scale-105 active:scale-95 transition-all duration-200 shrink-0`}>
                                <Icon className="w-5 h-5 sm:w-6 sm:h-6 stroke-[2.2]" />
                            </div>
                            <span className="w-full text-center text-[10px] sm:text-xs font-bold text-slate-800 dark:text-slate-100 truncate block leading-tight mt-1.5 group-hover:text-primary transition-colors">
                                {item.label}
                            </span>
                        </Link>
                    );
                })}
            </div>

            {/* ── 2. Top 4 Categories (Clean Static Grid — No Scroll Block) ── */}
            <div className="space-y-3">
                <div className="flex items-center justify-between px-1">
                    <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                            <LayoutGrid size={15} className="stroke-[2.5]" />
                        </div>
                        <h2 className="text-base sm:text-lg font-black text-on-surface tracking-tight">
                            Top Categories
                        </h2>
                        <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                            <Flame size={11} className="fill-amber-500" />
                            Featured
                        </span>
                    </div>

                    <Link
                        href="/shop/category"
                        className="text-xs font-bold text-primary hover:text-blue-700 dark:hover:text-blue-400 flex items-center gap-0.5 group"
                    >
                        <span>View All</span>
                        <ChevronRight size={14} className="transition-transform group-hover:translate-x-0.5" />
                    </Link>
                </div>

                {/* 4-Item Responsive Grid: 2 cols on mobile, 4 cols on tablet/desktop */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                    {TOP_4_CATEGORIES.map((cat) => (
                        <Link
                            key={cat.id}
                            href={cat.href}
                            className="group relative h-28 sm:h-32 rounded-2xl sm:rounded-3xl overflow-hidden border border-slate-200/80 dark:border-white/10 shadow-xs hover:shadow-md transition-all duration-300 flex flex-col justify-end p-3 sm:p-4 hover:scale-[1.02] active:scale-[0.98] focus:outline-none"
                        >
                            {/* Background Image with smooth hover scale */}
                            <img
                                src={cat.image}
                                alt={cat.label}
                                className="absolute inset-0 w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500 ease-out"
                                loading="lazy"
                            />

                            {/* Dark Gradient Scrim for crystal clear text readability */}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-black/10 group-hover:from-black/90 transition-colors duration-300" />

                            {/* Card Content */}
                            <div className="relative z-10">
                                <span className="text-[10px] font-bold text-white/75 uppercase tracking-wider block mb-0.5">
                                    {cat.badge}
                                </span>
                                <h3 className="text-xs sm:text-sm font-black text-white leading-tight flex items-center justify-between">
                                    <span>{cat.label}</span>
                                    <ChevronRight size={14} className="opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all text-white/90" />
                                </h3>
                            </div>
                        </Link>
                    ))}
                </div>
            </div>
        </section>
    );
}
