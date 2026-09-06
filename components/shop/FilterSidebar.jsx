'use client';

import React, { useState, useMemo } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { Check, Search, RotateCcw } from 'lucide-react';
import { STOREFRONT_FILTERS, PRICE_RANGES } from '@/lib/shop/filterTypes';
import { getSubCategories } from '@/lib/constants/categories';
import FilterGroup from './filters/FilterGroup';
import FilterCheckbox from './filters/FilterCheckbox';
import ColorSwatch from './filters/ColorSwatch';
import SizeGrid from './filters/SizeGrid';

export default function FilterSidebar({ onFilterChange, showHeader = true }) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const activeCategory = searchParams.get('category') || '';
    const activeSubCategory = searchParams.get('sub_category') || '';
    const activeMinPrice = searchParams.get('min_price') || '';
    const activeMaxPrice = searchParams.get('max_price') || '';

    const [subCategorySearch, setSubCategorySearch] = useState('');

    const pushParams = (params) => {
        params.set('page', '1');
        if (onFilterChange) {
            onFilterChange(params);
        } else {
            router.push(`${pathname}?${params.toString()}`, { scroll: false });
        }
    };

    // Sub-category toggle: single select, resets page to 1, preserves category
    const handleSubCategorySelect = (sub) => {
        const params = new URLSearchParams(searchParams);
        if (!sub || sub === 'All' || activeSubCategory.toLowerCase() === sub.toLowerCase()) {
            params.delete('sub_category');
        } else {
            params.set('sub_category', sub);
        }
        pushParams(params);
    };

    // Price range toggle
    const handlePriceToggle = (range) => {
        const params = new URLSearchParams(searchParams);
        const isCurrentMin = (range.min != null ? range.min.toString() : '') === activeMinPrice;
        const isCurrentMax = (range.max != null ? range.max.toString() : '') === activeMaxPrice;

        if (isCurrentMin && isCurrentMax) {
            params.delete('min_price');
            params.delete('max_price');
        } else {
            if (range.min != null) {
                params.set('min_price', range.min.toString());
            } else {
                params.delete('min_price');
            }

            if (range.max != null) {
                params.set('max_price', range.max.toString());
            } else {
                params.delete('max_price');
            }
        }
        pushParams(params);
    };

    // Attribute filters toggle (Brand, Size, Color)
    const handleFilterToggle = (key, value) => {
        const params = new URLSearchParams(searchParams);
        const current = params.get(key) || '';
        
        let values = current ? current.split(',') : [];
        if (values.includes(value)) {
            values = values.filter(v => v !== value);
        } else {
            values = [value]; // Single select per attribute for strict RPC compatibility
        }

        if (values.length > 0) {
            params.set(key, values.join(','));
        } else {
            params.delete(key);
        }

        pushParams(params);
    };

    // Clear all secondary filters while preserving current category from navbar
    const handleClearSecondaryFilters = () => {
        const params = new URLSearchParams(searchParams);
        params.delete('sub_category');
        params.delete('min_price');
        params.delete('max_price');
        params.delete('brand');
        params.delete('size');
        params.delete('color');
        pushParams(params);
    };

    const hasActiveSecondaryFilters = Boolean(
        activeSubCategory || 
        activeMinPrice || 
        activeMaxPrice || 
        searchParams.get('brand') || 
        searchParams.get('size') || 
        searchParams.get('color')
    );

    // Derive canonical sub-categories for the currently selected category
    const availableSubCategories = useMemo(() => {
        return getSubCategories(activeCategory);
    }, [activeCategory]);

    const filteredSubCategories = useMemo(() => {
        if (!subCategorySearch.trim()) return availableSubCategories;
        const q = subCategorySearch.toLowerCase().trim();
        return availableSubCategories.filter(s => s.toLowerCase().includes(q));
    }, [availableSubCategories, subCategorySearch]);

    const renderFilterContent = (filter) => {
        const currentValues = (searchParams.get(filter.id) || '').split(',').filter(Boolean);

        if (filter.type === 'checkbox') {
            return (
                <div className="space-y-0.5">
                    {filter.options.map(opt => (
                        <FilterCheckbox
                            key={opt.value}
                            label={opt.label}
                            isChecked={currentValues.includes(opt.value)}
                            onChange={() => handleFilterToggle(filter.id, opt.value)}
                        />
                    ))}
                </div>
            );
        }

        if (filter.type === 'swatch') {
            return (
                <div className="flex flex-wrap gap-2.5 pt-1 px-1">
                    {filter.options.map(opt => (
                        <ColorSwatch
                            key={opt.value}
                            label={opt.label}
                            hex={opt.hex}
                            isSelected={currentValues.includes(opt.value)}
                            onClick={() => handleFilterToggle(filter.id, opt.value)}
                        />
                    ))}
                </div>
            );
        }

        if (filter.type === 'pills') {
            return (
                <div className="grid grid-cols-3 gap-1.5 pt-1 px-0.5">
                    {filter.options.map(opt => (
                        <SizeGrid
                            key={opt.value}
                            label={opt.label}
                            isSelected={currentValues.includes(opt.value)}
                            onClick={() => handleFilterToggle(filter.id, opt.value)}
                        />
                    ))}
                </div>
            );
        }

        return null;
    };

    return (
        <aside className="space-y-1 h-full pb-8 select-none" aria-label="Product filters">
            {/* Desktop Header with Clear All */}
            {showHeader && (
                <div className="hidden lg:flex items-center justify-between pb-3 mb-1 border-b border-slate-200/80 dark:border-white/10">
                    <span className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
                        Filters
                    </span>
                    {hasActiveSecondaryFilters && (
                        <button
                            type="button"
                            onClick={handleClearSecondaryFilters}
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-sky-600 dark:text-sky-400 hover:text-sky-700 dark:hover:text-sky-300 transition-colors"
                        >
                            <RotateCcw size={11} />
                            <span>Clear All</span>
                        </button>
                    )}
                </div>
            )}

            {/* 1. Dynamic Sub-Category Filter — derived from canonical taxonomy */}
            {availableSubCategories.length > 0 && (
                <FilterGroup 
                    key="sub_category" 
                    title="Sub-category" 
                    count={availableSubCategories.length}
                    defaultExpanded={true}
                >
                    {/* Optional filter search for large lists */}
                    {availableSubCategories.length > 6 && (
                        <div className="relative mb-2 px-0.5">
                            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 pointer-events-none" />
                            <input
                                type="text"
                                value={subCategorySearch}
                                onChange={(e) => setSubCategorySearch(e.target.value)}
                                placeholder="Search sub-category..."
                                className="w-full pl-8 pr-2.5 py-1.5 text-xs bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500/30 transition-colors"
                            />
                        </div>
                    )}

                    <div className="space-y-0.5 max-h-56 overflow-y-auto no-scrollbar pr-0.5">
                        {/* "All" Option */}
                        <button
                            type="button"
                            onClick={() => handleSubCategorySelect('All')}
                            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-all group ${
                                !activeSubCategory || activeSubCategory.toLowerCase() === 'all'
                                    ? 'bg-sky-50 dark:bg-sky-500/10 text-sky-700 dark:text-sky-300 font-semibold'
                                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/5 font-medium'
                            }`}
                        >
                            <div className="flex items-center gap-2.5">
                                <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center transition-all ${
                                    !activeSubCategory || activeSubCategory.toLowerCase() === 'all'
                                        ? 'border-sky-500 bg-sky-500 shadow-xs'
                                        : 'border-slate-300 dark:border-slate-600 group-hover:border-slate-400 dark:group-hover:border-slate-500 bg-white dark:bg-[#12141c]'
                                }`}>
                                    {(!activeSubCategory || activeSubCategory.toLowerCase() === 'all') && (
                                        <div className="w-1.5 h-1.5 rounded-full bg-white" />
                                    )}
                                </div>
                                <span>All</span>
                            </div>
                            {(!activeSubCategory || activeSubCategory.toLowerCase() === 'all') && (
                                <Check size={13} className="text-sky-500 dark:text-sky-400" />
                            )}
                        </button>

                        {/* List of sub-categories */}
                        {filteredSubCategories.map(sub => {
                            const isSubActive = activeSubCategory.toLowerCase() === sub.toLowerCase();
                            return (
                                <button
                                    key={sub}
                                    type="button"
                                    onClick={() => handleSubCategorySelect(sub)}
                                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-all group ${
                                        isSubActive
                                            ? 'bg-sky-50 dark:bg-sky-500/10 text-sky-700 dark:text-sky-300 font-semibold'
                                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/5 font-medium'
                                    }`}
                                >
                                    <div className="flex items-center gap-2.5">
                                        <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center transition-all ${
                                            isSubActive
                                                ? 'border-sky-500 bg-sky-500 shadow-xs'
                                                : 'border-slate-300 dark:border-slate-600 group-hover:border-slate-400 dark:group-hover:border-slate-500 bg-white dark:bg-[#12141c]'
                                        }`}>
                                            {isSubActive && (
                                                <div className="w-1.5 h-1.5 rounded-full bg-white" />
                                            )}
                                        </div>
                                        <span>{sub}</span>
                                    </div>
                                    {isSubActive && (
                                        <Check size={13} className="text-sky-500 dark:text-sky-400" />
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </FilterGroup>
            )}

            {/* 2. Price Range Filter */}
            <FilterGroup key="price" title="Price Range" defaultExpanded={false}>
                <div className="space-y-0.5">
                    {PRICE_RANGES.map(range => {
                        const isCurrentMin = (range.min != null ? range.min.toString() : '') === activeMinPrice;
                        const isCurrentMax = (range.max != null ? range.max.toString() : '') === activeMaxPrice;
                        const isChecked = isCurrentMin && isCurrentMax;

                        return (
                            <FilterCheckbox
                                key={range.value}
                                label={range.label}
                                isChecked={isChecked}
                                onChange={() => handlePriceToggle(range)}
                            />
                        );
                    })}
                </div>
            </FilterGroup>

            {/* 3. Advanced Filters: Brand, Size, Color in exact hierarchy */}
            {STOREFRONT_FILTERS.map(filter => (
                <FilterGroup key={filter.id} title={filter.label} defaultExpanded={false}>
                    {renderFilterContent(filter)}
                </FilterGroup>
            ))}
        </aside>
    );
}


