'use client';

import React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { STOREFRONT_FILTERS } from '@/lib/shop/filterTypes';
import FilterGroup from './filters/FilterGroup';
import FilterCheckbox from './filters/FilterCheckbox';
import ColorSwatch from './filters/ColorSwatch';
import SizeGrid from './filters/SizeGrid';

export default function FilterSidebar({ categories = [] }) {
    const router = useRouter();
    const searchParams = useSearchParams();

    const activeCategory = searchParams.get('category') || 'All';

    const handleCategoryClick = (category) => {
        const params = new URLSearchParams(searchParams);
        if (category === 'All') {
            params.delete('category');
        } else {
            params.set('category', category);
        }
        
        // Phase 14: Reset stale filters when changing categories
        params.delete('brand');
        params.delete('size');
        params.delete('color');
        params.delete('min_price');
        params.delete('max_price');
        params.set('page', '1');

        router.push(`?${params.toString()}`, { scroll: false });
    };

    const handleFilterToggle = (key, value) => {
        const params = new URLSearchParams(searchParams);
        const current = params.get(key) || '';
        
        // Split current comma separated values
        let values = current ? current.split(',') : [];
        
        if (values.includes(value)) {
            values = values.filter(v => v !== value);
        } else {
            values.push(value);
        }

        if (values.length > 0) {
            params.set(key, values.join(','));
        } else {
            params.delete(key);
        }

        params.set('page', '1');
        router.push(`?${params.toString()}`, { scroll: false });
    };

    const renderFilterContent = (filter) => {
        const currentValues = (searchParams.get(filter.id) || '').split(',');

        if (filter.type === 'checkbox') {
            return (
                <div className="space-y-1">
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
                <div className="flex flex-wrap gap-3">
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
                <div className="grid grid-cols-3 gap-2">
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
        <div className="space-y-2 h-full pb-10">
            {/* Category Filter Group */}
            <FilterGroup title="Categories" defaultExpanded={true}>
                <div className="space-y-2">
                    {categories.map((cat, idx) => {
                        const isActive = (cat === 'All' && !searchParams.has('category')) || activeCategory === cat;
                        return (
                            <button
                                key={idx}
                                onClick={() => handleCategoryClick(cat)}
                                className={`flex items-center text-sm w-full text-left transition-colors px-3 py-2 rounded-xl ${
                                    isActive 
                                        ? 'bg-indigo-50 dark:bg-indigo-500/10 font-bold text-indigo-700 dark:text-indigo-400' 
                                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-gray-200'
                                }`}
                            >
                                {cat}
                            </button>
                        );
                    })}
                </div>
            </FilterGroup>

            {/* Advanced Filters */}
            {STOREFRONT_FILTERS.map(filter => (
                <FilterGroup key={filter.id} title={filter.label} defaultExpanded={false}>
                    {renderFilterContent(filter)}
                </FilterGroup>
            ))}
        </div>
    );
}
