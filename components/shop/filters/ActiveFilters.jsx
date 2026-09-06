'use client';

import React from 'react';
import { X } from 'lucide-react';

export default function ActiveFilters({ activeFilters, onRemoveFilter, onClearAll }) {
    if (!activeFilters || activeFilters.length === 0) return null;

    const formatTypeLabel = (type) => {
        if (type === 'sub_category') return 'Sub-category';
        if (type === 'category') return 'Category';
        if (type === 'min_price' || type === 'max_price' || type === 'price') return 'Price';
        if (type === 'search') return 'Search';
        return type.charAt(0).toUpperCase() + type.slice(1);
    };

    return (
        <div className="flex flex-wrap items-center gap-2 mb-4" aria-label="Active filters list">
            <span className="text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mr-1">
                Active:
            </span>
            {activeFilters.map((filter, idx) => (
                <div
                    key={`${filter.type}-${filter.value}-${idx}`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-50 dark:bg-sky-500/10 border border-sky-100 dark:border-sky-500/20 text-sky-700 dark:text-sky-300 text-xs font-bold shadow-2xs"
                >
                    <span className="opacity-70 font-semibold">{formatTypeLabel(filter.type)}:</span>
                    <span>{filter.label}</span>
                    <button
                        onClick={() => onRemoveFilter(filter)}
                        className="ml-0.5 p-0.5 rounded-full hover:bg-sky-200 dark:hover:bg-sky-500/30 transition-colors"
                        aria-label={`Remove ${filter.label} filter`}
                    >
                        <X size={12} strokeWidth={2.5} />
                    </button>
                </div>
            ))}
            {activeFilters.length >= 1 && (
                <button
                    onClick={onClearAll}
                    className="ml-1 text-xs font-black uppercase tracking-wider text-rose-500 hover:text-rose-600 dark:text-rose-400 dark:hover:text-rose-300 transition-colors px-2 py-1 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-500/10"
                >
                    Clear All
                </button>
            )}
        </div>
    );
}

