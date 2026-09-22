'use client';

import { useMemo, useState } from 'react';
import { Check, RotateCcw, Search, SlidersHorizontal } from 'lucide-react';
import FilterGroup from '@/components/shop/filters/FilterGroup';

/**
 * WholesaleFilterSidebar — B2B filter panel built from the shared storefront
 * filter primitives (`components/shop/filters/FilterGroup`) so the merchant panel
 * inherits the customer shop's exact collapsible-group design language.
 *
 * Rendered twice by the wholesale page:
 *   • `hidden md:block` sticky column on tablet/desktop
 *   • inside `MobileFilterDrawer` below md (never stacked at the top of the mobile view)
 *
 * Every row is `min-h-[44px]` so the same markup stays thumb-friendly in the drawer.
 */
export default function WholesaleFilterSidebar({
    categories = [],
    selectedCategory = 'All',
    onCategoryChange,
    subCategories = [],
    selectedSubCategory = '',
    onSubCategoryChange,
    onClearAll,
    hasActiveFilters = false,
}) {
    const [subCategorySearch, setSubCategorySearch] = useState('');

    const categoryOptions = useMemo(
        () => [{ id: '__all__', name: 'All', color_gradient: 'from-slate-400 to-slate-500' }, ...categories],
        [categories]
    );

    const filteredSubCategories = useMemo(() => {
        if (!subCategorySearch.trim()) return subCategories;
        const q = subCategorySearch.toLowerCase().trim();
        return subCategories.filter((sub) => sub.toLowerCase().includes(q));
    }, [subCategories, subCategorySearch]);

    const rowClass = (isActive) =>
        `w-full min-h-[44px] flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg text-xs text-left transition-all ${
            isActive
                ? 'bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-sky-300 font-bold'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5 font-medium'
        }`;

    const radioDot = (isActive) => (
        <span
            className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center shrink-0 transition-all ${
                isActive
                    ? 'border-blue-500 bg-blue-500'
                    : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-[#12141c]'
            }`}
        >
            {isActive && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
        </span>
    );

    return (
        <div className="rounded-2xl border border-slate-200/90 dark:border-white/[0.06] bg-white dark:bg-[#12151c] shadow-sm p-4">
            <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-100 dark:border-white/5">
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <SlidersHorizontal size={13} className="text-blue-600 dark:text-sky-400" />
                    Refine Stock
                </h2>
                <button
                    type="button"
                    onClick={onClearAll}
                    disabled={!hasActiveFilters}
                    aria-label="Reset all filters"
                    className={`inline-flex items-center gap-1 px-2 py-1.5 rounded-lg text-[11px] font-bold transition-all ${
                        hasActiveFilters
                            ? 'text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-sky-400 hover:bg-slate-50 dark:hover:bg-white/5 active:scale-95'
                            : 'text-slate-300 dark:text-slate-600 cursor-not-allowed'
                    }`}
                >
                    <RotateCcw size={12} />
                    Reset
                </button>
            </div>

            <FilterGroup title="Category" defaultExpanded>
                <div className="space-y-0.5">
                    {categoryOptions.map((cat) => {
                        const isActive = selectedCategory === cat.name;
                        return (
                            <button
                                key={cat.id || cat.name}
                                type="button"
                                onClick={() => onCategoryChange && onCategoryChange(cat.name)}
                                className={rowClass(isActive)}
                            >
                                <span className="flex items-center gap-2.5 min-w-0">
                                    <span className={`w-2.5 h-2.5 rounded-full bg-gradient-to-br shrink-0 ${cat.color_gradient || 'from-blue-500 to-indigo-600'}`} />
                                    <span className="truncate">{cat.name}</span>
                                </span>
                                {isActive && <Check size={14} className="shrink-0 text-blue-600 dark:text-sky-400" />}
                            </button>
                        );
                    })}
                </div>
            </FilterGroup>

            {subCategories.length > 0 ? (
                <FilterGroup title={selectedCategory === 'Fashion' ? 'Department' : 'Sub-Category'} defaultExpanded>
                    {subCategories.length > 6 && (
                        <div className="relative mb-2">
                            <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-400">
                                <Search size={13} />
                            </div>
                            <input
                                type="text"
                                value={subCategorySearch}
                                onChange={(e) => setSubCategorySearch(e.target.value)}
                                placeholder="Search sub-category"
                                aria-label="Search sub-category"
                                className="w-full min-h-[44px] bg-slate-50 dark:bg-white/5 border border-slate-200/90 dark:border-white/10 rounded-lg pl-8 pr-2.5 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                            />
                        </div>
                    )}
                    <div className="space-y-0.5 max-h-72 overflow-y-auto no-scrollbar">
                        <button
                            type="button"
                            onClick={() => onSubCategoryChange && onSubCategoryChange(selectedSubCategory)}
                            className={rowClass(!selectedSubCategory)}
                        >
                            <span className="flex items-center gap-2.5 min-w-0">
                                {radioDot(!selectedSubCategory)}
                                <span className="truncate">
                                    All {selectedCategory === 'Fashion' ? 'Departments' : 'Sub-Categories'}
                                </span>
                            </span>
                            {!selectedSubCategory && <Check size={14} className="shrink-0 text-blue-600 dark:text-sky-400" />}
                        </button>
                        {filteredSubCategories.map((sub) => {
                            const isActive = selectedSubCategory.toLowerCase() === sub.toLowerCase();
                            return (
                                <button
                                    key={sub}
                                    type="button"
                                    onClick={() => onSubCategoryChange && onSubCategoryChange(sub)}
                                    className={rowClass(isActive)}
                                >
                                    <span className="flex items-center gap-2.5 min-w-0">
                                        {radioDot(isActive)}
                                        <span className="truncate">{sub}</span>
                                    </span>
                                    {isActive && <Check size={14} className="shrink-0 text-blue-600 dark:text-sky-400" />}
                                </button>
                            );
                        })}
                        {filteredSubCategories.length === 0 && (
                            <p className="text-[11px] text-slate-400 dark:text-slate-500 px-2.5 py-2 font-medium">
                                No sub-category matches “{subCategorySearch}”.
                            </p>
                        )}
                    </div>
                </FilterGroup>
            ) : (
                <FilterGroup title="Sub-Category" defaultExpanded>
                    <p className="text-[11px] text-slate-400 dark:text-slate-500 px-2.5 py-1 font-medium">
                        Pick a category to see its sub-categories.
                    </p>
                </FilterGroup>
            )}
        </div>
    );
}
