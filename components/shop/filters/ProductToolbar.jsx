'use client';

import React from 'react';
import { SlidersHorizontal } from 'lucide-react';
import ActiveFilters from './ActiveFilters';

export default function ProductToolbar({ onOpenMobileFilters, activeFilters, onRemoveFilter, onClearAll, resultsCount }) {
    return (
        <div className="flex flex-col gap-2 w-full">
            <div className="flex items-center justify-end sm:justify-between gap-3">
                <h2 className="text-lg md:text-xl font-black text-gray-900 dark:text-white tracking-tight hidden sm:block">
                    Products {resultsCount !== undefined && <span className="text-gray-400 dark:text-gray-500 font-medium ml-1">({resultsCount})</span>}
                </h2>
                
                {/* Mobile Filter Toggle */}
                <button
                    onClick={onOpenMobileFilters}
                    className="lg:hidden flex items-center gap-1.5 md:gap-2 px-3 py-1.5 md:px-4 md:py-2 bg-white dark:bg-[#151822] border border-gray-200 dark:border-gray-700 rounded-xl text-xs md:text-sm font-bold text-gray-700 dark:text-gray-300 shadow-sm hover:border-indigo-400 dark:hover:border-indigo-500 transition-all active:scale-95 whitespace-nowrap"
                >
                    <SlidersHorizontal size={14} className="md:w-4 md:h-4" />
                    Filters
                </button>
            </div>

            {/* Desktop Sort Dropdown could go here */}

            <ActiveFilters
                activeFilters={activeFilters}
                onRemoveFilter={onRemoveFilter}
                onClearAll={onClearAll}
            />
        </div>
    );
}
