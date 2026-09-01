'use client';

import React from 'react';
import { X } from 'lucide-react';

export default function ActiveFilters({ activeFilters, onRemoveFilter, onClearAll }) {
    if (!activeFilters || activeFilters.length === 0) return null;

    return (
        <div className="flex flex-wrap items-center gap-2 mb-6">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-widest mr-1">
                Active:
            </span>
            {activeFilters.map((filter, idx) => (
                <div
                    key={`${filter.type}-${filter.value}-${idx}`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20 text-indigo-700 dark:text-indigo-300 text-xs font-bold shadow-sm"
                >
                    <span className="opacity-70 font-medium capitalize">{filter.type}:</span>
                    <span>{filter.label}</span>
                    <button
                        onClick={() => onRemoveFilter(filter)}
                        className="ml-0.5 p-0.5 rounded-full hover:bg-indigo-200 dark:hover:bg-indigo-500/30 transition-colors"
                        aria-label={`Remove ${filter.label} filter`}
                    >
                        <X size={12} strokeWidth={3} />
                    </button>
                </div>
            ))}
            {activeFilters.length > 1 && (
                <button
                    onClick={onClearAll}
                    className="ml-2 text-xs font-bold text-gray-500 hover:text-red-500 underline decoration-gray-300 hover:decoration-red-300 transition-all underline-offset-2"
                >
                    Clear All
                </button>
            )}
        </div>
    );
}
