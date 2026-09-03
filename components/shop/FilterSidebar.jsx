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
            {/* Department Filter (Only for Fashion) */}
            {searchParams.get('category') === 'Fashion' && (
                <FilterGroup key="sub_category" title="Department" defaultExpanded={true}>
                    <div className="space-y-1">
                        {['Men', 'Women', 'Kids'].map(dept => (
                            <FilterCheckbox
                                key={dept}
                                label={dept}
                                isChecked={(searchParams.get('sub_category') || '').split(',').includes(dept)}
                                onChange={() => handleFilterToggle('sub_category', dept)}
                            />
                        ))}
                    </div>
                </FilterGroup>
            )}

            {/* Advanced Filters */}
            {STOREFRONT_FILTERS.map(filter => (
                <FilterGroup key={filter.id} title={filter.label} defaultExpanded={false}>
                    {renderFilterContent(filter)}
                </FilterGroup>
            ))}
        </div>
    );
}
