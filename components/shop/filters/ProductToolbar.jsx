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
                    type="button"
                    onClick={onOpenMobileFilters}
                    className="lg:hidden flex items-center gap-1.5 md:gap-2 px-3.5 py-2 bg-white dark:bg-[#151822] border border-slate-200 dark:border-white/10 rounded-xl text-xs md:text-sm font-bold text-slate-700 dark:text-slate-300 shadow-xs hover:border-sky-400 dark:hover:border-sky-500 hover:text-sky-600 dark:hover:text-sky-400 transition-all active:scale-95 whitespace-nowrap"
                >
                    <SlidersHorizontal size={14} className="md:w-4 md:h-4 text-sky-500" />
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
