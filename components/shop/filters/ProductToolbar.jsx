'use client';

import React from 'react';
import { SlidersHorizontal } from 'lucide-react';
import ActiveFilters from './ActiveFilters';

export default function ProductToolbar({ onOpenMobileFilters, activeFilters, onRemoveFilter, onClearAll, resultsCount }) {
    return (
        <div className="mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-black text-gray-900 dark:text-white tracking-tight">
                        Products {resultsCount !== undefined && <span className="text-gray-400 dark:text-gray-500 font-medium ml-1">({resultsCount})</span>}
                    </h2>
                    
                    {/* Mobile Filter Toggle */}
                    <button
                        onClick={onOpenMobileFilters}
                        className="lg:hidden flex items-center gap-2 px-4 py-2 bg-white dark:bg-[#151822] border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-bold text-gray-700 dark:text-gray-300 shadow-sm hover:border-indigo-400 dark:hover:border-indigo-500 transition-all active:scale-95"
                    >
                        <SlidersHorizontal size={16} />
                        Filters
                    </button>
                </div>

                {/* Desktop Sort Dropdown could go here */}
            </div>

            <ActiveFilters
                activeFilters={activeFilters}
                onRemoveFilter={onRemoveFilter}
                onClearAll={onClearAll}
            />
        </div>
    );
}
