'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { 
    ChevronRight, 
    Sparkles 
} from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { getCategorySlug, getCategoryIcon, getCategoryImage } from '@/lib/shopping/categories';

const DEFAULT_CATEGORIES = [
    { label: 'Groceries', slug: 'groceries', image: getCategoryImage('groceries'), tint: 'from-emerald-500/10 to-teal-500/5 hover:border-emerald-500/30' },
    { label: 'Electronics', slug: 'electronics', image: getCategoryImage('electronics'), tint: 'from-blue-500/10 to-indigo-500/5 hover:border-blue-500/30' },
    { label: 'Mobiles', slug: 'mobiles', image: getCategoryImage('mobiles'), tint: 'from-purple-500/10 to-fuchsia-500/5 hover:border-purple-500/30' },
    { label: 'Fashion', slug: 'fashion', image: getCategoryImage('fashion'), tint: 'from-pink-500/10 to-rose-500/5 hover:border-pink-500/30' },
    { label: 'Home & Living', slug: 'home', image: getCategoryImage('home'), tint: 'from-amber-500/10 to-orange-500/5 hover:border-amber-500/30' },
    { label: 'Beauty & Care', slug: 'beauty', image: getCategoryImage('beauty'), tint: 'from-rose-500/10 to-pink-500/5 hover:border-rose-500/30' },
    { label: 'Sports & Fitness', slug: 'sports', image: getCategoryImage('sports'), tint: 'from-cyan-500/10 to-blue-500/5 hover:border-cyan-500/30' },
    { label: 'Solar Tech', slug: 'solar', image: getCategoryImage('solar'), tint: 'from-yellow-500/10 to-amber-500/5 hover:border-yellow-500/30' },
];

export default function CategoryQuickPills() {
    const [categories, setCategories] = useState(DEFAULT_CATEGORIES);

    useEffect(() => {
        const fetchCategories = async () => {
            try {
                const { data, error } = await supabase
                    .from('shopping_categories')
                    .select('*')
                    .eq('is_active', true)
                    .order('display_order', { ascending: true });

                if (!error && data && data.length > 0) {
                    const tintPresets = [
                        'from-emerald-500/10 to-teal-500/5 hover:border-emerald-500/30',
                        'from-blue-500/10 to-indigo-500/5 hover:border-blue-500/30',
                        'from-purple-500/10 to-fuchsia-500/5 hover:border-purple-500/30',
                        'from-pink-500/10 to-rose-500/5 hover:border-pink-500/30',
                        'from-amber-500/10 to-orange-500/5 hover:border-amber-500/30',
                        'from-rose-500/10 to-pink-500/5 hover:border-rose-500/30',
                        'from-cyan-500/10 to-blue-500/5 hover:border-cyan-500/30',
                        'from-yellow-500/10 to-amber-500/5 hover:border-yellow-500/30',
                        'from-teal-500/10 to-emerald-500/5 hover:border-teal-500/30',
                        'from-violet-500/10 to-purple-500/5 hover:border-violet-500/30',
                    ];

                    const mapped = data.map((cat, idx) => {
                        const slug = getCategorySlug(cat);
                        const label = cat.name || cat.label || slug;
                        const image = cat.image_url || getCategoryImage(cat);
                        const Icon = getCategoryIcon(label);

                        return {
                            id: cat.id,
                            label,
                            slug,
                            href: `/shop/category/${slug}`,
                            image,
                            icon: Icon,
                            tint: tintPresets[idx % tintPresets.length],
                        };
                    });
                    setCategories(mapped);
                }
            } catch (err) {
                console.error('Error fetching dashboard categories:', err);
            }
        };
        fetchCategories();
    }, []);

    return (
        <section className="w-full space-y-3">
            <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                    <span className="text-xs font-black uppercase tracking-wider text-on-surface-variant flex items-center gap-1.5">
                        <Sparkles size={14} className="text-sky-500" />
                        Explore Categories
                    </span>
                </div>
                <Link
                    href="/shop/category"
                    className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-0.5 group"
                >
                    <span>View All Categories</span>
                    <ChevronRight size={13} strokeWidth={2.5} className="transition-transform group-hover:translate-x-0.5" />
                </Link>
            </div>

            {/* Responsive Category Grid: 4 columns on mobile, 8 columns on tablet/desktop */}
            <div className="grid grid-cols-4 sm:grid-cols-4 md:grid-cols-8 gap-2 sm:gap-3">
                {categories.map((cat) => {
                    const href = cat.href || `/shop/category/${cat.slug}`;
                    const Icon = cat.icon || getCategoryIcon(cat.label);

                    return (
                        <motion.div
                            key={cat.slug || cat.id}
                            whileHover={{ y: -3, scale: 1.02 }}
                            whileTap={{ scale: 0.96 }}
                            transition={{ type: 'spring', stiffness: 350, damping: 22 }}
                        >
                            <Link
                                href={href}
                                className={`relative flex flex-col items-center justify-between p-2 sm:p-2.5 rounded-2xl bg-gradient-to-b ${cat.tint} bg-surface-container-lowest border border-outline-variant/25 shadow-xs hover:shadow-md transition-all text-center group h-full min-h-[96px] sm:min-h-[110px] overflow-hidden`}
                            >
                                {/* Visual Category Image Container */}
                                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl overflow-hidden bg-white/80 dark:bg-black/20 p-1 flex items-center justify-center relative shadow-xs transition-transform duration-300 group-hover:scale-105">
                                    {cat.image ? (
                                        <img
                                            src={cat.image}
                                            alt={cat.label}
                                            className="w-full h-full object-cover rounded-lg"
                                            onError={(e) => {
                                                // Gracefully fallback to icon container if image fails to load
                                                e.currentTarget.style.display = 'none';
                                                const fallbackEl = e.currentTarget.nextSibling;
                                                if (fallbackEl) fallbackEl.style.display = 'flex';
                                            }}
                                        />
                                    ) : null}
                                    <div 
                                        className="w-full h-full items-center justify-center text-primary"
                                        style={{ display: cat.image ? 'none' : 'flex' }}
                                    >
                                        <Icon size={22} strokeWidth={2.2} />
                                    </div>
                                </div>

                                {/* Multi-line Clean Label (Never clipped into dots) */}
                                <div className="w-full mt-1.5 min-h-[28px] sm:min-h-[32px] flex items-center justify-center px-0.5">
                                    <span className="text-[10px] sm:text-[11px] font-bold text-slate-800 dark:text-slate-200 line-clamp-2 leading-tight group-hover:text-primary transition-colors">
                                        {cat.label}
                                    </span>
                                </div>
                            </Link>
                        </motion.div>
                    );
                })}
            </div>
        </section>
    );
}
