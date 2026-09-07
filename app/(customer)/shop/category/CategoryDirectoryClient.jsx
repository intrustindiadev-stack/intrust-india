'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Search,
    X,
    ChevronRight,
    Sparkles,
    ShoppingBag,
    Package,
    ArrowRight,
    ShieldCheck,
    Grid,
    CheckCircle2,
    SlidersHorizontal,
    Layers
} from 'lucide-react';
import CustomerBreadcrumbs from '@/components/common/CustomerBreadcrumbs';
import { getCategoryIcon, getCategoryImage } from '@/lib/shopping/categories';
import { CATEGORY_MAP, getSubCategories } from '@/lib/constants/categories';

export default function CategoryDirectoryClient({ initialCategories = [], initialCounts = {} }) {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedDepartment, setSelectedDepartment] = useState('all');

    // Build unified categories list combining DB categories and canonical taxonomy
    const categories = useMemo(() => {
        const canonicalKeys = Object.keys(CATEGORY_MAP);
        const map = new Map();

        // Populate from DB if available
        initialCategories.forEach(cat => {
            const name = cat.name || cat.title || '';
            const slug = (cat.slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''));
            map.set(slug, {
                id: cat.id || slug,
                name: name,
                slug: slug,
                description: cat.description || `Explore genuine ${name} products from verified merchants.`,
                image: cat.image_url || getCategoryImage(name),
                itemCount: initialCounts[slug] || initialCounts[name.toLowerCase()] || 0,
                subCategories: getSubCategories(name),
            });
        });

        // Add any missing canonical categories
        canonicalKeys.forEach(canonName => {
            const slug = canonName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
            if (!map.has(slug)) {
                map.set(slug, {
                    id: `canon-${slug}`,
                    name: canonName,
                    slug: slug,
                    description: `Explore top quality ${canonName} essentials and brand deals.`,
                    image: getCategoryImage(canonName),
                    itemCount: initialCounts[slug] || initialCounts[canonName.toLowerCase()] || 0,
                    subCategories: CATEGORY_MAP[canonName] || [],
                });
            } else {
                // Ensure subcategories are merged
                const existing = map.get(slug);
                if (!existing.subCategories || existing.subCategories.length === 0) {
                    existing.subCategories = CATEGORY_MAP[canonName] || [];
                }
            }
        });

        return Array.from(map.values());
    }, [initialCategories, initialCounts]);

    // Filter categories based on search and selected department filter
    const filteredCategories = useMemo(() => {
        let result = categories;

        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase().trim();
            result = result.filter(cat => {
                const nameMatch = cat.name.toLowerCase().includes(q);
                const descMatch = (cat.description || '').toLowerCase().includes(q);
                const subMatch = (cat.subCategories || []).some(sub => sub.toLowerCase().includes(q));
                return nameMatch || descMatch || subMatch;
            });
        }

        return result;
    }, [categories, searchQuery]);

    const totalSubcategories = useMemo(() => {
        let count = 0;
        categories.forEach(c => {
            count += (c.subCategories || []).length;
        });
        return count;
    }, [categories]);

    return (
        <div className="w-full space-y-6 font-body-md text-slate-900 dark:text-on-surface pb-12">
            {/* Breadcrumb Navigation */}
            <CustomerBreadcrumbs 
                items={[
                    { label: 'Shop Hub', href: '/shop' },
                    { label: 'All Categories' }
                ]} 
            />

            {/* ── HERO BANNER ── */}
            <div className="relative overflow-hidden rounded-3xl bg-surface-container-lowest p-6 sm:p-8 border border-outline-variant/30 shadow-sm">
                <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-blue-500/10 blur-3xl pointer-events-none" />
                <div className="absolute left-1/3 -bottom-20 h-48 w-48 rounded-full bg-indigo-500/10 blur-2xl pointer-events-none" />

                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="max-w-2xl space-y-2.5">
                        <div className="flex items-center gap-2">
                            <span className="px-3 py-1 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 text-[11px] font-black uppercase tracking-wider border border-blue-500/20 flex items-center gap-1.5">
                                <Sparkles size={12} className="text-blue-600 dark:text-blue-400" />
                                Product Taxonomy &amp; Directory
                            </span>
                            <span className="text-xs text-slate-400 dark:text-brand-steel">•</span>
                            <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 text-xs font-bold">
                                <ShieldCheck size={14} /> 100% Verified Stores
                            </span>
                        </div>
                        <h1 className="text-2xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">
                            Shop by Category &amp; Department
                        </h1>
                        <p className="text-xs sm:text-sm text-slate-600 dark:text-brand-steel font-medium leading-relaxed">
                            Discover authentic products across {categories.length} major departments and {totalSubcategories}+ curated subcategories from verified Bhopal shops and InTrust Official inventory.
                        </p>
                    </div>

                    {/* Quick Stats Badges */}
                    <div className="flex sm:flex-col gap-3 shrink-0">
                        <div className="px-4 py-2.5 rounded-2xl bg-white dark:bg-surface-container-low border border-slate-200 dark:border-outline-variant/20 shadow-xs flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center font-black">
                                <Grid size={18} />
                            </div>
                            <div>
                                <p className="text-lg font-black text-slate-900 dark:text-white leading-none">
                                    {categories.length}
                                </p>
                                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-brand-steel mt-0.5">
                                    Departments
                                </p>
                            </div>
                        </div>
                        <div className="px-4 py-2.5 rounded-2xl bg-white dark:bg-surface-container-low border border-slate-200 dark:border-outline-variant/20 shadow-xs flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-black">
                                <Layers size={18} />
                            </div>
                            <div>
                                <p className="text-lg font-black text-slate-900 dark:text-white leading-none">
                                    {totalSubcategories}+
                                </p>
                                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-brand-steel mt-0.5">
                                    Subcategories
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Search Bar */}
                <div className="relative mt-6 max-w-xl">
                    <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search departments, subcategories (e.g. Mobiles, Staple food, Men's wear)..."
                        className="w-full h-12 pl-11 pr-10 rounded-2xl bg-slate-100/80 dark:bg-surface-container-low text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-brand-steel text-xs sm:text-sm font-medium border border-transparent focus:border-blue-500 focus:bg-white dark:focus:bg-surface-container-lowest focus:outline-none transition-all shadow-inner"
                    />
                    {searchQuery && (
                        <button
                            type="button"
                            onClick={() => setSearchQuery('')}
                            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-white"
                        >
                            <X size={16} />
                        </button>
                    )}
                </div>
            </div>

            {/* ── CATEGORY DIRECTORY GRID ── */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white tracking-tight">
                            {searchQuery ? `Search Results (${filteredCategories.length})` : 'All Departments'}
                        </h2>
                        <p className="text-xs text-slate-500 dark:text-brand-steel font-medium">
                            Select any category to browse live products and local store inventory
                        </p>
                    </div>

                    <Link
                        href="/shop"
                        className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                    >
                        <span>Back to Storefront</span>
                        <ArrowRight size={13} />
                    </Link>
                </div>

                {filteredCategories.length === 0 ? (
                    <div className="p-12 rounded-3xl bg-white dark:bg-surface-container-lowest border border-slate-200 dark:border-outline-variant/20 text-center space-y-3">
                        <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-surface-container-high mx-auto flex items-center justify-center text-slate-400">
                            <Search size={22} />
                        </div>
                        <h3 className="text-base font-black text-slate-900 dark:text-white">
                            No matching categories found
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-brand-steel max-w-sm mx-auto">
                            We couldn't find any departments or subcategories matching "{searchQuery}". Try searching for Electronics, Groceries, or Fashion.
                        </p>
                        <button
                            onClick={() => setSearchQuery('')}
                            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-sm"
                        >
                            Clear Search
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                        {filteredCategories.map((cat, idx) => {
                            const Icon = getCategoryIcon(cat.name);
                            const categoryHref = `/shop/category/${cat.slug}`;

                            return (
                                <motion.div
                                    key={cat.slug}
                                    initial={{ opacity: 0, y: 12 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.25, delay: Math.min(idx * 0.03, 0.3) }}
                                    className="group rounded-3xl bg-white dark:bg-surface-container-lowest border border-slate-200/80 dark:border-outline-variant/25 hover:border-blue-500/50 dark:hover:border-primary/50 overflow-hidden shadow-xs hover:shadow-lg transition-all duration-300 flex flex-col justify-between"
                                >
                                    <div>
                                        {/* Image Header with Gradient Overlay */}
                                        <div className="relative h-36 w-full overflow-hidden bg-slate-100 dark:bg-black/30">
                                            <img
                                                src={cat.image}
                                                alt={cat.name}
                                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                                loading="lazy"
                                                onError={(e) => {
                                                    e.currentTarget.src = getCategoryImage(cat.name);
                                                }}
                                            />
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent" />
                                            
                                            {/* Icon Squircle Floating Badge */}
                                            <div className="absolute bottom-3 left-4 flex items-center gap-2.5">
                                                <div className="w-10 h-10 rounded-2xl bg-white dark:bg-surface-container-highest shadow-md flex items-center justify-center text-blue-600 dark:text-primary">
                                                    <Icon size={20} strokeWidth={2.2} />
                                                </div>
                                                <div>
                                                    <h3 className="text-base font-black text-white drop-shadow-sm leading-tight">
                                                        {cat.name}
                                                    </h3>
                                                    {cat.itemCount > 0 ? (
                                                        <span className="text-[10px] font-bold text-white/90 drop-shadow-xs">
                                                            {cat.itemCount} Items Available
                                                        </span>
                                                    ) : (
                                                        <span className="text-[10px] font-bold text-white/75 drop-shadow-xs">
                                                            Curated Collection
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Top Tag */}
                                            <div className="absolute top-3 right-3">
                                                <span className="px-2.5 py-0.5 rounded-full bg-black/40 backdrop-blur-md text-white text-[10px] font-bold border border-white/20">
                                                    {cat.subCategories.length} Subcategories
                                                </span>
                                            </div>
                                        </div>

                                        {/* Content & Subcategories */}
                                        <div className="p-4 sm:p-5 space-y-3.5">
                                            <p className="text-xs text-slate-600 dark:text-brand-steel font-medium leading-relaxed line-clamp-2">
                                                {cat.description}
                                            </p>

                                            {/* Subcategories Chip Cloud */}
                                            {cat.subCategories && cat.subCategories.length > 0 && (
                                                <div className="space-y-1.5">
                                                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-brand-steel">
                                                        Popular In {cat.name}
                                                    </span>
                                                    <div className="flex flex-wrap gap-1.5 max-h-24 overflow-hidden">
                                                        {cat.subCategories.slice(0, 6).map((sub, sIdx) => (
                                                            <Link
                                                                key={sIdx}
                                                                href={`/shop/category/${cat.slug}?sub=${encodeURIComponent(sub)}`}
                                                                className="px-2.5 py-1 rounded-lg bg-slate-50 dark:bg-surface-container-low hover:bg-blue-50 dark:hover:bg-blue-900/30 text-slate-700 dark:text-on-surface-variant hover:text-blue-600 dark:hover:text-blue-400 text-[11px] font-semibold border border-slate-200/60 dark:border-outline-variant/15 transition-colors"
                                                            >
                                                                {sub}
                                                            </Link>
                                                        ))}
                                                        {cat.subCategories.length > 6 && (
                                                            <span className="px-2 py-1 text-[10px] font-bold text-slate-400 dark:text-brand-steel self-center">
                                                                +{cat.subCategories.length - 6} more
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Action Link Footer */}
                                    <div className="px-4 sm:px-5 pb-4 sm:pb-5 pt-1">
                                        <Link
                                            href={categoryHref}
                                            className="w-full py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-blue-600 text-slate-800 hover:text-white dark:bg-surface-container-high dark:hover:bg-blue-600 dark:text-white text-xs font-black transition-all flex items-center justify-between group/btn shadow-xs active:scale-98"
                                        >
                                            <span>Explore {cat.name}</span>
                                            <ChevronRight size={15} strokeWidth={2.5} className="group-hover/btn:translate-x-1 transition-transform" />
                                        </Link>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* ── BOTTOM CALLOUT BANNER ── */}
            <div className="rounded-3xl bg-gradient-to-r from-blue-900 via-blue-950 to-slate-950 text-white p-6 sm:p-8 border border-blue-500/30 shadow-lg flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="space-y-2 max-w-xl">
                    <span className="px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 text-[10px] font-black uppercase tracking-wider border border-blue-400/30">
                        Merchant Catalog Integration
                    </span>
                    <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                        Looking for a specific store or item?
                    </h3>
                    <p className="text-xs sm:text-sm text-blue-200/90 font-medium leading-relaxed">
                        Search across all verified local merchants and official brand stores directly from the shop homepage.
                    </p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                    <Link
                        href="/shop"
                        className="px-5 py-2.5 rounded-xl bg-white text-blue-950 hover:bg-blue-50 font-black text-xs transition-all shadow-md active:scale-95 flex items-center gap-1.5"
                    >
                        <span>Go to Shop Home</span>
                        <ArrowRight size={14} />
                    </Link>
                </div>
            </div>
        </div>
    );
}
